REGION="ap-south-1"
TABLE_NAME="QuotelyCore-v11" # Updated name
BUCKET_NAME="quotely-quotes-v11" # Updated name
REPO_NAME="quotely-serverless-v11" # Updated name
FUNCTION_NAME="quotely-api"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "⚠️  WARNING: This will DELETE existing infrastructure to allow CloudFormation to take over."
echo "Resources to be deleted:"
echo " - DynamoDB Table: $TABLE_NAME"
echo " - S3 Bucket: $BUCKET_NAME"
echo " - ECR Repo: $REPO_NAME"
echo " - Lambda: $FUNCTION_NAME"
echo "Starting in 10 seconds..." # Increased sleep
sleep 10

echo "🗑️  Deleting Lambda Function..."
aws lambda delete-function --function-name $FUNCTION_NAME --region $REGION || echo "Lambda not found or already deleted"

echo "🗑️  Deleting DynamoDB Table..."
aws dynamodb delete-table --table-name $TABLE_NAME --region $REGION || echo "Table not found or already deleted"
echo "⏳ Waiting for table deletion..."
aws dynamodb wait table-not-exists --table-name $TABLE_NAME --region $REGION

echo "🗑️  Deleting S3 Bucket (Emptying first)..."
aws s3 rm s3://$BUCKET_NAME --recursive --region $REGION || echo "Bucket empty or not accessible"
aws s3 rb s3://$BUCKET_NAME --region $REGION || echo "Bucket not found or already deleted"

echo "🗑️  Deleting ECR Repository..."
aws ecr delete-repository --repository-name $REPO_NAME --region $REGION --force || echo "Repo not found or already deleted"

echo "🧹 Cleanup complete."

echo "🚀 Phase 1: Deploying Infrastructure (Without Lambda to create ECR)..."
./infrastructure/deploy.sh "false"

echo "🔨 Phase 2: Building and Pushing Docker Image..."
# Reuse logic from deploy-hook.sh basically
IMAGE_NAME="quotely-serverless-v11" # Updated name
ECR_REPO_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${IMAGE_NAME}"

docker build --quiet --platform linux/arm64 -t $IMAGE_NAME -f server/Dockerfile server/
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com
docker tag $IMAGE_NAME:latest $ECR_REPO_URI:latest
docker push $ECR_REPO_URI:latest

echo "🚀 Phase 3: Deploying Lambda Function..."
./infrastructure/deploy.sh "true"

echo "✅ Full Infrastructure Reset and Deployment Complete!"
