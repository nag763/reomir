import base64
import json
import os  # Ensure os is imported for patch.dict
from unittest import mock
from unittest.mock import MagicMock, patch  # Added patch and MagicMock

import pytest

# Patch google.cloud.firestore.Client BEFORE main is imported.
firestore_client_patcher = mock.patch("google.cloud.firestore.Client")
MockFirestoreClientGlobal = firestore_client_patcher.start()

# Patch google.cloud.kms.KeyManagementServiceClient BEFORE main is imported.
kms_client_patcher = mock.patch("google.cloud.kms.KeyManagementServiceClient")
MockKmsClientGlobal = kms_client_patcher.start()

import main as main_module  # Import the module itself
# main.py's "db = firestore.Client()" and "KMS_CLIENT = kms.KeyManagementServiceClient()"
# should use the globally patched mocks.
from main import app # Import the Flask app object

# Define a client for the Flask app for use in tests
client = app.test_client()

@pytest.fixture(autouse=True)
def auto_reset_mocks(request):
    # Reset Firestore mock
    mock_db_instance = main_module.db
    if not isinstance(mock_db_instance, mock.Mock):
        pytest.fail(
            f"Patching error: main_module.db is type {type(mock_db_instance)}, not unittest.mock.Mock."
        )
    mock_db_instance.reset_mock()
    # Setup default behaviors for firestore mock if needed by most tests
    mock_doc_snapshot = mock.Mock()
    mock_doc_ref = mock.Mock()
    mock_doc_ref.get.return_value = mock_doc_snapshot
    mock_collection_ref = mock.Mock()
    mock_collection_ref.document.return_value = mock_doc_ref
    mock_db_instance.collection.return_value = mock_collection_ref

    # Reset KMS mock
    mock_kms_instance = main_module.KMS_CLIENT
    if not isinstance(mock_kms_instance, mock.Mock):
        pytest.fail(
            f"Patching error: main_module.KMS_CLIENT is type {type(mock_kms_instance)}, not unittest.mock.Mock."
        )
    mock_kms_instance.reset_mock()
    # Setup default behaviors for KMS mock if needed
    mock_decrypt_response = mock.Mock()
    mock_decrypt_response.plaintext = b"decrypted_default_token"
    mock_kms_instance.decrypt.return_value = mock_decrypt_response

    # Patch logging in main_module
    patcher_logging_info = patch("main_module.logging.info")
    patcher_logging_warning = patch("main_module.logging.warning")
    patcher_logging_error = patch("main_module.logging.error")

    mock_logging_info = patcher_logging_info.start()
    mock_logging_warning = patcher_logging_warning.start()
    mock_logging_error = patcher_logging_error.start()

    yield {
        "db": mock_db_instance,
        "kms": mock_kms_instance,
        "log_info": mock_logging_info,
        "log_warning": mock_logging_warning,
        "log_error": mock_logging_error,
    }

    patcher_logging_info.stop()
    patcher_logging_warning.stop()
    patcher_logging_error.stop()


def teardown_module(module):
    firestore_client_patcher.stop()
    kms_client_patcher.stop()


def _get_auth_headers(user_id="test-user-123", email="test@example.com", name="Test User"):
    user_info = {"sub": user_id, "email": email, "name": name}
    user_info_json = json.dumps(user_info)
    user_info_b64 = base64.b64encode(user_info_json.encode("utf-8")).decode("utf-8")
    return {"X-Apigateway-Api-Userinfo": user_info_b64}


# Test for basic GET request
def test_get_user_exists(auto_reset_mocks):
    mock_db = auto_reset_mocks["db"]
    mock_doc_snapshot = mock_db.collection.return_value.document.return_value.get.return_value
    mock_doc_snapshot.exists = True
    mock_doc_snapshot.to_dict.return_value = {"uid": "test-user-123", "email": "test@example.com"}

    headers = _get_auth_headers(user_id="test-user-123")
    response = client.get("/", headers=headers)

    assert response.status_code == 200
    assert response.json == {"uid": "test-user-123", "email": "test@example.com"}
    assert response.headers["Access-Control-Allow-Origin"] == "*" # or specific if configured
    mock_db.collection.assert_called_once_with("users")
    mock_db.collection.return_value.document.assert_called_once_with("test-user-123")


# --- Tests for KMS Decryption ---
@patch.dict(os.environ, {
    "KMS_KEY_NAME": "test-key", "KMS_KEY_RING": "test-key-ring",
    "KMS_LOCATION": "test-location", "GOOGLE_CLOUD_PROJECT": "test-gcp-project"})
def test_get_user_with_encrypted_token_success(auto_reset_mocks):
    mock_db = auto_reset_mocks["db"]
    mock_kms = auto_reset_mocks["kms"]

    mock_doc_snapshot = mock_db.collection.return_value.document.return_value.get.return_value
    mock_doc_snapshot.exists = True
    mock_doc_snapshot.to_dict.return_value = {
        "uid": "test-user-kms", "email": "kms@example.com",
        "github_access_token": "sample_encrypted_token_base64"}

    mock_decrypt_response = mock.Mock()
    mock_decrypt_response.plaintext = b"decrypted_access_token"
    mock_kms.decrypt.return_value = mock_decrypt_response

    headers = _get_auth_headers(user_id="test-user-kms")
    response = client.get("/", headers=headers)

    assert response.status_code == 200
    assert response.json["uid"] == "test-user-kms"
    assert response.json["github_access_token"] == "decrypted_access_token"
    assert "github_access_token_error" not in response.json

    mock_kms.crypto_key_path.assert_called_once_with("test-gcp-project", "test-location", "test-key-ring", "test-key")
    mock_kms.decrypt.assert_called_once() # Fuller assertion can check name and ciphertext
    # Example of checking specific args if needed:
    # call_args = mock_kms.decrypt.call_args
    # self.assertEqual(call_args[1]['name'], expected_key_path)
    # self.assertEqual(call_args[1]['ciphertext'], base64.b64decode("sample_encrypted_token_base64"))


@patch.dict(os.environ, {
    "KMS_KEY_NAME": "test-key", "KMS_KEY_RING": "test-key-ring",
    "KMS_LOCATION": "test-location", "GOOGLE_CLOUD_PROJECT": "test-gcp-project"})
def test_get_user_with_encrypted_token_failure(auto_reset_mocks):
    mock_db = auto_reset_mocks["db"]
    mock_kms = auto_reset_mocks["kms"]

    mock_doc_snapshot = mock_db.collection.return_value.document.return_value.get.return_value
    mock_doc_snapshot.exists = True
    mock_doc_snapshot.to_dict.return_value = {
        "uid": "test-user-kms-fail", "email": "kmsfail@example.com",
        "github_access_token": "another_encrypted_token_base64"}

    mock_kms.decrypt.side_effect = Exception("KMS Decryption Failed")

    headers = _get_auth_headers(user_id="test-user-kms-fail")
    response = client.get("/", headers=headers)

    assert response.status_code == 200
    assert response.json["uid"] == "test-user-kms-fail"
    assert response.json["github_access_token"] is None
    assert response.json["github_access_token_error"] == "decryption_failed"
    mock_kms.decrypt.assert_called_once()


def test_get_user_no_github_token(auto_reset_mocks):
    mock_db = auto_reset_mocks["db"]
    mock_kms = auto_reset_mocks["kms"]
    mock_doc_snapshot = mock_db.collection.return_value.document.return_value.get.return_value
    mock_doc_snapshot.exists = True
    mock_doc_snapshot.to_dict.return_value = {"uid": "test-user-no-token", "email": "notoken@example.com"}

    headers = _get_auth_headers(user_id="test-user-no-token")
    response = client.get("/", headers=headers)

    assert response.status_code == 200
    assert response.json["uid"] == "test-user-no-token"
    assert "github_access_token" not in response.json
    assert "github_access_token_error" not in response.json
    mock_kms.decrypt.assert_not_called()


def test_get_user_github_token_not_string(auto_reset_mocks):
    mock_db = auto_reset_mocks["db"]
    mock_kms = auto_reset_mocks["kms"]
    mock_doc_snapshot = mock_db.collection.return_value.document.return_value.get.return_value
    mock_doc_snapshot.exists = True
    mock_doc_snapshot.to_dict.return_value = {
        "uid": "test-user-invalid-token-type", "email": "invalidtype@example.com",
        "github_access_token": False} # Not a string

    headers = _get_auth_headers(user_id="test-user-invalid-token-type")
    response = client.get("/", headers=headers)

    assert response.status_code == 200
    assert response.json["uid"] == "test-user-invalid-token-type"
    assert response.json["github_access_token"] is False
    assert "github_access_token_error" not in response.json
    mock_kms.decrypt.assert_not_called()


# --- POST Tests ---
def test_post_user_valid_data(auto_reset_mocks):
    mock_db = auto_reset_mocks["db"]
    user_id = "test-user-post"
    headers = _get_auth_headers(user_id=user_id, email="post@example.com", name="Post User")
    request_data = {"cookieConsent": "true", "emailMarketing": False, "someOtherData": "value"}

    response = client.post("/", json=request_data, headers=headers)

    assert response.status_code == 200
    expected_stored_data = {
        "uid": user_id, "email": "post@example.com", "displayName": "Post User",
        "cookieConsent": "true", "emailMarketing": False, "someOtherData": "value"}
    assert response.json == expected_stored_data
    mock_db.collection.return_value.document.return_value.set.assert_called_once_with(
        expected_stored_data, merge=True
    )


def test_post_user_invalid_cookie_consent(auto_reset_mocks):
    mock_db = auto_reset_mocks["db"]
    headers = _get_auth_headers()

    # Missing cookieConsent
    response_missing = client.post("/", json={"otherField": True}, headers=headers)
    assert response_missing.status_code == 400
    assert response_missing.json["error"] == "'cookieConsent' field must be present and set to 'true'."

    # Wrong type for cookieConsent
    response_wrong_type = client.post("/", json={"cookieConsent": True}, headers=headers) # boolean true, not "true"
    assert response_wrong_type.status_code == 400
    assert response_wrong_type.json["error"] == "'cookieConsent' field must be present and set to 'true'."

    mock_db.collection.return_value.document.return_value.set.assert_not_called()


def test_post_user_no_json_body(auto_reset_mocks):
    mock_db = auto_reset_mocks["db"]
    headers = _get_auth_headers()
    # Sending data that is not application/json, or empty data with wrong content type
    response = client.post("/", data="not json", headers=headers, content_type="text/plain")

    assert response.status_code == 400 # Flask's get_json() will fail
    assert "Invalid JSON payload" in response.json["error"] or "Failed to decode JSON object" in response.json["error"]
    mock_db.collection.return_value.document.return_value.set.assert_not_called()

# --- PUT Tests ---
def test_put_user_valid_data(auto_reset_mocks):
    mock_db = auto_reset_mocks["db"]
    user_id = "test-user-put"
    headers = _get_auth_headers(user_id=user_id)
    request_data = {"emailMarketing": True, "displayName": "Updated Name"}

    # Mock the get call that happens after update to return the updated data
    mock_updated_doc_snapshot = mock.Mock()
    mock_updated_doc_snapshot.exists = True
    mock_updated_doc_snapshot.to_dict.return_value = request_data # Simulate it returns the updated fields

    doc_ref = mock_db.collection.return_value.document.return_value
    doc_ref.update.return_value = None # update itself returns None
    doc_ref.get.return_value = mock_updated_doc_snapshot # get after update returns the new snapshot

    response = client.put("/", json=request_data, headers=headers)

    assert response.status_code == 200
    assert response.json == request_data
    doc_ref.update.assert_called_once_with(request_data)


def test_put_user_not_found(auto_reset_mocks):
    mock_db = auto_reset_mocks["db"]
    user_id = "test-user-put-nonexistent"
    headers = _get_auth_headers(user_id=user_id)
    request_data = {"emailMarketing": True}

    mock_db.collection.return_value.document.return_value.update.side_effect = main_module.firestore.exceptions.NotFound("Doc not found")

    response = client.put("/", json=request_data, headers=headers)

    assert response.status_code == 404
    assert response.json["error"] == f"User document {user_id} not found to update."


def test_put_user_empty_json_body(auto_reset_mocks):
    mock_db = auto_reset_mocks["db"]
    headers = _get_auth_headers()
    response = client.put("/", json={}, headers=headers) # Empty JSON object

    assert response.status_code == 400
    assert response.json["error"] == "Request body must be a non-empty JSON object for PUT."
    mock_db.collection.return_value.document.return_value.update.assert_not_called()


# --- DELETE Tests ---
def test_delete_user_exists(auto_reset_mocks):
    mock_db = auto_reset_mocks["db"]
    user_id = "test-user-delete"
    headers = _get_auth_headers(user_id=user_id)

    mock_db.collection.return_value.document.return_value.get.return_value.exists = True

    response = client.delete("/", headers=headers)

    assert response.status_code == 200
    assert response.json["message"] == f"User data for {user_id} deleted successfully."
    mock_db.collection.return_value.document.return_value.delete.assert_called_once()


def test_delete_user_not_exists(auto_reset_mocks):
    mock_db = auto_reset_mocks["db"]
    user_id = "test-user-delete-nonexistent"
    headers = _get_auth_headers(user_id=user_id)

    mock_db.collection.return_value.document.return_value.get.return_value.exists = False

    response = client.delete("/", headers=headers)

    assert response.status_code == 204
    assert response.data == b"" # make_response('', 204)
    mock_db.collection.return_value.document.return_value.delete.assert_not_called()


# --- Generic Error and Auth Tests ---
def test_get_user_not_exists(auto_reset_mocks): # Renamed from original test_get_user_not_exists to avoid conflict
    mock_db = auto_reset_mocks["db"]
    mock_doc_snapshot = mock_db.collection.return_value.document.return_value.get.return_value
    mock_doc_snapshot.exists = False

    headers = _get_auth_headers(user_id="test-user-unknown")
    response = client.get("/", headers=headers)

    assert response.status_code == 204
    assert response.data == b""
    mock_db.collection.return_value.document.assert_called_once_with("test-user-unknown")


def test_options_request(auto_reset_mocks):
    mock_db = auto_reset_mocks["db"]
    response = client.options("/")

    assert response.status_code == 204
    assert response.data == b""
    assert response.headers["Access-Control-Allow-Origin"] == "*" # or specific if configured
    assert "GET" in response.headers["Access-Control-Allow-Methods"]
    assert "POST" in response.headers["Access-Control-Allow-Methods"]
    assert "PUT" in response.headers["Access-Control-Allow-Methods"]
    assert "DELETE" in response.headers["Access-Control-Allow-Methods"]
    assert "Content-Type" in response.headers["Access-Control-Allow-Headers"]
    assert "Authorization" in response.headers["Access-Control-Allow-Headers"]
    mock_db.collection.assert_not_called() # No DB interaction for OPTIONS


def test_missing_auth_header(auto_reset_mocks):
    mock_db = auto_reset_mocks["db"]
    response = client.get("/", headers={}) # No auth header

    assert response.status_code == 401
    assert response.json["error"] == "Authentication information not found."
    mock_db.collection.assert_not_called()


def test_malformed_auth_header_not_base64(auto_reset_mocks):
    mock_db = auto_reset_mocks["db"]
    headers = {"X-Apigateway-Api-Userinfo": "this-is-not-base64"}
    response = client.get("/", headers=headers)

    assert response.status_code == 400
    assert response.json["error"] == "Invalid authentication information format."
    mock_db.collection.assert_not_called()


def test_malformed_auth_header_not_json(auto_reset_mocks):
    mock_db = auto_reset_mocks["db"]
    not_json_b64 = base64.b64encode("this is not json".encode("utf-8")).decode("utf-8")
    headers = {"X-Apigateway-Api-Userinfo": not_json_b64}
    response = client.get("/", headers=headers)

    assert response.status_code == 400
    assert response.json["error"] == "Invalid authentication information format."
    mock_db.collection.assert_not_called()


def test_auth_header_missing_user_id_claim(auto_reset_mocks):
    mock_db = auto_reset_mocks["db"]
    headers = _get_auth_headers(user_id=None) # Will create a header without 'sub' if user_id is None
    # Need to adjust _get_auth_headers or create a specific malformed header
    user_info_no_sub = {"email": "test@example.com", "name": "Test User"} # No 'sub'
    user_info_json_no_sub = json.dumps(user_info_no_sub)
    user_info_b64_no_sub = base64.b64encode(user_info_json_no_sub.encode("utf-8")).decode("utf-8")
    malformed_headers = {"X-Apigateway-Api-Userinfo": user_info_b64_no_sub}

    response = client.get("/", headers=malformed_headers)

    assert response.status_code == 400
    assert response.json["error"] == "User ID claim ('sub') not found in authentication information."
    mock_db.collection.assert_not_called()
