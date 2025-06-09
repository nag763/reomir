import base64
import json
import logging
import os

import functions_framework
import requests
from flask import Flask, Response, jsonify, redirect, request
from google.cloud import firestore, kms

# Initialize Flask app
app = Flask(__name__)

# Initialize Firestore client
db = firestore.Client()

# Initialize KMS client
KMS_CLIENT = kms.KeyManagementServiceClient()
KMS_KEY_NAME = os.getenv("KMS_KEY_NAME")
KMS_KEY_RING = os.getenv("KMS_KEY_RING")
KMS_LOCATION = os.getenv("KMS_LOCATION")
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT")


# --- Constants ---
ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "*")
X_APIGATEWAY_USERINFO_HEADER = "X-Apigateway-Api-Userinfo"
USER_ID_CLAIM = "sub"  # Standard claim for user ID in OIDC tokens

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "/")
API_GATEWAY_BASE_URL = os.getenv(
    "API_GATEWAY_BASE_URL"
)  # e.g., https://your-gateway-id.uc.gateway.dev

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_API = "https://api.github.com/user"

# Configure logging
logging.basicConfig(level=logging.INFO)


# --- Helper Functions ---
def _encrypt_data_kms(plaintext: str) -> str | None:
    """Encrypts plaintext using KMS and returns base64 encoded ciphertext."""
    if not all([GOOGLE_CLOUD_PROJECT, KMS_LOCATION, KMS_KEY_RING, KMS_KEY_NAME]):
        logging.error(
            "KMS environment variables (GOOGLE_CLOUD_PROJECT, KMS_LOCATION, KMS_KEY_RING, KMS_KEY_NAME) not fully set. Cannot encrypt."
        )
        return None
    try:
        key_path = KMS_CLIENT.crypto_key_path(
            GOOGLE_CLOUD_PROJECT, KMS_LOCATION, KMS_KEY_RING, KMS_KEY_NAME
        )
        logging.info(f"Encrypting data with KMS key: {key_path}")
        response = KMS_CLIENT.encrypt(
            name=key_path, plaintext=plaintext.encode("utf-8")
        )
        ciphertext = base64.b64encode(response.ciphertext).decode("utf-8")
        logging.info("Data successfully encrypted with KMS.")
        return ciphertext
    except Exception as e:
        logging.error(f"KMS encryption failed: {e}")
        return None


def _get_auth_user_info(req):
    """
    Retrieves user information from the 'X-Apigateway-Api-Userinfo' header
    set by API Gateway after successful Firebase authentication.
    """
    userinfo_header = req.headers.get(X_APIGATEWAY_USERINFO_HEADER)
    if not userinfo_header:
        logging.warning("X-Apigateway-Api-Userinfo header missing.")
        return None
    try:
        # The header is base64 encoded, decode it
        auth_info_header_padded = userinfo_header + "=" * (-len(userinfo_header) % 4)
        userinfo_json = base64.b64decode(auth_info_header_padded).decode("utf-8")
        userinfo = json.loads(userinfo_json)
        # Extract user_id (subject claim)
        user_id = userinfo.get(USER_ID_CLAIM)
        if not user_id:
            logging.warning(f"'{USER_ID_CLAIM}' not found in userinfo: {userinfo}")
            return None
        logging.info(f"Authenticated user_id: {user_id}")
        return {"user_id": user_id, "full_claims": userinfo}
    except Exception as e:
        logging.error(f"Error decoding userinfo header: {e}")
        return None


# --- CORS Handling ---
@app.after_request
def add_cors_headers(response):
    """
    Adds CORS headers to every response using the @after_request decorator.
    This function is automatically executed by Flask after each request.
    """
    response.headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGINS
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = (
        "Content-Type, Authorization, X-Apigateway-Api-Userinfo"
    )
    response.headers["Access-Control-Max-Age"] = "3600"
    return response


# --- Route Implementations ---


@app.route("/api/v1/github/connect", methods=["GET", "OPTIONS"])
def handle_connect_route():
    if request.method == "OPTIONS":
        return "", 204  # Preflight request handled by @after_request

    auth_info = _get_auth_user_info(request)
    if not auth_info or not auth_info.get("user_id"):
        return jsonify({"error": "Authentication required."}), 401
    user_id = auth_info["user_id"]

    if not GITHUB_CLIENT_ID:
        logging.error("GITHUB_CLIENT_ID not configured.")
        return jsonify({"error": "Server configuration error."}), 500

    if not API_GATEWAY_BASE_URL:
        logging.error("API_GATEWAY_BASE_URL not configured.")
        return jsonify({"error": "Server configuration error for callback."}), 500

    callback_url = f"{API_GATEWAY_BASE_URL}/api/v1/github/callback"
    state = user_id  # Using user_id as state for simplicity

    auth_params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": callback_url,
        "scope": "read:user user:email",
        "state": state,
    }
    github_auth_target_url = (
        f"{GITHUB_AUTH_URL}?{'&'.join([f'{k}={v}' for k, v in auth_params.items()])}"
    )

    logging.info(
        f"Redirecting user {user_id} to GitHub for authorization: {github_auth_target_url}"
    )
    # The @after_request decorator will add CORS headers to this redirect response
    return jsonify({"redirectUrl": github_auth_target_url})


@app.route("/api/v1/github/callback", methods=["GET", "OPTIONS"])
def handle_callback_route():
    if request.method == "OPTIONS":
        return "", 204

    code = request.args.get("code")
    state = request.args.get("state")  # This is the user_id

    if not code or not state:
        logging.warning("Callback missing code or state.")
        return redirect(f"{FRONTEND_URL}/auth/settings?github_error=missing_params")

    user_id = state
    logging.info(f"Handling GitHub callback for user_id (from state): {user_id}")

    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET or not API_GATEWAY_BASE_URL:
        logging.error(
            "GitHub OAuth app credentials or API_GATEWAY_BASE_URL not configured."
        )
        return redirect(f"{FRONTEND_URL}/auth/settings?github_error=config_error")

    callback_url = f"{API_GATEWAY_BASE_URL}/api/v1/github/callback"

    try:
        # Exchange code for access token
        token_payload = {
            "client_id": GITHUB_CLIENT_ID,
            "client_secret": GITHUB_CLIENT_SECRET,
            "code": code,
            "redirect_uri": callback_url,
        }
        headers = {"Accept": "application/json"}
        logging.info(f"Exchanging code for token at {GITHUB_TOKEN_URL}")
        token_response = requests.post(
            GITHUB_TOKEN_URL, data=token_payload, headers=headers
        )
        token_response.raise_for_status()
        token_data = token_response.json()
        access_token = token_data.get("access_token")

        if not access_token:
            logging.error(f"Access token not in GitHub response: {token_data}")
            return redirect(
                f"{FRONTEND_URL}/auth/settings?github_error=token_exchange_failed"
            )

        # Encrypt the access token
        encrypted_access_token = _encrypt_data_kms(access_token)
        if not encrypted_access_token:
            logging.error("Failed to encrypt GitHub access token.")
            return redirect(
                f"{FRONTEND_URL}/auth/settings?github_error=encryption_failed"
            )
        logging.info("GitHub access token successfully encrypted.")

        # Get user info from GitHub
        user_api_headers = {"Authorization": f"token {access_token}"}
        logging.info(f"Fetching user info from {GITHUB_USER_API}")
        user_info_response = requests.get(GITHUB_USER_API, headers=user_api_headers)
        user_info_response.raise_for_status()
        github_user_data = user_info_response.json()

        github_login = github_user_data.get("login")
        github_id = github_user_data.get("id")

        if not github_login or not github_id:
            logging.error(
                f"GitHub username or ID not in API response: {github_user_data}"
            )
            return redirect(
                f"{FRONTEND_URL}/auth/settings?github_error=user_fetch_failed"
            )

        # Store token and GitHub info in Firestore
        user_ref = db.collection("users").document(user_id)
        user_data_to_store = {
            "github_access_token": encrypted_access_token, # Store encrypted token
            "github_login": github_login,
            "github_id": str(github_id),  # Ensure ID is stored as string
            "github_connected": True,
            "github_last_updated": firestore.SERVER_TIMESTAMP,
        }
        logging.info(
            f"Updating Firestore for user {user_id} with GitHub data (token encrypted)."
        )
        user_ref.set(user_data_to_store, merge=True)

        logging.info(
            f"Successfully connected GitHub for user {user_id}, username {github_login}. Token stored with encryption."
        )
        
        # The origin of your frontend application for secure communication
        frontend_origin = FRONTEND_URL.strip('/')

        # This HTML is served to the popup window.
        # It sends a message to the parent window (`window.opener`) and then closes.
        return Response(
            f"""
            <html>
                <head><title>GitHub Authentication Success</title></head>
                <body>
                    <p>Success! This window will now close.</p>
                    <script>
                        // Only proceed if running in a popup that has a parent
                        if (window.opener) {{
                            // Send a success message to the parent window
                            const message = {{ "source": "github-popup", "status": "success" }};
                            const targetOrigin = "{frontend_origin}";
                            
                            console.log(`Sending message to origin: ${{targetOrigin}}`);
                            window.opener.postMessage(message, targetOrigin);
                        }}
                        // Close the popup window
                        window.close();
                    </script>
                </body>
            </html>
            """,
            mimetype="text/html",
        )

    except requests.exceptions.RequestException as e:
        logging.error(f"RequestException during GitHub OAuth: {e}")
        if e.response is not None:
            logging.error(f"GitHub error response: {e.response.text}")
        return redirect(f"{FRONTEND_URL}/auth/settings?github_error=api_error")
    except Exception as e:
        logging.error(f"Unexpected error during GitHub callback: {e}")
        return redirect(f"{FRONTEND_URL}/auth/settings?github_error=internal_error")


@app.route("/api/v1/github/status", methods=["GET", "OPTIONS"])
def handle_status_route():
    if request.method == "OPTIONS":
        return "", 204

    auth_info = _get_auth_user_info(request)
    if not auth_info or not auth_info.get("user_id"):
        return jsonify({"error": "Authentication required."}), 401
    user_id = auth_info["user_id"]

    try:
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()

        if user_doc.exists and user_doc.get("github_connected"):
            logging.info(
                f"GitHub status for user {user_id}: connected as {user_doc.get('github_login')}"
            )
            return (
                jsonify(
                    {
                        "connected": True,
                        "username": user_doc.get("github_login"),
                        "github_id": user_doc.get("github_id"),
                    }
                ),
                200,
            )
        else:
            logging.info(f"GitHub status for user {user_id}: not connected.")
            return jsonify({"connected": False}), 200
    except Exception as e:
        logging.error(f"Error fetching GitHub status for user {user_id}: {e}")
        return jsonify({"error": "Failed to retrieve status."}), 500


@app.route("/api/v1/github/disconnect", methods=["DELETE", "OPTIONS"])
def handle_disconnect_route():
    if request.method == "OPTIONS":
        return "", 204

    auth_info = _get_auth_user_info(request)
    if not auth_info or not auth_info.get("user_id"):
        return jsonify({"error": "Authentication required."}), 401
    user_id = auth_info["user_id"]

    try:
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()

        if user_doc.exists and user_doc.get("github_connected"):
            updates = {
                "github_access_token": firestore.DELETE_FIELD,
                "github_login": firestore.DELETE_FIELD,
                "github_id": firestore.DELETE_FIELD,
                "github_connected": False,
                "github_last_updated": firestore.SERVER_TIMESTAMP,
            }
            user_ref.update(updates)
            logging.info(f"Successfully disconnected GitHub for user {user_id}.")
            return jsonify({"message": "GitHub disconnected successfully."}), 200
        else:
            logging.info(
                f"No active GitHub connection found for user {user_id} to disconnect."
            )
            return (
                jsonify({"message": "No active GitHub connection to disconnect."}),
                200,
            )

    except Exception as e:
        logging.error(f"Error disconnecting GitHub for user {user_id}: {e}")
        return jsonify({"error": "Failed to disconnect GitHub."}), 500


# --- Main Cloud Function Entry Point ---
@functions_framework.http
def handler(req):
    """
    Routes incoming requests to the appropriate Flask handler based on the path.
    This function is the entry point for the Google Cloud Function.
    """
    with app.request_context(req.environ):
        return app.full_dispatch_request()
