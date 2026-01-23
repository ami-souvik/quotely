#!/bin/bash
set -e

# Configuration (hardcoded for now based on project, could be env vars)
STACK_NAME="QuotelyInfrastructureV11"
REGION="ap-south-1"
DEPLOY_LAMBDA=${1:-"true"}

echo "🚀 Deploying CloudFormation Stack: $STACK_NAME (DeployLambda=$DEPLOY_LAMBDA)..."

aws cloudformation deploy \
  --template-file infrastructure/template.yaml \
  --stack-name $STACK_NAME \
  --region $REGION \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    Environment=dev \
    ExistingTableName="QuotelyCore-v11" \
    ExistingBucketName="quotely-quotes-v11" \
    CognitoUserPoolId=ap-south-1_BvTJlEG5R \
    CognitoAppClientId=5dqss2ei776k8n7jb9e54le8q4 \
    CognitoAudience=5dqss2ei776k8n7jb9e54le8q4 \

echo "✅ Stack deployment initiated (check AWS Console for status if async)."
