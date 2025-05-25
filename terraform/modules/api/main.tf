# ------------------------------------------------------------------------------
# Resource to enable Google Cloud APIs
# ------------------------------------------------------------------------------
resource "google_project_service" "project_services" {
  for_each         = toset(var.apis)
  project          = var.project_id
  service          = each.value
  disable_on_destroy = false
}
