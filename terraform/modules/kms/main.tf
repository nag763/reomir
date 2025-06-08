resource "google_kms_key_ring" "keyring" {
  project  = var.project_id
  name     = var.key_ring_name
  location = var.location
}

resource "google_kms_crypto_key" "cryptokey" {
  name            = var.crypto_key_name
  key_ring        = google_kms_key_ring.keyring.id
  rotation_period = "100000s" # Example rotation period, can be made a variable

  lifecycle {
    prevent_destroy = var.prevent_destroy_crypto_key
  }
}

# IAM policy for the provided github-integration service account to encrypt
data "google_iam_policy" "kms_encrypter" {
  binding {
    role    = "roles/cloudkms.cryptoKeyEncrypter"
    members = [
      "serviceAccount:${var.github_integration_function_sa_email}"
    ]
  }
}

resource "google_kms_crypto_key_iam_policy" "key_encrypter_policy" {
  crypto_key_id = google_kms_crypto_key.cryptokey.id
  policy_data   = data.google_iam_policy.kms_encrypter.policy_data
}

# IAM policy for the provided users service account to decrypt
data "google_iam_policy" "kms_decrypter" {
  binding {
    role    = "roles/cloudkms.cryptoKeyDecrypter"
    members = [
      "serviceAccount:${var.users_function_sa_email}"
    ]
  }
}

resource "google_kms_crypto_key_iam_policy" "key_decrypter_policy" {
  crypto_key_id = google_kms_crypto_key.cryptokey.id
  policy_data   = data.google_iam_policy.kms_decrypter.policy_data
}
