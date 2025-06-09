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