#!/bin/bash
set -e

# Configuration (hardcoded for now based on project, could be env vars)
STACK_NAME="QuotelyInfrastructureFinal"
REGION="ap-south-1"

echo "🚀 Deploying CloudFormation Stack: $STACK_NAME..."

aws cloudformation deploy \
  --template-file infrastructure/template.yaml \
  --stack-name $STACK_NAME \
  --region $REGION \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    Environment=dev \
    ExistingTableName="QuotelyCoreFinal" \
    ExistingBucketName="quotely-quotes-final" \
    EcrRepositoryArn="arn:aws:ecr:ap-south-1:295920452208:repository/quotely-serverless"

echo "✅ Stack deployment initiated (check AWS Console for status if async)."
