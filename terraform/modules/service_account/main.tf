# ------------------------------------------------------------------------------
# Create service account
# ------------------------------------------------------------------------------
resource "google_service_account" "service_account" {
  account_id   = var.sa_id
  display_name = "Service Account for ${var.sa_id}"
  project      = var.gcp_project
}

# ------------------------------------------------------------------------------
# Grant roles to service account
# ------------------------------------------------------------------------------
resource "google_project_iam_member" "iam_member" {
  for_each = var.roles

  project = var.gcp_project
  role    = each.value
  member  = "serviceAccount:${google_service_account.service_account.email}"
}

# ------------------------------------------------------------------------------
# Output the service account ID and email
# ------------------------------------------------------------------------------
output "id" {
  value = google_service_account.service_account.id
}

output "email" {
  value = google_service_account.service_account.email
}