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
    available_memory               = "256M"
    environment_variables = {
      LOG_EXECUTION_ID = "true"
    }
    ingress_settings                 = "ALLOW_ALL"
    max_instance_count               = 20
    max_instance_request_concurrency = 1
    min_instance_count               = 0

  }
}

output "url" {
  value = google_cloudfunctions2_function.function.url
}
