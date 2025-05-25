# ------------------------------------------------------------------------------
# Variable for the GCP project ID
# ------------------------------------------------------------------------------
variable "gcp_project" {
  type        = string
  description = "The GCP project ID."
}

# ------------------------------------------------------------------------------
# Variable for the list of roles to assign to the service account
# ------------------------------------------------------------------------------
variable "roles" {
  type        = set(string)
  description = "A list of roles to assign to the service account."
  default     = []
}

# ------------------------------------------------------------------------------
# Variable for the service account ID
# ------------------------------------------------------------------------------
variable "sa_id" {
  type        = string
  description = "The service account ID."
}
