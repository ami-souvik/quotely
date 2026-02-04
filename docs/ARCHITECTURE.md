# Quotely Architecture

## Overview
Quotely is a mobile-first MicroSaaS for interior design firms. It allows users to create and manage quotations using a multi-tenant architecture. The entire application is built using Next.js, handling both the frontend UI and the backend business logic via API Routes.

## Tech Stack
*   **Unified Framework**: Next.js (React)
    *   **Frontend**: Tailwind CSS + Shadcn/UI
    *   **Backend**: Next.js API Routes (Node.js)
*   **Database**: AWS DynamoDB (Single Table Design)
*   **Authentication**: AWS Cognito (JWT)
*   **Storage**: AWS S3 (for generated PDFs)
*   **PDF Generation**: Puppeteer (executed server-side in API routes)

## System Design

### Client-Server Interaction
*   The frontend authenticates with AWS Cognito directly using `react-oidc-context` (Auth Code Flow).
*   The frontend receives an ID Token.
*   API requests include the **ID Token** in the `Authorization: Bearer <token>` header.
*   Next.js API routes validate the token using `aws-jwt-verify`.

### Multi-Tenancy
*   Users are linked to an **Organization**.
*   The Organization is determined by the `custom:org_name` and `custom:org_id` attributes in Cognito.
*   The `authenticate` helper in `src/lib/auth-server.ts` resolves or creates the organization in DynamoDB upon login if it doesn't already exist.
*   All data (Quotes, Products, Customers) in DynamoDB is partitioned using the `PK: ORG#<OrgID>` pattern.

### Data Flow
1.  **User Login**: Frontend -> Cognito -> ID Token stored in session.
2.  **API Call**: Frontend -> Next.js API Routes -> DynamoDB (using AWS SDK v3).
3.  **Quote Creation**: User selects products -> Frontend calculates totals -> API Route validates and saves the quote structure to DynamoDB.
4.  **PDF Generation**: 
    - Triggered via `/api/quotes/[id]/generate-pdf`.
    - Next.js server retrieves the quote data.
    - Generates HTML based on selected templates.
    - Uses **Puppeteer** to render HTML to PDF.
    - Uploads the resulting Buffer to S3.
    - Returns a success status; frontend then requests a presigned URL to download.
