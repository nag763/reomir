variable "gcp_region" {
  type        = string
  description = "The GCP region to deploy to."
}

variable "gcp_project" {
  type        = string
  description = "The GCP project ID."
}

variable "image" {
  type        = string
  description = "The Docker image to deploy."
}

variable "service_name" {
  type        = string
  description = "The name of the Cloud Run service."

}

variable "container_port" {
  type        = number
  description = "The port the container listens on."
  default     = 8000
}

variable "open_to_public" {
  type        = bool
  description = "Whether to allow unauthenticated invocations."
  default     = false
}

variable "service_account_email" {
  type        = string
  description = "The email of the service account to use for the Cloud Run service."
  default     = null
}

variable "environment_variables" {
  description = "A list of environment variables to pass to the container. For each item, provide either 'value' or 'secret_ref'."
  type = list(object({
    name  = string
    value = optional(string)
    secret_ref = optional(object({
      secret_id = string # The ID of the secret (e.g., "db-password")
      version   = string # The version of the secret (e.g., "latest" or "1")
    }))
  }))
  default = []

  validation {
    condition = alltrue([
      for v in var.environment_variables :
      (v.value != null && v.secret_ref == null) || (v.value == null && v.secret_ref != null)
    ])
    error_message = "For each environment variable, you must provide either 'value' or 'secret_ref', but not both."
  }
}
