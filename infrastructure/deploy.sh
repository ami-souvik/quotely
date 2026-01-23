#!/bin/bash
set -e

# Configuration (hardcoded for now based on project, could be env vars)
STACK_NAME="QuotelyInfrastructureV6"
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
    ExistingTableName="QuotelyCore-v6" \
    ExistingBucketName="quotely-quotes-v6" \
    CognitoUserPoolId=ap-south-1_BvTJlEG5R \
    CognitoAppClientId=5dqss2ei776k8n7jb9e54le8q4 \
    CognitoAudience=5dqss2ei776k8n7jb9e54le8q4 \
    CorsAllowedOrigins="http://localhost:3000,http://127.0.0.1:3000,https://quotely-six.vercel.app" \
    AllowedHosts="af3zoi4ci0.execute-api.ap-south-1.amazonaws.com,quotely-six.vercel.app,localhost,127.0.0.1" \
    DjangoSecretKey="uRhIGrixN38aQctjbnPWxf+dx7hvDw2VbhJ1P1Ev9LA=" \
    DeployLambda=$DEPLOY_LAMBDA

echo "✅ Stack deployment initiated (check AWS Console for status if async)."
