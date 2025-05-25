resource "google_service_account" "service_account" {
  account_id = var.sa_id
  project    = var.gcp_project
}

resource "google_project_iam_member" "service_account_roles" {
  for_each = var.roles

  project = var.gcp_project
  role    = each.value
  member  = "serviceAccount:${google_service_account.service_account.email}"
}

output "id" {
  value = google_service_account.service_account.id
}

output "email" {
  value = google_service_account.service_account.email

}