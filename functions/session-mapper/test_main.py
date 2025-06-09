import base64
import json
import os
import unittest
from unittest.mock import MagicMock, patch

import google.auth.exceptions  # For actual exception types
import requests.exceptions  # For actual exception types

# from .main import CLOUDRUN_AGENT_URL as MAIN_CLOUDRUN_AGENT_URL # This is no longer a global in main.py
# Import the Flask app and other necessary components from main.py
from .main import ALLOWED_ORIGINS  # For checking CORS headers
from .main import _get_auth_user_info  # Keep for direct testing if needed, but primary tests via routes
from .main import (
    AUTHORIZATION_HEADER,
    USER_ID_CLAIM,
    X_APIGATEWAY_USERINFO_HEADER,
    X_APP_HEADER,
    app,
)

# Environment variable for patching
CLOUDRUN_AGENT_URL_ENV = "CLOUDRUN_AGENT_URL"

# Mock for google.auth.exceptions to hold custom DefaultCredentialsError type
# This needs to be available for patching main.google.auth.exceptions
# mock_google_auth_exceptions = MagicMock() # No longer needed, will use actual exceptions
# mock_google_auth_exceptions.DefaultCredentialsError = type(
#     "DefaultCredentialsError", (Exception,), {}
# )

# Mock for requests.exceptions to hold custom RequestException type
# This needs to be available for patching main.requests.exceptions
# mock_requests_exceptions = MagicMock() # No longer needed, will use actual exceptions
# mock_requests_exceptions.RequestException = type(
#     "RequestException", (Exception,), {"response": None}
# )


@patch.dict(os.environ, {CLOUDRUN_AGENT_URL_ENV: "http://fake-agent.com"})
class TestCloudFunction(unittest.TestCase):

    def setUp(self):
        """Set up the Flask test client and reset mocks."""
        app.testing = True
        self.client = app.test_client()
        # Patch logging directly in main.py where the app's logging occurs
        self.mock_logging_info = patch(
            "functions.session-mapper.main.logging.info"
        ).start()
        self.mock_logging_warning = patch(
            "functions.session-mapper.main.logging.warning"
        ).start()
        self.mock_logging_error = patch(
            "functions.session-mapper.main.logging.error"
        ).start()
        self.addCleanup(patch.stopall)  # Stops all patches started with start()

        # CLOUDRUN_AGENT_URL is now patched at class level
        # patch.dict(
        #     os.environ, {CLOUDRUN_AGENT_URL_ENV: "http://fake-agent.com"}
        # ).start() # This line is removed

    def _get_auth_header(self, user_id="test_user_123", email="test@example.com"):
        auth_info = {USER_ID_CLAIM: user_id, "email": email}
        encoded_auth_info = base64.b64encode(json.dumps(auth_info).encode()).decode()
        return encoded_auth_info.rstrip("=")

    # --- Tests for _get_auth_user_info (direct testing, useful for complex internal logic) ---
    # These tests are mostly kept from the original, but adapted to use Flask's request context implicitly if needed
    # or by creating a mock request if _get_auth_user_info is tested in complete isolation.
    # For now, we assume _get_auth_user_info is tested via the app context.

    def test_get_auth_user_info_success_direct(self):
        """Test _get_auth_user_info successfully decodes (direct call style)."""
        user_id = "test_user_123"
        auth_header_val = self._get_auth_header(user_id=user_id)
        # mock_req = MagicMock() # Not used directly if using app.test_request_context
        # mock_req.headers = {X_APIGATEWAY_USERINFO_HEADER: auth_header_val}

        # Call within app context to ensure it behaves as it would in the app
        with app.test_request_context(  # app is from .main
            headers={X_APIGATEWAY_USERINFO_HEADER: auth_header_val}
        ):
            # Note: _get_auth_user_info takes flask.request directly
            from flask import request as flask_request

            result_info, error = _get_auth_user_info(
                flask_request
            )  # _get_auth_user_info from .main

        self.assertIsNone(error)
        self.assertIsNotNone(result_info)
        self.assertEqual(result_info[USER_ID_CLAIM], user_id)

    def test_get_auth_user_info_missing_header_direct(self):
        with app.test_request_context(headers={}):
            from flask import request as flask_request

            result_info, error = _get_auth_user_info(flask_request)
        self.assertIsNone(result_info)
        self.assertIsNotNone(error)
        self.assertEqual(error[1], 401)  # Status code

    def test_get_auth_user_info_invalid_base64_direct(self):
        with app.test_request_context(
            headers={X_APIGATEWAY_USERINFO_HEADER: "this is not base64"}
        ):
            from flask import request as flask_request

            result_info, error = _get_auth_user_info(flask_request)
        self.assertIsNone(result_info)
        self.assertIsNotNone(error)
        self.assertEqual(error[1], 400)
        self.mock_logging_error.assert_called_once()  # Check that main.logging.error was called

    # --- Route Tests ---
    def test_options_request(self):
        """Test OPTIONS preflight request returns 204 and CORS headers."""
        test_app_id = "test-app"
        test_user_id = "test-user"
        response = self.client.options(
            "/",  # Changed path to root
            headers={
                X_APP_HEADER: test_app_id
            },  # Ensure X-App header is present for OPTIONS if logic depends on it
        )

        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.data, b"")
        self.assertEqual(
            response.headers["Access-Control-Allow-Origin"], ALLOWED_ORIGINS
        )
        self.assertIn("POST", response.headers["Access-Control-Allow-Methods"])
        self.assertIn("OPTIONS", response.headers["Access-Control-Allow-Methods"])
        self.assertIn("X-App", response.headers["Access-Control-Allow-Headers"])

    @patch.dict(os.environ, {CLOUDRUN_AGENT_URL_ENV: ""}, clear=True)
    def test_post_request_missing_cloudrun_agent_url_env(self):
        """Test POST request when CLOUDRUN_AGENT_URL is not set."""
        # Ensure the environment variable is truly unset for this test
        # main.CLOUDRUN_AGENT_URL will be None if the env var is not set when main.py is imported/reloaded
        # For safety, we can also patch the variable in 'main' module directly if needed,
        # but patching os.environ before 'app' use in test_client() should be effective for Flask config.

        # To make this test robust, we should ensure that main.CLOUDRUN_AGENT_URL is effectively None or empty.
        # The @patch.dict for os.environ in this test's decorator already handles unsetting CLOUDRUN_AGENT_URL_ENV.
        # The 'with patch(...)' below is no longer needed as CLOUDRUN_AGENT_URL is not a global in main.py.
        # with patch("functions.session-mapper.main.CLOUDRUN_AGENT_URL", None):
        test_app_id = "test-app"
        test_user_id = "test-user"
        auth_header_val = self._get_auth_header(user_id=test_user_id)

        response = self.client.post(
            "/",  # Changed path to root
            headers={
                X_APIGATEWAY_USERINFO_HEADER: auth_header_val,
                X_APP_HEADER: test_app_id,
            },
        )
        self.assertEqual(response.status_code, 500)
        self.assertIn("Agent URL configuration error", response.json["error"])

    def test_post_request_missing_apigateway_userinfo_header(self):
        """Test POST request with missing X-Apigateway-Api-Userinfo header."""
        test_app_id = "test-app"
        test_user_id = "test-user"
        response = self.client.post(
            "/",  # Changed path to root
            headers={X_APP_HEADER: test_app_id},
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn("Authentication information not found", response.json["error"])

    def test_post_request_missing_x_app_header(self):
        """Test POST request with missing X-App header."""
        test_app_id = "test-app"
        test_user_id = "test-user"
        auth_header_val = self._get_auth_header(user_id=test_user_id)
        response = self.client.post(
            "/",  # Changed path to root
            headers={X_APIGATEWAY_USERINFO_HEADER: auth_header_val},
            # X_APP_HEADER is missing, this test expects 400
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn(f"'{X_APP_HEADER}' header not found", response.json["error"])

    # Removed test_post_request_app_id_mismatch as it's invalid for the current main.py logic
    # Removed test_post_request_user_id_mismatch as it's invalid for the current main.py logic

    @patch(
        "functions.session-mapper.main.google.oauth2.id_token.fetch_id_token"
    )  # Patching absolute path
    @patch("functions.session-mapper.main.requests.post")  # Patching absolute path
    def test_post_request_successful(self, mock_requests_post, mock_fetch_id_token):
        """Test a successful POST request."""
        test_app_id = "test-app"
        test_user_id = "test-user"
        fake_id_token = "fake-id-token"
        agent_response_content = {"session_id": "session123"}
        agent_status_code = 200

        auth_header_val = self._get_auth_header(user_id=test_user_id)

        mock_fetch_id_token.return_value = fake_id_token

        mock_agent_response = MagicMock()
        mock_agent_response.content = json.dumps(agent_response_content).encode()
        mock_agent_response.status_code = agent_status_code
        mock_agent_response.headers = {"Content-Type": "application/json"}
        mock_requests_post.return_value = mock_agent_response

        response = self.client.post(
            "/",  # Corrected path to root
            headers={
                X_APIGATEWAY_USERINFO_HEADER: auth_header_val,
                X_APP_HEADER: test_app_id,
                AUTHORIZATION_HEADER: "Bearer some-gateway-token",  # Test this is logged
            },
        )

        self.assertEqual(response.status_code, agent_status_code)
        self.assertEqual(response.json, agent_response_content)
        self.assertEqual(response.headers["Content-Type"], "application/json")
        self.assertEqual(
            response.headers["Access-Control-Allow-Origin"], ALLOWED_ORIGINS
        )

        expected_agent_url = (
            f"http://fake-agent.com/apps/{test_app_id}/users/{test_user_id}/sessions"
        )
        mock_fetch_id_token.assert_called_once()
        # google.auth.transport.requests.Request is called inside fetch_id_token, direct assertion is complex.
        # We trust that if fetch_id_token is called with target_audience=expected_agent_url, it's correct.
        self.assertEqual(mock_fetch_id_token.call_args[0][1], expected_agent_url)

        mock_requests_post.assert_called_once_with(
            expected_agent_url,
            data=b"",  # Added to match actual call
            timeout=10,
            headers={
                AUTHORIZATION_HEADER: f"Bearer {fake_id_token}",
                X_APP_HEADER: test_app_id,
            },
        )
        self.mock_logging_info.assert_any_call(
            "Successfully fetched ID token for agent."
        )
        self.mock_logging_info.assert_any_call(
            "Agent responded with status: %s", agent_status_code
        )
        self.mock_logging_info.assert_any_call(
            "Authorization header received from API Gateway (not used for downstream impersonated call): %s...",
            "Bearer some-gateway-",  # Corrected to 20 chars
        )

    @patch(  # Patching absolute path
        "functions.session-mapper.main.google.oauth2.id_token.fetch_id_token",
        side_effect=google.auth.exceptions.DefaultCredentialsError("Credentials error"),
    )
    def test_post_request_google_auth_error(self, mock_fetch_id_token):
        """Test POST request with Google DefaultCredentialsError."""
        test_app_id = "test-app"
        test_user_id = "test-user"
        auth_header_val = self._get_auth_header(user_id=test_user_id)

        response = self.client.post(
            "/",  # Changed path to root
            headers={
                X_APIGATEWAY_USERINFO_HEADER: auth_header_val,
                X_APP_HEADER: test_app_id,
            },
        )
        self.assertEqual(response.status_code, 500)
        self.assertIn("Service account configuration issue", response.json["error"])
        self.assertTrue(self.mock_logging_error.called)
        args, kwargs = self.mock_logging_error.call_args
        self.assertEqual(
            args[0],
            "Could not find default credentials for the Cloud Function itself: %s",
        )
        self.assertIsInstance(args[1], google.auth.exceptions.DefaultCredentialsError)
        self.assertEqual(str(args[1]), "Credentials error")

    @patch(
        "functions.session-mapper.main.google.oauth2.id_token.fetch_id_token",
        return_value="fake-id-token",
    )  # Patching absolute path
    @patch("functions.session-mapper.main.requests.post")  # Patching absolute path
    def test_post_request_agent_request_exception(
        self, mock_requests_post, mock_fetch_id_token
    ):
        """Test POST request when agent call fails with RequestException."""
        test_app_id = "test-app"
        test_user_id = "test-user"
        auth_header_val = self._get_auth_header(user_id=test_user_id)

        # Configure the mock for RequestException
        mock_exception = requests.exceptions.RequestException(
            "Agent communication error"
        )
        # To simulate a response object on the exception, if main.py uses it:
        mock_response = MagicMock()
        mock_response.text = "Agent unavailable"
        mock_response.status_code = 503
        mock_exception.response = mock_response
        mock_requests_post.side_effect = mock_exception

        response = self.client.post(
            "/",  # Changed path to root
            headers={
                X_APIGATEWAY_USERINFO_HEADER: auth_header_val,
                X_APP_HEADER: test_app_id,
            },
        )
        self.assertEqual(response.status_code, 503)
        self.assertIn(
            "Failed to communicate with agent service", response.json["error"]
        )
        self.assertEqual(response.json["agent_status"], 503)
        self.assertEqual(response.json["agent_response"], "Agent unavailable")

        expected_agent_url = (
            f"http://fake-agent.com/apps/{test_app_id}/users/{test_user_id}/sessions"
        )
        self.mock_logging_error.assert_any_call(
            "Error calling agent at %s: %s", expected_agent_url, mock_exception
        )

    @patch(
        "functions.session-mapper.main.google.oauth2.id_token.fetch_id_token",
        return_value="fake-id-token",
    )  # Patching absolute path
    @patch(
        "functions.session-mapper.main.requests.post",
        side_effect=Exception("Unexpected generic error"),
    )  # Patching absolute path
    def test_post_request_agent_unexpected_error(
        self, mock_requests_post, mock_fetch_id_token
    ):
        """Test POST request with an unexpected error during agent call."""
        test_app_id = "test-app"
        test_user_id = "test-user"
        auth_header_val = self._get_auth_header(user_id=test_user_id)

        response = self.client.post(
            "/",  # Changed path to root
            headers={
                X_APIGATEWAY_USERINFO_HEADER: auth_header_val,
                X_APP_HEADER: test_app_id,
            },
        )
        self.assertEqual(response.status_code, 500)
        self.assertIn("An unexpected internal error occurred", response.json["error"])
        self.assertTrue(self.mock_logging_error.called)
        args, kwargs = self.mock_logging_error.call_args
        self.assertEqual(args[0], "An unexpected error occurred: %s")
        self.assertIsInstance(args[1], Exception)  # Check it's an Exception
        self.assertEqual(str(args[1]), "Unexpected generic error")  # Check its message
        self.assertTrue(kwargs.get("exc_info"))  # Check exc_info=True


if __name__ == "__main__":
    unittest.main(argv=["first-arg-is-ignored"], exit=False)
