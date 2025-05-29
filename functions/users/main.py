import os
import base64
import json
import logging

import functions_framework
from flask import request
from google.cloud import firestore

# Initialize Firestore client
# This will use Application Default Credentials
# Ensure the Cloud Function's service account has Firestore permissions
db = firestore.Client()

# Get allowed origins from environment variable, default to all (*)
allowed_origins = os.getenv("CORS_ALLOWED_ORIGINS", "*")

# Define global CORS headers
# These headers will be used for preflight requests and actual responses.
CORS_HEADERS = {
    "Access-Control-Allow-Origin": allowed_origins,
    "Access-Control-Allow-Methods": "GET, OPTIONS",  # Specify allowed methods
    "Access-Control-Allow-Headers": "Content-Type, Authorization",  # Specify allowed headers
    "Access-Control-Max-Age": "3600",  # Cache preflight response for 1 hour
}


@functions_framework.http
def handler(req: request):
    # Set CORS headers for the preflight request (OPTIONS)
    if req.method == "OPTIONS":
        return ("", 204, CORS_HEADERS)

    # Handle GET requests
    if req.method == "GET":
        # --- Authentication ---
        # API Gateway is expected to pass authenticated user info in this header
        auth_info_header = req.headers.get("X-Apigateway-Api-Userinfo")

        if not auth_info_header:
            return (
                {"error": "Authentication information not found."},
                401,  # Unauthorized
                CORS_HEADERS,
            )

        try:
            # Decode the base64 string
            auth_info_decoded = base64.b64decode(auth_info_header + "==").decode(
                "utf-8"
            )
            # Parse the JSON string
            auth_info_json = json.loads(auth_info_decoded)
            # Extract the user ID (Google ID tokens usually use 'id' or 'sub' for subject/user ID)
            # For Google ID tokens validated by API Gateway, 'id' and 'email' are typical.
            user_id = auth_info_json.get("sub")

            if not user_id:
                return (
                    {"error": "User ID not found in authentication information."},
                    400,  # Bad Request
                    CORS_HEADERS,
                )
        except (TypeError, ValueError, AttributeError) as e:
            return (
                {"error": "Invalid authentication information format."},
                400,  # Bad Request
                CORS_HEADERS,
            )

        # --- Firestore Check ---
        try:
            user_doc_ref = db.collection("users").document(user_id)
            user_doc = user_doc_ref.get()

            if user_doc.exists:
                # User document exists
                response_data = {"status": "user_exists", "user_id": user_id}
                return (response_data, 200, CORS_HEADERS)
            else:
                # User document does not exist
                # A 204 response MUST NOT include a message-body
                return ("", 204, CORS_HEADERS)

        except Exception as e:
            # Log the exception for debugging: print(f"Firestore error: {e}")
            return (
                {"error": "An error occurred while checking user data."},
                500,  # Internal Server Error
                CORS_HEADERS,
            )

    # Handle other methods
    else:
        # Respond with 405 Method Not Allowed and include CORS_HEADERS
        # The 'Allow' header is also good practice for 405 responses.
        response_headers = CORS_HEADERS.copy()
        response_headers["Allow"] = "GET, OPTIONS"
        return (
            {"error": "Method not allowed. Please use GET or OPTIONS."},
            405,  # Method Not Allowed
            response_headers,
        )
