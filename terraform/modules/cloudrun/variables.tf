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