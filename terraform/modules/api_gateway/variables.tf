variable "gcp_project_id" {
  description = "Your GCP Project ID."
  type        = string
}

variable "gcp_region" {
  description = "The GCP region for the API Gateway."
  type        = string
  default     = "europe-west1" # Or your preferred region
}

variable "openapi_spec_path" {
  description = "Path to the OpenAPI specification file."
  type        = string
  default     = "openapi-agent.yaml" # Assumes it's in the same directory
}

variable "service_account_email" {
  description = "Service account email for the API Gateway invoker."
  type        = string
}

variable "template_vars" {
  description = "A map of variables to replace in the OpenAPI spec template."
  type        = map(string)
  default     = {}
}