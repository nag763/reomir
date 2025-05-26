variable "gcp_project" {
  type        = string
  description = "The GCP project ID."
}

variable "region" {
  type        = string
  description = "The GCP region to deploy to."

}

variable "firestore_rules" {
  type        = list(string)
  description = "The Firestore rules to apply. Each rule should be a string."
  default     = []
}