"""
Cloud Function to manage user data in Firestore.

This function handles CRUD operations for user profiles, extracting user
identity from an API Gateway-provided header. It supports GET, POST, PUT,
and DELETE methods. CORS is handled for all requests.
"""

import base64
import json
import logging
import os

import functions_framework
from flask import request
from google.cloud import firestore
from google.cloud import kms

db = firestore.Client()

# Initialize KMS client
KMS_CLIENT = kms.KeyManagementServiceClient()
KMS_KEY_NAME = os.getenv("KMS_KEY_NAME")
KMS_KEY_RING = os.getenv("KMS_KEY_RING")
KMS_LOCATION = os.getenv("KMS_LOCATION")
GCP_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT")

ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "*")
X_APIGATEWAY_USERINFO_HEADER = "X-Apigateway-Api-Userinfo"
USER_ID_CLAIM = "sub"  # Standard OpenID Connect claim for subject (user ID)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "3600",
}

# --- Helper Functions (still useful to reduce repetition) ---

def _decrypt_data_kms(ciphertext_b64: str) -> str | None:
    """Decrypts base64 encoded ciphertext using KMS and returns plaintext string."""
    if not all([GCP_PROJECT, KMS_LOCATION, KMS_KEY_RING, KMS_KEY_NAME]):
        logging.error(
            "KMS environment variables (GCP_PROJECT, KMS_LOCATION, KMS_KEY_RING, KMS_KEY_NAME) not fully set. Cannot decrypt."
        )
        return None
    try:
        key_path = KMS_CLIENT.crypto_key_path(
            GCP_PROJECT, KMS_LOCATION, KMS_KEY_RING, KMS_KEY_NAME
        )
        decoded_ciphertext = base64.b64decode(ciphertext_b64)
        logging.info(f"Decrypting data with KMS key: {key_path}")
        response = KMS_CLIENT.decrypt(name=key_path, ciphertext=decoded_ciphertext)
        plaintext = response.plaintext.decode("utf-8")
        logging.info("Data successfully decrypted with KMS.")
        return plaintext
    except Exception as e:
        logging.error(f"KMS decryption failed: {e}")
        return None

def _get_auth_user_info(req: request):
    """Extracts, decodes, and validates user authentication info from request headers.

    Args:
        req (flask.Request): The Flask request object.

    Returns:
        tuple: (dict, None) on success with user info, or (None, tuple) on error.
               The error tuple is (error_dict, status_code, headers).
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
    """Parses JSON data from the request body.

    Args:
        req (flask.Request): The Flask request object.

    Returns:
        tuple: (dict, None) on success with request data, or (None, tuple) on error.
               The error tuple is (error_dict, status_code, headers).
    """
    try:
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
    """Handles HTTP requests for user data management in Firestore.

    This is the main entry point for the Cloud Function, triggered by HTTP requests
    routed via the Functions Framework. It delegates to helper functions for
    authentication and data parsing, then handles business logic based on the
    HTTP method.

    Args:
        req (flask.Request): The Flask request object, expected to be routed by
                             Functions Framework.

    Returns:
        tuple: A Flask response tuple (body, status_code, headers).
               Body is JSON or empty.
    """

    if req.method == "OPTIONS":
        return "", 204, CORS_HEADERS

    # --- Authentication (common for applicable methods) ---
    # This is performed once for methods that require it.
    auth_info, error_response = _get_auth_user_info(req)
    if error_response:
        # error_response already includes (dict, status_code, CORS_HEADERS)
        return error_response

    # auth_info is not None here and USER_ID_CLAIM exists.
    user_id = auth_info[USER_ID_CLAIM]

    # --- Method-specific logic ---
    match req.method:
        case "GET":
            try:
                user_doc_ref = db.collection("users").document(user_id)
                user_doc = user_doc_ref.get()

                if user_doc.exists:
                    user_doc_data = user_doc.to_dict()

                    # Check and decrypt github_access_token if present
                    encrypted_token = user_doc_data.get("github_access_token")
                    if encrypted_token and isinstance(encrypted_token, str):
                        logging.info(f"Found github_access_token for user {user_id}, attempting decryption.")
                        decrypted_token = _decrypt_data_kms(encrypted_token)
                        if decrypted_token is not None:
                            user_doc_data["github_access_token"] = decrypted_token
                            logging.info(f"Successfully decrypted github_access_token for user {user_id}.")
                        else:
                            logging.error(f"Failed to decrypt github_access_token for user {user_id}.")
                            user_doc_data["github_access_token"] = None # Or consider omitting or using an empty string
                            user_doc_data["github_access_token_error"] = "decryption_failed"

                    return user_doc_data, 200, CORS_HEADERS
                else:
                    return (
                        "",
                        204,
                        CORS_HEADERS,
                    )  # No content, user document does not exist
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
                # 200 for idempotent set/merge
                return data_to_store_cleaned, 200, CORS_HEADERS
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

                updated_doc = user_doc_ref.get()
                # Should ideally always exist if update() succeeded.
                if not updated_doc.exists:
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
                    # Note: Does not recursively delete subcollections.
                    user_doc_ref.delete()
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
                    return "", 204, CORS_HEADERS  # No content, document didn't exist
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
