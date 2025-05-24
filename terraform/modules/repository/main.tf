resource "google_artifact_registry_repository" "default" {
  location      = var.gcp_region
  repository_id = "reomir"
  project       = var.gcp_project
  description   = "Docker repository"
  format        = "DOCKER"
}