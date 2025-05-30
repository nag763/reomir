import base64
import json
import logging
import os

import functions_framework
from flask import request
from google.cloud import firestore


# Initialize Firestore client
db = firestore.Client()

# Configuration
ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "*")
X_APIGATEWAY_USERINFO_HEADER = "X-Apigateway-Api-Userinfo"
USER_ID_CLAIM = "sub"  # Standard OpenID Connect claim for subject (user ID)

# Global CORS headers
CORS_HEADERS = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "3600",
}

# --- Helper Functions (still useful to reduce repetition) ---


def _get_auth_user_info(req: request):
    """
    Extracts, decodes, and validates user authentication info from request headers.

    Returns:
        tuple: (auth_info_json, None) on success, or (None, error_response_tuple) on failure.
               The error_response_tuple is (error_dict, status_code, headers).
    """
    auth_info_header = req.headers.get(X_APIGATEWAY_USERINFO_HEADER)
    if not auth_info_header:
        return None, (
            {"error": "Authentication information not found."},
            401,
            CORS_HEADERS,
        )

    try:
        # Add correct padding for base64 decoding if missing
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


def _get_request_data(req: request):
    """
    Parses JSON data from the request body.

    Returns:
        tuple: (request_data_json, None) on success, or (None, error_response_tuple) on failure.
    """
    try:
        # get_json raises BadRequest (400) if not JSON, malformed, or wrong Content-Type.
        request_data = req.get_json(silent=False)
        if request_data is None:  # Handles cases like an empty body or JSON 'null'
            return None, (
                {"error": "No JSON payload provided or payload is null."},
                400,
                CORS_HEADERS,
            )
        return request_data, None
    except Exception as e:  # Catches BadRequest from get_json
        logging.error("Error parsing JSON body: %s", e)
        return None, (
            {"error": "Invalid JSON payload or Content-Type."},
            400,
            CORS_HEADERS,
        )


# --- Main Cloud Function Handler ---


@functions_framework.http
def handler(req: request):
    """Handles HTTP requests for user data management in Firestore."""

    if req.method == "OPTIONS":
        return "", 204, CORS_HEADERS

    # --- Authentication (common for applicable methods) ---
    # This is performed once for methods that require it.
    auth_info, error_response = _get_auth_user_info(req)
    if error_response:
        # This error_response already includes (dict, status_code, CORS_HEADERS)
        return error_response

    # We can be sure auth_info is not None here and USER_ID_CLAIM exists.
    user_id = auth_info[USER_ID_CLAIM]

    # --- Method-specific logic ---
    match req.method:
        case "GET":
            try:
                user_doc_ref = db.collection("users").document(user_id)
                user_doc = user_doc_ref.get()

                if user_doc.exists:
                    return user_doc.to_dict(), 200, CORS_HEADERS
                else:
                    # User document does not exist
                    return "", 204, CORS_HEADERS  # No content
            except Exception as e:
                logging.error("Firestore GET error for user %s: %s", user_id, e)
                return (
                    {"error": "An error occurred while retrieving user data."},
                    500,
                    CORS_HEADERS,
                )

        case "POST":
            request_data, error_response = _get_request_data(req)
            if error_response:
                return error_response

            # Validate specific fields required by POST
            if not (
                isinstance(request_data, dict)
                and request_data.get("cookieConsent") == "true"
            ):
                return (
                    {
                        "error": "'cookieConsent' field must be present and set to 'true'."
                    },
                    400,
                    CORS_HEADERS,
                )

            try:
                user_doc_ref = db.collection("users").document(user_id)
                data_to_store = {
                    "uid": user_id,
                    "email": auth_info.get("email"),
                    "displayName": auth_info.get("name"),  # Google ID token uses 'name'
                    **request_data,
                }
                # Remove any keys with None values that originated from auth_info
                data_to_store_cleaned = {
                    k: v for k, v in data_to_store.items() if v is not None
                }

                user_doc_ref.set(data_to_store_cleaned, merge=True)
                logging.info("User document for %s created/updated via POST.", user_id)
                return (
                    data_to_store_cleaned,
                    200,
                    CORS_HEADERS,
                )  # 200 for idempotent set/merge
            except Exception as e:
                logging.error("Firestore POST error for user %s: %s", user_id, e)
                return (
                    {"error": "An error occurred while saving user data."},
                    500,
                    CORS_HEADERS,
                )

        case "PUT":
            request_data, error_response = _get_request_data(req)
            if error_response:
                return error_response

            if (
                not isinstance(request_data, dict) or not request_data
            ):  # Must be a non-empty dict
                return (
                    {"error": "Request body must be a non-empty JSON object for PUT."},
                    400,
                    CORS_HEADERS,
                )

            try:
                user_doc_ref = db.collection("users").document(user_id)
                user_doc_ref.update(
                    request_data
                )  # Updates fields; fails if doc doesn't exist.

                updated_doc = user_doc_ref.get()  # Fetch the updated document
                if (
                    not updated_doc.exists
                ):  # Should ideally always exist if update() succeeded.
                    logging.error(
                        "Firestore PUT error: Document %s not found after presumed update.",
                        user_id,
                    )
                    return (
                        {"error": "Failed to retrieve document after update."},
                        500,
                        CORS_HEADERS,
                    )

                logging.info("User document for %s updated via PUT.", user_id)
                return updated_doc.to_dict(), 200, CORS_HEADERS
            except firestore.exceptions.NotFound:
                logging.warning(
                    "Firestore PUT: Document %s not found for update.", user_id
                )
                return (
                    {"error": f"User document {user_id} not found to update."},
                    404,
                    CORS_HEADERS,
                )
            except Exception as e:
                logging.error("Firestore PUT error for user %s: %s", user_id, e)
                return (
                    {"error": "An error occurred while updating user data."},
                    500,
                    CORS_HEADERS,
                )

        case "DELETE":
            try:
                user_doc_ref = db.collection("users").document(user_id)
                doc_snapshot = user_doc_ref.get()

                if doc_snapshot.exists:
                    user_doc_ref.delete()  # Note: Does not recursively delete subcollections.
                    logging.info("Firestore document for user %s deleted.", user_id)
                    return (
                        {"message": f"User data for {user_id} deleted successfully."},
                        200,
                        CORS_HEADERS,
                    )
                else:
                    logging.info(
                        "No Firestore document to delete for user %s.", user_id
                    )
                    return "", 204, CORS_HEADERS  # No content
            except Exception as e:
                logging.error(
                    "Error deleting Firestore document for user %s: %s", user_id, e
                )
                return (
                    {"error": "An error occurred while deleting user data."},
                    500,
                    CORS_HEADERS,
                )

        case _:
            return {"error": "Method not allowed."}, 405, CORS_HEADERS
