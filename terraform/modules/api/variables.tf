
variable "apis" {
  description = "List of APIs to enable"
  type        = list(string)
}

variable "project_id" {
  description = "The project ID to enable the APIs for"
  type        = string
}
