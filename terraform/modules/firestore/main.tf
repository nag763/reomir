resource "google_firestore_database" "database" {
  project     = var.gcp_project
  name        = "(default)"
  location_id = var.location
  type        = "FIRESTORE_NATIVE"

}
