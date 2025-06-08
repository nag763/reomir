import os
import json
import base64
import logging
import functions_framework
from flask import Flask, redirect, request, Response, jsonify
from google.cloud import firestore
import requests

# Initialize Flask app
app = Flask(__name__)

# Initialize Firestore client
db = firestore.Client()

# --- Constants ---
ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "*")
X_APIGATEWAY_USERINFO_HEADER = "X-Apigateway-Api-Userinfo"
USER_ID_CLAIM = "sub"  # Standard claim for user ID in OIDC tokens

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "/")
API_GATEWAY_BASE_URL = os.getenv("API_GATEWAY_BASE_URL") # e.g., https://your-gateway-id.uc.gateway.dev

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_API = "https://api.github.com/user"

# Configure logging
logging.basicConfig(level=logging.INFO)

# --- Helper Functions ---
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
        userinfo_json = base64.b64decode(userinfo_header).decode('utf-8')
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
def _add_cors_headers(response_or_resp_obj):
    """Adds CORS headers to a Flask Response object or a tuple response."""
    if isinstance(response_or_resp_obj, Response):
        response = response_or_resp_obj
    else: # tuple like (body, status, headers) or (body, status)
        if len(response_or_resp_obj) == 3:
            body, status, headers = response_or_resp_obj
            response = Response(body, status=status, headers=headers)
        elif len(response_or_resp_obj) == 2:
            body, status = response_or_resp_obj
            response = Response(body, status=status)
        else: # just body
            response = Response(response_or_resp_obj)

    response.headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGINS
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Apigateway-Api-Userinfo'
    response.headers['Access-Control-Max-Age'] = '3600'
    if request.method == 'OPTIONS':
        response.status_code = 204 # No Content for OPTIONS
    return response

# --- Route Implementations ---

@app.route('/api/v1/github/connect', methods=['GET', 'OPTIONS'])
def handle_connect_route():
    if request.method == 'OPTIONS':
        return _add_cors_headers(("", 204))

    auth_info = _get_auth_user_info(request)
    if not auth_info or not auth_info.get("user_id"):
        return _add_cors_headers(jsonify({"error": "Authentication required."}), 401)
    user_id = auth_info["user_id"]

    if not GITHUB_CLIENT_ID:
        logging.error("GITHUB_CLIENT_ID not configured.")
        return _add_cors_headers(jsonify({"error": "Server configuration error."}), 500)

    if not API_GATEWAY_BASE_URL:
        logging.error("API_GATEWAY_BASE_URL not configured.")
        return _add_cors_headers(jsonify({"error": "Server configuration error for callback."}), 500)

    callback_url = f"{API_GATEWAY_BASE_URL}/api/v1/github/callback"
    state = user_id # Using user_id as state for simplicity in this iteration

    auth_params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": callback_url,
        "scope": "read:user user:email", # Request access to user's profile and email
        "state": state
    }
    github_auth_target_url = f"{GITHUB_AUTH_URL}?{'&'.join([f'{k}={v}' for k, v in auth_params.items()])}"

    logging.info(f"Redirecting user {user_id} to GitHub for authorization: {github_auth_target_url}")
    return _add_cors_headers(redirect(github_auth_target_url))

@app.route('/api/v1/github/callback', methods=['GET', 'OPTIONS'])
def handle_callback_route():
    if request.method == 'OPTIONS':
        return _add_cors_headers(("", 204))

    code = request.args.get('code')
    state = request.args.get('state') # This is the user_id we passed

    if not code or not state:
        logging.warning("Callback missing code or state.")
        return _add_cors_headers(redirect(f"{FRONTEND_URL}/auth/settings?github_error=missing_params"))

    # In this simplified model, state is the user_id.
    # A more robust solution would involve validating state against a stored value.
    user_id = state
    logging.info(f"Handling GitHub callback for user_id (from state): {user_id}")

    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET or not API_GATEWAY_BASE_URL:
        logging.error("GitHub OAuth app credentials or API_GATEWAY_BASE_URL not configured.")
        return _add_cors_headers(redirect(f"{FRONTEND_URL}/auth/settings?github_error=config_error"))

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
        token_response = requests.post(GITHUB_TOKEN_URL, data=token_payload, headers=headers)
        token_response.raise_for_status() # Raise an exception for bad status codes
        token_data = token_response.json()
        access_token = token_data.get("access_token")

        if not access_token:
            logging.error(f"Access token not in GitHub response: {token_data}")
            return _add_cors_headers(redirect(f"{FRONTEND_URL}/auth/settings?github_error=token_exchange_failed"))

        # Get user info from GitHub
        user_api_headers = {"Authorization": f"token {access_token}"}
        logging.info(f"Fetching user info from {GITHUB_USER_API}")
        user_info_response = requests.get(GITHUB_USER_API, headers=user_api_headers)
        user_info_response.raise_for_status()
        github_user_data = user_info_response.json()

        github_login = github_user_data.get("login")
        github_id = github_user_data.get("id")

        if not github_login or not github_id:
            logging.error(f"GitHub username or ID not in API response: {github_user_data}")
            return _add_cors_headers(redirect(f"{FRONTEND_URL}/auth/settings?github_error=user_fetch_failed"))

        # Store token and GitHub info in Firestore
        user_ref = db.collection("users").document(user_id)
        user_data_to_store = {
            "github_access_token": access_token,
            "github_login": github_login,
            "github_id": str(github_id), # Ensure ID is stored as string
            "github_connected": True,
            "github_last_updated": firestore.SERVER_TIMESTAMP
        }
        logging.info(f"Updating Firestore for user {user_id} with GitHub data.")
        user_ref.set(user_data_to_store, merge=True) # Use set with merge=True to update or create

        logging.info(f"Successfully connected GitHub for user {user_id}, username {github_login}")
        return _add_cors_headers(redirect(f"{FRONTEND_URL}/auth/settings?github_connected=true"))

    except requests.exceptions.RequestException as e:
        logging.error(f"RequestException during GitHub OAuth: {e}")
        if e.response is not None:
            logging.error(f"GitHub error response: {e.response.text}")
        return _add_cors_headers(redirect(f"{FRONTEND_URL}/auth/settings?github_error=api_error"))
    except Exception as e:
        logging.error(f"Unexpected error during GitHub callback: {e}")
        return _add_cors_headers(redirect(f"{FRONTEND_URL}/auth/settings?github_error=internal_error"))


@app.route('/api/v1/github/status', methods=['GET', 'OPTIONS'])
def handle_status_route():
    if request.method == 'OPTIONS':
        return _add_cors_headers(("", 204))

    auth_info = _get_auth_user_info(request)
    if not auth_info or not auth_info.get("user_id"):
        return _add_cors_headers(jsonify({"error": "Authentication required."}), 401)
    user_id = auth_info["user_id"]

    try:
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()

        if user_doc.exists and user_doc.get("github_connected"):
            logging.info(f"GitHub status for user {user_id}: connected as {user_doc.get('github_login')}")
            return _add_cors_headers(jsonify({
                "connected": True,
                "username": user_doc.get("github_login"),
                "github_id": user_doc.get("github_id")
            }), 200)
        else:
            logging.info(f"GitHub status for user {user_id}: not connected.")
            return _add_cors_headers(jsonify({"connected": False}), 200)
    except Exception as e:
        logging.error(f"Error fetching GitHub status for user {user_id}: {e}")
        return _add_cors_headers(jsonify({"error": "Failed to retrieve status."}), 500)


@app.route('/api/v1/github/disconnect', methods=['DELETE', 'OPTIONS'])
def handle_disconnect_route():
    if request.method == 'OPTIONS':
        return _add_cors_headers(("", 204))

    auth_info = _get_auth_user_info(request)
    if not auth_info or not auth_info.get("user_id"):
        return _add_cors_headers(jsonify({"error": "Authentication required."}), 401)
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
                "github_last_updated": firestore.SERVER_TIMESTAMP
            }
            user_ref.update(updates)
            logging.info(f"Successfully disconnected GitHub for user {user_id}.")
            return _add_cors_headers(jsonify({"message": "GitHub disconnected successfully."}), 200)
        else:
            logging.info(f"No active GitHub connection found for user {user_id} to disconnect.")
            return _add_cors_headers(jsonify({"message": "No active GitHub connection to disconnect."}), 200) # Or 404 if preferred

    except Exception as e:
        logging.error(f"Error disconnecting GitHub for user {user_id}: {e}")
        return _add_cors_headers(jsonify({"error": "Failed to disconnect GitHub."}), 500)


# --- Main Cloud Function Entry Point ---
@functions_framework.http
def handler(req):
    """
    Routes incoming requests to the appropriate Flask handler based on the path.
    This function is the entry point for the Google Cloud Function.
    """
    # Handle OPTIONS requests globally for CORS preflight at the function entry level if needed,
    # or rely on Flask app's per-route OPTIONS handling.
    # For simplicity and consistency with Flask's @app.route, we'll let Flask handle it.

    # Create a new request context for each incoming request
    with app.request_context(req.environ):
        # Dispatch the request to the Flask app
        # Flask's app.full_dispatch_request() or app.wsgi_app(req.environ, start_response) can be used.
        # wsgi_app is more standard for WSGI servers.
        # However, for Cloud Functions, often just calling the view function directly or using
        # app.full_dispatch_request() is common.

        # The Flask app's routing will take over based on @app.route decorators.
        # We need to ensure the original request object `req` (a Flask request) is used by Flask.
        # The `app.full_dispatch_request()` handles the Werkzeug environment setup.

        # If `req` is already a Flask request object (which functions_framework provides),
        # we can let Flask's routing mechanism handle it.
        # The key is that the routes are defined on `app`.

        # functions_framework provides a Flask request object as `req`.
        # We use app.full_dispatch_request() to correctly dispatch to our routes.
        return app.full_dispatch_request()

# Example of how to run this locally for testing (requires Flask development server):
# if __name__ == '__main__':
#     # Set environment variables locally for testing
#     os.environ['GITHUB_CLIENT_ID'] = 'your_github_client_id'
#     os.environ['GITHUB_CLIENT_SECRET'] = 'your_github_client_secret'
#     os.environ['FRONTEND_URL'] = 'http://localhost:3000'
#     os.environ['API_GATEWAY_BASE_URL'] = 'http://localhost:8080' # Or your local function invoker URL
#     # For Firestore, ensure ADC are set up (e.g. gcloud auth application-default login)
#     app.run(debug=True, port=8080)
