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
    match req.method:
        case "OPTIONS":
            headers = CORS_HEADERS
            return ("", 204, headers)
        case "GET":
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
                logging.error("Error decoding authentication information: %s", e)
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
                    return (user_doc.to_dict(), 200, CORS_HEADERS)
                else:
                    # User document does not exist
                    # A 204 response MUST NOT include a message-body
                    return ("", 204, CORS_HEADERS)

            except Exception as e:
                logging.error("Firestore error: %s", e)
                return (
                    {"error": "An error occurred while checking user data."},
                    500,  # Internal Server Error
                    CORS_HEADERS,
                )
        case "POST":
            # --- Authentication (same logic as GET to identify the user) ---
            auth_info_header = req.headers.get("X-Apigateway-Api-Userinfo")
            if not auth_info_header:
                return (
                    {"error": "Authentication information not found."},
                    401,
                    CORS_HEADERS,
                )

            try:
                auth_info_decoded = base64.b64decode(auth_info_header + "==").decode(
                    "utf-8"
                )
                auth_info_json = json.loads(auth_info_decoded)
                user_id = auth_info_json.get("sub")  # Standard claim for Google User ID

                if not user_id:
                    return (
                        {"error": "User ID not found in authentication information."},
                        400,
                        CORS_HEADERS,
                    )
            except (TypeError, ValueError, AttributeError, json.JSONDecodeError) as e:
                logging.error(
                    "Error decoding authentication information for POST: %s", e
                )
                return (
                    {"error": "Invalid authentication information format."},
                    400,
                    CORS_HEADERS,
                )

            # --- Get Data from Request Body ---
            try:
                # Ensure request has JSON content type, Flask's get_json handles this check.
                # Setting force=True can bypass content-type check but is generally not recommended.
                request_data = req.get_json(silent=False)
                if (
                    request_data is None
                ):  # Should not happen if silent=False and content-type is wrong
                    return (
                        {
                            "error": "No JSON payload provided or incorrect Content-Type header."
                        },
                        400,
                        CORS_HEADERS,
                    )
            except (
                Exception
            ) as e:  # Catches werkzeug.exceptions.BadRequest for malformed JSON
                logging.error("Error parsing JSON body for POST: %s", e)
                return ({"error": "Invalid JSON payload provided."}, 400, CORS_HEADERS)

            # --- Validate required fields (based on your frontend logic) ---
            # Example: Your frontend sends 'cookieConsent' and optionally 'organizationName'
            if (
                "cookieConsent" not in request_data
                or request_data["cookieConsent"] != "true"
            ):
                # This validation depends on what your ConsentPopup guarantees to send.
                # If only cookieConsent='true' means "valid", this check is important.
                # If other fields are always sent, adjust validation.
                # For the use case of ConsentPopup, cookieConsent is mandatory.
                return (
                    {"error": "'cookieConsent' must be present and set to 'true'."},
                    400,
                    CORS_HEADERS,
                )

            # --- Firestore Operation: Create/Update User Document ---
            try:
                user_doc_ref = db.collection("users").document(user_id)

                data_to_store = {
                    "uid": user_id,  # Ensure uid is stored, matching the document ID
                    "email": auth_info_json.get("email"),  # From validated token
                    "displayName": auth_info_json.get(
                        "name"
                    ),  # From validated token (Google calls it 'name')
                    **request_data,
                }

                # Clean up None values from auth_info_json if you prefer not to store them
                if data_to_store["email"] is None:
                    del data_to_store["email"]
                if data_to_store["displayName"] is None:
                    del data_to_store["displayName"]

                # Using set with merge=True will create the document if it doesn't exist,
                # or update/merge fields if it already exists.
                # This is suitable for creating the initial profile or updating it.
                user_doc_ref.set(data_to_store, merge=True)

                logging.info(
                    f"User document for {user_id} created/updated successfully via POST."
                )

            except Exception as e:
                logging.error(f"Firestore error during POST for user {user_id}: {e}")
                return (
                    {"error": "An error occurred while saving user data."},
                    500,
                    CORS_HEADERS,
                )
            # Return the newly created/updated data or a success message
            # It's often good practice to return the resource state after creation/update
            return (
                data_to_store,
                200,
                CORS_HEADERS,
            )  # 200 for idempotent set, or 201 if strictly creation
        case _:
            return ("Method not allowed", 405)
