```mermaid
graph TD
    subgraph "External Services"
        GitHub["GitHub (OAuth Provider, User Data)"]
    end

    subgraph "Google Cloud Platform"
        API_Gateway["API Gateway (Validates Google OAuth Token)"]

        Cloud_Run_Frontend[Cloud Run: Frontend]
        Cloud_Run_Backend[Cloud Run: Backend Agent]
        Cloud_Function_UserMgmt[Cloud Function: User Management]
        Cloud_Function_GitHub[Cloud Function: GitHub Integration] %% New
        Firestore[Firestore Database]
        Secret_Manager[Secret Manager]
        KMS[KMS (Token Encryption)] %% New
    end

    User[End User]

    %% User Interaction Flow
    User -- HTTPS --> Cloud_Run_Frontend

    %% GitHub OAuth Flow initiated by Frontend
    Cloud_Run_Frontend -- 1. User initiates GitHub Connect --> API_Gateway
    API_Gateway -- /api/v1/github/connect --> Cloud_Function_GitHub
    Cloud_Function_GitHub -- 2. Redirects User --> GitHub
    User -- 3. Authenticates with GitHub --> GitHub
    GitHub -- 4. Redirects User (with auth code) --> API_Gateway %% To callback endpoint
    API_Gateway -- /api/v1/github/callback --> Cloud_Function_GitHub

    %% GitHub Integration Function Logic
    Cloud_Function_GitHub -- 5. Exchanges auth code for token --> GitHub
    Cloud_Function_GitHub -- 6. Encrypts token --> KMS
    Cloud_Function_GitHub -- 7. Stores encrypted token & user info --> Firestore
    Cloud_Function_GitHub -- 8. Retrieves GitHub data / status --> Firestore
    Cloud_Function_GitHub -- 9. Decrypts token (if needed for API calls to GitHub) --> KMS


    %% API Gateway Routing (Existing and New)
    API_Gateway -- /api/agent --> Cloud_Run_Backend
    API_Gateway -- /api/user --> Cloud_Function_UserMgmt
    %% Note: /api/v1/github/* routes are implicitly handled by the specific connect and callback routes shown above.

    %% Frontend Interactions (Existing)
    Cloud_Run_Frontend -- API Calls (with Google OAuth Token) --> API_Gateway


    %% Backend Agent Interactions (Existing)
    Cloud_Run_Backend -- Stores/Retrieves Session Data, Logs --> Firestore
    Cloud_Run_Backend -- Accesses API Keys, Config --> Secret_Manager

    %% Cloud Function User Management Interactions (Existing)
    Cloud_Function_UserMgmt -- Stores/Retrieves User Profiles --> Firestore
    Cloud_Function_UserMgmt -- Accesses Service Account Keys (if needed) --> Secret_Manager


    %% Component Styles
    style API_Gateway fill:#D6EAF8,stroke:#2E86C1,stroke-width:2px
    style Cloud_Run_Frontend fill:#D1F2EB,stroke:#1ABC9C,stroke-width:2px
    style Cloud_Run_Backend fill:#D1F2EB,stroke:#1ABC9C,stroke-width:2px
    style Cloud_Function_UserMgmt fill:#E8DAEF,stroke:#8E44AD,stroke-width:2px
    style Cloud_Function_GitHub fill:#E8DAEF,stroke:#8E44AD,stroke-width:2px %% New Style
    style Firestore fill:#FADBD8,stroke:#C0392B,stroke-width:2px
    style Secret_Manager fill:#FCF3CF,stroke:#F1C40F,stroke-width:2px
    style KMS fill:#FADBD8,stroke:#C0392B,stroke-width:2px %% New Style (can adjust color)
    style User fill:#E5E7E9,stroke:#5D6D7E,stroke-width:2px
    style GitHub fill:#CCCCCC,stroke:#333333,stroke-width:2px %% New Style
```
