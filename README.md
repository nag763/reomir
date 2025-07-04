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
- **GitHub Integration:** Connect your GitHub account to manage repositories and streamline workflows. User GitHub tokens are securely encrypted using Key Management Service (KMS) and stored in Firestore. Access and manage this feature in User Settings.
- **Dynamic User Profile Management:** Allows users to manage their profile information.
- **Terraform Managed Infrastructure:** Ensures reproducible and scalable deployments on Google Cloud.
- **Automated CI/CD Pipeline:** Uses GitHub Actions for building and deploying services.

## Architecture

The project follows a modern web architecture:

*   **Frontend:** A Next.js application providing the user interface. User authentication is initiated here, redirecting to Google for OAuth.
*   **API Gateway:** Manages and secures access to backend services. It validates Google OAuth tokens to authenticate API requests.
*   **Backend Agent:** A Python-based agent responsible for AI logic and backend operations, accessed via the API Gateway.
*   **Cloud Functions:** Serverless functions for specific backend tasks (e.g., user profile management post-authentication, GitHub OAuth handling and token management), accessed via the API Gateway.
*   **Infrastructure:** Managed by Terraform, ensuring reproducible and scalable deployments on Google Cloud.
*   **Key Management Service (KMS):** Used to encrypt sensitive data, such as user GitHub tokens, before storage.

```mermaid
graph TD
    subgraph "External Services"
        Google["Google (OAuth Provider)"]
        GitHub["GitHub (OAuth Provider, User Data)"]
    end

    subgraph "Google Cloud Platform"
        API_Gateway["API Gateway (Validates Token, Routes Requests)"]
        Cloud_Run_Frontend[Cloud Run: Frontend]
        Cloud_Run_Backend[Cloud Run: Backend Agent]
        Cloud_Function_UserMgmt[Cloud Function: User Management]
        Cloud_Function_GitHub[Cloud Function: GitHub Integration]
        Cloud_Function_SessionMapper[Cloud Function: Session Mapper]
        Firestore[Firestore Database]
        Secret_Manager[Secret Manager]
        KMS["KMS (Token Encryption)"]
    end

    User[End User]

    %% Primary Authentication Flow (Google OAuth)
    User -- 1\. Accesses App --> Cloud_Run_Frontend
    Cloud_Run_Frontend -- 2\. Initiates Google Sign-In --> Google
    User -- 3\. Authenticates with Google --> Google
    Google -- 4\. Returns Google ID Token --> Cloud_Run_Frontend

    %% Agent Interaction Flow (Requires Authentication)
    Cloud_Run_Frontend -- 5\. API Call to Agent (with Google Token) --> API_Gateway
    API_Gateway -- 6\. Validates Token & Calls Session Mapper --> Cloud_Function_SessionMapper
    Cloud_Function_SessionMapper -- 7\. Creates/Updates Session --> Firestore
    API_Gateway -- 8\. Routes to Backend Agent --> Cloud_Run_Backend
    Cloud_Run_Backend -- 9\. Requests Session Data --> Firestore
    Cloud_Run_Backend -- 10\. Accesses Config/Secrets --> Secret_Manager

    %% Secondary Flow: Connecting GitHub Account (User is already logged in)
    Cloud_Run_Frontend -- 11\. User clicks 'Connect GitHub' --> API_Gateway
    API_Gateway -- /api/v1/github/connect --> Cloud_Function_GitHub
    Cloud_Function_GitHub -- 12\. Redirects User --> GitHub
    User -- 13\. Authorizes App on GitHub --> GitHub
    GitHub -- 14\. Redirects User (with auth code) --> API_Gateway
    API_Gateway -- /api/v1/github/callback --> Cloud_Function_GitHub
    Cloud_Function_GitHub -- 15\. Exchanges code, encrypts & stores token --> KMS & Firestore

    %% Component Styles
    style API_Gateway fill:#D6EAF8,stroke:#2E86C1,stroke-width:2px
    style Cloud_Run_Frontend fill:#D1F2EB,stroke:#1ABC9C,stroke-width:2px
    style Cloud_Run_Backend fill:#D1F2EB,stroke:#1ABC9C,stroke-width:2px
    style Cloud_Function_UserMgmt fill:#E8DAEF,stroke:#8E44AD,stroke-width:2px
    style Cloud_Function_GitHub fill:#E8DAEF,stroke:#8E44AD,stroke-width:2px
    style Cloud_Function_SessionMapper fill:#E8DAEF,stroke:#8E44AD,stroke-width:2px
    style Firestore fill:#FADBD8,stroke:#C0392B,stroke-width:2px
    style Secret_Manager fill:#FCF3CF,stroke:#F1C40F,stroke-width:2px
    style KMS fill:#FADBD8,stroke:#C0392B,stroke-width:2px
    style User fill:#E5E7E9,stroke:#5D6D7E,stroke-width:2px
    style Google fill:#F4B400,stroke:#DB4437,stroke-width:2px
    style GitHub fill:#CCCCCC,stroke:#333333,stroke-width:2px
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

    subgraph "CI/CD Pipeline"
        GitHub_Actions[GitHub Actions: CI/CD Workflow]
        Artifact_Registry[Artifact Registry: Build Artifacts]
    end

    subgraph "Google Cloud Deployment Targets"
        Cloud_Run_Frontend[Cloud Run: Frontend]
        Cloud_Run_Backend[Cloud Run: Backend Agent]
        Cloud_Function_UserMgmt[Cloud Function: User Management]
        Cloud_Function_GitHub[Cloud Function: GitHub Integration]
    end

    %% CI/CD Flow
    Developer -- 1\. Pushes Code --> GitHub_Repo
    GitHub_Repo -- 2\. Triggers --> GitHub_Actions

    GitHub_Actions -- "3\. Builds, Packages & Pushes Artifacts" --> Artifact_Registry

    GitHub_Actions -- "4\. Deploys Services & Functions" --> Cloud_Run_Frontend
    GitHub_Actions -- "4\. Deploys Services & Functions" --> Cloud_Run_Backend
    GitHub_Actions -- "4\. Deploys Services & Functions" --> Cloud_Function_UserMgmt
    GitHub_Actions -- "4\. Deploys Services & Functions" --> Cloud_Function_GitHub

    %% Runtime Dependency
    Cloud_Run_Frontend -.->|Pulls Image| Artifact_Registry
    Cloud_Run_Backend -.->|Pulls Image| Artifact_Registry
    Cloud_Function_UserMgmt -.->|Pulls Package| Artifact_Registry
    Cloud_Function_GitHub -.->|Pulls Package| Artifact_Registry

    %% Styling
    style Developer fill:#E5E7E9,stroke:#5D6D7E,stroke-width:2px
    style GitHub_Repo fill:#CCCCCC,stroke:#333333,stroke-width:2px
    style GitHub_Actions fill:#FFF9C4,stroke:#FBC02D,stroke-width:2px
    style Artifact_Registry fill:#FADBD8,stroke:#C0392B,stroke-width:2px
    style Cloud_Run_Frontend fill:#D1F2EB,stroke:#1ABC9C,stroke-width:2px
    style Cloud_Run_Backend fill:#D1F2EB,stroke:#1ABC9C,stroke-width:2px
    style Cloud_Function_UserMgmt fill:#E8DAEF,stroke:#8E44AD,stroke-width:2px
    style Cloud_Function_GitHub fill:#E8DAEF,stroke:#8E44AD,stroke-width:2px
```

## General disclaimer

Some of the parts of this project have been created using AI tools reviewed by the development team.

These generated parts helped fitting the agenda for the Hackaton, and allowed the team to provide a better product.