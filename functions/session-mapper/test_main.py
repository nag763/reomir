import base64
import json
import os
import unittest
from unittest.mock import MagicMock, Mock, patch

# Assuming your cloud function code is in a file named 'main.py'
# If it's in a different file, adjust the import accordingly.
# For this example, I'll assume the functions are directly available
# as if they were in the same file or imported.
# from main import handler, _get_auth_user_info, CORS_HEADERS, X_APIGATEWAY_USERINFO_HEADER, USER_ID_CLAIM, X_APP_HEADER, AUTHORIZATION_HEADER

# --- Bring in the functions and constants from the user's code ---
# This section would typically be: from your_module import handler, _get_auth_user_info, ...
# For self-contained testing, we'll define them here or ensure they are accessible.

# --- Configuration from Environment Variables (Defaults for testing) ---
ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "*")
CLOUDRUN_AGENT_URL_ENV = "CLOUDRUN_AGENT_URL"  # For patching os.getenv

# --- Header Names and Claims ---
X_APIGATEWAY_USERINFO_HEADER = "X-Apigateway-Api-Userinfo"
X_APP_HEADER = "X-App"
AUTHORIZATION_HEADER = "Authorization"
USER_ID_CLAIM = "sub"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-App, X-End-User-ID",
    "Access-Control-Max-Age": "3600",
}

# Mock logging to prevent actual logging during tests and allow assertions on log calls
mock_logging = MagicMock()


def _get_auth_user_info(req: Mock):  # Changed 'request' to 'Mock' for type hint
    """
    Extracts, decodes, and validates user authentication info from X-Apigateway-Api-Userinfo.
    (Copied from user's code for testability)
    """
    auth_info_header = req.headers.get(X_APIGATEWAY_USERINFO_HEADER)
    if not auth_info_header:
        return None, (
            {
                "error": "Authentication information not found (X-Apigateway-Api-Userinfo missing)."
            },
            401,
            CORS_HEADERS,
        )
    try:
        # Ensure padding is correct for base64 decoding
        auth_info_header_padded = auth_info_header + "=" * (-len(auth_info_header) % 4)
        auth_info_decoded = base64.b64decode(auth_info_header_padded).decode("utf-8")
        auth_info_json = json.loads(auth_info_decoded)
        if not auth_info_json.get(USER_ID_CLAIM):
            msg = f"User ID claim ('{USER_ID_CLAIM}') not found in authentication information."
            return None, ({"error": msg}, 400, CORS_HEADERS)
        return auth_info_json, None
    except (TypeError, ValueError, AttributeError, json.JSONDecodeError) as e:
        mock_logging.error(
            "Error decoding authentication information: %s", e
        )  # Use mocked logging
        return None, (
            {"error": "Invalid authentication information format."},
            400,
            CORS_HEADERS,
        )


# Mock functions_framework if not available in test environment
try:
    import functions_framework
except ImportError:
    # Create a dummy decorator if functions_framework is not installed
    def http_decorator(func):
        return func

    functions_framework = MagicMock()
    functions_framework.http = http_decorator


@functions_framework.http
@patch("logging.info", mock_logging.info)  # Patch logging within the handler
@patch("logging.warning", mock_logging.warning)
@patch("logging.error", mock_logging.error)
def handler(req: Mock):  # Changed 'request' to 'Mock' for type hint
    """Handles HTTP requests, impersonates a SA to call a downstream service.
    (Copied and modified from user's code for testability)
    """
    # --- Mock external dependencies directly inside or via @patch ---
    # For 'requests' and 'google.auth', we'll use @patch on the test methods.
    # The 'google' and 'requests' modules themselves will be mocked where handler accesses them.

    mock_logging.info("Request method: %s", req.method)
    incoming_headers = {key: value for key, value in req.headers.items()}
    mock_logging.info(
        "Incoming request headers: %s", json.dumps(incoming_headers, indent=2)
    )

    if req.method == "OPTIONS":
        return "", 204, CORS_HEADERS

    CLOUDRUN_AGENT_URL = os.getenv(CLOUDRUN_AGENT_URL_ENV)

    if not CLOUDRUN_AGENT_URL:
        mock_logging.error("CLOUDRUN_AGENT_URL environment variable is not set.")
        return {"error": "Agent URL configuration error."}, 500, CORS_HEADERS

    auth_header_from_gateway = req.headers.get(AUTHORIZATION_HEADER)
    if auth_header_from_gateway:
        mock_logging.info(
            "Authorization header received from API Gateway (not used for downstream impersonated call): %s...",
            (
                auth_header_from_gateway[:20]
                if len(auth_header_from_gateway) > 20
                else auth_header_from_gateway
            ),
        )
    else:
        mock_logging.warning(
            "No Authorization header received by this function from API Gateway."
        )

    if req.method == "GET":
        auth_info, error_response = _get_auth_user_info(req)
        if error_response:
            return error_response

        user_id_from_claims = auth_info[USER_ID_CLAIM]
        x_app_value = req.headers.get(X_APP_HEADER)

        if not x_app_value:
            mock_logging.error("'%s' header not found.", X_APP_HEADER)
            return (
                {"error": f"'{X_APP_HEADER}' header not found."},
                400,
                CORS_HEADERS,
            )

        target_url_for_agent = f"{CLOUDRUN_AGENT_URL}/apps/{x_app_value}/users/{user_id_from_claims}/sessions"
        mock_logging.info("Attempting to POST to agent at: %s", target_url_for_agent)

        try:
            # 'google' and 'requests' will be mocked by @patch in the test methods
            auth_req = google.auth.transport.requests.Request()
            id_token = google.oauth2.id_token.fetch_id_token(
                auth_req, target_url_for_agent
            )

            mock_logging.warning("Bearer %s", id_token)

            downstream_headers = {
                AUTHORIZATION_HEADER: f"Bearer {id_token}",
                X_APP_HEADER: x_app_value,
            }
            response = requests.post(
                target_url_for_agent, timeout=10, headers=downstream_headers
            )
            response.raise_for_status()

            mock_logging.info("Agent responded with status: %s", response.status_code)
            final_headers = CORS_HEADERS.copy()
            if "Content-Type" in response.headers:
                final_headers["Content-Type"] = response.headers["Content-Type"]
            return response.content, response.status_code, final_headers

        except google.auth.exceptions.DefaultCredentialsError as e:
            mock_logging.error(
                "Could not find default credentials for the Cloud Function itself: %s",
                e,
            )
            return (
                {"error": "Service account configuration issue for the function."},
                500,
                CORS_HEADERS,
            )
        except requests.exceptions.RequestException as e:
            agent_response_text = (
                e.response.text if e.response is not None else "No response text"
            )
            agent_status_code = (
                e.response.status_code if e.response is not None else 502
            )
            mock_logging.error("Error calling agent at %s: %s", target_url_for_agent, e)
            mock_logging.error(
                "Agent response status: %s, text: %s",
                agent_status_code,
                agent_response_text,
            )
            return (
                {
                    "error": "Failed to communicate with agent service.",
                    "agent_status": agent_status_code,
                    "agent_response": agent_response_text,
                },
                agent_status_code,
                CORS_HEADERS,
            )
        except Exception as e:
            mock_logging.error("An unexpected error occurred: %s", e, exc_info=True)
            return (
                {
                    "error": "An unexpected internal error occurred.",
                    "details": str(e),
                },
                500,
                CORS_HEADERS,
            )
    else:
        mock_logging.warning("Method not allowed: %s", req.method)
        return {"error": "Method not allowed."}, 405, CORS_HEADERS


# --- Mock objects for defining custom exception types ---
# These are used as blueprints for exceptions raised/caught by the mocked libraries.

# Mock for google.auth.exceptions to hold custom DefaultCredentialsError type
mock_google_auth_exceptions = MagicMock()
mock_google_auth_exceptions.DefaultCredentialsError = type(
    "DefaultCredentialsError", (Exception,), {}
)

# Mock for requests.exceptions to hold custom RequestException type
mock_requests_exceptions = MagicMock()  # Renamed for clarity
mock_requests_exceptions.RequestException = type(
    "RequestException", (Exception,), {"response": None}
)


class TestCloudFunction(unittest.TestCase):

    def setUp(self):
        """Reset mocks before each test."""
        mock_logging.reset_mock()
        # Reset relevant parts of global mocks if they maintain state, though for types it's usually fine.
        # For instance, if mock_google_auth_exceptions itself was modified beyond type definition.
        # Here, they primarily define types, so less of an issue for reset.

    def _create_mock_request(self, headers=None, method="GET", body=None, args=None):
        """Helper to create a mock Flask request object."""
        mock_req = MagicMock()
        mock_req.headers = headers or {}
        mock_req.method = method
        mock_req.get_data.return_value = body.encode() if body else b""
        mock_req.args = args or {}
        return mock_req

    def test_get_auth_user_info_success(self):
        """Test _get_auth_user_info successfully decodes and extracts user ID."""
        user_id = "test_user_123"
        email = "test@example.com"
        auth_info = {USER_ID_CLAIM: user_id, "email": email}
        encoded_auth_info = base64.b64encode(json.dumps(auth_info).encode()).decode()
        encoded_auth_info = encoded_auth_info.rstrip("=")

        mock_req = self._create_mock_request(
            headers={X_APIGATEWAY_USERINFO_HEADER: encoded_auth_info}
        )
        result_info, error = _get_auth_user_info(mock_req)

        self.assertIsNone(error)
        self.assertIsNotNone(result_info)
        self.assertEqual(result_info[USER_ID_CLAIM], user_id)
        self.assertEqual(result_info["email"], email)

    def test_get_auth_user_info_missing_header(self):
        mock_req = self._create_mock_request(headers={})
        result_info, error = _get_auth_user_info(mock_req)
        self.assertIsNone(result_info)
        self.assertIsNotNone(error)
        self.assertEqual(error[1], 401)

    def test_get_auth_user_info_invalid_base64(self):
        mock_req = self._create_mock_request(
            headers={X_APIGATEWAY_USERINFO_HEADER: "this is not base64"}
        )
        result_info, error = _get_auth_user_info(mock_req)
        self.assertIsNone(result_info)
        self.assertIsNotNone(error)
        self.assertEqual(error[1], 400)
        mock_logging.error.assert_called_once()

    def test_get_auth_user_info_json_decode_error(self):
        encoded_auth_info = base64.b64encode(b"this is not json").decode().rstrip("=")
        mock_req = self._create_mock_request(
            headers={X_APIGATEWAY_USERINFO_HEADER: encoded_auth_info}
        )
        result_info, error = _get_auth_user_info(mock_req)
        self.assertIsNone(result_info)
        self.assertIsNotNone(error)
        self.assertEqual(error[1], 400)
        mock_logging.error.assert_called_once()

    def test_get_auth_user_info_missing_user_id_claim(self):
        auth_info = {"email": "test@example.com"}
        encoded_auth_info = (
            base64.b64encode(json.dumps(auth_info).encode()).decode().rstrip("=")
        )
        mock_req = self._create_mock_request(
            headers={X_APIGATEWAY_USERINFO_HEADER: encoded_auth_info}
        )
        result_info, error = _get_auth_user_info(mock_req)
        self.assertIsNone(result_info)
        self.assertIsNotNone(error)
        self.assertEqual(error[1], 400)

    def test_handler_options_request(self):
        mock_req = self._create_mock_request(method="OPTIONS")
        response, status_code, headers = handler(mock_req)
        self.assertEqual(response, "")
        self.assertEqual(status_code, 204)
        self.assertEqual(headers, CORS_HEADERS)

    @patch.dict(os.environ, {CLOUDRUN_AGENT_URL_ENV: ""})
    def test_handler_missing_cloudrun_agent_url_env(self):
        mock_req = self._create_mock_request(method="GET")
        response, status_code, headers = handler(mock_req)
        self.assertEqual(status_code, 500)
        self.assertIn("Agent URL configuration error", response["error"])

    # Note: The order of arguments for test methods with multiple @patch decorators
    # is from the innermost decorator to the outermost.
    # e.g. @patch('A') @patch('B') def test(mock_B, mock_A):

    @patch.dict(os.environ, {CLOUDRUN_AGENT_URL_ENV: "http://fake-agent.com"})
    @patch(f"{__name__}._get_auth_user_info")
    def test_handler_get_request_missing_x_app_header(self, mock_get_auth_info):
        user_id = "user123"
        mock_get_auth_info.return_value = ({USER_ID_CLAIM: user_id}, None)
        mock_req_obj = self._create_mock_request(
            headers={X_APIGATEWAY_USERINFO_HEADER: "fake_encoded_info"}, method="GET"
        )
        response_body, status_code, headers = handler(mock_req_obj)
        self.assertEqual(status_code, 400)
        self.assertIn(f"'{X_APP_HEADER}' header not found", response_body["error"])

    @patch.dict(os.environ, {CLOUDRUN_AGENT_URL_ENV: "http://fake-agent.com"})
    @patch(f"{__name__}._get_auth_user_info")
    def test_handler_get_request_auth_info_error(self, mock_get_auth_info):
        error_payload = {"error": "Auth failed"}, 401, CORS_HEADERS
        mock_get_auth_info.return_value = (None, error_payload)
        mock_req_obj = self._create_mock_request(method="GET")
        response_body, status_code, headers = handler(mock_req_obj)
        self.assertEqual(status_code, error_payload[1])
        self.assertEqual(response_body, error_payload[0])

    @patch.dict(os.environ, {CLOUDRUN_AGENT_URL_ENV: "http://fake-agent.com"})
    def test_handler_unsupported_method(self):
        mock_req_obj = self._create_mock_request(method="PUT")
        response_body, status_code, headers = handler(mock_req_obj)
        self.assertEqual(status_code, 405)
        self.assertIn("Method not allowed", response_body["error"])

    def test_handler_get_request_no_gateway_auth_header_logs_warning(self):
        with patch.dict(os.environ, {CLOUDRUN_AGENT_URL_ENV: "http://fake-agent.com"}):
            with patch(f"{__name__}._get_auth_user_info") as mock_get_auth_info:
                mock_get_auth_info.return_value = (
                    None,
                    ({"error": "test"}, 400, CORS_HEADERS),
                )
                mock_req_obj = self._create_mock_request(
                    headers={X_APP_HEADER: "some-app"}, method="GET"
                )
                handler(mock_req_obj)
                mock_logging.warning.assert_any_call(
                    "No Authorization header received by this function from API Gateway."
                )

    def test_handler_get_request_gateway_auth_header_present_logs_info(self):
        with patch.dict(os.environ, {CLOUDRUN_AGENT_URL_ENV: "http://fake-agent.com"}):
            with patch(f"{__name__}._get_auth_user_info") as mock_get_auth_info:
                mock_get_auth_info.return_value = (
                    None,
                    ({"error": "test"}, 400, CORS_HEADERS),
                )
                auth_token_short = "Bearer shorttoken"
                mock_req_short_token = self._create_mock_request(
                    headers={
                        AUTHORIZATION_HEADER: auth_token_short,
                        X_APP_HEADER: "some-app",
                    },
                    method="GET",
                )
                handler(mock_req_short_token)
                mock_logging.info.assert_any_call(
                    "Authorization header received from API Gateway (not used for downstream impersonated call): %s...",
                    auth_token_short,
                )


if __name__ == "__main__":
    # Ensure the 'google' and 'requests' modules are created in the global scope of this test file
    # BEFORE the handler function (which uses them) is defined or called.
    # This is implicitly handled by @patch if handler was imported.
    # Since handler is defined in this file, the @patch decorators on test methods
    # will correctly mock 'test_main.google' and 'test_main.requests'.
    if "google" not in globals():
        google = (
            MagicMock()
        )  # Ensures 'google' name exists if handler is called outside patched test
    if "requests" not in globals():
        requests = MagicMock()  # Ensures 'requests' name exists

    unittest.main(argv=["first-arg-is-ignored"], exit=False)
