output "key_ring_id" {
  description = "The ID of the created KMS Key Ring."
  value       = google_kms_key_ring.keyring.id
}

output "key_ring_name" {
  description = "The name of the created KMS Key Ring."
  value       = google_kms_key_ring.keyring.name
}

output "crypto_key_id" {
  description = "The ID of the created KMS Crypto Key."
  value       = google_kms_crypto_key.cryptokey.id
}

output "crypto_key_name" {
  description = "The name of the created KMS Crypto Key."
  value       = google_kms_crypto_key.cryptokey.name
}