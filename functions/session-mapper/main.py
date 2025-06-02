import base64
import json
import logging
import os

import functions_framework
from flask import request
import requests

# Import Google Auth libraries for impersonation
import google.auth
import google.auth.transport.requests
import google.oauth2.id_token

# Note: google.oauth2.id_token is NOT directly used if fetching ID token via impersonated_credentials

# --- Configuration from Environment Variables ---
ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "*")
CLOUDRUN_AGENT_URL = os.getenv("CLOUDRUN_AGENT_URL")

# --- Header Names and Claims ---
X_APIGATEWAY_USERINFO_HEADER = "X-Apigateway-Api-Userinfo"
X_APP_HEADER = "X-App"
AUTHORIZATION_HEADER = (
    "Authorization"  # For Authorization header received by this function
)
USER_ID_CLAIM = "sub"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-App, X-End-User-ID",
    "Access-Control-Max-Age": "3600",
}


def _get_auth_user_info(req: request):
    """
    Extracts, decodes, and validates user authentication info from X-Apigateway-Api-Userinfo.
    """
    auth_info_header = req.headers.get(X_APIGATEWAY_USERINFO_HEADER)
    if not auth_info_header:
        return None, (
            {
                "error": "Authentication information not found (X-Apigateway-Api-Userinfo missing)."
            },
            401,
            CORS_HEADERS,
        )
    try:
        auth_info_header_padded = auth_info_header + "=" * (-len(auth_info_header) % 4)
        auth_info_decoded = base64.b64decode(auth_info_header_padded).decode("utf-8")
        auth_info_json = json.loads(auth_info_decoded)
        if not auth_info_json.get(USER_ID_CLAIM):
            msg = f"User ID claim ('{USER_ID_CLAIM}') not found in authentication information."
            return None, ({"error": msg}, 400, CORS_HEADERS)
        return auth_info_json, None
    except (TypeError, ValueError, AttributeError, json.JSONDecodeError) as e:
        logging.error("Error decoding authentication information: %s", e)
        return None, (
            {"error": "Invalid authentication information format."},
            400,
            CORS_HEADERS,
        )


@functions_framework.http
def handler(req: request):
    """Handles HTTP requests, impersonates a SA to call a downstream service."""

    logging.info("Request method: %s", req.method)
    incoming_headers = {key: value for key, value in req.headers.items()}
    logging.info("Incoming request headers: %s", json.dumps(incoming_headers, indent=2))

    if req.method == "OPTIONS":
        return "", 204, CORS_HEADERS

    # --- Essential Configuration Check ---
    if not CLOUDRUN_AGENT_URL:
        logging.error("CLOUDRUN_AGENT_URL environment variable is not set.")
        return {"error": "Agent URL configuration error."}, 500, CORS_HEADERS

    # Log the Authorization header received by this function (from API Gateway)
    # This token is NOT used for the downstream call when impersonating.
    auth_header_from_gateway = req.headers.get(AUTHORIZATION_HEADER)
    if auth_header_from_gateway:
        logging.info(
            "Authorization header received from API Gateway (not used for downstream impersonated call): %s...",
            (
                auth_header_from_gateway[:20]
                if len(auth_header_from_gateway) > 20
                else auth_header_from_gateway
            ),
        )
    else:
        logging.warning(
            "No Authorization header received by this function from API Gateway."
        )

    match req.method:
        case "GET":
            auth_info, error_response = _get_auth_user_info(req)
            if error_response:
                return error_response

            user_id_from_claims = auth_info[
                USER_ID_CLAIM
            ]  # Original end-user ID from initial token

            x_app_value = req.headers.get(X_APP_HEADER)
            if not x_app_value:
                logging.error("'%s' header not found.", X_APP_HEADER)
                return (
                    {"error": f"'{X_APP_HEADER}' header not found."},
                    400,
                    CORS_HEADERS,
                )

            target_url_for_agent = f"{CLOUDRUN_AGENT_URL}/apps/{x_app_value}/users/{user_id_from_claims}/sessions"
            logging.info("Attempting to POST to agent at: %s", target_url_for_agent)

            try:

                auth_req = google.auth.transport.requests.Request()
                id_token = google.oauth2.id_token.fetch_id_token(
                    auth_req, target_url_for_agent
                )

                logging.warning("Bearer %s", id_token)

                downstream_headers = {
                    AUTHORIZATION_HEADER: f"Bearer {id_token}",
                    X_APP_HEADER: x_app_value,
                }

                response = requests.post(
                    target_url_for_agent, timeout=10, headers=downstream_headers
                )
                response.raise_for_status()

                logging.info("Agent responded with status: %s", response.status_code)
                final_headers = CORS_HEADERS.copy()
                if "Content-Type" in response.headers:
                    final_headers["Content-Type"] = response.headers["Content-Type"]
                return response.content, response.status_code, final_headers

            except google.auth.exceptions.DefaultCredentialsError as e:
                logging.error(
                    "Could not find default credentials for the Cloud Function itself: %s",
                    e,
                )
                return (
                    {"error": "Service account configuration issue for the function."},
                    500,
                    CORS_HEADERS,
                )
            except requests.exceptions.RequestException as e:
                agent_response_text = (
                    e.response.text if e.response is not None else "No response text"
                )
                agent_status_code = (
                    e.response.status_code if e.response is not None else 502
                )
                logging.error("Error calling agent at %s: %s", target_url_for_agent, e)
                logging.error(
                    "Agent response status: %s, text: %s",
                    agent_status_code,
                    agent_response_text,
                )
                return (
                    {
                        "error": "Failed to communicate with agent service.",
                        "agent_status": agent_status_code,
                        "agent_response": agent_response_text,
                    },
                    agent_status_code,
                    CORS_HEADERS,
                )
            except Exception as e:
                logging.error("An unexpected error occurred: %s", e, exc_info=True)
                return (
                    {
                        "error": "An unexpected internal error occurred.",
                        "details": str(e),
                    },
                    500,
                    CORS_HEADERS,
                )

        case _:
            logging.warning("Method not allowed: %s", req.method)
            return {"error": "Method not allowed."}, 405, CORS_HEADERS
