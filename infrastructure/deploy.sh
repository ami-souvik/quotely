#!/bin/bash
set -e

# Configuration (hardcoded for now based on project, could be env vars)
STACK_NAME="QuotelyInfrastructure"
REGION="ap-south-1"

echo "🚀 Deploying CloudFormation Stack: $STACK_NAME..."

aws cloudformation deploy \
  --template-file infrastructure/template.yaml \
  --stack-name $STACK_NAME \
  --region $REGION \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    Environment=dev \
    ExistingTableName="QuotelyCore" \
    ExistingBucketName="quotely-quotes" \
    CognitoUserPoolId=ap-south-1_BvTJlEG5R \
    CognitoAppClientId=5dqss2ei776k8n7jb9e54le8q4 \
    CognitoAudience=5dqss2ei776k8n7jb9e54le8q4 \
    EcrRepositoryName="quotely-serverless" \
    EcrRepositoryArn="arn:aws:ecr:ap-south-1:295920452208:repository/quotely-serverless" \
    CorsAllowedOrigins="http://localhost:3000,http://127.00.1:3000,https://quotely-six.vercel.app" \
    DjangoSecretKey="uRhIGrixN38aQctjbnPWxf+dx7hvDw2VbhJ1P1Ev9LA="

echo "✅ Stack deployment initiated (check AWS Console for status if async)."
