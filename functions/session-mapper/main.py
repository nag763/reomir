import base64
import json
import logging
import os

import functions_framework
# Import Google Auth libraries for impersonation
import google.auth
import google.auth.transport.requests
import google.oauth2.id_token
import requests
from flask import Flask, make_response, request

# Note: google.oauth2.id_token is NOT directly used if fetching ID token via impersonated_credentials

# --- Flask App Initialization ---
app = Flask(__name__)

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
        )
    try:
        # Pad the base64 string if necessary
        auth_info_header_padded = auth_info_header + "=" * (-len(auth_info_header) % 4)
        auth_info_decoded = base64.b64decode(auth_info_header_padded).decode("utf-8")
        auth_info_json = json.loads(auth_info_decoded)
        if not auth_info_json.get(USER_ID_CLAIM):
            msg = f"User ID claim ('{USER_ID_CLAIM}') not found in authentication information."
            return None, ({"error": msg}, 400)
        return auth_info_json, None
    except (TypeError, ValueError, AttributeError, json.JSONDecodeError) as e:
        logging.error("Error decoding authentication information: %s", e)
        return None, (
            {"error": "Invalid authentication information format."},
            400,
        )


@app.route("/", methods=["GET", "POST", "OPTIONS"])
def map_session():
    """Handles session mapping requests."""
    logging.info(
        "Flask route / hit with method: %s",
        request.method,
    )

    if request.method == "OPTIONS":
        # Preflight request. Reply successfully:
        return _build_cors_preflight_response()

    # --- Essential Configuration Check ---
    if not CLOUDRUN_AGENT_URL:
        logging.error("CLOUDRUN_AGENT_URL environment variable is not set.")
        return {"error": "Agent URL configuration error."}, 500

    auth_info, error_response = _get_auth_user_info(request)
    if error_response:
        # error_response is a tuple (data, status_code), we need to make it a Flask response
        return make_response(json.dumps(error_response[0]), error_response[1])

    user_id_from_claims = auth_info[
        USER_ID_CLAIM
    ]  # Original end-user ID from initial token

    # Validate that app_id from path matches the one from X-App header
    x_app_value = request.headers.get(X_APP_HEADER)
    if not x_app_value:
        logging.error("'%s' header not found.", X_APP_HEADER)
        return (
            {"error": f"'{X_APP_HEADER}' header not found."},
            400,
        )
    target_url_for_agent = (
        f"{CLOUDRUN_AGENT_URL}/apps/{x_app_value}/users/{user_id_from_claims}/sessions"
    )
    logging.info("Attempting to POST to agent at: %s", target_url_for_agent)

    try:
        auth_req = google.auth.transport.requests.Request()
        id_token = google.oauth2.id_token.fetch_id_token(auth_req, target_url_for_agent)

        # Do NOT log the full id_token in production.
        logging.info("Successfully fetched ID token for agent.")

        downstream_headers = {
            AUTHORIZATION_HEADER: f"Bearer {id_token}",
            X_APP_HEADER: x_app_value,  # Forward the X-App header
        }

        # Log the Authorization header received by this function (from API Gateway)
        auth_header_from_gateway = request.headers.get(AUTHORIZATION_HEADER)
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

        # The original code was missing a way to forward the request body.
        # This gets the raw body from the incoming request.
        request_body = request.get_data()

        response = requests.post(
            target_url_for_agent,
            data=request_body,
            timeout=10,
            headers=downstream_headers,
        )
        response.raise_for_status()

        logging.info("Agent responded with status: %s", response.status_code)
        # Create a Flask response
        flask_response = make_response(response.content, response.status_code)
        if "Content-Type" in response.headers:
            flask_response.headers["Content-Type"] = response.headers["Content-Type"]
        return flask_response

    except google.auth.exceptions.DefaultCredentialsError as e:
        logging.error(
            "Could not find default credentials for the Cloud Function itself: %s", e
        )
        return (
            {"error": "Service account configuration issue for the function."},
            500,
        )
    except requests.exceptions.RequestException as e:
        agent_response_text = (
            e.response.text if e.response is not None else "No response text"
        )
        agent_status_code = e.response.status_code if e.response is not None else 502
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
        )
    except Exception as e:
        logging.error("An unexpected error occurred: %s", e, exc_info=True)
        return (
            {
                "error": "An unexpected internal error occurred.",
                "details": str(e),
            },
            500,
        )


def _build_cors_preflight_response():
    """Builds a response for CORS preflight OPTIONS requests."""
    response = make_response()
    response.status_code = 204
    return response


@app.after_request
def add_cors_headers(response):
    """Adds CORS headers to the response."""
    response.headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGINS
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = (
        "Content-Type, Authorization, X-App, X-End-User-ID, X-Apigateway-Api-Userinfo"
    )
    response.headers["Access-Control-Max-Age"] = "3600"
    logging.info("CORS headers added to response by @app.after_request.")
    return response


@functions_framework.http
def handler(req: request):
    """
    Handles HTTP requests by dispatching them to the Flask app.
    This function is the entry point for Google Cloud Functions.
    """
    # Create a request context for the Flask app to work correctly.
    with app.request_context(req.environ):
        # Let Flask handle the request routing and processing.
        flask_response = app.full_dispatch_request()
        return flask_response
