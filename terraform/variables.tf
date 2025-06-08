# ------------------------------------------------------------------------------
# Variable for billing account
# ------------------------------------------------------------------------------
variable "billing_account" {
  type        = string
  description = "The billing account ID to associate with the GCP project."
}

# ------------------------------------------------------------------------------
# Variable for secrets
# ------------------------------------------------------------------------------
variable "secrets" {
  type        = map(string)
  description = "A map of secrets to create in Secret Manager. Key is the secret name, value is the secret data."
}

# ------------------------------------------------------------------------------
# Variables for KMS
# ------------------------------------------------------------------------------
variable "kms_key_ring_name" {
  description = "The name of the KMS key ring."
  type        = string
  default     = "github_integration_keyring"
}

variable "kms_crypto_key_name" {
  description = "The name of the KMS crypto key."
  type        = string
  default     = "github_token_key"
}

variable "kms_location" {
  description = "The GCP location for the KMS key ring and crypto key."
  type        = string
  # Default to a common region, but this should ideally be configured per environment
  default     = "us-central1"
}

# ------------------------------------------------------------------------------
# Variable for GCP Project ID
# ------------------------------------------------------------------------------
variable "project_id" {
  description = "The GCP project ID."
  type        = string
  # This variable would typically be set via tfvars or environment variable
  # For example, it could be populated from google_project.reomir.project_id
  # if this variables.tf file was consumed by a module that also had access to that resource.
  # However, for kms.tf at the root level, it needs to be explicitly passed in or defaulted if appropriate.
}

variable "kms_prevent_destroy_crypto_key" {
  description = "Whether to prevent the destruction of the crypto key created by the KMS module. Recommended to be true for production."
  type        = bool
  default     = true
}