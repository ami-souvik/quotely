import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION || "us-east-1";

// DynamoDB Client
const dynamoClient = new DynamoDBClient({
  region,
  endpoint: process.env.DYNAMODB_ENDPOINT_URL || undefined,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export const db = DynamoDBDocumentClient.from(dynamoClient);

// S3 Client
export const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export const DYNAMO_TABLE_NAME = process.env.DYNAMO_TABLE_NAME || "QuotelyCore";
export const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "quotely-quotes";
