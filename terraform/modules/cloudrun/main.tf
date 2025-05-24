# ------------------------------------------------------------------------------
# GCP Cloud Run Service for app deployment
# ------------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "default" {
  name     = var.service_name
  location = var.gcp_region
  project  = var.gcp_project

  template {
    containers {
      image = var.image
      # Map to port 8000
      ports {
        container_port = var.container_port
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }

    # Optional: Timeout in seconds for requests
    timeout = "600s" # 5 minutes
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  # Ignore some values
  lifecycle {
    ignore_changes = [
      client,
      client_version,
      template[0].labels
    ]
  }
}

resource "google_cloud_run_service_iam_member" "noauth" {
  count    = var.open_to_public ? 1 : 0
  location = google_cloud_run_v2_service.default.location
  project  = google_cloud_run_v2_service.default.project
  service  = google_cloud_run_v2_service.default.name

  role   = "roles/run.invoker"
  member = "allUsers"
}