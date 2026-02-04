# Quotely

Quotely is a mobile-first MicroSaaS designed for interior design firms. It provides a unified, multi-tenant platform for managing customers, products, and professional quotations.

## Key Features
- **Professional Quotation Builder**: Create detailed, snapshotted quotes for customers.
- **Dynamic Product Catalog**: Manage product families and custom attributes with a real-time formula engine.
- **Automated PDF Generation**: Seamlessly generate and share professional PDFs via S3.
- **Multi-Tenant Architecture**: Secure data isolation using AWS Cognito and DynamoDB Single Table Design.
- **PWA Ready**: Mobile-first design, optimized for on-site agent use.

## Tech Stack
- **Framework**: [Next.js](https://nextjs.org/) (Unified Frontend & API)
- **Styling**: Tailwind CSS + Shadcn/UI
- **Database**: [AWS DynamoDB](https://aws.amazon.com/dynamodb/)
- **Authentication**: [AWS Cognito](https://aws.amazon.com/cognito/)
- **Storage**: [AWS S3](https://aws.amazon.com/s3/)
- **PDF Engine**: Puppeteer

## Project Structure
```text
/client
  ├── src/app/api       # Unified backend routes
  ├── src/lib/services  # DynamoDB/S3 service layer
  ├── src/lib/auth      # Cognito authentication integration
  ├── src/components    # UI components (Shadcn/UI)
/docs                   # System & Setup documentation
```

## Getting Started

### Prerequisites
- Node.js 20+
- AWS Account with DynamoDB and S3 configured.

### Local Setup
1. Clone the repository.
2. Navigate to the `client` directory: `cd client`.
3. Install dependencies: `npm install`.
4. Configure your `.env.local` (see `docs/DEVELOPMENT.md` for details).
5. Start the development server: `npm run dev`.

## Documentation
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Local Development Guide](docs/DEVELOPMENT.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## License
MIT
