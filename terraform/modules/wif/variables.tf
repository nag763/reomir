# ------------------------------------------------------------------------------
# Variable for the GCP project ID
# ------------------------------------------------------------------------------
variable "gcp_project" {
  type        = string
  description = "The GCP project ID."
}

# ------------------------------------------------------------------------------
# Variable for the GCP project number
# ------------------------------------------------------------------------------
variable "gcp_project_number" {
  type        = string
  description = "The GCP project number."
}

# ------------------------------------------------------------------------------
# Variable for the name of the workload identity pool
# ------------------------------------------------------------------------------
variable "pool_name" {
  type        = string
  description = "The name of the workload identity pool."
  default     = "github-actions-pool"
}

# ------------------------------------------------------------------------------
# Variable for the service account ID
# ------------------------------------------------------------------------------
variable "service_account_id" {
  type        = string
  description = "The service account ID."
}