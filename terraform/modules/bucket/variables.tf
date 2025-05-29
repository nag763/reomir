variable "name" {
  description = "The name of the Google Cloud Storage bucket."
  type        = string
}

variable "gcp_project" {
  description = "The GCP project ID where resources will be created."
  type        = string
}

variable "location" {
  description = "The GCP region where resources will be created."
  type        = string
}
