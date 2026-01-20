This is a comprehensive architectural blueprint for Quotely, a mobile-first MicroSaaS for interior design firms.

This design prioritizes speed of use (mobile context), data isolation (multi-tenancy), and operational simplicity
(AWS).

---

1️⃣ Product Architecture

We will use a Hybrid Architecture: A server-side Python API for heavy logic (PDF generation, auth) and a client-side
React app for the interactive mobile experience.

* Client: Next.js PWA (Progressive Web App). Acts as a native app shell.
* CDN/Edge: AWS CloudFront + WAF (Security).
* API Layer: Python Django running in a Docker Container.
* Authentication: Django Simple JWT.
* Database (Hybrid):
    * PostgreSQL (AWS RDS or Aurora Serverless): Strictly for Users, Groups, and Auth permissions (Django's auth
        system works best here).
    * DynamoDB: For all business data (Quotations, Templates, Products, Companies). This ensures high-speed reads and
        flexible schemas.
* Storage: AWS S3 (for generated PDF storage and static assets).

---

2️⃣ Data Model (DynamoDB - Single Table Design)

We will use a Single Table Design pattern.
Table Name: QuotelyCore
Partition Key (PK): ORG#<OrgID> (This guarantees strict multi-tenant isolation).
Sort Key (SK): Entity definitions.

Entities

1. Product Families (Templates)
* PK: ORG#<OrgID>
* SK: FAMILY#<FamilyType>#<FamilyID> (e.g., FAMILY#KITCHEN#123)
* Attributes:
    * name: "Modern Modular Kitchen"
    * default_items: JSON List of items (e.g., "Hinges", "Plywood", "Labor")
    * base_margin: 15%

2. Line Items (Master Catalog)
* PK: ORG#<OrgID>
* SK: ITEM#<CategoryID>#<ItemID>
* Attributes:
    * name: "Marine Ply 18mm"
    * unit_price: 120.00
    * unit_type: "sqft"

3. Quotations (The Snapshot)
* PK: ORG#<OrgID>
* SK: QUOTE#<QuoteID>
* Attributes:
    * customer_name: "John Doe"
    * status: "DRAFT" | "SENT" | "APPROVED"
    * created_by: "Agent_Mike"
    * total_amount: 15000.00
    * s3_pdf_link: "https://..."
    * `data_snapshot`: (JSON Blob) This contains the entire quote structure at the moment of creation.

1         [
2           {
3             "family": "Kitchen",
4             "items": [
5                {"name": "Ply", "qty": 100, "price": 120, "total": 12000}
6             ]
7           }
8         ]
    * Why? If you change the price of Plywood next month, John Doe's quote from today must not change.

---

3️⃣ Backend Design (Django + DRF)

Directory Structure:

1 /backend
2   /core (Settings)
3   /users (Postgres Auth)
4   /quotes (DynamoDB Logic)
5   /common (Utils, S3, PDF)

Key Libraries:
* boto3: AWS SDK for DynamoDB interaction.
* djangorestframework: API structure.
* djangorestframework-simplejwt: Authentication.
* weasyprint: For generating PDFs (better styling than ReportLab).

API Endpoints:


┌────────┬────────────────────────────┬───────────────────────────────────────────────┐
│ Method │ Endpoint                   │ Description                                   │
├────────┼────────────────────────────┼───────────────────────────────────────────────┤
│ POST   │ /api/auth/login/           │ Returns JWT Access/Refresh tokens.            │
│ GET    │ /api/families/             │ Lists available templates (Kitchen, Bedroom). │
│ GET    │ /api/items/?q=ply          │ Search master catalog for custom additions.   │
│ POST   │ /api/quotes/               │ Creates a new quote. Snapshots data here.     │
│ PATCH  │ /api/quotes/<id>/          │ Update line items (Draft mode only).          │
│ POST   │ /api/quotes/<id>/finalize/ │ Locks quote, Generates PDF, uploads to S3.    │
└────────┴────────────────────────────┴───────────────────────────────────────────────┘


DynamoDB Service Wrapper (Code Snippet):
Don't use Django ORM for Dynamo. Use a service class.

1 # quotes/services.py
2 import boto3
3 from django.conf import settings
4 import uuid
5 
6 dynamodb = boto3.resource('dynamodb', region_name=settings.AWS_REGION)
7 table = dynamodb.Table(settings.DYNAMO_TABLE_NAME)
8 
9 def create_quote(org_id, user_id, quote_data):
10     quote_id = str(uuid.uuid4())
11     item = {
12         'PK': f"ORG#{org_id}",
13         'SK': f"QUOTE#{quote_id}",
14         'created_by': user_id,
15         'status': 'DRAFT',
16         'snapshot': quote_data, # Full JSON of items
17         'GSI1PK': f"USER#{user_id}", # For "My Quotes" list
18         'GSI1SK': f"DATE#{current_timestamp}"
19     }
20     table.put_item(Item=item)
21     return quote_id

---

4️⃣ Frontend Design (Next.js App Router)

UX Philosophy: "Thumb-driven Design". Important actions at the bottom.

Tech Stack:
* Next.js 14+ (App Router)
* Tailwind CSS
* Shadcn/UI: For robust, accessible components (Drawers, Dialogs).
* React Hook Form: For performance on large lists.
* Zustand: For local state (managing the current quote being built).

Page Flow:

1. Dashboard: List of recent quotes + big FAB (Floating Action Button) "New Quote".
2. Family Selector: Grid of icons (Kitchen, Bedroom, etc.). Tapping one opens a bottom drawer to configure basic
    dimensions (e.g., "Kitchen L-Shape, 10x10").
3. Quote Editor (The Core):
    * View: Accordion list of selected families.
    * Action: Swipe left on an item to delete. Tap to edit Qty/Price.
    * Add: "Add Custom Item" button opens a search for the Master Catalog.
    * Footer: Sticky bar showing "Total: $5,000".
4. Preview: Simple HTML view of the invoice.
5. Share: Triggers navigator.share (native mobile share) with the S3 PDF link.

---

5️⃣ Pricing & Calculation Logic

The Formula:
LineTotal = (Unit Cost * Qty) + (Unit Cost * Margin%)
GrandTotal = Sum(LineTotals) + Tax%

Snapshot Logic:
1. Frontend fetches DefaultTemplate.
2. User modifies Qty/Price in Frontend State.
3. User clicks "Save".
4. Frontend sends the entire object to Backend.
5. Backend validates structure, calculates totals (server-side trust), and saves as a JSON blob to DynamoDB.
6. Crucial: We do not reference Item IDs in the saved quote. We save the actual text/price values.

---

6️⃣ Security & Roles

* Multi-tenancy: Every API request must have the user's OrganizationID injected into the context via Middleware.
* DynamoDB Isolation: The Backend code appends ORG#{org_id} to every PK query. A user from Org A literally cannot
    query Org B's data because the PK won't match.
* JWT: Short-lived access tokens (5 mins), long-lived refresh tokens (7 days).
* PDF Security: S3 files should be private. Use boto3.generate_presigned_url() to generate a temporary 1-hour link
    when the user clicks "Share".

---

7️⃣ AWS DEPLOYMENT GUIDE (Production Ready)

We will use AWS App Runner for the backend (easiest container management) and Amplify for the frontend.

Step A: Database (DynamoDB)
1. Go to AWS Console -> DynamoDB -> Create Table.
2. Table Name: QuotelyCore
3. Partition Key: PK (String).
4. Sort Key: SK (String).
5. Capacity: On-Demand (Cost-effective for startups).
6. Create GSI (Global Secondary Index):
    * Index Name: User-Date-Index
    * PK: GSI1PK (String) - Used for USER#<id>
    * SK: GSI1SK (String) - Used for DATE#<timestamp>

Step B: Backend (Django on App Runner)
1. Dockerize Django:
    Create Dockerfile in root:

1     FROM python:3.11-slim
2     WORKDIR /app
3     COPY requirements.txt .
4     RUN pip install -r requirements.txt
5     COPY . .
6     # Install dependencies for WeasyPrint (PDF)
7     RUN apt-get update && apt-get install -y libpango-1.0-0 libpangoft2-1.0-0
8     CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
2. Push to ECR:
    * Create Repo quotely-backend.
    * aws ecr push ... (Follow AWS copy-paste commands).
3. Create App Runner Service:
    * Source: Container Image (from ECR).
    * Env Vars: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, DJANGO_SECRET_KEY, DYNAMO_TABLE_NAME.
    * Why App Runner? It handles load balancing, SSL, and auto-scaling automatically. Much simpler than ECS Fargate
        for this scale.
Step C: Frontend (Next.js on Amplify)
1. Commit code to GitHub.
2. Go to AWS Amplify Console -> "Host Web App".
3. Connect GitHub Repo.
4. Build Settings: Amplify auto-detects Next.js.
    * Add Env Var: NEXT_PUBLIC_API_URL (The URL from App Runner above).
5. Deploy.

Step D: Storage (S3)
1. Create Bucket: quotely-invoices.
2. Block Public Access: On (Private).
3. CORS Configuration: Allow GET from your Amplify domain.

---

8️⃣ MVP Development Plan (21 Days)

Week 1: Foundation & Data
* Day 1-2: Setup Django repo, Docker, and DynamoDB connection (boto3).
* Day 3-4: Implement User Auth (JWT) and Organization Logic.
* Day 5-7: Build "Product Family" and "Master Catalog" CRUD APIs. Seed with dummy data (Kitchen, Bath).

Week 2: The Core Builder (Frontend)
* Day 8-10: Next.js setup with Shadcn/UI. Build Login and Dashboard.
* Day 11-13: Build the Quote Editor. This is the hardest part. Focus on adding/removing items from local state and
    calculating totals live.
* Day 14: Integration. Send the JSON payload to Django and save to DynamoDB.

Week 3: Output & Polish
* Day 15-17: Implement WeasyPrint in Django. Generate PDF from the JSON snapshot. Upload to S3.
* Day 18: Mobile responsiveness check. Ensure keyboard doesn't hide input fields (common mobile web issue).
* Day 19-20: AWS Deployment (ECR, App Runner, Amplify).
* Day 21: Final end-to-end smoke test.

🚫 Constraints Check
* No ERP: We only store snapshots, we don't track inventory levels.
* Mobile First: UI is designed with Drawers and Sticky Footers.
* MicroSaaS: Multi-tenant ORG# keys are baked in from day 1.

You are ready to execute. Start by setting up the Django Docker container.