# ------------------------------------------------------------------------------
# GCP Cloud Run Service for app deployment
# ------------------------------------------------------------------------------
resource "google_cloud_run_v2_service" "default" {
  name     = var.service_name
  location = var.gcp_region
  project  = var.gcp_project

  template {


    service_account = var.service_account_email

    containers {
      image = var.image

      ports {
        container_port = var.container_port
      }

      resources {
        cpu_idle          = true
        startup_cpu_boost = true

        limits = {
          "cpu"    = var.cpu
          "memory" = var.memory
        }
      }

      dynamic "env" {
        for_each = var.environment_variables

        content {
          name = env.value.name

          # Set value only if secret_ref is not defined
          value = try(env.value.secret_ref, null) == null ? env.value.value : null

          # Set value_source only if secret_ref is defined
          dynamic "value_source" {
            for_each = try(env.value.secret_ref, null) != null ? [env.value.secret_ref] : []
            content {
              secret_key_ref {
                # Construct the full secret resource name: projects/PROJECT_ID/secrets/SECRET_ID
                secret  = value_source.value.secret_id
                version = value_source.value.version
              }
            }
          }
        }

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

  deletion_protection = false

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

output "url" {
  description = "The URL of the Cloud Run service."
  value       = google_cloud_run_v2_service.default.uri
}
