# Local Development Guide

## Prerequisites
*   Node.js 20+
*   AWS Credentials (configured in `.env.local`)

## Setup

1.  **Navigate to Client Directory**:
    ```bash
    cd client
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Variables**:
    Create a `client/.env.local` file with the following keys:
    ```env
    # AWS Credentials
    AWS_ACCESS_KEY_ID=your_access_key
    AWS_SECRET_ACCESS_KEY=your_secret_key
    AWS_REGION=ap-south-1

    # DynamoDB & S3
    DYNAMO_TABLE_NAME=QuotelyCore
    AWS_S3_BUCKET_NAME=quotely-quotes

    # Cognito
    NEXT_PUBLIC_USER_POOL_ID=ap-south-1_xxxxxx
    NEXT_PUBLIC_USER_POOL_CLIENT_ID=5dqss2ei776k8n7jb9e54le8q4
    ```

4.  **Start Development Server**:
    ```bash
    npm run dev
    ```
    The app will be available at `http://localhost:3000`.

## Architecture Note
The application uses Next.js API Routes for all backend logic. There is no separate backend server. The backend code is located in `src/app/api/` and shared logic is in `src/lib/services.ts`.

## PDF Generation
PDF generation uses Puppeteer. Ensure your development environment can run Headless Chrome (most modern OSs support this natively via `npm install puppeteer`).
