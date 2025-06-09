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