# Deployment Guide

## AWS Serverless Deployment (Lambda + Docker)

This is the recommended production deployment method.

### Prerequisites
*   AWS CLI installed and configured.
*   Docker installed.
*   Access to an AWS Account.

### Steps

1.  **Build Docker Image**:
    Use the correct platform for Lambda (`linux/arm64` is recommended for cost/speed).
    ```bash
    docker build --platform linux/arm64 -t quotely-serverless -f server/Dockerfile server/
    ```

2.  **Authenticate with ECR**:
    ```bash
    aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com
    ```

3.  **Tag and Push**:
    ```bash
    docker tag quotely-serverless:latest <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/quotely-serverless:latest
    docker push <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/quotely-serverless:latest
    ```

4.  **Update Lambda Function**:
    If the function already exists (`quotely-api`), update the code to use the new image.
    ```bash
    aws lambda update-function-code --function-name quotely-api --image-uri <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/quotely-serverless:latest --region ap-south-1
    ```

5.  **Configuration**:
    Ensure the Lambda function has the following Environment Variables:
    *   `DJANGO_SECRET_KEY`: Your secret key.
    *   `AWS_ACCESS_KEY_ID`: Credentials for accessing DynamoDB/S3 (or use IAM Role).
    *   `AWS_SECRET_ACCESS_KEY`: Credentials.
    *   `AWS_REGION`: `ap-south-1`.
    *   `DYNAMO_TABLE_NAME`: `QuotelyCore`.
    *   `AWS_S3_BUCKET_NAME`: `quotely-quotes`.
    *   `COGNITO_USER_POOL`: Your User Pool ID.
    *   `COGNITO_APP_CLIENT_ID`: Your App Client ID.
    *   `ALLOWED_HOSTS`: Your API Gateway domain (e.g., `xyz.execute-api.ap-south-1.amazonaws.com`).

---

## Frontend Deployment

The frontend is a static Next.js export or Node.js app.

1.  **Build**:
    ```bash
    cd client
    npm run build
    ```
2.  **Environment Variables**:
    Create `.env` or set in deployment platform (Vercel/Amplify):
    *   `NEXT_PUBLIC_API_URL`: URL of your Lambda Function or API Gateway.
    *   `NEXT_PUBLIC_USER_POOL_ID`: Cognito User Pool ID.
    *   `NEXT_PUBLIC_USER_POOL_CLIENT_ID`: Cognito App Client ID.
    *   `NEXT_PUBLIC_COGNITO_AUTHORITY`: `https://cognito-idp.ap-south-1.amazonaws.com/<PoolID>`
    *   `NEXT_PUBLIC_REDIRECT_URI`: The callback URL (must match Cognito settings).
