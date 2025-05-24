# ------------------------------------------------------------------------------
# GCP Cloud Run Service for app deployment
# ------------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "default" {
  name     = "reomir-assistant"
  location = var.gcp_region
  project  = var.gcp_project

  template {
    containers {
      image = var.image
      # Map to port 8000
      ports {
        container_port = 8000
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
