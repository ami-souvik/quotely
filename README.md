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

8️⃣ Docker Deployment on AWS EC2 (Step-by-Step)

If you prefer to deploy using Docker containers on a single AWS EC2 instance (simplest start), follow these steps.

**Prerequisites:**
1.  **AWS Account** with a valid payment method.
2.  **AWS CLI** installed and configured locally (`aws configure`).
3.  **SSH Key Pair** downloaded for EC2 access.

**Step 1: Configure AWS Resources**

1.  **Create DynamoDB Table**:
    *   Go to DynamoDB Console -> **Create table**.
    *   **Name**: `QuotelyCore` (or as per your `.env`).
    *   **Partition Key**: `PK` (String).
    *   **Sort Key**: `SK` (String).
    *   **Indexes**: Create two GSIs:
        *   `User-Date-Index` (PK: `GSI1PK`, SK: `GSI1SK`).
        *   `Family-Product-Index` (PK: `GSI2PK`, SK: `GSI2SK`).

2.  **Create S3 Bucket**:
    *   Go to S3 Console -> **Create bucket**.
    *   **Name**: `quotely-quotes-prod` (must be unique).
    *   **Region**: `ap-south-1` (same as DynamoDB).
    *   **Block Public Access**: **ENABLED** (Recommended).
    *   **Object Ownership**: **Bucket owner enforced** (ACLs disabled).

3.  **Create IAM User**:
    *   Go to IAM Console -> **Users** -> **Create User** (`quotely-deploy`).
    *   **Permissions**: Attach a policy allowing `DynamoDBFullAccess` and `S3FullAccess` (or scope strictly to the created resources).
    *   **Security Credentials**: Create Access Key and save the **ID** and **Secret**.

**Step 2: Prepare Application for Docker**

1.  **Update `server/.env`**:
    *   Create a production `.env` file for the backend.
    *   Set `DEBUG=False`.
    *   Set `ALLOWED_HOSTS=your-ec2-public-ip` (after creating EC2) or `*` temporarily.
    *   Set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` from Step 1.
    *   Set `DYNAMO_TABLE_NAME` and `AWS_S3_BUCKET_NAME`.
    *   **Comment out** `DYNAMODB_ENDPOINT_URL` (to use real AWS).

2.  **Update `docker-compose.yml`**:
    *   Ensure the `server` service command is `gunicorn config.wsgi:application --bind 0.0.0.0:8000`.
    *   Ensure `client` has `NEXT_PUBLIC_API_URL` pointing to your EC2 IP/Domain.

**Step 3: Launch EC2 Instance**

1.  Go to EC2 Console -> **Launch Instance**.
2.  **OS**: Ubuntu Server 24.04 LTS (t3.small or t3.medium recommended for Node+Python build).
3.  **Key Pair**: Select your SSH key.
4.  **Security Group**: Allow **SSH (22)**, **HTTP (80)**, **HTTPS (443)**, **Custom TCP (3000)**, **Custom TCP (8000)** from Anywhere (0.0.0.0/0).

**Step 4: Deploy on EC2**

1.  **SSH into EC2**:
    ```bash
    ssh -i "your-key.pem" ubuntu@your-ec2-public-ip
    ```

2.  **Install Docker & Docker Compose**:
    ```bash
    sudo apt update
    sudo apt install docker.io docker-compose -y
    sudo usermod -aG docker $USER
    # Log out and log back in for permissions to take effect
    ```

3.  **Clone/Copy Code**:
    *   Clone your repo: `git clone https://github.com/your-repo/quotely.git`
    *   Or SCP your project folder.

4.  **Run Containers**:
    ```bash
    cd quotely
    # Create .env file with production secrets
    nano server/.env 
    # Build and start in detached mode
    docker-compose up -d --build
    ```

5.  **Verify**:
    *   Visit `http://your-ec2-public-ip:3000` in your browser.
    *   The frontend should load and communicate with the backend at port 8000.

---

🔟 Serverless Deployment (AWS Lambda + Docker)

For a serverless backend that scales to zero (pay only when used), we can deploy the Django Docker container to AWS Lambda using the **AWS Lambda Web Adapter**. This adapter allows us to run standard web applications (Django, Flask, etc.) on Lambda without code changes.

**How it works:**
The adapter runs as a Lambda Extension. It receives Lambda events (from API Gateway or Function URL), converts them to standard HTTP requests, forwards them to your web app (Gunicorn) running on localhost inside the container, and then converts the HTTP response back to a Lambda response.

**Prerequisites:**
1.  AWS CLI installed and configured.
2.  Docker installed.

**Step 1: Update Dockerfile for Lambda**

We need to add the Lambda Web Adapter to our `server/Dockerfile`.

1.  Open `server/Dockerfile`.
2.  Add this line **after** the `FROM` instruction:
    ```dockerfile
    COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.7.0 /lambda-adapter /opt/extensions/lambda-adapter
    ```
    (This copies the adapter binary into the container extension path).
3.  Ensure your `CMD` starts Gunicorn on port `8080` (default port expected by the adapter, though configurable).
    ```dockerfile
    # ... existing steps ...
    EXPOSE 8080
    CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8080"]
    ```

**Step 2: Build and Push to AWS ECR**

1.  **Create ECR Repository**:
    ```bash
    aws ecr create-repository --repository-name quotely-serverless --region ap-south-1
    ```

2.  **Login to ECR**:
    ```bash
    aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com
    ```

3.  **Build Image**:
    ```bash
    docker build -t quotely-serverless -f server/Dockerfile server/
    ```

4.  **Tag and Push**:
    ```bash
    docker tag quotely-serverless:latest YOUR_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/quotely-serverless:latest
    docker push YOUR_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/quotely-serverless:latest
    ```

**Step 3: Create Lambda Function**

1.  Go to AWS Lambda Console -> **Create function**.
2.  Select **Container image**.
3.  **Name**: `quotely-api`.
4.  **Container image URI**: Browse and select the image you just pushed (`quotely-serverless:latest`).
5.  **Architecture**: x86_64 (or arm64 if you built on M1/M2 Mac).
6.  **Create function**.

**Step 4: Configure Lambda**

1.  **Configuration -> General configuration**:
    *   **Timeout**: Increase to 30 seconds (or more for PDF generation).
    *   **Memory**: Increase to 512MB or 1024MB (PDF generation needs RAM/CPU).

2.  **Configuration -> Environment variables**:
    *   Add all variables from your `server/.env` file:
        *   `DJANGO_SECRET_KEY`
        *   `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
        *   `DYNAMO_TABLE_NAME`, `AWS_S3_BUCKET_NAME`
        *   `DEBUG`: `False`
        *   `ALLOWED_HOSTS`: `*` (or the specific Function URL domain).

3.  **Permissions**:
    *   Go to **Configuration -> Permissions**.
    *   Click the Role name to open IAM.
    *   Add policies to allow access to DynamoDB (`QuotelyCore`) and S3 (`quotely-quotes`).

**Step 5: Expose via Function URL or API Gateway**

**Option A: Function URL (Simplest)**
1.  Go to **Configuration -> Function URL**.
2.  **Create function URL**.
3.  **Auth type**: `NONE` (if you want it public for your frontend to call).
4.  **CORS**: Configure to allow your frontend domain (e.g., `*` for dev, or your Vercel/Amplify domain).
    *   Allow Methods: `*`.
    *   Allow Headers: `*`.
    *   Allow Origins: `*`.
5.  **Save**.
6.  Copy the Function URL. This is your new `NEXT_PUBLIC_API_URL`.

**Option B: API Gateway (Advanced)**
1.  Create an HTTP API in API Gateway.
2.  Create a route `ANY /{proxy+}`.
3.  Integrate it with your Lambda function.

**Step 6: Update Frontend**

1.  Update your frontend environment variable `NEXT_PUBLIC_API_URL` to point to the Lambda Function URL (e.g., `https://xyz...lambda-url.ap-south-1.on.aws/api` - note you might need to append `/api` if your Django urls expect it, or adjust Django `urls.py`).
2.  Redeploy frontend.

---

1️⃣1️⃣ Traditional Deployment (EC2 without Docker)

For simplicity or debugging, you can run the Django app directly on a Linux server (Ubuntu 24.04).

**Step 1: System Setup**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3-pip python3-venv libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-gobject0 libgdk-pixbuf-2.0-0 libcairo-gobject2 -y
```

**Step 2: Application Setup**
```bash
git clone https://github.com/your-repo/quotely.git
cd quotely/server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn
```

**Step 3: Configuration**
Create `.env` file in `server/` with your AWS credentials and settings.

**Step 4: Run Application**
```bash
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```
(For production, set up a Systemd service and Nginx reverse proxy).
