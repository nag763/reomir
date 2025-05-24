variable "gcp_project_id" {
  type        = string
  description = "The GCP project ID."
}

variable "gcp_project_number" {
  type        = string
  description = "The GCP project number."
}

variable "pool_name" {
  type        = string
  description = "The name of the workload identity pool."
  default     = "github-actions-pool"
}

variable "issuer_uri" {
  type        = string
  description = "The issuer URI for the workload identity pool."
  default     = "https://accounts.google.com"
  
}
variable "service_account_id" {
  type        = string
  description = "The service account ID to bind to the workload identity pool provider."
}