# ------------------------------------------------------------------------------
# Variable for the GCP region
# ------------------------------------------------------------------------------
variable "gcp_region" {
  type        = string
  description = "The GCP region to deploy to."
}

# ------------------------------------------------------------------------------
# Variable for the GCP project ID
# ------------------------------------------------------------------------------
variable "gcp_project" {
  type        = string
  description = "The GCP project ID."
}

# ------------------------------------------------------------------------------
# Variable for the Docker image
# ------------------------------------------------------------------------------
variable "image" {
  type        = string
  description = "The Docker image to deploy."
}

# ------------------------------------------------------------------------------
# Variable for the service name
# ------------------------------------------------------------------------------
variable "service_name" {
  type        = string
  description = "The name of the Cloud Run service."
}

# ------------------------------------------------------------------------------
# Variable to control public access
# ------------------------------------------------------------------------------
variable "open_to_public" {
  type        = bool
  default     = false
  description = "Whether the service is open to the public."
}

# ------------------------------------------------------------------------------
# Variable for the service account email
# ------------------------------------------------------------------------------
variable "service_account_email" {
  type        = string
  default     = null
  description = "The email of the service account to use."
}

# ------------------------------------------------------------------------------
# Variable for environment variables
# ------------------------------------------------------------------------------
variable "environment_variables" {
  type = list(object({
    name  = string
    value = optional(string)
    secret_ref = optional(object({
      secret_id = string
      version   = string
    }))
  }))
  default     = []
  description = "A list of environment variables to set on the container."
}

# ------------------------------------------------------------------------------
# Variable for the container port
# ------------------------------------------------------------------------------
variable "container_port" {
  type        = number
  default     = 8000
  description = "The port the container listens on."
}
