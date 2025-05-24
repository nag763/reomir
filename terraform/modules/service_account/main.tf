resource "google_service_account" "github_actions_sa" {
  account_id   = "github-actions-deployer"
  display_name = "Service Account for GitHub Actions Cloud Run Deployments"
  project      = var.gcp_project
}

resource "google_project_iam_member" "github_actions_sa" {
  for_each = var.github_actions_roles

  project = var.gcp_project
  role    = each.value
  member  = "serviceAccount:${google_service_account.github_actions_sa.email}"
}

output "id" {
  value = google_service_account.github_actions_sa.id

}