resource "google_storage_bucket" "bucket" {
  name     = var.name
  location = var.location
  project  = var.gcp_project
}

output "name" {
  value = google_storage_bucket.bucket.name
}