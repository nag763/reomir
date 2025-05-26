# ------------------------------------------------------------------------------
# Create Secret Manager secrets
# ------------------------------------------------------------------------------
resource "google_secret_manager_secret" "secret" {
  for_each  = var.secrets
  secret_id = each.key
  project   = var.gcp_project
  replication {
    auto {

    }
  }
}

# ------------------------------------------------------------------------------
# Add secret versions
# ------------------------------------------------------------------------------
resource "google_secret_manager_secret_version" "secret_version" {
  for_each    = var.secrets
  secret      = google_secret_manager_secret.secret[each.key].id
  secret_data = each.value
}

# ------------------------------------------------------------------------------
# Output the secret IDs
# ------------------------------------------------------------------------------
output "secrets_id" {
  description = "A map of logical secret names to their full Secret Manager resource IDs."
  value = {
    # Correctly iterate over the map created by for_each
    for k, v in google_secret_manager_secret.secret :
    # Map the key (e.g., "GOOGLE_CLIENT_ID") to the full resource ID (v.id)
    k => v.id
  }
}