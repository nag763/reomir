terraform {
  required_providers {
    # Configure the Google provider
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  # Specify the Google Cloud project ID
  project = "reomir"
  # Specify the Google Cloud region
  region  = "europe-west1"
}

data "google_project" "project" {
  # Retrieve information about the Google Cloud project
  project_id = "reomir"
}


module "api" {
  source = "./modules/api"
  # Enable required Google Cloud APIs

  project_id = data.google_project.project.project_id
  apis = [
    "aiplatform.googleapis.com",
  ]
}
