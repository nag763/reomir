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
  "NEXTAUTH_SECRET"      = "${RANDOM_VALUE_WITH_HIGH_ENTRHOPY}",
  "NEXTAUTH_URL"         = "https://reomir-front-${PROJECT_ID}.europe-west1.run.app/api/auth"
}
```

This will apply the secrets on terraform apply

### 4 - Apply Terraform Configuration

With the packages installed, apply the Terraform configuration to your GCP project:

```shell
terraform apply
```

The Cloud Run deployment might initially fail because the required container images haven't been built and pushed yet.

It's recommended to apply the configuration initially to create the Artifact Registry repository. After the initial failure, proceed as follows:

```shell
gcloud auth configure-docker
```

This configures Docker to authenticate with your Google Cloud project. Next, build the container images locally:

```shell
# Build the frontend project
docker build -t europe-west1-docker.pkg.dev/reomir/reomir/reomir-front ./front

# Build the agent project
docker build -t europe-west1-docker.pkg.dev/reomir/reomir/reomir-agent ./agent
```

Then, push the images to Artifact Registry:

```shell
docker push europe-west1-docker.pkg.dev/reomir/reomir/reomir-front
docker push europe-west1-docker.pkg.dev/reomir/reomir/reomir-agent
```

:warning: Your project name and ID might differ if the name is already taken.

The image naming convention is: `${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_NAME}/${GCP_PROJECT_ID}/${IMAGE_NAME}`

After pushing the images, re-run `terraform apply` to deploy the Cloud Run services.

