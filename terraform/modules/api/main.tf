# ------------------------------------------------------------------------------
# Google Cloud API Enabler Module
# ------------------------------------------------------------------------------
# This module is responsible for enabling a list of specified Google Cloud APIs
# for a given project. It iterates through the provided list of API service
# names and enables each one.
# ------------------------------------------------------------------------------

# ------------------------------------------------------------------------------
# Resource to enable multiple Google Cloud APIs
# ------------------------------------------------------------------------------
# Enables each API specified in the 'var.apis' list for the project.
# The 'for_each' meta-argument iterates over the set of API names.
resource "google_project_service" "project_services" {
  for_each           = toset(var.apis) # Ensures unique API names and iterates over them
  project            = var.project_id  # The GCP project ID where APIs will be enabled
  service            = each.value      # The specific API service name to enable (e.g., "run.googleapis.com")
  disable_on_destroy = false           # Keeps APIs enabled even if this resource is destroyed, which is typical.
}
