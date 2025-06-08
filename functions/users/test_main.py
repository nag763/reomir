import base64
import json
import os # Ensure os is imported for patch.dict
from unittest import mock
from unittest.mock import patch, MagicMock # Added patch and MagicMock

import pytest

# Patch google.cloud.firestore.Client BEFORE main is imported.
# This mock will be active when main.py is imported.
firestore_client_patcher = mock.patch("google.cloud.firestore.Client")
MockFirestoreClientGlobal = firestore_client_patcher.start()

import main as main_module  # Import the module itself to access main_module.db
# Now import main. main.py's "db = firestore.Client()" should use MockFirestoreClientGlobal
from main import handler


@pytest.fixture(autouse=True)
def mock_firestore_client_instance_control(request):
    # main_module.db should now be an instance of MockFirestoreClientGlobal.
    mock_db_instance = main_module.db

    if not isinstance(mock_db_instance, mock.Mock):
        pytest.fail(
            f"Patching error: main_module.db is type {type(mock_db_instance)}, not unittest.mock.Mock. "
            "The global patch on google.cloud.firestore.Client did not apply as expected."
        )

    mock_db_instance.reset_mock()

    mock_doc_snapshot = mock.Mock()
    mock_doc_ref = mock.Mock()
    mock_doc_ref.get.return_value = mock_doc_snapshot

    mock_collection_ref = mock.Mock()
    mock_collection_ref.document.return_value = mock_doc_ref

    mock_db_instance.collection.return_value = mock_collection_ref

    yield mock_db_instance


def teardown_module(module):
    firestore_client_patcher.stop()


@pytest.fixture
def mock_request():
    def _create_request(method, data=None, headers=None):
        req = mock.Mock()
        req.method = method
        req.headers = headers if headers else {}

        def get_json_side_effect(silent=False):
            if data is None:
                if not silent:
                    from werkzeug.exceptions import BadRequest

                    raise BadRequest(
                        "Failed to decode JSON object: Expecting value: line 1 column 1 (char 0)"
                    )
                return None
            return data

        if data is not None:
            req.get_json = mock.Mock(return_value=data)
        else:
            req.get_json = mock.Mock(side_effect=get_json_side_effect)
        return req

    return _create_request


# Test for basic GET request
def test_get_user_exists(mock_request, mock_firestore_client_instance_control):
    mock_db = mock_firestore_client_instance_control
    mock_db.collection.return_value.document.return_value.get.return_value.exists = True
    mock_db.collection.return_value.document.return_value.get.return_value.to_dict.return_value = {
        "uid": "test-user-123",
        "email": "test@example.com",
    }

    user_info = {"sub": "test-user-123", "email": "test@example.com"}
    user_info_json = json.dumps(user_info)
    user_info_b64 = base64.b64encode(user_info_json.encode("utf-8")).decode("utf-8")
    headers = {"X-Apigateway-Api-Userinfo": user_info_b64}
    request = mock_request("GET", headers=headers)

    response, status_code, _ = handler(request)

    assert status_code == 200
    assert response == {"uid": "test-user-123", "email": "test@example.com"}
    mock_db.collection.assert_called_once_with("users")
    mock_db.collection.return_value.document.assert_called_once_with("test-user-123")
    mock_db.collection.return_value.document.return_value.get.assert_called_once()

# --- Tests for KMS Decryption ---

@patch.dict(
    os.environ,
    {
        "KMS_KEY_NAME": "test-key",
        "KMS_KEY_RING": "test-key-ring",
        "KMS_LOCATION": "test-location",
        "GOOGLE_CLOUD_PROJECT": "test-gcp-project",
    },
)
@patch("main._decrypt_data_kms")
def test_get_user_with_encrypted_token_success(
    mock_decrypt_data_kms, mock_request, mock_firestore_client_instance_control
):
    mock_db = mock_firestore_client_instance_control
    mock_doc_snapshot = mock_db.collection.return_value.document.return_value.get.return_value
    mock_doc_snapshot.exists = True
    mock_doc_snapshot.to_dict.return_value = {
        "uid": "test-user-kms",
        "email": "kms@example.com",
        "github_access_token": "sample_encrypted_token_base64",
    }

    mock_decrypt_data_kms.return_value = "decrypted_access_token"

    user_info = {"sub": "test-user-kms", "email": "kms@example.com"}
    user_info_json = json.dumps(user_info)
    user_info_b64 = base64.b64encode(user_info_json.encode("utf-8")).decode("utf-8")
    headers = {"X-Apigateway-Api-Userinfo": user_info_b64}
    request = mock_request("GET", headers=headers)

    response, status_code, _ = handler(request)

    assert status_code == 200
    assert response["uid"] == "test-user-kms"
    assert response["github_access_token"] == "decrypted_access_token"
    assert "github_access_token_error" not in response

    mock_decrypt_data_kms.assert_called_once_with("sample_encrypted_token_base64")
    mock_db.collection.assert_called_once_with("users")
    mock_db.collection.return_value.document.assert_called_once_with("test-user-kms")


@patch.dict(
    os.environ,
    {
        "KMS_KEY_NAME": "test-key",
        "KMS_KEY_RING": "test-key-ring",
        "KMS_LOCATION": "test-location",
        "GOOGLE_CLOUD_PROJECT": "test-gcp-project",
    },
)
@patch("main._decrypt_data_kms")
def test_get_user_with_encrypted_token_failure(
    mock_decrypt_data_kms, mock_request, mock_firestore_client_instance_control
):
    mock_db = mock_firestore_client_instance_control
    mock_doc_snapshot = mock_db.collection.return_value.document.return_value.get.return_value
    mock_doc_snapshot.exists = True
    mock_doc_snapshot.to_dict.return_value = {
        "uid": "test-user-kms-fail",
        "email": "kmsfail@example.com",
        "github_access_token": "another_encrypted_token_base64",
    }

    mock_decrypt_data_kms.return_value = None  # Simulate decryption failure

    user_info = {"sub": "test-user-kms-fail", "email": "kmsfail@example.com"}
    user_info_json = json.dumps(user_info)
    user_info_b64 = base64.b64encode(user_info_json.encode("utf-8")).decode("utf-8")
    headers = {"X-Apigateway-Api-Userinfo": user_info_b64}
    request = mock_request("GET", headers=headers)

    response, status_code, _ = handler(request)

    assert status_code == 200
    assert response["uid"] == "test-user-kms-fail"
    assert response["github_access_token"] is None
    assert response["github_access_token_error"] == "decryption_failed"

    mock_decrypt_data_kms.assert_called_once_with("another_encrypted_token_base64")
    mock_db.collection.assert_called_once_with("users")
    mock_db.collection.return_value.document.assert_called_once_with("test-user-kms-fail")


@patch("main._decrypt_data_kms")
def test_get_user_no_github_token(
    mock_decrypt_data_kms, mock_request, mock_firestore_client_instance_control
):
    mock_db = mock_firestore_client_instance_control
    mock_doc_snapshot = mock_db.collection.return_value.document.return_value.get.return_value
    mock_doc_snapshot.exists = True
    mock_doc_snapshot.to_dict.return_value = {
        "uid": "test-user-no-token",
        "email": "notoken@example.com",
        # No github_access_token field
    }

    user_info = {"sub": "test-user-no-token", "email": "notoken@example.com"}
    user_info_json = json.dumps(user_info)
    user_info_b64 = base64.b64encode(user_info_json.encode("utf-8")).decode("utf-8")
    headers = {"X-Apigateway-Api-Userinfo": user_info_b64}
    request = mock_request("GET", headers=headers)

    response, status_code, _ = handler(request)

    assert status_code == 200
    assert response["uid"] == "test-user-no-token"
    assert "github_access_token" not in response # or assert response.get("github_access_token") is None
    assert "github_access_token_error" not in response

    mock_decrypt_data_kms.assert_not_called()


@patch("main._decrypt_data_kms")
def test_get_user_github_token_not_string(
    mock_decrypt_data_kms, mock_request, mock_firestore_client_instance_control
):
    mock_db = mock_firestore_client_instance_control
    mock_doc_snapshot = mock_db.collection.return_value.document.return_value.get.return_value
    mock_doc_snapshot.exists = True
    mock_doc_snapshot.to_dict.return_value = {
        "uid": "test-user-invalid-token-type",
        "email": "invalidtype@example.com",
        "github_access_token": False, # Token is not a string
    }

    user_info = {"sub": "test-user-invalid-token-type", "email": "invalidtype@example.com"}
    user_info_json = json.dumps(user_info)
    user_info_b64 = base64.b64encode(user_info_json.encode("utf-8")).decode("utf-8")
    headers = {"X-Apigateway-Api-Userinfo": user_info_b64}
    request = mock_request("GET", headers=headers)

    response, status_code, _ = handler(request)

    assert status_code == 200
    assert response["uid"] == "test-user-invalid-token-type"
    assert response["github_access_token"] is False
    assert "github_access_token_error" not in response

    mock_decrypt_data_kms.assert_not_called()


# --- Original tests continue below ---

def test_post_user_valid_data(mock_request, mock_firestore_client_instance_control):
    mock_db = mock_firestore_client_instance_control

    user_id = "test-user-123"
    user_email = "test@example.com"
    user_name = "Test User"

    user_info = {"sub": user_id, "email": user_email, "name": user_name}
    user_info_json = json.dumps(user_info)
    user_info_b64 = base64.b64encode(user_info_json.encode("utf-8")).decode("utf-8")
    headers = {"X-Apigateway-Api-Userinfo": user_info_b64}

    request_data = {
        "cookieConsent": "true",
        "emailMarketing": False,
        "someOtherData": "value",
    }
    request_obj = mock_request("POST", data=request_data, headers=headers)

    mock_doc_ref_for_set = mock_db.collection.return_value.document.return_value

    response, status_code, _ = handler(request_obj)

    assert status_code == 200
    expected_stored_data = {
        "uid": user_id,
        "email": user_email,
        "displayName": user_name,
        "cookieConsent": "true",
        "emailMarketing": False,
        "someOtherData": "value",
    }
    assert response == expected_stored_data

    mock_db.collection.assert_called_once_with("users")
    mock_db.collection.return_value.document.assert_called_once_with(user_id)
    mock_doc_ref_for_set.set.assert_called_once_with(expected_stored_data, merge=True)


def test_post_user_invalid_cookie_consent(
    mock_request, mock_firestore_client_instance_control
):
    mock_db = mock_firestore_client_instance_control

    user_info = {"sub": "test-user-123", "email": "test@example.com"}
    user_info_json = json.dumps(user_info)
    user_info_b64 = base64.b64encode(user_info_json.encode("utf-8")).decode("utf-8")
    headers = {"X-Apigateway-Api-Userinfo": user_info_b64}

    request_obj_missing = mock_request(
        "POST", data={"otherField": True}, headers=headers
    )
    response_missing, status_code_missing, _ = handler(request_obj_missing)
    assert status_code_missing == 400
    assert response_missing == {
        "error": "'cookieConsent' field must be present and set to 'true'."
    }

    request_obj_wrong_type = mock_request(
        "POST", data={"cookieConsent": True}, headers=headers
    )
    response_wrong_type, status_code_wrong_type, _ = handler(request_obj_wrong_type)
    assert status_code_wrong_type == 400
    assert response_wrong_type == {
        "error": "'cookieConsent' field must be present and set to 'true'."
    }

    request_obj_false_str = mock_request(
        "POST", data={"cookieConsent": "false"}, headers=headers
    )
    response_false_str, status_code_false_str, _ = handler(request_obj_false_str)
    assert status_code_false_str == 400
    assert response_false_str == {
        "error": "'cookieConsent' field must be present and set to 'true'."
    }

    mock_db.collection.assert_not_called()


def test_post_user_no_json_body(mock_request, mock_firestore_client_instance_control):
    mock_db = mock_firestore_client_instance_control

    user_info = {"sub": "test-user-123", "email": "test@example.com"}
    user_info_json = json.dumps(user_info)
    user_info_b64 = base64.b64encode(user_info_json.encode("utf-8")).decode("utf-8")
    headers = {
        "X-Apigateway-Api-Userinfo": user_info_b64,
        "Content-Type": "application/json",
    }

    request_obj = mock_request("POST", data=None, headers=headers)

    response, status_code, _ = handler(request_obj)

    assert status_code == 400
    assert (
        "Failed to decode JSON object" in response["error"]
        or "Invalid JSON payload" in response["error"]
    )
    mock_db.collection.assert_not_called()


def test_get_user_not_exists(mock_request, mock_firestore_client_instance_control):
    mock_db = mock_firestore_client_instance_control
    mock_db.collection.return_value.document.return_value.get.return_value.exists = (
        False
    )

    user_info = {"sub": "test-user-unknown", "email": "unknown@example.com"}
    user_info_json = json.dumps(user_info)
    user_info_b64 = base64.b64encode(user_info_json.encode("utf-8")).decode("utf-8")
    headers = {"X-Apigateway-Api-Userinfo": user_info_b64}
    request = mock_request("GET", headers=headers)

    response, status_code, _ = handler(request)

    assert status_code == 204
    assert response == ""
    mock_db.collection.assert_called_once_with("users")
    mock_db.collection.return_value.document.assert_called_once_with(
        "test-user-unknown"
    )
    mock_db.collection.return_value.document.return_value.get.assert_called_once()


def test_options_request(mock_request, mock_firestore_client_instance_control):
    mock_db = mock_firestore_client_instance_control
    request = mock_request("OPTIONS")

    response, status_code, headers_map = handler(request)

    assert status_code == 204
    assert response == ""
    assert headers_map["Access-Control-Allow-Origin"] == "*"
    assert "GET" in headers_map["Access-Control-Allow-Methods"]
    mock_db.collection.assert_not_called()


def test_missing_auth_header(mock_request, mock_firestore_client_instance_control):
    mock_db = mock_firestore_client_instance_control
    request = mock_request("GET", headers={})

    response, status_code, _ = handler(request)

    assert status_code == 401
    assert response == {"error": "Authentication information not found."}
    mock_db.collection.assert_not_called()


def test_malformed_auth_header_not_base64(
    mock_request, mock_firestore_client_instance_control
):
    mock_db = mock_firestore_client_instance_control
    headers = {"X-Apigateway-Api-Userinfo": "this-is-not-base64"}
    request = mock_request("GET", headers=headers)

    response, status_code, _ = handler(request)

    assert status_code == 400
    assert response == {"error": "Invalid authentication information format."}
    mock_db.collection.assert_not_called()


def test_malformed_auth_header_not_json(
    mock_request, mock_firestore_client_instance_control
):
    mock_db = mock_firestore_client_instance_control
    not_json_b64 = base64.b64encode("this is not json".encode("utf-8")).decode("utf-8")
    headers = {"X-Apigateway-Api-Userinfo": not_json_b64}
    request = mock_request("GET", headers=headers)

    response, status_code, _ = handler(request)

    assert status_code == 400
    assert response == {"error": "Invalid authentication information format."}
    mock_db.collection.assert_not_called()


def test_auth_header_missing_user_id_claim(
    mock_request, mock_firestore_client_instance_control
):
    mock_db = mock_firestore_client_instance_control
    user_info_no_sub = {"email": "test@example.com"}
    user_info_json = json.dumps(user_info_no_sub)
    user_info_b64 = base64.b64encode(user_info_json.encode("utf-8")).decode("utf-8")
    headers = {"X-Apigateway-Api-Userinfo": user_info_b64}
    request = mock_request("GET", headers=headers)

    # Need to import os for patch.dict to work if it's not already imported globally in test file
    # For the purpose of this diff, assume os is imported. If not, it would need to be added.
    # import os # This would be at the top of the file

    response, status_code, _ = handler(request)

    assert status_code == 400
    assert response == {
        "error": "User ID claim ('sub') not found in authentication information."
    }
    mock_db.collection.assert_not_called()
