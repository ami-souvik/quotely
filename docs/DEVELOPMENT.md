# Local Development Guide

## Prerequisites
*   Docker & Docker Compose.
*   Node.js 18+.
*   Python 3.11+.

## Setup

1.  **Clone Repository**.
2.  **Environment Variables**:
    *   Create `server/.env` with your AWS credentials (see `DEPLOYMENT.md` for keys).
    *   Set `ALLOWED_HOSTS=localhost` in `server/.env`.
3.  **Start Services**:
    ```bash
    docker compose up --build
    ```
    This starts:
    *   Backend on `http://localhost:8000`.
    *   Frontend on `http://localhost:3000`.

## Frontend Development
*   Navigate to `client/`.
*   Run `npm install`.
*   Run `npm run dev` to start locally (if not using Docker).

## Backend Development
*   Navigate to `server/`.
*   Create venv: `python -m venv venv`.
*   Install deps: `pip install -r requirements.txt`.
*   Run: `python manage.py runserver` (requires local AWS creds setup).

## Cognito Setup for Localhost
1.  Add `http://localhost:3000` to **Allowed callback URLs** in your Cognito App Client settings.
2.  Add `http://localhost:3000` to **Allowed sign-out URLs**.

## Managing Cognito Users via CLI

You can manage AWS Cognito users directly from the Django backend container using the custom `cognito_users` command.

**Usage:**
Run inside the server container (e.g., `docker exec -it quotely-server-1 bash`):

*   **List Users**:
    ```bash
    python manage.py cognito_users list
    ```
*   **Get User Details**:
    ```bash
    python manage.py cognito_users get <username>
    ```
*   **Create User**:
    ```bash
    python manage.py cognito_users create <username> <email> --org-name "Organization Name"
    ```
    (Note: This creates the user in Cognito AND triggers the local DB sync/creation when they first log in, or you can invoke the manager manually if needed).
*   **Delete User**:
    ```bash
    python manage.py cognito_users delete <username>
    ```
* In order to manage local DB include flag: [--local]
