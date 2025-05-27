# ------------------------------------------------------------------------------
# Create artifact registry
# ------------------------------------------------------------------------------
resource "google_artifact_registry_repository" "default" {
  location      = var.gcp_region
  repository_id = "reomir"
  project       = var.gcp_project
  description   = "Docker repository"
  format        = "DOCKER"
}

output "location" {
  value = google_artifact_registry_repository.default.location
}

output "project" {
  value = google_artifact_registry_repository.default.project
}

output "repository_id" {
  value = google_artifact_registry_repository.default.repository_id
}