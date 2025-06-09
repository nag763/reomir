# Installation Guide

## Prerequisites

*   A Google Cloud Account (a generous free tier is available).
*   `gcloud` configured locally. See: <https://cloud.google.com/sdk/docs/install>
*   Terraform installed. See: <https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli>
*   Docker installed locally. See: <https://docs.docker.com/engine/install/>
*   A Google Cloud project created beforehand. This project is currently configured to work with the name **reomir** in the **europe-west1** region. Future versions will be modified to allow other names and regions.

Be aware that running this project may incur costs, although it's designed to minimize expenses when not actively in use.

## Steps

### 1 - Initialize Terraform

This step installs the required modules. Navigate to the `terraform` directory and run:

```shell
terraform init
```

This command resolves and caches the necessary providers (`google`) and local modules (`cloudrun`).

### 2 - Configure OAuth Client

Currently, Terraform cannot automate OAuth client configuration.


To configure the OAuth client, follow these steps:

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Navigate to "APIs & Services" > "Credentials".
3.  Click "+ CREATE CREDENTIALS" and select "OAuth client ID".
4.  Configure the OAuth client:
    *   Application type: "Web application".
    *   Name: Choose a descriptive name for your OAuth client.
    *   Authorized JavaScript origins: Add the URL of your frontend application (e.g., `https://your-project-id.run.app`).
    *   Authorized redirect URIs: Add the redirect URI for your application (e.g., `https://your-project-id.run.app/oauth2callback`).
5.  Click "CREATE".
6.  Take note of the Client ID and Client Secret, as you'll need them to configure your application.

See the official Google documentation for more details: [https://developers.google.com/identity/protocols/oauth2/web-server](https://developers.google.com/identity/protocols/oauth2/web-server)

### 3 - Set tfvars

As your project contains sensitive credentials dependent on your configuraiton, add a terraform.tfvars file in terraform folder with the following values

```hcl
secrets = {
  "GOOGLE_CLIENT_ID"     = "${THE_CLIENT_ID_CONFIGURED_STEP2}"
  "GOOGLE_CLIENT_SECRET" = "${THE_CLIENT_SECRET_CONFIGURED_STEP2}"
  "NEXTAUTH_SECRET"      = "${RANDOM_VALUE_WITH_HIGH_ENTROPY}" # Replace with a strong random string
  "NEXTAUTH_URL"         = "https://YOUR_FRONTEND_CLOUD_RUN_URL/api/auth" # Replace YOUR_FRONTEND_CLOUD_RUN_URL

  "GITHUB_CLIENT_ID"     = "${YOUR_GITHUB_OAUTH_APP_CLIENT_ID}" # From Step 2.B
  "GITHUB_CLIENT_SECRET" = "${YOUR_GITHUB_OAUTH_APP_CLIENT_SECRET}" # From Step 2.B
}

# These are not secrets but are often needed by functions and are good to define clearly.
# Ensure your Terraform configuration for the Cloud Functions (especially github-integration)
# sources these from tfvars or directly if they are outputs from other modules (like api_gateway_url).
# The github-integration function was configured in previous steps to get API_GATEWAY_BASE_URL from module output.
# FRONTEND_URL might also be needed for the github-integration function's redirects.
# If your function's env vars are already correctly populated by terraform module outputs,
# you might not need to duplicate them here unless you want to explicitly pass them.
# For clarity in setup, let's list them as values the user should be aware of.

general_config = {
  "FRONTEND_URL"         = "https://YOUR_FRONTEND_CLOUD_RUN_URL" # Replace YOUR_FRONTEND_CLOUD_RUN_URL
  "API_GATEWAY_BASE_URL" = "https://YOUR_API_GATEWAY_URL" # Replace YOUR_API_GATEWAY_URL (base URL for your API Gateway)
}
```
Ensure all `${...}` placeholders are replaced with your actual configured values. The `FRONTEND_URL` and `API_GATEWAY_BASE_URL` are particularly important for the GitHub integration to correctly construct redirect and callback URLs. While `API_GATEWAY_BASE_URL` for the `github-integration` function is set by Terraform using module outputs (as `module.api_gateway.url`), you need this URL to correctly configure the GitHub OAuth App's callback URL. The `FRONTEND_URL` is used by the `github-integration` function to redirect users back to your application.

This will apply the secrets on terraform apply

### 4 - Apply Terraform Configuration

With the packages installed, apply the Terraform configuration to your GCP project:

```shell
terraform apply
```

The apply might fail the first time if certain Google Cloud APIs are not yet enabled for your project (e.g., Cloud Run API, Artifact Registry API, IAM API, etc.). The error message from Terraform will usually indicate which API needs to be enabled. You can enable APIs through the Google Cloud Console (APIs & Services > Library) or by using `gcloud services enable <SERVICE_NAME>` (e.g., `gcloud services enable run.googleapis.com`). After enabling the required APIs, re-run `terraform apply`.

The Cloud Run deployment might initially fail because the required container images haven't been built and pushed yet. 

It's recommended to apply the configuration initially to create the Artifact Registry repository. After the initial failure, proceed as follows:

First change project to newly created project, while staying on the terraform directory

```
gcloud config set project $(terraform output -raw project_id)
```

```shell
gcloud auth configure-docker
```

And while staying in the same dir, use the following to build and push

```shell
docker build -t $(terraform output -raw cloudrun_agent_image) ../agent && docker push $(terraform output -raw cloudrun_agent_image)

docker build -t $(terraform output -raw cloudrun_front_image) ../front && docker push $(terraform output -raw cloudrun_front_image)
```

After pushing the images, re-run `terraform apply` to deploy the Cloud Run services.

