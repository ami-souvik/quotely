# Deployment Guide

## Recommended: Vercel or AWS Amplify

Next.js is best deployed on platforms that support Edge/Serverless functions natively.

### 1. Build & Environment Variables

Ensure the following environment variables are set in your deployment platform:

**Server-Side (Secrets)**
- `AWS_ACCESS_KEY_ID`: IAM user with DynamoDB/S3 permissions.
- `AWS_SECRET_ACCESS_KEY`: IAM secret.
- `AWS_REGION`: e.g., `ap-south-1`.
- `DYNAMO_TABLE_NAME`: The name of your single DynamoDB table.
- `AWS_S3_BUCKET_NAME`: The name of your quote storage bucket.

**Client-Side (Public)**
- `NEXT_PUBLIC_USER_POOL_ID`: Cognito Customer User Pool ID.
- `NEXT_PUBLIC_USER_POOL_CLIENT_ID`: Cognito App Client ID.

### 2. PDF Generation in Serverless

Since the app uses **Puppeteer** for PDF generation, standard serverless environments (like basic Vercel or AWS Lambda) might require additional configuration because the browser binary is quite large.

- **On Vercel**: You might need to use `puppeteer-core` and `@sparticuz/chromium` to stay within function size limits.
- **On AWS Lambda**: If deploying via Docker (recommended for the unified app), ensure the Dockerfile includes the necessary Chrome dependencies.

### 3. Build Command
```bash
cd client
npm run build
```

The output will be a optimized Next.js build.
