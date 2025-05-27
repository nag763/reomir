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
    # Configure the Google provider
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

# Generate a random integer
resource "random_integer" "project_id" {
  min = 1
  max = 10000
  keepers = {
    # Generate a new integer each time the project name changes
    name = "reomir"
  }
}


# ------------------------------------------------------------------------------
# Configure the Google Cloud provider
# ------------------------------------------------------------------------------
provider "google" {
  # Specify the Google Cloud region
  region                = "europe-west1"
  user_project_override = true
}

# ------------------------------------------------------------------------------
# Retrieve project information
# ------------------------------------------------------------------------------
resource "google_project" "reomir" {
  name       = "reomir"
  project_id = "reomir-${random_integer.project_id.result}"

  billing_account = var.billing_account
  deletion_policy = "DELETE"
}

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
# Module to enable required APIs
# ------------------------------------------------------------------------------
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
    "firebase.googleapis.com",
    "firestore.googleapis.com",
  ]
  depends_on = [module.prioritized_api]
}

# ------------------------------------------------------------------------------
# Module for managing secrets
# ------------------------------------------------------------------------------
module "secret_manager" {
  source      = "./modules/secret_manager"
  secrets     = var.secrets
  gcp_project = google_project.reomir.project_id

  depends_on = [module.api]
}

# ------------------------------------------------------------------------------
# Module for managing Artifact Registry repository
# ------------------------------------------------------------------------------
module "repository" {
  source = "./modules/repository"

  gcp_region  = local.region
  gcp_project = google_project.reomir.project_id

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

  gcp_project = google_project.reomir.project_id

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

  gcp_project = google_project.reomir.project_id

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

  gcp_project        = google_project.reomir.project_id
  gcp_project_number = google_project.reomir.number

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
  gcp_project  = google_project.reomir.project_id
  image        = "${module.repository.location}-docker.pkg.dev/${module.repository.project}/${module.repository.repository_id}/reomir-agent:latest"
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
  gcp_project    = google_project.reomir.project_id
  image          = "${module.repository.location}-docker.pkg.dev/${module.repository.project}/${module.repository.repository_id}/reomir-front:latest"
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
    },
    {
      name = "FIREBASE_API_KEY",
      secret_ref = {
      secret_id = module.secret_manager.secrets_id["FIREBASE_API_KEY"]
      version   = "latest"
      }
    },
    {
      name = "FIREBASE_AUTH_DOMAIN",
      secret_ref = {
      secret_id = module.secret_manager.secrets_id["FIREBASE_AUTH_DOMAIN"]
      version   = "latest"
      }
    },
    {
      name = "FIREBASE_PROJECT_ID",
      secret_ref = {
      secret_id = module.secret_manager.secrets_id["FIREBASE_PROJECT_ID"]
      version   = "latest"
      }
    },
    {
      name = "FIREBASE_STORAGE_BUCKET",
      secret_ref = {
      secret_id = module.secret_manager.secrets_id["FIREBASE_STORAGE_BUCKET"]
      version   = "latest"
      }
    },
    {
      name = "FIREBASE_MESSAGING_SENDER_ID",
      secret_ref = {
      secret_id = module.secret_manager.secrets_id["FIREBASE_MESSAGING_SENDER_ID"]
      version   = "latest"
      }
    },
    {
      name = "FIREBASE_APP_ID",
      secret_ref = {
      secret_id = module.secret_manager.secrets_id["FIREBASE_APP_ID"]
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

# ------------------------------------------------------------------------------
# Module for deploying Firebase
# ------------------------------------------------------------------------------
module "firebase" {
  source          = "./modules/firebase"
  firestore_rules = ["firestore.rules"]

  gcp_project = google_project.reomir.project_id
  region      = local.region

  depends_on = [
    module.api,
    module.secret_manager
  ]
}


output "project_name" {
  value = google_project.reomir.name
}

output "project_id" {
  value = google_project.reomir.project_id
}

output "cloudrun_front_image" {
  value = "${module.repository.location}-docker.pkg.dev/${module.repository.project}/${module.repository.repository_id}/reomir-front:latest"
}

output "cloudrun_agent_image" {
  value = "${module.repository.location}-docker.pkg.dev/${module.repository.project}/${module.repository.repository_id}/reomir-agent:latest"
}
