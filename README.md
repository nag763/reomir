# Reomir

Your enterprise developer portal boosted by AI :rocket:

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![JS Validity](https://github.com/NAG763/REOMIR/actions/workflows/check_js_validity.yml/badge.svg)](https://github.com/NAG763/REOMIR/actions/workflows/check_js_validity.yml)
[![Python Validity](https://github.com/NAG763/REOMIR/actions/workflows/check_python_validity.yml/badge.svg)](https://github.com/NAG763/REOMIR/actions/workflows/check_python_validity.yml)
[![Terraform Validity](https://github.com/NAG763/REOMIR/actions/workflows/check_tf_validity.yml/badge.svg)](https://github.com/NAG763/REOMIR/actions/workflows/check_tf_validity.yml)
[![Language: Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)](https://www.python.org)
[![Language: JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Language: HCL](https://img.shields.io/badge/Terraform-7B42BC?logo=terraform&logoColor=white)](https://www.terraform.io)

## Project Overview

Reomir is an AI-powered developer portal designed to streamline enterprise development workflows. It provides a centralized platform for developers to access tools, documentation, and resources, with AI assistance integrated to enhance productivity.

## Features
- **AI-Powered Assistance:** Integrates with AI to enhance developer productivity.
- **Centralized Developer Hub:** Provides a single platform for tools, documentation, and resources.
- **Google OAuth Integration:** Secure user authentication using Google accounts.
- **GitHub Integration:** Connect your GitHub account to manage repositories and streamline workflows. Access and manage this in User Settings.
- **Dynamic User Profile Management:** Allows users to manage their profile information.
- **Terraform Managed Infrastructure:** Ensures reproducible and scalable deployments on Google Cloud.
- **Automated CI/CD Pipeline:** Uses GitHub Actions for building and deploying services.

## Architecture

The project follows a modern web architecture:

*   **Frontend:** A Next.js application providing the user interface. User authentication is initiated here, redirecting to Google for OAuth.
*   **API Gateway:** Manages and secures access to backend services. It validates Google OAuth tokens to authenticate API requests.
*   **Backend Agent:** A Python-based agent responsible for AI logic and backend operations, accessed via the API Gateway.
*   **Cloud Functions:** Serverless functions for specific backend tasks (e.g., user profile management post-authentication), accessed via the API Gateway.
*   **Infrastructure:** Managed by Terraform, ensuring reproducible and scalable deployments on Google Cloud.

```mermaid
graph TD
    subgraph "Google Cloud Platform"
        API_Gateway["API Gateway (Validates Google OAuth Token)"]

        Cloud_Run_Frontend[Cloud Run: Frontend]
        Cloud_Run_Backend[Cloud Run: Backend Agent]
        Cloud_Function_UserMgmt[Cloud Function: User Management]
        Firestore[Firestore Database]
        Secret_Manager[Secret Manager]
    end

    User[End User]

    %% User Interaction Flow
    User -- HTTPS --> Cloud_Run_Frontend

    %% API Gateway Routing
    API_Gateway -- /api/agent --> Cloud_Run_Backend
    API_Gateway -- /api/user --> Cloud_Function_UserMgmt

    %% Frontend Interactions
    Cloud_Run_Frontend -- API Calls (with Google OAuth Token) --> API_Gateway


    %% Backend Agent Interactions
    Cloud_Run_Backend -- Stores/Retrieves Session Data, Logs --> Firestore
    Cloud_Run_Backend -- Accesses API Keys, Config --> Secret_Manager

    %% Cloud Function Interactions
    Cloud_Function_UserMgmt -- Stores/Retrieves User Profiles --> Firestore
    Cloud_Function_UserMgmt -- Accesses Service Account Keys (if needed) --> Secret_Manager

    %% Authentication/Authorization
    %% Removed direct authentication line from Frontend to User Management Function


    %% Component Styles (Optional, for better readability if rendered)
    style API_Gateway fill:#D6EAF8,stroke:#2E86C1,stroke-width:2px
    style Cloud_Run_Frontend fill:#D1F2EB,stroke:#1ABC9C,stroke-width:2px
    style Cloud_Run_Backend fill:#D1F2EB,stroke:#1ABC9C,stroke-width:2px
    style Cloud_Function_UserMgmt fill:#E8DAEF,stroke:#8E44AD,stroke-width:2px
    style Firestore fill:#FADBD8,stroke:#C0392B,stroke-width:2px
    style Secret_Manager fill:#FCF3CF,stroke:#F1C40F,stroke-width:2px
    style User fill:#E5E7E9,stroke:#5D6D7E,stroke-width:2px
```

## Getting Started

To get Reomir up and running, please refer to the detailed [Installation Guide](INSTALL.md). The guide provides step-by-step instructions for setting up the project, including prerequisites, OAuth configuration, and Terraform deployment.

### Environment Variable Overview
Key backend services, particularly the Cloud Functions, rely on environment variables set during deployment (typically via Terraform). These include:
*   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: For Google OAuth.
*   `NEXTAUTH_SECRET`, `NEXTAUTH_URL`: For Next.js authentication.
*   `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`: For the GitHub integration feature.
*   `FRONTEND_URL`: Base URL of the deployed frontend, used by backend services for redirects.
*   `API_GATEWAY_BASE_URL`: Base URL of the deployed API Gateway, used by backend services to construct callback URLs.

Detailed setup for these, especially OAuth credentials, can be found in the [Installation Guide](INSTALL.md).

## Google Hackathon Context

This project was developed as part of the Google Hackathon Agentic AI Challenge. While it demonstrates innovative AI integration, it is a prototype and not yet production-ready.

## Cost Optimization Note

To minimize operational costs during development and demonstration, the cloud instances are configured to stop when not actively in use. In a production environment, these instances would typically have higher memory allocations and would be configured to run continuously to ensure availability.

## CI/CD Pipeline
The project uses GitHub Actions for CI/CD. When changes are pushed to the main branch, GitHub Actions workflows are triggered to:
- Build Docker images for the frontend and backend agent services.
- Package the Cloud Function code.
- Push the Docker images to Google Artifact Registry.
- Deploy the new versions of the Cloud Run services (frontend and backend) and the Cloud Function.
This automated process ensures that new changes are quickly and reliably deployed to the Google Cloud environment.
The diagram below illustrates this pipeline:
```mermaid
graph TD
    subgraph "Development & Source Control"
        Developer[Developer]
        GitHub_Repo[GitHub: Source Code Repository]
    end

    subgraph "CI/CD Orchestration & Storage"
        GitHub_Actions[GitHub Actions: Workflow Orchestrator]
        Artifact_Registry[Artifact Registry: Docker Images & Function Packages]
        Build_Step[(Build & Package Code)]
    end

    subgraph "Google Cloud Deployment Targets"
        Cloud_Run_Frontend[Cloud Run: Frontend]
        Cloud_Run_Backend[Cloud Run: Backend Agent]
        Cloud_Function_UserMgmt[Cloud Function: User Management]
    end

    %% Flow
    Developer -- 1. Pushes Code --> GitHub_Repo
    GitHub_Repo -- 2. Triggers --> GitHub_Actions

    GitHub_Actions -- 3. Executes Workflow --> Build_Step
    Build_Step -- "Builds Docker images (Frontend, Backend)" --> GitHub_Actions
    Build_Step -- "Packages Function code (User Mgmt)" --> GitHub_Actions

    GitHub_Actions -- 4. Pushes Built Artifacts --> Artifact_Registry

    GitHub_Actions -- 5. Deploys Service --> Cloud_Run_Frontend
    GitHub_Actions -- 5. Deploys Service --> Cloud_Run_Backend
    GitHub_Actions -- 5. Deploys Function --> Cloud_Function_UserMgmt

    %% Deployment Source (Implicitly from Artifact Registry via GitHub Actions)
    Cloud_Run_Frontend -.-> Artifact_Registry
    Cloud_Run_Backend -.-> Artifact_Registry
    Cloud_Function_UserMgmt -.-> Artifact_Registry

    %% Styling (Optional)
    style Developer fill:#E5E7E9,stroke:#5D6D7E,stroke-width:2px
    style GitHub_Repo fill:#CCCCCC,stroke:#333333,stroke-width:2px
    style GitHub_Actions fill:#FFF9C4,stroke:#FBC02D,stroke-width:2px
    style Build_Step fill:#E1BEE7,stroke:#8E24AA,stroke-width:2px
    style Artifact_Registry fill:#FADBD8,stroke:#C0392B,stroke-width:2px
    style Cloud_Run_Frontend fill:#D1F2EB,stroke:#1ABC9C,stroke-width:2px
    style Cloud_Run_Backend fill:#D1F2EB,stroke:#1ABC9C,stroke-width:2px
    style Cloud_Function_UserMgmt fill:#E8DAEF,stroke:#8E44AD,stroke-width:2px
```

## General disclaimer

Some of the parts of this project have been created using AI tools reviewed by the development team.

These generated parts helped fitting the agenda for the Hackaton, and allowed the team to provide a better product.