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
        Cloud_Function_GitHub[Cloud Function: GitHub Integration] %% New
    end

    %% Flow
    Developer -- 1. Pushes Code --> GitHub_Repo
    GitHub_Repo -- 2. Triggers --> GitHub_Actions

    GitHub_Actions -- 3. Executes Workflow --> Build_Step
    Build_Step -- "Builds Docker images (Frontend, Backend)" --> GitHub_Actions
    Build_Step -- "Packages Function code (User Mgmt, GitHub Integration)" --> GitHub_Actions %% Updated

    GitHub_Actions -- 4. Pushes Built Artifacts --> Artifact_Registry

    GitHub_Actions -- 5. Deploys Service --> Cloud_Run_Frontend
    GitHub_Actions -- 5. Deploys Service --> Cloud_Run_Backend
    GitHub_Actions -- 5. Deploys Function --> Cloud_Function_UserMgmt
    GitHub_Actions -- 5. Deploys Function --> Cloud_Function_GitHub %% New

    %% Deployment Source (Implicitly from Artifact Registry via GitHub Actions)
    Cloud_Run_Frontend -.-> Artifact_Registry
    Cloud_Run_Backend -.-> Artifact_Registry
    Cloud_Function_UserMgmt -.-> Artifact_Registry
    Cloud_Function_GitHub -.-> Artifact_Registry %% New

    %% Styling (Optional)
    style Developer fill:#E5E7E9,stroke:#5D6D7E,stroke-width:2px
    style GitHub_Repo fill:#CCCCCC,stroke:#333333,stroke-width:2px
    style GitHub_Actions fill:#FFF9C4,stroke:#FBC02D,stroke-width:2px
    style Build_Step fill:#E1BEE7,stroke:#8E24AA,stroke-width:2px
    style Artifact_Registry fill:#FADBD8,stroke:#C0392B,stroke-width:2px
    style Cloud_Run_Frontend fill:#D1F2EB,stroke:#1ABC9C,stroke-width:2px
    style Cloud_Run_Backend fill:#D1F2EB,stroke:#1ABC9C,stroke-width:2px
    style Cloud_Function_UserMgmt fill:#E8DAEF,stroke:#8E44AD,stroke-width:2px
    style Cloud_Function_GitHub fill:#E8DAEF,stroke:#8E44AD,stroke-width:2px %% New
```
