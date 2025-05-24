# Variable for the GCP region
variable "gcp_region" {
  type        = string
  description = "The GCP region to deploy to."
}

# Variable for the GCP project ID
variable "gcp_project" {
  type        = string
  description = "The GCP project ID."
}
