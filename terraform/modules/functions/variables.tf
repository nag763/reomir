variable "gcp_project" {
  description = "The GCP project ID where resources will be created."
  type        = string
}

variable "bucket_name" {
  description = "The name of the Google Cloud Storage bucket to store function source code."
  type        = string
}

variable "function_name" {
  description = "The name of the Cloud Function."
  type        = string
}

variable "location" {
  description = "The GCP region where the function will be deployed."
  type        = string
}

variable "bucket_object" {
  description = "The name of the object in the bucket containing the function source code."
  type        = string
}

variable "entry_point" {
  description = "The name of the function (within the source code) that will be executed."
  type        = string
}

variable "environment_variables" {
  description = "A map of environment variables to set for the function."
  type        = map(string)
  default     = {}
}

variable "secret_environment_variables" {
  description = "A map of environment variables to set for the function."
  type        = list(string)
  default     = []
}

variable "service_account_email" {
  description = "The email of the service account to use for the function."
  type        = string
  default     = null
}
