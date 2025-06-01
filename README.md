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

## Architecture

The project follows a modern web architecture:

*   **Frontend:** A Next.js application providing the user interface.
*   **Backend Agent:** A Python-based agent responsible for AI logic and backend operations.
*   **Cloud Functions:** Serverless functions for specific backend tasks.
*   **Infrastructure:** Managed by Terraform, ensuring reproducible and scalable deployments on Google Cloud.

```mermaid
graph TD
    subgraph "Google Cloud Platform"
        API_Gateway[API Gateway]
        Cloud_Run_Frontend[Cloud Run: Frontend]
        Cloud_Run_Backend[Cloud Run: Backend Agent]
        Cloud_Function_UserMgmt[Cloud Function: User Management]
        Firestore[Firestore Database]
        Secret_Manager[Secret Manager]
        Artifact_Registry[Artifact Registry]
    end

    GitHub[GitHub: Source Code & WIF]
    User[End User]

    %% User Interaction Flow
    User -- HTTPS --> API_Gateway

    %% API Gateway Routing
    API_Gateway -- /api/agent --> Cloud_Run_Backend
    API_Gateway -- /api/user --> Cloud_Function_UserMgmt
    API_Gateway -- / --> Cloud_Run_Frontend

    %% Frontend Interactions
    Cloud_Run_Frontend -- Fetches data/triggers actions --> API_Gateway

    %% Backend Agent Interactions
    Cloud_Run_Backend -- Stores/Retrieves Session Data, Logs --> Firestore
    Cloud_Run_Backend -- Accesses API Keys, Config --> Secret_Manager

    %% Cloud Function Interactions
    Cloud_Function_UserMgmt -- Stores/Retrieves User Profiles --> Firestore
    Cloud_Function_UserMgmt -- Accesses Service Account Keys (if needed) --> Secret_Manager

    %% CI/CD and Source Control
    GitHub -- Source Code --> Cloud_Run_Frontend
    GitHub -- Source Code --> Cloud_Run_Backend
    GitHub -- Source Code --> Cloud_Function_UserMgmt
    GitHub -- Stores Docker Images --> Artifact_Registry
    GitHub -- Workload Identity Federation --> Google_Cloud_Platform

    Cloud_Run_Frontend -- Deploys from --> Artifact_Registry
    Cloud_Run_Backend -- Deploys from --> Artifact_Registry
    Cloud_Function_UserMgmt -- Deploys from --> Artifact_Registry

    %% Authentication/Authorization
    Cloud_Run_Frontend -- Authenticates Users via --> Cloud_Function_UserMgmt

    %% Component Styles (Optional, for better readability if rendered)
    style API_Gateway fill:#D6EAF8,stroke:#2E86C1,stroke-width:2px
    style Cloud_Run_Frontend fill:#D1F2EB,stroke:#1ABC9C,stroke-width:2px
    style Cloud_Run_Backend fill:#D1F2EB,stroke:#1ABC9C,stroke-width:2px
    style Cloud_Function_UserMgmt fill:#E8DAEF,stroke:#8E44AD,stroke-width:2px
    style Firestore fill:#FADBD8,stroke:#C0392B,stroke-width:2px
    style Secret_Manager fill:#FCF3CF,stroke:#F1C40F,stroke-width:2px
    style Artifact_Registry fill:#FADBD8,stroke:#C0392B,stroke-width:2px
    style GitHub fill:#CCCCCC,stroke:#333333,stroke-width:2px
    style User fill:#E5E7E9,stroke:#5D6D7E,stroke-width:2px
```

## Getting Started

To get Reomir up and running, please refer to the detailed [Installation Guide](INSTALL.md). The guide provides step-by-step instructions for setting up the project, including prerequisites, OAuth configuration, and Terraform deployment.

## Google Hackathon Context

This project was developed as part of the Google Hackathon Agentic AI Challenge. While it demonstrates innovative AI integration, it is a prototype and not yet production-ready.

## Cost Optimization Note

To minimize operational costs during development and demonstration, the cloud instances are configured to stop when not actively in use. In a production environment, these instances would typically have higher memory allocations and would be configured to run continuously to ensure availability.

## General disclaimer

Some of the parts of this project have been created using AI tools reviewed by the development team.

These generated parts helped fitting the agenda for the Hackaton, and allowed the team to provide a better product.