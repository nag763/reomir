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

variable "sa_encrypter" {
  description = "A list of service account emails that need encrypter permissions."
  type        = list(string)
  default     = []
}

variable "sa_decrypter" {
  description = "A list of service account emails that need decrypter permissions."
  type        = list(string)
  default     = []
}