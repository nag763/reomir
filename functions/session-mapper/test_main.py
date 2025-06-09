import base64
import json
import os
from unittest import mock
from unittest.mock import MagicMock, patch

import pytest
import requests
from google.auth import exceptions as google_auth_exceptions

# Import the main module and the Flask app object
import main as main_module
from main import app

# Create a test client for the Flask app
client = app.test_client()

# --- Fixtures for Mocking ---


@pytest.fixture
def mock_dependencies(request):
    """
    This fixture patches the main external dependencies of the Cloud Function:
    - os.getenv to control environment variables
    - google.oauth2.id_token.fetch_id_token for agent authentication
    - requests.post for calling the downstream agent
    - logging functions for verifying log output
    """
    # Create a dictionary to hold all the mocks
    mocks = {}

    # Patch os.getenv
    patcher_getenv = patch.dict(os.environ, {}, clear=True)
    mocks["getenv"] = patcher_getenv.start()

    # Patch google.oauth2.id_token.fetch_id_token
    patcher_fetch_id_token = patch("main.google.oauth2.id_token.fetch_id_token")
    mocks["fetch_id_token"] = patcher_fetch_id_token.start()

    # Patch requests.post
    patcher_requests_post = patch("main.requests.post")
    mocks["requests_post"] = patcher_requests_post.start()

    # Patch logging
    patcher_log_info = patch.object(main_module.logging, "info")
    patcher_log_error = patch.object(main_module.logging, "error")
    mocks["log_info"] = patcher_log_info.start()
    mocks["log_error"] = patcher_log_error.start()

    # Yield the dictionary of mocks to the test function
    yield mocks

    # Teardown: stop all patchers
    patcher_getenv.stop()
    patcher_fetch_id_token.stop()
    patcher_requests_post.stop()
    patcher_log_info.stop()
    patcher_log_error.stop()


# --- Helper Functions ---


def _get_auth_headers(user_id="test-user-sub-123", email="test@example.com"):
    """
    Generates a valid, base64-encoded 'X-Apigateway-Api-Userinfo' header.
    """
    if user_id is None:
        user_info = {"email": email}  # No 'sub' claim
    else:
        user_info = {"sub": user_id, "email": email}

    user_info_json = json.dumps(user_info)
    user_info_b64 = base64.b64encode(user_info_json.encode("utf-8")).decode("utf-8")
    return {"X-Apigateway-Api-Userinfo": user_info_b64}


# --- Test Cases ---


def test_map_session_success(mock_dependencies):
    """
    GIVEN a valid POST request with all required headers and environment variables
    WHEN the / endpoint is called
    THEN it should successfully fetch an ID token and proxy the request to the agent
    """
    # --- GIVEN (Arrange) ---
    # Set the environment variable using the mocked os.getenv
    mock_dependencies["getenv"] = patch.dict(
        os.environ, {"CLOUDRUN_AGENT_URL": "https://fake-agent.com"}
    ).start()

    # Configure mock for fetching ID token
    mock_dependencies["fetch_id_token"].return_value = "mock-id-token"

    # Configure mock for the downstream agent's response
    mock_agent_response = MagicMock()
    mock_agent_response.status_code = 201
    mock_agent_response.content = b'{"agent_response": "ok"}'
    mock_agent_response.headers = {"Content-Type": "application/json"}
    mock_dependencies["requests_post"].return_value = mock_agent_response

    headers = _get_auth_headers(user_id="user-1")
    headers["X-App"] = "app-abc"
    headers["Content-Type"] = "application/json"
    request_body = {"data": "some-payload"}

    # --- WHEN (Act) ---
    response = client.post("/", headers=headers, json=request_body)

    # --- THEN (Assert) ---
    assert response.status_code == 201
    assert response.json == {"agent_response": "ok"}

    # Verify ID token was fetched for the correct audience
    expected_agent_url = "https://fake-agent.com/apps/app-abc/users/user-1/sessions"
    mock_dependencies["fetch_id_token"].assert_called_once()
    assert mock_dependencies["fetch_id_token"].call_args[0][1] == expected_agent_url

    # Verify the POST request to the agent was correct
    mock_dependencies["requests_post"].assert_called_once_with(
        expected_agent_url,
        data=json.dumps(request_body).encode("utf-8"),
        timeout=10,
        headers={
            "Authorization": "Bearer mock-id-token",
            "X-App": "app-abc",
        },
    )

    # Verify CORS headers
    assert response.headers["Access-Control-Allow-Origin"] == "*"


def test_missing_agent_url_env(mock_dependencies):
    """
    GIVEN the CLOUDRUN_AGENT_URL environment variable is not set
    WHEN a request is made
    THEN it should return a 500 configuration error
    """
    # GIVEN
    # The fixture already clears env vars, so CLOUDRUN_AGENT_URL is not set
    headers = _get_auth_headers()
    headers["X-App"] = "app-abc"

    # WHEN
    response = client.post("/", headers=headers, json={})

    # THEN
    assert response.status_code == 500
    assert response.json == {"error": "Agent URL configuration error."}
    mock_dependencies["log_error"].assert_called_once_with(
        "CLOUDRUN_AGENT_URL environment variable is not set."
    )


def test_missing_x_app_header(mock_dependencies):
    """
    GIVEN a request is missing the 'X-App' header
    WHEN a request is made
    THEN it should return a 400 bad request error
    """
    # GIVEN
    patch.dict(os.environ, {"CLOUDRUN_AGENT_URL": "https://fake-agent.com"}).start()
    headers = _get_auth_headers()  # X-App is missing

    # WHEN
    response = client.post("/", headers=headers, json={})

    # THEN
    assert response.status_code == 400
    assert response.json == {"error": "'X-App' header not found."}


# --- Authentication Header Tests ---


def test_missing_auth_header(mock_dependencies):
    """
    GIVEN a request is missing the 'X-Apigateway-Api-Userinfo' header
    WHEN a request is made
    THEN it should return a 401 unauthorized error
    """
    patch.dict(os.environ, {"CLOUDRUN_AGENT_URL": "https://fake-agent.com"}).start()
    response = client.post("/", headers={"X-App": "app-abc"})  # No auth header

    assert response.status_code == 401
    assert (
        response.json["error"]
        == "Authentication information not found (X-Apigateway-Api-Userinfo missing)."
    )


def test_malformed_auth_header_not_base64(mock_dependencies):
    """
    GIVEN the auth header contains a string that is not valid Base64
    WHEN a request is made
    THEN it should return a 400 bad request error
    """
    patch.dict(os.environ, {"CLOUDRUN_AGENT_URL": "https://fake-agent.com"}).start()
    headers = {"X-Apigateway-Api-Userinfo": "this-is-not-base64", "X-App": "app-abc"}
    response = client.post("/", headers=headers)

    assert response.status_code == 400
    assert response.json == {"error": "Invalid authentication information format."}


def test_auth_header_missing_user_id_claim(mock_dependencies):
    """
    GIVEN the auth header is valid but the decoded JSON lacks the 'sub' claim
    WHEN a request is made
    THEN it should return a 400 bad request error
    """
    patch.dict(os.environ, {"CLOUDRUN_AGENT_URL": "https://fake-agent.com"}).start()
    headers = _get_auth_headers(user_id=None)  # Helper creates a payload without 'sub'
    headers["X-App"] = "app-abc"

    response = client.post("/", headers=headers)

    assert response.status_code == 400
    assert response.json == {
        "error": "User ID claim ('sub') not found in authentication information."
    }


# --- Downstream Failure Tests ---


def test_id_token_fetch_failure(mock_dependencies):
    """
    GIVEN the call to fetch an ID token fails with credentials error
    WHEN a request is made
    THEN it should return a 500 internal server error
    """
    # GIVEN
    patch.dict(os.environ, {"CLOUDRUN_AGENT_URL": "https://fake-agent.com"}).start()
    mock_dependencies["fetch_id_token"].side_effect = (
        google_auth_exceptions.DefaultCredentialsError("Creds not found")
    )
    headers = _get_auth_headers()
    headers["X-App"] = "app-abc"

    # WHEN
    response = client.post("/", headers=headers, json={})

    # THEN
    assert response.status_code == 500
    assert response.json == {
        "error": "Service account configuration issue for the function."
    }
    mock_dependencies["log_error"].assert_called_with(
        "Could not find default credentials for the Cloud Function itself: %s", mock.ANY
    )


# --- CORS Preflight Test ---


def test_options_request(mock_dependencies):
    """
    GIVEN an OPTIONS preflight request
    WHEN it hits the endpoint
    THEN it should return a 204 No Content response with correct CORS headers
    """
    # WHEN
    response = client.options("/")

    # THEN
    assert response.status_code == 204
    assert response.data == b""
    assert response.headers["Access-Control-Allow-Origin"] == "*"
    assert "POST" in response.headers["Access-Control-Allow-Methods"]
    assert "OPTIONS" in response.headers["Access-Control-Allow-Methods"]
    assert (
        "X-Apigateway-Api-Userinfo" in response.headers["Access-Control-Allow-Headers"]
    )
    assert "X-App" in response.headers["Access-Control-Allow-Headers"]
