# Variable for the GCP project ID
variable "gcp_project" {
  type        = string
  description = "The GCP project ID."
}

# Variable for the list of roles to assign to the service account
variable "github_actions_roles" {
  type = set(string)
  description = "A list of roles to assign to the service account."
  default = [
    "roles/run.invoker",
  ]
}
