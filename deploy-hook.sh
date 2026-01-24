#!/bin/bash
# deploy-hook.sh

# Exit on any error
set -e

# Configuration
AWS_REGION=${AWS_REGION:-"ap-south-1"}
# Try to get Account ID from aws cli
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
IMAGE_NAME="quotely-serverless"
LAMBDA_FUNCTION_NAME="quotely-api"

# Check for server changes
echo "🔍 Checking for changes in 'server/' directory..."
CHANGES_FOUND=false

if [ -t 0 ]; then
    # Manual run: Compare against upstream or check for uncommitted/local changes
    UPSTREAM=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null)
    if [ -n "$UPSTREAM" ]; then
        if ! git diff --quiet "$UPSTREAM..HEAD" -- server/; then
            CHANGES_FOUND=true
        fi
    else
        # No upstream, check if any changes in server/ exist in HEAD
        CHANGES_FOUND=true 
    fi
else
    # Hook run: Read push info from stdin
    while read local_ref local_sha remote_ref remote_sha; do
        if [ "$local_sha" = "0000000000000000000000000000000000000000" ]; then
            continue # Deleting branch
        fi
        if [ "$remote_sha" = "0000000000000000000000000000000000000000" ]; then
            CHANGES_FOUND=true # New branch, assume changes
        else
            if ! git diff --quiet "$remote_sha..$local_sha" -- server/; then
                CHANGES_FOUND=true
            fi
        fi
    done
fi

if [ "$CHANGES_FOUND" = "false" ]; then
    echo "✅ No changes in 'server/' detected. Skipping deployment."
    exit 0
fi

echo "📦 Changes detected in 'server/'. Proceeding with deployment..."

# Check if AWS_ACCOUNT_ID was found
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "❌ Error: Could not determine AWS Account ID. Please configure AWS CLI or set AWS_PROFILE."
    exit 1
fi

ECR_REPO_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_NAME}"

echo "🚀 Starting Deployment Hook..."
echo "AWS Account: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"
echo "Repo: $ECR_REPO_URI"

# 1. Build Docker Image
echo "🔨 Building Docker image (linux/arm64)..."
docker build --quiet --platform linux/arm64 -t $IMAGE_NAME -f server/Dockerfile server/

# Ensure ECR repository exists
echo "🔍 Checking for ECR repository: $IMAGE_NAME..."
if ! aws ecr describe-repositories --repository-names $IMAGE_NAME --region $AWS_REGION > /dev/null 2>&1; then
    echo "📦 ECR repository $IMAGE_NAME not found. Creating..."
        aws ecr create-repository --repository-name $IMAGE_NAME --region $AWS_REGION > /dev/null
        echo "✅ ECR repository $IMAGE_NAME created."
    else
        echo "✅ ECR repository $IMAGE_NAME already exists."
    fi
    echo "Verifying ECR repository details:"
    aws ecr describe-repositories --repository-names $IMAGE_NAME --region $AWS_REGION --query 'repositories[0].[repositoryName, repositoryUri]' --output text
    # 2. Authenticate with ECR
echo "🔑 Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# 3. Tag and Push
echo "🏷️ Tagging and Pushing image..."
docker tag $IMAGE_NAME:latest $ECR_REPO_URI:latest
docker push $ECR_REPO_URI:latest

# 4. Update Lambda Function
echo "⚡ Updating Lambda function code..."
aws lambda update-function-code --function-name $LAMBDA_FUNCTION_NAME --image-uri $ECR_REPO_URI:latest --region $AWS_REGION > /dev/null

# 5. Cleanup Old Images
echo "🧹 Cleaning up old untagged images from ECR..."
IMAGES_TO_DELETE=$(aws ecr list-images --region $AWS_REGION --repository-name $IMAGE_NAME --filter "tagStatus=UNTAGGED" --query 'imageIds[*]' --output json)

if [ "$IMAGES_TO_DELETE" != "[]" ] && [ "$IMAGES_TO_DELETE" != "" ]; then
    aws ecr batch-delete-image --region $AWS_REGION --repository-name $IMAGE_NAME --image-ids "$IMAGES_TO_DELETE" > /dev/null
    echo "   Removed untagged images."
else
    echo "   No untagged images to remove."
fi

echo "✅ Deployment complete!"
