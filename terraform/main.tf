# Define local variables
locals {
  region       = "europe-west1"
  project_name = "reomir"
}

# Configure Terraform settings
terraform {
  required_providers {
    # Configure the Google provider
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

# Configure the Google Cloud provider
provider "google" {
  # Specify the Google Cloud project ID
  project = local.project_name
  # Specify the Google Cloud region
  region = "europe-west1"
}

# Retrieve project information
data "google_project" "project" {
  # Retrieve information about the Google Cloud project
  project_id = local.project_name
}

# Module to enable required APIs
module "api" {
  source = "./modules/api"
  # Enable required Google Cloud APIs

  project_id = data.google_project.project.project_id
  apis = [
    "aiplatform.googleapis.com",
    "artifactregistry.googleapis.com",
    "run.googleapis.com",
    "logging.googleapis.com",
    "iam.googleapis.com",
  ]
}

# Module for deploying Cloud Run service
module "cloudrun" {
  source = "./modules/cloudrun"

  # Specify the GCP region and project ID
  gcp_region            = local.region
  gcp_project           = data.google_project.project.project_id
  image                 = "${local.region}.pkg.dev/${local.project_name}/${local.project_name}/agent:latest"

  depends_on = [
    module.api,
    module.repository,
  ]
}

# Module for managing Artifact Registry repository
module "repository" {
  source = "./modules/repository"

  # Specify the GCP region and project ID
  gcp_region  = local.region
  gcp_project = data.google_project.project.project_id

  depends_on = [
    module.api
  ]
}

# Module for managing service account
module "service_account" {
  source = "./modules/service_account"

  # Specify the GCP project ID
  gcp_project = data.google_project.project.project_id

  github_actions_roles = [
    "roles/run.admin",                # For Cloud Run deployments
    "roles/artifactregistry.writer",  # For pushing Docker images
    "roles/iam.serviceAccountUser",   # Allows SA to impersonate itself for Cloud Run runtime
    "roles/cloudbuild.builds.editor", # For Cloud Build implicit build from source
  ]

  depends_on = [
    module.api
  ]
}

# Module for configuring Workload Identity Federation
module "wif" {
  source = "./modules/wif"

  # Specify the GCP project ID
  gcp_project     = data.google_project.project.project_id
  gcp_project_number = data.google_project.project.number

  pool_name          = "github-actions-pool"
  issuer_uri         = "https://token.actions.githubusercontent.com"
  service_account_id = module.service_account.id

  depends_on = [
    module.api
  ]
}
