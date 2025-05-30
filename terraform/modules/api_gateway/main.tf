
# 1. Create the API
resource "google_api_gateway_api" "reomir_api" {
  provider     = google-beta
  project      = var.gcp_project_id
  api_id       = "reomir-api" # e.g., "reomir-agent-api"
  display_name = "Reomir API"
}

# 2. Create the API Config from the OpenAPI specification
resource "google_api_gateway_api_config" "reomir_api_config" {
  provider             = google-beta
  project              = var.gcp_project_id
  api                  = google_api_gateway_api.reomir_api.api_id
  api_config_id_prefix = "reomir-api-config" # e.g., "reomir-config"
  display_name         = "Reomir API Configuration"
  openapi_documents {
    document {
      path     = var.openapi_spec_path
      contents = base64encode(templatefile(var.openapi_spec_path, var.template_vars))
    }
  }

  # If reomir-agent is private and needs invocation by API Gateway's SA:
  gateway_config {
    backend_config {
      google_service_account = var.service_account_email
    }
  }

  lifecycle {
    create_before_destroy = true
  }
  depends_on = [google_api_gateway_api.reomir_api]
}

# 3. Deploy the API Config to a Gateway
resource "google_api_gateway_gateway" "reomir_gateway" {
  provider = google-beta

  project      = var.gcp_project_id
  api_config   = google_api_gateway_api_config.reomir_api_config.id
  gateway_id   = "reomir-gateway"
  region       = var.gcp_region
  display_name = "Reomir API Gateway"

  depends_on = [google_api_gateway_api_config.reomir_api_config]
}

# --- Output ---
output "url" {
  description = "The default hostname of the deployed API Gateway for Reomir."
  value       = "https://${google_api_gateway_gateway.reomir_gateway.default_hostname}"
}