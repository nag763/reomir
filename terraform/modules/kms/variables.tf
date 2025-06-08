variable "project_id" {
  description = "The GCP project ID where KMS resources will be created."
  type        = string
}

variable "location" {
  description = "The GCP location (region) for the KMS key ring and crypto key."
  type        = string
}

variable "key_ring_name" {
  description = "The name for the KMS key ring."
  type        = string
  default     = "default_keyring"
}

variable "crypto_key_name" {
  description = "The name for the KMS crypto key."
  type        = string
  default     = "default_cryptokey"
}

variable "github_integration_function_sa_email" {
  description = "The service account email for the github-integration function that needs encrypter permissions."
  type        = string
}

variable "users_function_sa_email" {
  description = "The service account email for the users function that needs decrypter permissions."
  type        = string
}

variable "prevent_destroy_crypto_key" {
  description = "Whether to prevent the destruction of the crypto key. Recommended to be true for production."
  type        = bool
  default     = true
}
