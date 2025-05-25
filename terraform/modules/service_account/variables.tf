# Variable for the GCP project ID
variable "gcp_project" {
  type        = string
  description = "The GCP project ID."
}

variable "sa_id" {
  type        = string
  description = "The name of the service account to create."
}


# Variable for the list of roles to assign to the service account
variable "roles" {
  type        = set(string)
  description = "A list of roles to assign to the service account."
  default = [
    "roles/run.invoker",
  ]
}
