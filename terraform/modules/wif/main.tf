# ------------------------------------------------------------------------------
# GCP Workload Identity Federation Pool for GitHub Actions
# ------------------------------------------------------------------------------
resource "google_iam_workload_identity_pool" "github_actions_pool" {
  project                   = var.gcp_project
  workload_identity_pool_id = var.pool_name
  display_name              = "GitHub Pool"
  description               = "Workload Identity Pool for GitHub Actions"
  disabled                  = false
}

# ------------------------------------------------------------------------------
# GCP Workload Identity Provider for GitHub OIDC
# ------------------------------------------------------------------------------
resource "google_iam_workload_identity_pool_provider" "github_provider" {
  project                            = var.gcp_project
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_actions_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub OIDC Provider"
  description                        = "OIDC Provider for GitHub Actions"
  attribute_condition                = "attribute.repository == 'nag763/reomir'"
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.aud"        = "assertion.aud"
    "attribute.repository" = "assertion.repository"
  }
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
  disabled = false
}

# ------------------------------------------------------------------------------
# Bind Service Account to Workload Identity Pool Provider
# ------------------------------------------------------------------------------
resource "google_service_account_iam_member" "wif_binding" {
  service_account_id = var.service_account_id
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/projects/${var.gcp_project_number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github_actions_pool.workload_identity_pool_id}/attribute.repository/nag763/reomir"
}
