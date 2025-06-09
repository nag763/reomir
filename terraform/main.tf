# ------------------------------------------------------------------------------
# Root Terraform Configuration for Reomir Project
# ------------------------------------------------------------------------------
# This file defines the core infrastructure for the Reomir project,
# including project setup, API enablement, service accounts, Cloud Run services
# for frontend and agent, Cloud Functions, and API Gateway.
# It orchestrates various modules to deploy all necessary components.
# ------------------------------------------------------------------------------

# ------------------------------------------------------------------------------
# Define local variables
# ------------------------------------------------------------------------------
locals {
  region = "europe-west1"
}

# ------------------------------------------------------------------------------
# Configure Terraform settings
# ------------------------------------------------------------------------------
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

# ------------------------------------------------------------------------------
# Additional modules and resources
# ------------------------------------------------------------------------------

# Generate a random integer to ensure project ID uniqueness if not explicitly set.
# This helps in creating a unique project ID suffix.
resource "random_integer" "project_id" {
  min = 1
  max = 10000
  keepers = {
    # Generate a new integer each time the base project name changes
    name = "reomir"
  }
}


provider "google" {
  region                = "europe-west1"
  user_project_override = true
}

# ------------------------------------------------------------------------------
# Create or import the Google Cloud Project
# ------------------------------------------------------------------------------
resource "google_project" "reomir" {
  name       = "reomir"
  project_id = "reomir-${random_integer.project_id.result}"

  billing_account = var.billing_account
  deletion_policy = "DELETE" # Ensures project is deleted when 'terraform destroy' is run.
}

# Enables the Service Usage API, necessary for Terraform to manage other service APIs.
module "service_usage_api" {
  source     = "./modules/api"
  project_id = google_project.reomir.project_id
  apis = [
    "serviceusage.googleapis.com"
  ]

  depends_on = [google_project.reomir]
}

module "prioritized_api" {
  source = "./modules/api"

  project_id = google_project.reomir.project_id
  apis = [
    "appengine.googleapis.com",
    "cloudresourcemanager.googleapis.com"
  ]

  depends_on = [module.service_usage_api]
}

# ------------------------------------------------------------------------------
# Module to enable core and product-specific Google Cloud APIs
# ------------------------------------------------------------------------------
# This enables all necessary APIs for the project's services to function.
module "api" {
  source     = "./modules/api"
  project_id = google_project.reomir.project_id
  apis = [
    "aiplatform.googleapis.com",
    "artifactregistry.googleapis.com",
    "run.googleapis.com",
    "logging.googleapis.com",
    "iam.googleapis.com",
    "identitytoolkit.googleapis.com",
    "iap.googleapis.com",
    "secretmanager.googleapis.com",
    "apigateway.googleapis.com",
    "servicemanagement.googleapis.com",
    "servicecontrol.googleapis.com",
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com",
    "iamcredentials.googleapis.com",
    "firestore.googleapis.com",
    "cloudkms.googleapis.com"
  ]
  depends_on = [module.prioritized_api]
}

# ------------------------------------------------------------------------------
# Module for managing secrets in Google Secret Manager
# ------------------------------------------------------------------------------
# Stores sensitive configuration like API keys and secrets.
module "secret_manager" {
  source      = "./modules/secret_manager"
  secrets     = var.secrets
  gcp_project = google_project.reomir.project_id

  depends_on = [module.api]
}

# ------------------------------------------------------------------------------
# Module for managing Artifact Registry repository for Docker images
# ------------------------------------------------------------------------------
# Creates a repository to store Docker images for Cloud Run services.
module "repository" {
  source = "./modules/repository"

  gcp_region  = local.region
  gcp_project = google_project.reomir.project_id

  depends_on = [
    module.api
  ]
}

# Configures Firestore in Native mode for the project.
module "firestore" {
  source = "./modules/firestore"

  gcp_project = google_project.reomir.project_id
  location    = local.region

  depends_on = [
    module.api
  ]
}

# ------------------------------------------------------------------------------
# Module for managing the service account for GitHub Actions CI/CD
# ------------------------------------------------------------------------------
# This service account is used by GitHub Actions to deploy resources.
module "service_account_gh" {
  source = "./modules/service_account"

  sa_id = "github-actions-deployer"

  gcp_project = google_project.reomir.project_id

  roles = [
    "roles/run.admin",                # For managing Cloud Run services
    "roles/artifactregistry.writer",  # For pushing images to Artifact Registry
    "roles/iam.serviceAccountUser",   # For impersonating other service accounts if needed
    "roles/cloudbuild.builds.editor", # For submitting builds
    "roles/cloudfunctions.developer"  # For deploying Cloud Functions
  ]

  depends_on = [
    module.api
  ]
}

module "kms_config" {
  source = "./modules/kms"

  project_id      = google_project.reomir.project_id
  location        = local.region
  key_ring_name   = "reomir-keyring"
  crypto_key_name = "reomir-key"
  sa_encrypter    = [module.service_account_gh_fn.email]
  sa_decrypter    = [module.service_account_users_fn.email]

  depends_on = [
    module.api,
    module.repository,
    module.service_account_gh,
    module.service_account_front,
    module.wif
  ]
}

module "service_account_gh_fn" {
  source = "./modules/service_account"

  sa_id = "github-integration-function"

  gcp_project = google_project.reomir.project_id

  roles = [
    "roles/secretmanager.secretAccessor", # For GITHUB_CLIENT_ID etc.
    "roles/datastore.user"                # For Firestore access
  ]

  depends_on = [
    module.api
  ]
}

# Service account for the 'users' function
module "service_account_users_fn" {
  source = "./modules/service_account"

  sa_id = "users-function"

  gcp_project = google_project.reomir.project_id

  roles = [
    "roles/datastore.user" # For Firestore access
    # KMS decrypter will be added via kms.tf
  ]

  depends_on = [
    module.api
  ]
}


# Service account for API Gateway to invoke backend services.
module "service_account_apigw" {
  source = "./modules/service_account"

  sa_id = "apigateway"

  gcp_project = google_project.reomir.project_id

  roles = [
    "roles/run.invoker"
  ]

  depends_on = [
    module.api
  ]
}

# Service account for API Gateway to invoke backend services.
module "service_account_agent_mapper" {
  source = "./modules/service_account"

  sa_id = "agentmapper"

  gcp_project = google_project.reomir.project_id

  roles = [
    "roles/run.invoker"
  ]

  depends_on = [
    module.api
  ]
}


# ------------------------------------------------------------------------------
# Module for managing the service account for the frontend Cloud Run service
# ------------------------------------------------------------------------------
# Grants frontend service necessary permissions (e.g., access secrets).
module "service_account_front" {
  source = "./modules/service_account"

  sa_id = "cloudrun-front" # Service account ID for the frontend

  gcp_project = google_project.reomir.project_id

  roles = [
    "roles/secretmanager.secretAccessor" # Allows access to secrets stored in Secret Manager
  ]

  depends_on = [
    module.api
  ]
}

# ------------------------------------------------------------------------------
# Module for configuring Workload Identity Federation for GitHub Actions
# ------------------------------------------------------------------------------
# Allows GitHub Actions to securely authenticate with GCP using OIDC.
module "wif" {
  source = "./modules/wif"

  gcp_project        = google_project.reomir.project_id
  gcp_project_number = google_project.reomir.number

  pool_name          = "gh-actions-pool"
  service_account_id = module.service_account_gh.id

  depends_on = [
    module.api
  ]
}

# ------------------------------------------------------------------------------
# Module for deploying the backend agent as a Cloud Run service
# ------------------------------------------------------------------------------
# Deploys the Python-based backend agent.
module "cloudrun_agent" {
  source = "./modules/cloudrun"

  gcp_region   = local.region # Deploys to the defined local region
  gcp_project  = google_project.reomir.project_id
  image        = "${module.repository.location}-docker.pkg.dev/${module.repository.project}/${module.repository.repository_id}/reomir-agent:latest"
  service_name = "reomir-agent"

  environment_variables = [
    {
      name  = "GOOGLE_GENAI_USE_VERTEXAI",
      value = "1"
    },
    {
      name  = "GOOGLE_CLOUD_PROJECT",
      value = google_project.reomir.project_id
    },
    {
      name  = "GOOGLE_CLOUD_LOCATION",
      value = local.region
    },

  ]

  memory = "1Gi"

  depends_on = [
    module.api,
    module.repository,
  ]
}

# ------------------------------------------------------------------------------
# Module for deploying the Next.js frontend as a Cloud Run service
# ------------------------------------------------------------------------------
# Deploys the user-facing web application.
module "cloudrun_front" {
  source = "./modules/cloudrun"

  gcp_region     = local.region # Deploys to the defined local region
  gcp_project    = google_project.reomir.project_id
  image          = "${module.repository.location}-docker.pkg.dev/${module.repository.project}/${module.repository.repository_id}/reomir-front:latest" # Image from Artifact Registry
  service_name   = "reomir-front"
  open_to_public = true # Makes the frontend publicly accessible

  service_account_email = module.service_account_front.email # Assigns dedicated SA

  environment_variables = [ # Environment variables, including secrets
    {
      name = "NEXTAUTH_SECRET",
      secret_ref = {
        secret_id = module.secret_manager.secrets_id["NEXTAUTH_SECRET"]
        version   = "latest"
      }
    },
    {
      name = "NEXTAUTH_URL",
      secret_ref = {
        secret_id = module.secret_manager.secrets_id["NEXTAUTH_URL"]
        version   = "latest"
      }
    },
    {
      name = "GOOGLE_CLIENT_ID",
      secret_ref = {
        secret_id = module.secret_manager.secrets_id["GOOGLE_CLIENT_ID"]
        version   = "latest"
      }
    },
    {
      name = "GOOGLE_CLIENT_SECRET",
      secret_ref = {
        secret_id = module.secret_manager.secrets_id["GOOGLE_CLIENT_SECRET"]
        version   = "latest"
      }
    },
  ]

  container_port = 3000

  depends_on = [
    module.api,
    module.secret_manager,
    module.service_account_front
  ]
}

module "function_bucket" {
  source = "./modules/bucket"

  name        = "reomir-function-bucket" # Name for the GCS bucket
  location    = local.region
  gcp_project = google_project.reomir.project_id
}

# Deploys the Cloud Function for user management.
module "function_user" {
  source = "./modules/functions"

  gcp_project = google_project.reomir.project_id
  location    = local.region

  bucket_name   = module.function_bucket.name # Source bucket for the function code
  bucket_object = "reomir-users.zip"          # Zipped source code in the bucket

  environment_variables = {
    LOG_EXECUTION_ID = "true" # Example environment variable
  }

  function_name         = "reomir-users"                        # Name of the Cloud Function
  entry_point           = "handler"                             # Entry point function in the code
  service_account_email = module.service_account_users_fn.email # Assign dedicated SA

  depends_on = [
    module.service_account_users_fn # Ensure SA is created first
  ]
}

# Deploys the Cloud Function for user management.
module "function_session_mapper" {
  source = "./modules/functions"

  gcp_project = google_project.reomir.project_id
  location    = local.region

  bucket_name   = module.function_bucket.name
  bucket_object = "reomir-session-mapper.zip"

  environment_variables = {
    LOG_EXECUTION_ID   = "true"
    CLOUDRUN_AGENT_URL = module.cloudrun_agent.url
    SA_PRINCIPAL       = module.service_account_agent_mapper.email
  }

  service_account_email = module.service_account_agent_mapper.email

  function_name = "reomir-session-mapper"
  entry_point   = "handler"
}

# Deploys the Cloud Function for GitHub integration.
module "function_github_integration" {
  source = "./modules/functions"

  gcp_project = google_project.reomir.project_id
  location    = local.region

  bucket_name   = module.function_bucket.name
  bucket_object = "reomir-github-integration.zip" # Will be created by build_and_zip.sh

  environment_variables = {
    LOG_EXECUTION_ID     = "true"
    FRONTEND_URL         = module.cloudrun_front.url # Placeholder - to be configured as needed
    GOOGLE_CLOUD_PROJECT = google_project.reomir.project_id
    KMS_KEY_NAME         = module.kms_config.crypto_key_name
    KMS_KEY_RING         = module.kms_config.key_ring_name
    KMS_LOCATION         = local.region

  }

  secret_environment_variables = ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "API_GATEWAY_BASE_URL"]

  function_name         = "reomir-github-integration"
  entry_point           = "handler"
  service_account_email = module.service_account_gh_fn.email

  depends_on = [
    module.service_account_gh_fn,
    module.secret_manager
  ]
}

# Deploys the API Gateway to expose backend services.
module "api_gateway" {
  source = "./modules/api_gateway"

  gcp_project_id    = google_project.reomir.project_id
  openapi_spec_path = "./swagger.yaml"


  template_vars = {
    CLOUDRUN_AGENT_URL          = module.cloudrun_agent.url
    CLOUDFUN_USER_URL           = module.function_user.url
    CLOUDFUN_GITHUB_URL         = module.function_github_integration.url # Add new function URL
    GOOGLE_OAUTH_CLIENT_ID      = var.secrets["GOOGLE_CLIENT_ID"]
    CLOUFRUN_SESSION_MAPPER_URL = module.function_session_mapper.url
  }

  service_account_email = module.service_account_apigw.email

  depends_on = [
    module.cloudrun_agent,
    module.cloudrun_front,
    module.function_session_mapper,
    module.service_account_gh,
    module.service_account_front,
    module.wif
  ]

}

output "project_name" {
  value = google_project.reomir.name
}

output "project_id" {
  value = google_project.reomir.project_id
}

output "project_number" {
  value = google_project.reomir.number

}

output "cloudrun_front_image" {
  value = "${module.repository.location}-docker.pkg.dev/${module.repository.project}/${module.repository.repository_id}/reomir-front:latest"
}

output "cloudrun_agent_image" {
  value = "${module.repository.location}-docker.pkg.dev/${module.repository.project}/${module.repository.repository_id}/reomir-agent:latest"
}

output "gateway_url" {
  description = "The URL of the deployed API Gateway."
  value       = module.api_gateway.url
}
