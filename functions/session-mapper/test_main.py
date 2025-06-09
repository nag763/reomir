import base64
import json
import os
import unittest
from unittest.mock import MagicMock, patch

# Import the Flask app and other necessary components from main.py
from main import ALLOWED_ORIGINS  # For checking CORS headers
from main import _get_auth_user_info  # Keep for direct testing if needed, but primary tests via routes
from main import AUTHORIZATION_HEADER
from main import CLOUDRUN_AGENT_URL as MAIN_CLOUDRUN_AGENT_URL  # To check if it's set
from main import USER_ID_CLAIM, X_APIGATEWAY_USERINFO_HEADER, X_APP_HEADER, app

# Environment variable for patching
CLOUDRUN_AGENT_URL_ENV = "CLOUDRUN_AGENT_URL"

# Mock for google.auth.exceptions to hold custom DefaultCredentialsError type
# This needs to be available for patching main.google.auth.exceptions
mock_google_auth_exceptions = MagicMock()
mock_google_auth_exceptions.DefaultCredentialsError = type(
    "DefaultCredentialsError", (Exception,), {}
)

# Mock for requests.exceptions to hold custom RequestException type
# This needs to be available for patching main.requests.exceptions
mock_requests_exceptions = MagicMock()
mock_requests_exceptions.RequestException = type(
    "RequestException", (Exception,), {"response": None}
)


class TestCloudFunction(unittest.TestCase):

    def setUp(self):
        """Set up the Flask test client and reset mocks."""
        app.testing = True
        self.client = app.test_client()
        # Patch logging directly in main.py where the app's logging occurs
        self.mock_logging_info = patch("main.logging.info").start()
        self.mock_logging_warning = patch("main.logging.warning").start()
        self.mock_logging_error = patch("main.logging.error").start()
        self.addCleanup(patch.stopall)  # Stops all patches started with start()

        # Ensure CLOUDRUN_AGENT_URL is set for most tests
        patch.dict(
            os.environ, {CLOUDRUN_AGENT_URL_ENV: "http://fake-agent.com"}
        ).start()

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
        mock_req = MagicMock()
        mock_req.headers = {X_APIGATEWAY_USERINFO_HEADER: auth_header_val}

        # Call within app context to ensure it behaves as it would in the app
        with app.test_request_context(
            headers={X_APIGATEWAY_USERINFO_HEADER: auth_header_val}
        ):
            # Note: _get_auth_user_info takes flask.request directly
            from flask import request as flask_request

            result_info, error = _get_auth_user_info(flask_request)

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
            f"/apps/{test_app_id}/users/{test_user_id}/sessions"
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

        # To make this test robust, we should ensure that main.CLOUDRUN_AGENT_URL is None.
        # This requires careful handling of when main.py is loaded relative to the patch.
        # A simple way is to patch 'main.CLOUDRUN_AGENT_URL' directly.
        with patch("main.CLOUDRUN_AGENT_URL", None):
            test_app_id = "test-app"
            test_user_id = "test-user"
            auth_header_val = self._get_auth_header(user_id=test_user_id)

            response = self.client.post(
                f"/apps/{test_app_id}/users/{test_user_id}/sessions",
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
            f"/apps/{test_app_id}/users/{test_user_id}/sessions",
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
            f"/apps/{test_app_id}/users/{test_user_id}/sessions",
            headers={X_APIGATEWAY_USERINFO_HEADER: auth_header_val},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn(f"'{X_APP_HEADER}' header not found", response.json["error"])

    def test_post_request_app_id_mismatch(self):
        """Test POST request with app_id in path not matching X-App header."""
        path_app_id = "path-app"
        header_app_id = "header-app"
        test_user_id = "test-user"
        auth_header_val = self._get_auth_header(user_id=test_user_id)
        response = self.client.post(
            f"/apps/{path_app_id}/users/{test_user_id}/sessions",
            headers={
                X_APIGATEWAY_USERINFO_HEADER: auth_header_val,
                X_APP_HEADER: header_app_id,
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn(
            "App ID in path does not match X-App header", response.json["error"]
        )

    def test_post_request_user_id_mismatch(self):
        """Test POST request with user_id in path not matching token."""
        path_user_id = "path-user"
        token_user_id = "token-user"
        test_app_id = "test-app"
        auth_header_val = self._get_auth_header(user_id=token_user_id)
        response = self.client.post(
            f"/apps/{test_app_id}/users/{path_user_id}/sessions",
            headers={
                X_APIGATEWAY_USERINFO_HEADER: auth_header_val,
                X_APP_HEADER: test_app_id,
            },
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn(
            "User ID in path does not match user ID in token", response.json["error"]
        )

    @patch("main.google.oauth2.id_token.fetch_id_token")
    @patch("main.requests.post")
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
            f"/apps/{test_app_id}/users/{test_user_id}/sessions",
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
            "Bearer some-gatewa",  # First 20 chars
        )

    @patch(
        "main.google.oauth2.id_token.fetch_id_token",
        side_effect=mock_google_auth_exceptions.DefaultCredentialsError(
            "Credentials error"
        ),
    )
    def test_post_request_google_auth_error(self, mock_fetch_id_token):
        """Test POST request with Google DefaultCredentialsError."""
        test_app_id = "test-app"
        test_user_id = "test-user"
        auth_header_val = self._get_auth_header(user_id=test_user_id)

        response = self.client.post(
            f"/apps/{test_app_id}/users/{test_user_id}/sessions",
            headers={
                X_APIGATEWAY_USERINFO_HEADER: auth_header_val,
                X_APP_HEADER: test_app_id,
            },
        )
        self.assertEqual(response.status_code, 500)
        self.assertIn("Service account configuration issue", response.json["error"])
        self.mock_logging_error.assert_called_with(
            "Could not find default credentials for the Cloud Function itself: %s",
            "Credentials error",
        )

    @patch("main.google.oauth2.id_token.fetch_id_token", return_value="fake-id-token")
    @patch("main.requests.post")
    def test_post_request_agent_request_exception(
        self, mock_requests_post, mock_fetch_id_token
    ):
        """Test POST request when agent call fails with RequestException."""
        test_app_id = "test-app"
        test_user_id = "test-user"
        auth_header_val = self._get_auth_header(user_id=test_user_id)

        # Configure the mock for RequestException
        mock_exception = mock_requests_exceptions.RequestException(
            "Agent communication error"
        )
        mock_exception.response = MagicMock()
        mock_exception.response.text = "Agent unavailable"
        mock_exception.response.status_code = 503
        mock_requests_post.side_effect = mock_exception

        response = self.client.post(
            f"/apps/{test_app_id}/users/{test_user_id}/sessions",
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

    @patch("main.google.oauth2.id_token.fetch_id_token", return_value="fake-id-token")
    @patch("main.requests.post", side_effect=Exception("Unexpected generic error"))
    def test_post_request_agent_unexpected_error(
        self, mock_requests_post, mock_fetch_id_token
    ):
        """Test POST request with an unexpected error during agent call."""
        test_app_id = "test-app"
        test_user_id = "test-user"
        auth_header_val = self._get_auth_header(user_id=test_user_id)

        response = self.client.post(
            f"/apps/{test_app_id}/users/{test_user_id}/sessions",
            headers={
                X_APIGATEWAY_USERINFO_HEADER: auth_header_val,
                X_APP_HEADER: test_app_id,
            },
        )
        self.assertEqual(response.status_code, 500)
        self.assertIn("An unexpected internal error occurred", response.json["error"])
        self.mock_logging_error.assert_called_with(
            "An unexpected error occurred: %s",
            Exception("Unexpected generic error"),
            exc_info=True,
        )


if __name__ == "__main__":
    unittest.main(argv=["first-arg-is-ignored"], exit=False)
