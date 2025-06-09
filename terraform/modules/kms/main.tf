resource "google_kms_key_ring" "keyring" {
  project  = var.project_id
  name     = var.key_ring_name
  location = var.location
}

resource "google_kms_crypto_key" "cryptokey" {
  name            = var.crypto_key_name
  key_ring        = google_kms_key_ring.keyring.id
  rotation_period = "100000s" # Example rotation period, can be made a variable
}

resource "google_kms_crypto_key_iam_member" "key_encrypter_policy" {
  for_each      = toset(var.sa_encrypter)
  crypto_key_id = google_kms_crypto_key.cryptokey.id
  role          = "roles/cloudkms.cryptoKeyEncrypter"
  member        = "serviceAccount:${each.key}"
}

resource "google_kms_crypto_key_iam_member" "key_decrypter_policy" {
  for_each      = toset(var.sa_decrypter)
  crypto_key_id = google_kms_crypto_key.cryptokey.id
  role          = "roles/cloudkms.cryptoKeyDecrypter"
  member        = "serviceAccount:${each.key}"
}

