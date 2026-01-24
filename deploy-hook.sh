#!/bin/bash
# deploy-hook.sh

# Exit on any error
set -e

# Configuration
AWS_REGION=${AWS_REGION:-"ap-south-1"}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
IMAGE_NAME="quotely-serverless"
LAMBDA_FUNCTION_NAME="quotely-api"

echo "--- DEBUG: Starting deploy-hook.sh (ECR focus) ---"

# Check if AWS_ACCOUNT_ID was found
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "❌ Error: Could not determine AWS Account ID. Please configure AWS CLI or set AWS_PROFILE."
    exit 1
fi

ECR_REPO_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_NAME}"

echo "🚀 Starting Deployment Hook (ECR focus)..."
echo "AWS Account: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"
echo "Repo: $ECR_REPO_URI"

# Ensure ECR repository exists (create if not, or ensure it's there)
echo "📦 Ensuring ECR repository: $IMAGE_NAME exists..."
aws ecr create-repository --repository-name $IMAGE_NAME --region $AWS_REGION > /dev/null 2>&1 || true # Create if not exists, ignore if already exists
echo "Verifying ECR repository details:"
aws ecr describe-repositories --repository-names $IMAGE_NAME --region $AWS_REGION --query 'repositories[0].[repositoryName, repositoryUri]' --output text

# 1. Build Docker Image
echo "🔨 Building Docker image (linux/arm64)..."
docker build --quiet --platform linux/arm64 -t $IMAGE_NAME -f server/Dockerfile server/

# 2. Authenticate with ECR
echo "🔑 Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# 3. Tag and Push
echo "🏷️ Tagging and Pushing image..."
docker tag $IMAGE_NAME:latest $ECR_REPO_URI:latest
docker push $ECR_REPO_URI:latest

echo "✅ ECR push complete (further Lambda update logic removed for debugging)."
exit 0
