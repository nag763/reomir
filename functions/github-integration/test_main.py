import pytest
from unittest import mock
import requests_mock
import flask
import json
import base64
import os

import main
from main import app, _encrypt_data_kms, _get_auth_user_info, _create_autoclose_html_response
from google.cloud import firestore as fs

@pytest.fixture
def client():
    # Make sure clients are None before each test that uses the app context
    # so _initialize_clients_if_needed in main.py uses the patched versions
    main.db = None
    main.KMS_CLIENT = None
    with app.test_client() as client:
        yield client

@pytest.fixture
def mock_requests(requests_mock):
    yield requests_mock

@pytest.fixture
def mock_firestore_client_constructor():
    with mock.patch('google.cloud.firestore.Client') as mock_constructor:
        yield mock_constructor

@pytest.fixture
def mock_kms_client_constructor():
    with mock.patch('google.cloud.kms.KeyManagementServiceClient') as mock_constructor:
        yield mock_constructor

# === Route Tests ===

def test_github_connect_success(client, monkeypatch, mock_firestore_client_constructor, mock_kms_client_constructor):
    user_info_payload = {'sub': 'test_user'}
    encoded_user_info = base64.b64encode(json.dumps(user_info_payload).encode('utf-8')).decode('utf-8')
    headers = {'X-Apigateway-Api-Userinfo': encoded_user_info}

    # Ensure client constructors return mocks, and then monkeypatch main's instances
    monkeypatch.setattr(main, 'db', mock_firestore_client_constructor.return_value)
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_client_constructor.return_value)

    with mock.patch.object(main, 'GITHUB_CLIENT_ID', 'test_client_id'), \
         mock.patch.object(main, 'API_GATEWAY_BASE_URL', 'https://api.example.com'):
        response = client.get('/api/v1/github/connect', headers=headers)

    assert response.status_code == 200
    assert response.is_json
    json_data = response.get_json()
    assert "redirectUrl" in json_data
    redirect_url = json_data["redirectUrl"]
    assert redirect_url.startswith('https://github.com/login/oauth/authorize')
    assert 'client_id=test_client_id' in redirect_url
    assert 'redirect_uri=https://api.example.com/api/v1/github/callback' in redirect_url
    assert 'state=test_user' in redirect_url

def test_github_connect_missing_header(client, monkeypatch, mock_firestore_client_constructor, mock_kms_client_constructor):
    monkeypatch.setattr(main, 'db', mock_firestore_client_constructor.return_value)
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_client_constructor.return_value)
    response = client.get('/api/v1/github/connect')
    assert response.status_code == 401

def test_github_connect_missing_client_id(client, monkeypatch, mock_firestore_client_constructor, mock_kms_client_constructor):
    user_info_payload = {'sub': 'test_user'}
    encoded_user_info = base64.b64encode(json.dumps(user_info_payload).encode('utf-8')).decode('utf-8')
    headers = {'X-Apigateway-Api-Userinfo': encoded_user_info}

    monkeypatch.setattr(main, 'db', mock_firestore_client_constructor.return_value)
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_client_constructor.return_value)

    with mock.patch.object(main, 'API_GATEWAY_BASE_URL', 'https://api.example.com'), \
         mock.patch.object(main, 'GITHUB_CLIENT_ID', None):
        response = client.get('/api/v1/github/connect', headers=headers)
    assert response.status_code == 500
    assert "Server configuration error." in response.get_json()['error']

def test_github_connect_missing_base_url(client, monkeypatch, mock_firestore_client_constructor, mock_kms_client_constructor):
    user_info_payload = {'sub': 'test_user'}
    encoded_user_info = base64.b64encode(json.dumps(user_info_payload).encode('utf-8')).decode('utf-8')
    headers = {'X-Apigateway-Api-Userinfo': encoded_user_info}

    monkeypatch.setattr(main, 'db', mock_firestore_client_constructor.return_value)
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_client_constructor.return_value)

    with mock.patch.object(main, 'GITHUB_CLIENT_ID', 'test_client_id'), \
         mock.patch.object(main, 'API_GATEWAY_BASE_URL', None):
        response = client.get('/api/v1/github/connect', headers=headers)
    assert response.status_code == 500
    assert "Server configuration error for callback." in response.get_json()['error']

# === Helper Function Tests ===
# These test helpers directly, so they might need to ensure main.KMS_CLIENT is the configured mock
# if _initialize_clients_if_needed is called within them implicitly or explicitly.

def test_encrypt_data_kms_success(monkeypatch, mock_kms_client_constructor):
    mock_kms_instance = mock_kms_client_constructor.return_value
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_instance) # Ensure main.KMS_CLIENT is this mock

    with mock.patch.object(main, 'GOOGLE_CLOUD_PROJECT', 'test_project'), \
         mock.patch.object(main, 'KMS_LOCATION', 'global'), \
         mock.patch.object(main, 'KMS_KEY_RING', 'test_key_ring'), \
         mock.patch.object(main, 'KMS_KEY_NAME', 'test_key'):

        raw_ciphertext = b'encrypted_data_raw'
        expected_b64_ciphertext = base64.b64encode(raw_ciphertext).decode('utf-8')

        mock_encrypt_response = mock.Mock()
        mock_encrypt_response.ciphertext = raw_ciphertext
        mock_kms_instance.encrypt.return_value = mock_encrypt_response

        # Call _initialize_clients_if_needed to make sure KMS_CLIENT is the patched one if it was None
        # This is tricky because _encrypt_data_kms uses the global main.KMS_CLIENT
        main.KMS_CLIENT = mock_kms_instance # Explicitly set it before call
        result = _encrypt_data_kms('test_payload')
        assert result == expected_b64_ciphertext
        mock_kms_instance.encrypt.assert_called_once()


def test_encrypt_data_kms_missing_env_vars(monkeypatch, mock_kms_client_constructor):
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_client_constructor.return_value)
    with mock.patch.object(main, 'GOOGLE_CLOUD_PROJECT', 'test_project'), \
         mock.patch.object(main, 'KMS_LOCATION', 'global'), \
         mock.patch.object(main, 'KMS_KEY_RING', 'test_key_ring'), \
         mock.patch.object(main, 'KMS_KEY_NAME', None):
        assert _encrypt_data_kms('test_payload') is None

def test_encrypt_data_kms_client_error(monkeypatch, mock_kms_client_constructor):
    mock_kms_instance = mock_kms_client_constructor.return_value
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_instance)

    with mock.patch.object(main, 'GOOGLE_CLOUD_PROJECT', 'test_project'), \
         mock.patch.object(main, 'KMS_LOCATION', 'global'), \
         mock.patch.object(main, 'KMS_KEY_RING', 'test_key_ring'), \
         mock.patch.object(main, 'KMS_KEY_NAME', 'test_key'):
        mock_kms_instance.encrypt.side_effect = Exception("KMS API Error")
        main.KMS_CLIENT = mock_kms_instance # Explicitly set
        assert _encrypt_data_kms('test_payload') is None

def test_get_auth_user_info_success(): # No client mocks needed
    user_info_payload = {'sub': 'test_user_id', 'email': 'user@example.com'}
    encoded_info = base64.b64encode(json.dumps(user_info_payload).encode()).decode()
    mock_flask_request = mock.Mock(spec=flask.Request)
    mock_flask_request.headers = {'X-Apigateway-Api-Userinfo': encoded_info}
    auth_details = _get_auth_user_info(mock_flask_request)
    assert auth_details is not None
    assert auth_details['user_id'] == 'test_user_id'
    assert auth_details['full_claims'] == user_info_payload

def test_get_auth_user_info_missing_header(): # No client mocks needed
    mock_flask_request = mock.Mock(spec=flask.Request)
    mock_flask_request.headers = {}
    assert _get_auth_user_info(mock_flask_request) is None

# ... (other _get_auth_user_info tests remain the same) ...
def test_get_auth_user_info_malformed_base64():
    mock_flask_request = mock.Mock(spec=flask.Request)
    mock_flask_request.headers = {'X-Apigateway-Api-Userinfo': 'not-base64'}
    assert _get_auth_user_info(mock_flask_request) is None

def test_get_auth_user_info_invalid_json():
    encoded_info = base64.b64encode(b'not_json_garbage_payload').decode()
    mock_flask_request = mock.Mock(spec=flask.Request)
    mock_flask_request.headers = {'X-Apigateway-Api-Userinfo': encoded_info}
    assert _get_auth_user_info(mock_flask_request) is None

def test_get_auth_user_info_missing_sub_claim():
    user_info_payload = {'email': 'user@example.com'}
    encoded_info = base64.b64encode(json.dumps(user_info_payload).encode()).decode()
    mock_flask_request = mock.Mock(spec=flask.Request)
    mock_flask_request.headers = {'X-Apigateway-Api-Userinfo': encoded_info}
    assert _get_auth_user_info(mock_flask_request) is None


def test_create_autoclose_html_response_content(): # No client mocks
    message = "Test Message"
    status = "success"
    with mock.patch.object(main, 'FRONTEND_URL', '*'):
        response_obj = _create_autoclose_html_response(message, status)
    html_content = response_obj.get_data(as_text=True)
    assert message in html_content
    assert f'"status": "{status}"' in html_content
    assert "window.opener.postMessage" in html_content

def test_create_autoclose_html_response_frontend_url_set(): # No client mocks
    with mock.patch.object(main, 'FRONTEND_URL', 'https://frontend.example.com'):
        response_obj = _create_autoclose_html_response("Test", "success")
    html_content = response_obj.get_data(as_text=True)
    assert 'const targetOrigin = "https://frontend.example.com";' in html_content

def test_create_autoclose_html_response_frontend_url_not_set(): # No client mocks
    with mock.patch.object(main, 'FRONTEND_URL', ''):
        response_obj = _create_autoclose_html_response("Test", "success")
    html_content = response_obj.get_data(as_text=True)
    assert 'const targetOrigin = "*";' in html_content

COMMON_CALLBACK_ENV_PATCHES = {
    'GITHUB_CLIENT_ID': 'test_client_id', 'GITHUB_CLIENT_SECRET': 'test_client_secret',
    'API_GATEWAY_BASE_URL': 'https://api.example.com',
    'GOOGLE_CLOUD_PROJECT': 'test_project', 'KMS_LOCATION': 'global',
    'KMS_KEY_RING': 'test_key_ring', 'KMS_KEY_NAME': 'test_key',
    'FRONTEND_URL': '*'
}

def test_github_callback_success(client, mock_requests, monkeypatch, mock_firestore_client_constructor, mock_kms_client_constructor):
    mock_db_instance = mock_firestore_client_constructor.return_value
    mock_kms_instance = mock_kms_client_constructor.return_value
    monkeypatch.setattr(main, 'db', mock_db_instance)
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_instance)

    with mock.patch.multiple(main, **COMMON_CALLBACK_ENV_PATCHES):
        mock_requests.post('https://github.com/login/oauth/access_token', json={'access_token': 'test_github_token'})
        raw_ciphertext = b'encrypted_token_raw_bytes_content'
        expected_b64_ciphertext = base64.b64encode(raw_ciphertext).decode('utf-8')

        mock_encrypt_response = mock.Mock()
        mock_encrypt_response.ciphertext = raw_ciphertext
        mock_kms_instance.encrypt.return_value = mock_encrypt_response

        mock_requests.get('https://api.github.com/user', json={'login': 'test_github_user', 'id': 123})

        response = client.get('/api/v1/github/callback?code=test_code&state=test_user')

        assert response.status_code == 200
        assert "Success! You have been authenticated." in response.get_data(as_text=True)
        mock_db_instance.collection.assert_any_call('users')
        doc_ref_mock = mock_db_instance.collection('users').document('test_user')
        # Added merge=True
        doc_ref_mock.set.assert_called_once_with({
            'github_access_token': expected_b64_ciphertext,
            'github_login': 'test_github_user', 'github_id': '123',
            'github_connected': True, 'github_last_updated': mock.ANY
        }, merge=True)


def test_github_callback_missing_code(client, monkeypatch, mock_firestore_client_constructor, mock_kms_client_constructor):
    monkeypatch.setattr(main, 'db', mock_firestore_client_constructor.return_value)
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_client_constructor.return_value)
    with mock.patch.multiple(main, **COMMON_CALLBACK_ENV_PATCHES):
        response = client.get('/api/v1/github/callback?state=test_user')
    assert response.status_code == 200
    assert "Missing required parameters" in response.get_data(as_text=True)

# ... (Apply similar monkeypatching and env var fixes to other callback tests) ...

def test_github_callback_missing_state(client, monkeypatch, mock_firestore_client_constructor, mock_kms_client_constructor):
    monkeypatch.setattr(main, 'db', mock_firestore_client_constructor.return_value)
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_client_constructor.return_value)
    with mock.patch.multiple(main, **COMMON_CALLBACK_ENV_PATCHES):
        response = client.get('/api/v1/github/callback?code=test_code')
    assert response.status_code == 200
    assert "Missing required parameters" in response.get_data(as_text=True)


def test_github_callback_missing_oauth_env_vars(client, monkeypatch, mock_firestore_client_constructor, mock_kms_client_constructor):
    monkeypatch.setattr(main, 'db', mock_firestore_client_constructor.return_value)
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_client_constructor.return_value)
    temp_env = COMMON_CALLBACK_ENV_PATCHES.copy()
    del temp_env['GITHUB_CLIENT_ID'] # Test missing GITHUB_CLIENT_ID
    with mock.patch.multiple(main, **temp_env), \
         mock.patch.object(main, 'GITHUB_CLIENT_ID', None): # Ensure it's None for the test
        response = client.get('/api/v1/github/callback?code=test_code&state=test_user')
    assert response.status_code == 200
    assert "Server configuration error" in response.get_data(as_text=True)


def test_github_callback_token_exchange_error(client, mock_requests, monkeypatch, mock_firestore_client_constructor, mock_kms_client_constructor):
    monkeypatch.setattr(main, 'db', mock_firestore_client_constructor.return_value)
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_client_constructor.return_value)
    with mock.patch.multiple(main, **COMMON_CALLBACK_ENV_PATCHES):
        mock_requests.post('https://github.com/login/oauth/access_token', status_code=500)
        response = client.get('/api/v1/github/callback?code=test_code&state=test_user')
    assert response.status_code == 200
    assert "communication error" in response.get_data(as_text=True)


def test_github_callback_no_access_token_in_response(client, mock_requests, monkeypatch, mock_firestore_client_constructor, mock_kms_client_constructor):
    monkeypatch.setattr(main, 'db', mock_firestore_client_constructor.return_value)
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_client_constructor.return_value)
    with mock.patch.multiple(main, **COMMON_CALLBACK_ENV_PATCHES):
        mock_requests.post('https://github.com/login/oauth/access_token', json={'error': 'bad_verification_code'})
        response = client.get('/api/v1/github/callback?code=test_code&state=test_user')
    assert response.status_code == 200
    assert "Could not retrieve access token" in response.get_data(as_text=True)


def test_github_callback_kms_encryption_error(client, mock_requests, monkeypatch, mock_firestore_client_constructor, mock_kms_client_constructor):
    mock_kms_instance = mock_kms_client_constructor.return_value
    monkeypatch.setattr(main, 'db', mock_firestore_client_constructor.return_value)
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_instance)
    with mock.patch.multiple(main, **COMMON_CALLBACK_ENV_PATCHES):
        mock_requests.post('https://github.com/login/oauth/access_token', json={'access_token': 'test_github_token'})
        mock_kms_instance.encrypt.side_effect = Exception("KMS API Error")
        response = client.get('/api/v1/github/callback?code=test_code&state=test_user')
    assert response.status_code == 200
    assert "A security error occurred during processing." in response.get_data(as_text=True)


def test_github_callback_get_user_info_error(client, mock_requests, monkeypatch, mock_firestore_client_constructor, mock_kms_client_constructor):
    mock_kms_instance = mock_kms_client_constructor.return_value
    monkeypatch.setattr(main, 'db', mock_firestore_client_constructor.return_value)
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_instance)
    with mock.patch.multiple(main, **COMMON_CALLBACK_ENV_PATCHES):
        mock_requests.post('https://github.com/login/oauth/access_token', json={'access_token': 'test_github_token'})
        mock_encrypt_response = mock.Mock()
        mock_encrypt_response.ciphertext = base64.b64decode(b'ZW5jcnlwdGVkX3Rva2Vu')
        mock_kms_instance.encrypt.return_value = mock_encrypt_response
        mock_requests.get('https://api.github.com/user', status_code=500)
        response = client.get('/api/v1/github/callback?code=test_code&state=test_user')
    assert response.status_code == 200
    assert "communication error" in response.get_data(as_text=True)


def test_github_callback_missing_user_info_fields(client, mock_requests, monkeypatch, mock_firestore_client_constructor, mock_kms_client_constructor):
    mock_kms_instance = mock_kms_client_constructor.return_value
    monkeypatch.setattr(main, 'db', mock_firestore_client_constructor.return_value)
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_instance)
    with mock.patch.multiple(main, **COMMON_CALLBACK_ENV_PATCHES):
        mock_requests.post('https://github.com/login/oauth/access_token', json={'access_token': 'test_github_token'})
        mock_encrypt_response = mock.Mock()
        mock_encrypt_response.ciphertext = base64.b64decode(b'ZW5jcnlwdGVkX3Rva2Vu')
        mock_kms_instance.encrypt.return_value = mock_encrypt_response
        mock_requests.get('https://api.github.com/user', json={'name': 'test_user'})
        response = client.get('/api/v1/github/callback?code=test_code&state=test_user')
    assert response.status_code == 200
    assert "Could not retrieve user profile from GitHub." in response.get_data(as_text=True)


def test_github_callback_firestore_error(client, mock_requests, monkeypatch, mock_firestore_client_constructor, mock_kms_client_constructor):
    mock_db_instance = mock_firestore_client_constructor.return_value
    mock_kms_instance = mock_kms_client_constructor.return_value
    monkeypatch.setattr(main, 'db', mock_db_instance)
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_instance)
    with mock.patch.multiple(main, **COMMON_CALLBACK_ENV_PATCHES):
        mock_requests.post('https://github.com/login/oauth/access_token', json={'access_token': 'test_github_token'})
        mock_encrypt_response = mock.Mock()
        mock_encrypt_response.ciphertext = base64.b64decode(b'ZW5jcnlwdGVkX3Rva2Vu')
        mock_kms_instance.encrypt.return_value = mock_encrypt_response
        mock_requests.get('https://api.github.com/user', json={'login': 'test_github_user', 'id': 123})
        mock_db_instance.collection('users').document('test_user').set.side_effect = Exception("Firestore error")
        response = client.get('/api/v1/github/callback?code=test_code&state=test_user')
    assert response.status_code == 200
    assert "internal error" in response.get_data(as_text=True)


@pytest.fixture
def mock_firestore_doc_setup(monkeypatch, mock_firestore_client_constructor):
    mock_db_instance = mock_firestore_client_constructor.return_value
    monkeypatch.setattr(main, 'db', mock_db_instance)

    mock_doc_snapshot = mock.Mock(spec=fs.DocumentSnapshot)
    mock_doc_ref = mock_db_instance.collection("users").document("test_user")
    mock_doc_ref.get.return_value = mock_doc_snapshot
    return mock_doc_ref, mock_doc_snapshot

def test_github_status_connected(client, monkeypatch, mock_kms_client_constructor, mock_firestore_doc_setup):
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_client_constructor.return_value) # Not used by status, but good practice
    mock_doc_ref, mock_doc_snapshot = mock_firestore_doc_setup

    user_info_payload = {'sub': 'test_user'}
    encoded_user_info = base64.b64encode(json.dumps(user_info_payload).encode('utf-8')).decode('utf-8')
    headers = {'X-Apigateway-Api-Userinfo': encoded_user_info}

    mock_doc_snapshot.exists = True
    doc_data = {'github_connected': True, 'github_login': 'test_login', 'github_id': '123'}
    mock_doc_snapshot.get = lambda key: doc_data.get(key)

    response = client.get('/api/v1/github/status', headers=headers)
    assert response.status_code == 200
    assert response.json == {'connected': True, 'username': 'test_login', 'github_id': '123'}

def test_github_status_not_connected(client, monkeypatch, mock_kms_client_constructor, mock_firestore_doc_setup):
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_client_constructor.return_value)
    mock_doc_ref, mock_doc_snapshot = mock_firestore_doc_setup
    user_info_payload = {'sub': 'test_user'}
    encoded_user_info = base64.b64encode(json.dumps(user_info_payload).encode('utf-8')).decode('utf-8')
    headers = {'X-Apigateway-Api-Userinfo': encoded_user_info}

    mock_doc_snapshot.exists = True
    doc_data = {'github_connected': False}
    mock_doc_snapshot.get = lambda key: doc_data.get(key)

    response = client.get('/api/v1/github/status', headers=headers)
    assert response.status_code == 200
    assert response.json == {'connected': False}

def test_github_status_doc_not_exists(client, monkeypatch, mock_kms_client_constructor, mock_firestore_doc_setup):
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_client_constructor.return_value)
    mock_doc_ref, mock_doc_snapshot = mock_firestore_doc_setup
    user_info_payload = {'sub': 'test_user'}
    encoded_user_info = base64.b64encode(json.dumps(user_info_payload).encode('utf-8')).decode('utf-8')
    headers = {'X-Apigateway-Api-Userinfo': encoded_user_info}

    mock_doc_snapshot.exists = False

    response = client.get('/api/v1/github/status', headers=headers)
    assert response.status_code == 200
    assert response.json == {'connected': False}

def test_github_status_missing_header(client, monkeypatch, mock_kms_client_constructor, mock_firestore_client_constructor):
    monkeypatch.setattr(main, 'db', mock_firestore_client_constructor.return_value)
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_client_constructor.return_value)
    response = client.get('/api/v1/github/status')
    assert response.status_code == 401

def test_github_status_firestore_error(client, monkeypatch, mock_kms_client_constructor, mock_firestore_client_constructor):
    mock_db_instance = mock_firestore_client_constructor.return_value
    monkeypatch.setattr(main, 'db', mock_db_instance)
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_client_constructor.return_value)

    user_info_payload = {'sub': 'test_user'}
    encoded_user_info = base64.b64encode(json.dumps(user_info_payload).encode('utf-8')).decode('utf-8')
    headers = {'X-Apigateway-Api-Userinfo': encoded_user_info}

    mock_db_instance.collection("users").document("test_user").get.side_effect = Exception("Firestore error")

    response = client.get('/api/v1/github/status', headers=headers)
    assert response.status_code == 500
    assert response.json == {'error': 'Failed to retrieve status.'}

def test_github_disconnect_success(client, monkeypatch, mock_kms_client_constructor, mock_firestore_doc_setup):
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_client_constructor.return_value)
    mock_doc_ref, mock_doc_snapshot = mock_firestore_doc_setup
    user_info_payload = {'sub': 'test_user'}
    encoded_user_info = base64.b64encode(json.dumps(user_info_payload).encode('utf-8')).decode('utf-8')
    headers = {'X-Apigateway-Api-Userinfo': encoded_user_info}

    mock_doc_snapshot.exists = True
    mock_doc_snapshot.get = lambda key: {'github_connected': True}.get(key) if key == 'github_connected' else None

    response = client.post('/api/v1/github/disconnect', headers=headers)
    assert response.status_code == 200
    assert response.json == {'message': 'GitHub disconnected successfully.'}

    mock_doc_ref.update.assert_called_once_with({
        'github_access_token': fs.DELETE_FIELD,
        'github_login': fs.DELETE_FIELD,
        'github_id': fs.DELETE_FIELD,
        'github_connected': False,
        'github_last_updated': mock.ANY
    })

def test_github_disconnect_not_connected(client, monkeypatch, mock_kms_client_constructor, mock_firestore_doc_setup):
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_client_constructor.return_value)
    mock_doc_ref, mock_doc_snapshot = mock_firestore_doc_setup
    user_info_payload = {'sub': 'test_user'}
    encoded_user_info = base64.b64encode(json.dumps(user_info_payload).encode('utf-8')).decode('utf-8')
    headers = {'X-Apigateway-Api-Userinfo': encoded_user_info}

    mock_doc_snapshot.exists = False

    response = client.post('/api/v1/github/disconnect', headers=headers)
    assert response.status_code == 200
    assert response.json == {'message': 'No active GitHub connection to disconnect.'}
    mock_doc_ref.update.assert_not_called()

def test_github_disconnect_missing_header(client, monkeypatch, mock_kms_client_constructor, mock_firestore_client_constructor):
    monkeypatch.setattr(main, 'db', mock_firestore_client_constructor.return_value)
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_client_constructor.return_value)
    response = client.post('/api/v1/github/disconnect')
    assert response.status_code == 401

def test_github_disconnect_firestore_error(client, monkeypatch, mock_kms_client_constructor, mock_firestore_doc_setup):
    monkeypatch.setattr(main, 'KMS_CLIENT', mock_kms_client_constructor.return_value)
    mock_doc_ref, mock_doc_snapshot = mock_firestore_doc_setup
    user_info_payload = {'sub': 'test_user'}
    encoded_user_info = base64.b64encode(json.dumps(user_info_payload).encode('utf-8')).decode('utf-8')
    headers = {'X-Apigateway-Api-Userinfo': encoded_user_info}

    mock_doc_snapshot.exists = True
    mock_doc_snapshot.get = lambda key: {'github_connected': True}.get(key)
    mock_doc_ref.update.side_effect = Exception("Firestore error")

    response = client.post('/api/v1/github/disconnect', headers=headers)
    assert response.status_code == 500
    assert response.json == {'error': 'Failed to disconnect GitHub.'}
