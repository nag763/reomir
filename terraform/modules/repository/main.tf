resource "google_artifact_registry_repository" "docker_repo" {
  location      = var.gcp_region
  repository_id = var.gcp_project
  description   = "Docker repository for Cloud Run images"
  format        = "DOCKER"
}