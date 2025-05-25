# ------------------------------------------------------------------------------
# Define local variables
# ------------------------------------------------------------------------------
locals {
  region       = "europe-west1"
  project_name = "reomir"
}

# ------------------------------------------------------------------------------
# Configure Terraform settings
# ------------------------------------------------------------------------------
terraform {
  required_providers {
    # Configure the Google provider
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

# ------------------------------------------------------------------------------
# Configure the Google Cloud provider
# ------------------------------------------------------------------------------
provider "google" {
  # Specify the Google Cloud project ID
  project = local.project_name
  # Specify the Google Cloud region
  region = "europe-west1"
}

# ------------------------------------------------------------------------------
# Retrieve project information
# ------------------------------------------------------------------------------
data "google_project" "project" {
  # Retrieve information about the Google Cloud project
  project_id = local.project_name
}

# ------------------------------------------------------------------------------
# Module to enable required APIs
# ------------------------------------------------------------------------------
module "api" {
  source = "./modules/api"
  project_id = data.google_project.project.project_id
  apis = [
    "aiplatform.googleapis.com",
    "artifactregistry.googleapis.com",
    "run.googleapis.com",
    "logging.googleapis.com",
    "iam.googleapis.com",
    "identitytoolkit.googleapis.com",
    "iap.googleapis.com",
    "secretmanager.googleapis.com"
  ]
}

# ------------------------------------------------------------------------------
# Module for managing secrets
# ------------------------------------------------------------------------------
module "secret_manager" {
  source  = "./modules/secret_manager"
  secrets = var.secrets

  depends_on = [module.api]
}

# ------------------------------------------------------------------------------
# Module for managing Artifact Registry repository
# ------------------------------------------------------------------------------
module "repository" {
  source = "./modules/repository"

  gcp_region  = local.region
  gcp_project = data.google_project.project.project_id

  depends_on = [
    module.api
  ]
}

# ------------------------------------------------------------------------------
# Module for managing service account for GitHub Actions
# ------------------------------------------------------------------------------
module "service_account_gh" {
  source = "./modules/service_account"

  sa_id = "github-actions-deployer"

  gcp_project = data.google_project.project.project_id

  roles = [
    "roles/run.admin",
    "roles/artifactregistry.writer",
    "roles/iam.serviceAccountUser",
    "roles/cloudbuild.builds.editor",
  ]

  depends_on = [
    module.api
  ]
}

# ------------------------------------------------------------------------------
# Module for managing service account for frontend
# ------------------------------------------------------------------------------
module "service_account_front" {
  source = "./modules/service_account"

  sa_id = "cloudrun-front"

  gcp_project = data.google_project.project.project_id

  roles = [
    "roles/secretmanager.secretAccessor"
  ]

  depends_on = [
    module.api
  ]
}

# ------------------------------------------------------------------------------
# Module for configuring Workload Identity Federation
# ------------------------------------------------------------------------------
module "wif" {
  source = "./modules/wif"

  gcp_project        = data.google_project.project.project_id
  gcp_project_number = data.google_project.project.number

  pool_name          = "gh-actions-pool"
  issuer_uri         = "https://token.actions.githubusercontent.com"
  service_account_id = module.service_account_gh.id

  depends_on = [
    module.api
  ]
}

# ------------------------------------------------------------------------------
# Module for deploying Cloud Run service for agent
# ------------------------------------------------------------------------------
module "cloudrun_agent" {
  source = "./modules/cloudrun"

  gcp_region   = local.region
  gcp_project  = data.google_project.project.project_id
  image        = "${local.region}-docker.pkg.dev/${local.project_name}/${local.project_name}/reomir-agent:latest"
  service_name = "reomir-agent"

  depends_on = [
    module.api,
    module.repository,
  ]
}

# ------------------------------------------------------------------------------
# Module for deploying Cloud Run service for frontend
# ------------------------------------------------------------------------------
module "cloudrun_front" {
  source = "./modules/cloudrun"

  gcp_region     = local.region
  gcp_project    = data.google_project.project.project_id
  image          = "${local.region}-docker.pkg.dev/${local.project_name}/${local.project_name}/reomir-front:latest"
  service_name   = "reomir-front"
  open_to_public = true

  service_account_email = module.service_account_front.email

  environment_variables = [
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
    }
  ]

  container_port = 3000

  depends_on = [
    module.api,
    module.secret_manager
  ]
}
