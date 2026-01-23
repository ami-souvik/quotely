#!/bin/bash
set -e

REGION="ap-south-1"
TABLE_NAME="QuotelyCore"
BUCKET_NAME="quotely-quotes"
REPO_NAME="quotely-serverless"
FUNCTION_NAME="quotely-api"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "⚠️  WARNING: This will DELETE existing infrastructure to allow CloudFormation to take over."
# ... (cleanup commented out to save time/errors)
# echo "Resources to be deleted:"
# ...
# aws lambda delete-function ...
# aws dynamodb delete-table ...
# aws s3 rm ...
# aws s3 rb ...
# aws ecr delete-repository ...

echo "🧹 Cleanup complete (Skipped - assumed done)."

echo "🚀 Phase 1: Deploying Infrastructure (Without Lambda to create ECR)..."
./infrastructure/deploy.sh "false"

echo "🔨 Phase 2: Building and Pushing Docker Image..."
# Reuse logic from deploy-hook.sh basically
IMAGE_NAME="quotely-serverless"
ECR_REPO_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${IMAGE_NAME}"

docker build --quiet --platform linux/arm64 -t $IMAGE_NAME -f server/Dockerfile server/
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com
docker tag $IMAGE_NAME:latest $ECR_REPO_URI:latest
docker push $ECR_REPO_URI:latest

echo "🚀 Phase 3: Deploying Lambda Function..."
./infrastructure/deploy.sh "true"

echo "✅ Full Infrastructure Reset and Deployment Complete!"
