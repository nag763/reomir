resource "google_firebase_project" "reomir_firebase" {
  provider = google-beta
  project  = var.gcp_project

}

resource "google_firestore_database" "database" {
  project     = var.gcp_project
  name        = "(default)"
  location_id = var.region         # Use the same region as App Engine
  type        = "FIRESTORE_NATIVE" # Use Native Mode
}

resource "google_firebase_web_app" "reomir_web_app" {
  provider     = google-beta
  project      = var.gcp_project
  display_name = "Reomir Web App"

  depends_on = [google_firebase_project.reomir_firebase]
}

output "firebase_app_id" {
  value = google_firebase_web_app.reomir_web_app.app_id
}
