# Troubleshooting Guide

## AWS Cognito & Authentication

### "Unauthorized" Error on API
*   **Cause**: The backend could not validate the token.
*   **Fix 1 (Audience)**: Ensure `COGNITO_APP_CLIENT_ID` in backend env matches the token's `aud` claim.
*   **Fix 2 (Region)**: Ensure `COGNITO_AWS_REGION` matches the token's `iss` region.
*   **Fix 3 (Attributes)**: Ensure the user in Cognito has `custom:org_name` populated. If missing, the backend might create a user without an organization.

### "InvalidAudienceError"
*   **Cause**: Mismatch between token's `aud` and backend `COGNITO_AUDIENCE`.
*   **Fix**: Update `COGNITO_AUDIENCE` or `COGNITO_APP_CLIENT_ID` in `server/.env`.

## Docker & Deployment

### "Invalid Elastic Container Registry Image URI" in Lambda
*   **Cause**: You are trying to use a **Public ECR** URI or a URI from a different region.
*   **Fix**: Use a **Private ECR** repository in the **same region** as your Lambda function.

### Large Docker Image Size
*   **Cause**: Build tools (`g++`, `build-essential`) left in the image layer.
*   **Fix**: Use a single `RUN` instruction to install build deps, pip install, and remove build deps. (Already optimized in `server/Dockerfile`).

### Lambda Timeout (Init Duration)
*   **Cause 1**: Port mismatch. Lambda Adapter expects port 8080. Ensure `Gunicorn` binds to `0.0.0.0:8080`.
*   **Cause 2**: Low memory. 128MB is too low for Django/WeasyPrint. Use 512MB+.

## S3 & PDF

### "Failed to upload PDF to S3"
*   **Cause**: Bucket has "Bucket owner enforced" (ACLs disabled), but code tried to set `ACL='private'`.
*   **Fix**: Remove `ACL` parameter from `s3_client.put_object` call. (Already fixed in `services.py`).
