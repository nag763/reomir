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
from flask import Flask, request, jsonify, make_response
from google.cloud import firestore, kms

# --- Flask App Initialization ---
app = Flask(__name__)

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

# CORS_HEADERS dictionary removed

# --- Helper Functions ---

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
               The error tuple is (error_dict, status_code).
    """
    auth_info_header = req.headers.get(X_APIGATEWAY_USERINFO_HEADER)
    if not auth_info_header:
        return None, ({"error": "Authentication information not found."}, 401)

    try:
        auth_info_header_padded = auth_info_header + "=" * (-len(auth_info_header) % 4)
        auth_info_decoded = base64.b64decode(auth_info_header_padded).decode("utf-8")
        auth_info_json = json.loads(auth_info_decoded)

        if not auth_info_json.get(USER_ID_CLAIM):
            msg = f"User ID claim ('{USER_ID_CLAIM}') not found in authentication information."
            return None, ({"error": msg}, 400)
        return auth_info_json, None
    except (TypeError, ValueError, AttributeError, json.JSONDecodeError) as e:
        logging.error("Error decoding authentication information: %s", e)
        return None, ({"error": "Invalid authentication information format."}, 400)


def _get_request_data(req: request):
    """Parses JSON data from the request body.

    Args:
        req (flask.Request): The Flask request object.

    Returns:
        tuple: (dict, None) on success with request data, or (None, tuple) on error.
               The error tuple is (error_dict, status_code).
    """
    try:
        request_data = req.get_json(silent=False)
        if request_data is None:
            return None, ({"error": "No JSON payload provided or payload is null."}, 400)
        return request_data, None
    except Exception as e:
        logging.error("Error parsing JSON body: %s", e)
        return None, ({"error": "Invalid JSON payload or Content-Type."}, 400)

# --- CORS Handling ---
@app.after_request
def add_cors_headers(response):
    """Adds CORS headers to the response."""
    response.headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGINS
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Max-Age"] = "3600"
    logging.info(f"CORS headers added to response for origin: {ALLOWED_ORIGINS}")
    return response

# --- Flask Routes ---

@app.route("/", methods=["GET", "OPTIONS"])
def get_user_data():
    if request.method == "OPTIONS":
        return make_response("", 204)

    auth_info, error_response_tuple = _get_auth_user_info(request)
    if error_response_tuple:
        error_dict, status_code = error_response_tuple
        return jsonify(error_dict), status_code

    user_id = auth_info[USER_ID_CLAIM]
    try:
        user_doc_ref = db.collection("users").document(user_id)
        user_doc = user_doc_ref.get()

        if user_doc.exists:
            user_doc_data = user_doc.to_dict()
            encrypted_token = user_doc_data.get("github_access_token")
            if encrypted_token and isinstance(encrypted_token, str):
                logging.info(f"Found github_access_token for user {user_id}, attempting decryption.")
                decrypted_token = _decrypt_data_kms(encrypted_token)
                if decrypted_token is not None:
                    user_doc_data["github_access_token"] = decrypted_token
                    logging.info(f"Successfully decrypted github_access_token for user {user_id}.")
                else:
                    logging.error(f"Failed to decrypt github_access_token for user {user_id}.")
                    user_doc_data["github_access_token"] = None
                    user_doc_data["github_access_token_error"] = "decryption_failed"
            return jsonify(user_doc_data), 200
        else:
            return make_response("", 204)  # No content
    except Exception as e:
        logging.error("Firestore GET error for user %s: %s", user_id, e)
        return jsonify({"error": "An error occurred while retrieving user data."}), 500

@app.route("/", methods=["POST", "OPTIONS"])
def create_update_user_data():
    if request.method == "OPTIONS":
        return make_response("", 204)

    auth_info, error_response_tuple = _get_auth_user_info(request)
    if error_response_tuple:
        error_dict, status_code = error_response_tuple
        return jsonify(error_dict), status_code
    user_id = auth_info[USER_ID_CLAIM]

    request_data, error_response_tuple = _get_request_data(request)
    if error_response_tuple:
        error_dict, status_code = error_response_tuple
        return jsonify(error_dict), status_code

    if not (isinstance(request_data, dict) and request_data.get("cookieConsent") == "true"):
        return jsonify({"error": "'cookieConsent' field must be present and set to 'true'."}), 400

    try:
        user_doc_ref = db.collection("users").document(user_id)
        data_to_store = {
            "uid": user_id,
            "email": auth_info.get("email"),
            "displayName": auth_info.get("name"),
            **request_data,
        }
        data_to_store_cleaned = {k: v for k, v in data_to_store.items() if v is not None}
        user_doc_ref.set(data_to_store_cleaned, merge=True)
        logging.info("User document for %s created/updated via POST.", user_id)
        return jsonify(data_to_store_cleaned), 200
    except Exception as e:
        logging.error("Firestore POST error for user %s: %s", user_id, e)
        return jsonify({"error": "An error occurred while saving user data."}), 500

@app.route("/", methods=["PUT", "OPTIONS"])
def update_user_data_put():
    if request.method == "OPTIONS":
        return make_response("", 204)

    auth_info, error_response_tuple = _get_auth_user_info(request)
    if error_response_tuple:
        error_dict, status_code = error_response_tuple
        return jsonify(error_dict), status_code
    user_id = auth_info[USER_ID_CLAIM]

    request_data, error_response_tuple = _get_request_data(request)
    if error_response_tuple:
        error_dict, status_code = error_response_tuple
        return jsonify(error_dict), status_code

    if not isinstance(request_data, dict) or not request_data:
        return jsonify({"error": "Request body must be a non-empty JSON object for PUT."}), 400

    try:
        user_doc_ref = db.collection("users").document(user_id)
        user_doc_ref.update(request_data)
        updated_doc = user_doc_ref.get()
        if not updated_doc.exists:
            logging.error("Firestore PUT error: Document %s not found after presumed update.", user_id)
            return jsonify({"error": "Failed to retrieve document after update."}), 500
        logging.info("User document for %s updated via PUT.", user_id)
        return jsonify(updated_doc.to_dict()), 200
    except firestore.exceptions.NotFound:
        logging.warning("Firestore PUT: Document %s not found for update.", user_id)
        return jsonify({"error": f"User document {user_id} not found to update."}), 404
    except Exception as e:
        logging.error("Firestore PUT error for user %s: %s", user_id, e)
        return jsonify({"error": "An error occurred while updating user data."}), 500

@app.route("/", methods=["DELETE", "OPTIONS"])
def delete_user_data():
    if request.method == "OPTIONS":
        return make_response("", 204)

    auth_info, error_response_tuple = _get_auth_user_info(request)
    if error_response_tuple:
        error_dict, status_code = error_response_tuple
        return jsonify(error_dict), status_code
    user_id = auth_info[USER_ID_CLAIM]

    try:
        user_doc_ref = db.collection("users").document(user_id)
        doc_snapshot = user_doc_ref.get()
        if doc_snapshot.exists:
            user_doc_ref.delete()
            logging.info("Firestore document for user %s deleted.", user_id)
            return jsonify({"message": f"User data for {user_id} deleted successfully."}), 200
        else:
            logging.info("No Firestore document to delete for user %s.", user_id)
            return make_response("", 204)
    except Exception as e:
        logging.error("Error deleting Firestore document for user %s: %s", user_id, e)
        return jsonify({"error": "An error occurred while deleting user data."}), 500

# --- Main Cloud Function Handler (delegates to Flask app) ---
@functions_framework.http
def handler(req: request):
    """
    Handles HTTP requests by dispatching them to the Flask app.
    This function is the entry point for Google Cloud Functions.
    """
    with app.request_context(req.environ):
        return app.full_dispatch_request()
