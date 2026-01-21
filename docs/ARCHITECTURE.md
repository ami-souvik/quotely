# Quotely Architecture

## Overview
Quotely is a mobile-first MicroSaaS for interior design firms. It allows users to create and manage quotations using a multi-tenant architecture.

## Tech Stack
*   **Frontend**: Next.js (React) using Tailwind CSS and Shadcn/UI.
*   **Backend**: Django (Python) using Django Rest Framework (DRF).
*   **Database**: AWS DynamoDB (Single Table Design).
*   **Authentication**: AWS Cognito (JWT).
*   **Storage**: AWS S3 (for generated PDFs).
*   **PDF Generation**: WeasyPrint.

## System Design

### Client-Server Interaction
*   The frontend authenticates with AWS Cognito directly using `react-oidc-context` (Auth Code Flow).
*   The frontend receives an ID Token and Access Token.
*   API requests include the **ID Token** in the `Authorization: Bearer <token>` header.
*   The Django backend validates the token using `django-cognito-jwt`.

### Multi-Tenancy
*   Users are linked to an **Organization**.
*   The Organization is determined by the `custom:org_name` attribute in Cognito.
*   The Django `User` model has a custom manager (`CustomUserManager`) that syncs user details and organization from the Cognito token payload upon every authenticated request.
*   All data (Quotes, Products) in DynamoDB is partitioned by `ORG#<OrgID>`.

### Data Flow
1.  **User Login**: Frontend -> Cognito -> Token.
2.  **API Call**: Frontend -> Django (via API Gateway/Load Balancer) -> DynamoDB.
3.  **Quote Creation**: User selects products -> Frontend calculates totals -> Backend validates and saves snapshot to DynamoDB.
4.  **PDF Generation**: Backend retrieves snapshot -> WeasyPrint generates PDF -> Upload to S3 (private) -> Presigned URL returned to Frontend.
