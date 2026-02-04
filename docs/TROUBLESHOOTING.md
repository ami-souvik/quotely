# Troubleshooting Guide

## AWS Cognito & Authentication

### "Unauthorized" Error on API
*   **Cause**: The API route could not validate the JWT token.
*   **Fix 1 (Client ID)**: Ensure `NEXT_PUBLIC_USER_POOL_CLIENT_ID` in `.env.local` matches the token's audience.
*   **Fix 2 (Attributes)**: The system expects `custom:org_name` or `custom:org_id` in the Cognito token to determine multi-tenancy. If missing, make sure to add these to the User Pool attributes and ensure they are writable by your App Client.

### Environment Variable Issues
*   **Missing Variables in Client**: If you access a variable starting with `NEXT_PUBLIC_` and it's undefined, restart the `npm run dev` server.
*   **Secret Keys in Browser**: Ensure AWS Secret Keys do **NOT** have the `NEXT_PUBLIC_` prefix; they should only be accessible in `src/lib/services.ts` (which runs on the server).

## PDF Generation

### Puppeteer Launch Failures
*   **Environment**: Headless Chrome requires specific system libraries (libnss, libatk, etc.).
*   **Local Fix**: Ensure Puppeteer downloaded Chromium (`npm install`).
*   **Serverless Fix**: In AWS Lambda or Vercel, you must use a lightweight chromium provider like `@sparticuz/chromium`.

## DynamoDB

### "UnrecognizedClientException"
*   **Cause**: Invalid AWS Credentials for the region or expired keys.
*   **Fix**: Check your `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `.env.local` and ensure they have permissions for `DynamoDB:GetItem`, `Query`, etc.

### Missing GSI Results
*   **Cause**: The GSI keys (`GSI1PK`, `GSI1SK`) were not populated on the item.
*   **Fix**: Check `src/lib/services.ts` to ensure that when a product is created with a `family_id`, the GSI keys are explicitly set.
