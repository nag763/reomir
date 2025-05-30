# ------------------------------------------------------------------------------
# Variable for the project ID
# ------------------------------------------------------------------------------
variable "project_id" {
  type        = string
  description = "The ID of the project"
}

# ------------------------------------------------------------------------------
# Variable for the list of APIs to enable
# ------------------------------------------------------------------------------
variable "apis" {
  type        = list(string)
  description = "A list of APIs to enable"
}
