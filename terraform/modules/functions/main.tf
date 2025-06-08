resource "google_cloudfunctions2_function" "function" {
  project     = var.gcp_project
  name        = var.function_name
  description = "A simple Cloud Function to manage users logic."
  location    = var.location

  build_config {
    runtime     = "python313"
    entry_point = var.entry_point

    source {
      storage_source {
        bucket = var.bucket_name
        object = var.bucket_object
      }

    }
  }

  service_config {
    all_traffic_on_latest_revision = true
    available_cpu                  = "0.1666"
    available_memory               = "256Mi"
    environment_variables          = var.environment_variables
    dynamic "secret_environment_variables" {
      for_each = toset(var.secret_environment_variables)

      content {
        key        = secret_environment_variables.key
        project_id = var.gcp_project
        secret     = secret_environment_variables.key
        version    = "latest"
      }
    }
    ingress_settings                 = "ALLOW_ALL"
    max_instance_count               = 20
    max_instance_request_concurrency = 1
    min_instance_count               = 0

    service_account_email = var.service_account_email
  }
}

output "url" {
  value = google_cloudfunctions2_function.function.url
}
