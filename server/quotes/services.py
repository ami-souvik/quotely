import boto3
import uuid
from decimal import Decimal
from django.conf import settings
from botocore.exceptions import ClientError
from weasyprint import HTML, CSS
from io import BytesIO
import datetime

class DynamoDBService:
    def __init__(self):
        endpoint_url = settings.DYNAMODB_ENDPOINT_URL
        if endpoint_url:
            self.dynamodb = boto3.resource(
                'dynamodb',
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                endpoint_url=endpoint_url
            )
        else:
            self.dynamodb = boto3.resource(
                'dynamodb',
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
            )
        self.table = self.dynamodb.Table(settings.DYNAMO_TABLE_NAME)
        self.s3_client = boto3.client(
            's3',
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        self.s3_bucket_name = settings.AWS_S3_BUCKET_NAME

    def _convert_floats_to_decimals(self, obj):
        if isinstance(obj, list):
            return [self._convert_floats_to_decimals(i) for i in obj]
        elif isinstance(obj, dict):
            return {k: self._convert_floats_to_decimals(v) for k, v in obj.items()}
        elif isinstance(obj, float):
            return Decimal(str(obj))
        return obj

    def create_quotation(self, org_id, user_id, data):
        quote_uuid = uuid.uuid4()
        quote_id = str(quote_uuid)
        # Sanitise data to convert floats to Decimals for DynamoDB
        sanitized_data = self._convert_floats_to_decimals(data)
        
        item = {
            'PK': f"ORG#{org_id}",
            'SK': f"QUOTE#{quote_id}",
            'type': 'QUOTATION',
            'created_by': str(user_id),
            'status': 'DRAFT', # Default status
            'snapshot': sanitized_data,  # Full JSON snapshot of the quote
            'customer_name': data.get('customer_name', ''),
            'total_amount': Decimal(str(data.get('total_amount', 0.0))),
            'created_at': datetime.datetime.now().isoformat(),
            's3_pdf_link': None, # Placeholder for PDF link
            'GSI1PK': f"USER#{user_id}", # For "My Quotes" list by user
            'GSI1SK': f"QUOTE#{quote_id}"
        }
        try:
            self.table.put_item(Item=item)
            return quote_id
        except ClientError as e:
            print(f"Error creating quotation: {e.response['Error']['Message']}")
            return None

    def get_quotation(self, org_id, quote_id):
        try:
            response = self.table.get_item(
                Key={
                    'PK': f"ORG#{org_id}",
                    'SK': f"QUOTE#{quote_id}"
                }
            )
            return response.get('Item')
        except ClientError as e:
            print(f"Error getting quotation: {e.response['Error']['Message']}")
            return None

    def update_quotation(self, org_id, quote_id, data):
        try:
            # Sanitise data to convert floats to Decimals for DynamoDB
            sanitized_data = self._convert_floats_to_decimals(data)
            
            # We update the main fields and the snapshot
            update_expression = "SET customer_name = :cn, total_amount = :ta, snapshot = :ss, #s = :status"
            expression_attribute_names = {
                '#s': 'status'
            }
            expression_attribute_values = {
                ':cn': data.get('customer_name'),
                ':ta': Decimal(str(data.get('total_amount', 0.0))),
                ':ss': sanitized_data,
                ':status': 'DRAFT' # Reset to DRAFT on edit? Or keep current? Let's assume DRAFT for now as it's modified.
            }
            
            response = self.table.update_item(
                Key={
                    'PK': f"ORG#{org_id}",
                    'SK': f"QUOTE#{quote_id}"
                },
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values,
                ReturnValues="ALL_NEW"
            )
            return response.get('Attributes')
        except ClientError as e:
            print(f"Error updating quotation: {e.response['Error']['Message']}")
            return None

    def delete_quotation(self, org_id, quote_id):
        try:
            self.table.delete_item(
                Key={
                    'PK': f"ORG#{org_id}",
                    'SK': f"QUOTE#{quote_id}"
                }
            )
            return True
        except ClientError as e:
            print(f"Error deleting quotation: {e.response['Error']['Message']}")
            return False

    def update_quotation_s3_link(self, org_id, quote_id, s3_pdf_link):
        try:
            response = self.table.update_item(
                Key={
                    'PK': f"ORG#{org_id}",
                    'SK': f"QUOTE#{quote_id}"
                },
                UpdateExpression="SET s3_pdf_link = :link, #s = :status",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={
                    ':link': s3_pdf_link,
                    ':status': 'FINALIZED' # Mark as finalized once PDF is generated
                },
                ReturnValues="UPDATED_NEW"
            )
            return response.get('Attributes')
        except ClientError as e:
            print(f"Error updating quotation S3 link: {e.response['Error']['Message']}")
            return None
    
    def generate_quote_pdf_html(self, quote_data, org_name="Quotely Org"):
        # This is a very basic HTML template.
        # For production, this should be a proper Django template or more sophisticated.
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Quotation for {quote_data.get('customer_name', 'Customer')}</title>
            <style>
                body {{ font-family: sans-serif; margin: 20mm; }}
                h1, h2, h3 {{ color: #333; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
                .total {{ font-weight: bold; }}
            </style>
        </head>
        <body>
            <h1>Quotation</h1>
            <p><strong>Organization:</strong> {org_name}</p>
            <p><strong>Customer Name:</strong> {quote_data.get('customer_name', 'N/A')}</p>
            <p><strong>Created At:</strong> {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            <h2>Items</h2>
        """

        for family in quote_data.get('families', []):
            html_content += f"<h3>{family.get('family_name')} ({family.get('category')})</h3>"
            html_content += """
            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Unit Type</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
            """
            for item in family.get('items', []):
                html_content += f"""
                    <tr>
                        <td>{item.get('name')}</td>
                        <td>{float(item.get('qty', 0)):.2f}</td>
                        <td>INR {float(item.get('unit_price', 0)):.2f}</td>
                        <td>{item.get('unit_type')}</td>
                        <td>INR {float(item.get('total', 0)):.2f}</td>
                    </tr>
                """
            html_content += f"""
                    <tr>
                        <td colspan="4" class="total">Family Subtotal</td>
                        <td class="total">INR {float(family.get('subtotal', 0.0)):.2f}</td>
                    </tr>
                    <tr>
                        <td colspan="4" class="total">Margin Applied ({float(family.get('margin_applied', 0)) * 100:.0f}%)</td>
                        <td class="total">INR {float(family.get('subtotal', 0.0)) * float(family.get('margin_applied', 0.0)):.2f}</td>
                    </tr>
                    <tr>
                        <td colspan="4" class="total">Family Total (incl. margin)</td>
                        <td class="total">INR {float(family.get('subtotal', 0.0)) * (1 + float(family.get('margin_applied', 0.0))):.2f}</td>
                    </tr>
                </tbody>
            </table>
            """
        
        html_content += f"""
            <h2>Grand Total: INR {float(quote_data.get('total_amount', 0.0)):.2f}</h2>
            </body>
            </html>
        """
        return html_content

    def upload_pdf_to_s3(self, pdf_bytes, org_id, quote_id):
        try:
            s3_key = f"quotes/{org_id}/{quote_id}.pdf"
            self.s3_client.put_object(
                Bucket=self.s3_bucket_name,
                Key=s3_key,
                Body=pdf_bytes,
                ContentType='application/pdf'
                # ACL='private' removed as it conflicts with 'Bucket owner enforced' setting
            )
            s3_url = f"https://{self.s3_bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"
            return s3_url
        except ClientError as e:
            print(f"Error uploading PDF to S3: {e.response['Error']['Message']}")
            return None

    def get_presigned_s3_url(self, org_id, quote_id, expiration=3600):
        try:
            s3_key = f"quotes/{org_id}/{quote_id}.pdf"
            response = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.s3_bucket_name, 'Key': s3_key},
                ExpiresIn=expiration
            )
            return response
        except ClientError as e:
            print(f"Error generating presigned URL: {e.response['Error']['Message']}")
            return None

    def get_user_quotations(self, org_id, user_id):
        try:
            # Query the GSI (Global Secondary Index)
            response = self.table.query(
                IndexName='User-Date-Index', # Make sure this GSI is created in DynamoDB
                KeyConditionExpression='GSI1PK = :gsi_pk',
                # Further filter by main PK to ensure it's for the specific organization
                FilterExpression='PK = :org_pk',
                ExpressionAttributeValues={
                    ':gsi_pk': f"USER#{user_id}",
                    ':org_pk': f"ORG#{org_id}"
                }
            )
            return response.get('Items', [])
        except ClientError as e:
            print(f"Error fetching user quotations: {e.response['Error']['Message']}")
            return []

    def get_organization_id_by_name(self, org_name):
        slug = org_name.lower().replace(' ', '-')
        try:
            response = self.table.get_item(
                Key={
                    'PK': f"ORG_NAME#{slug}",
                    'SK': "INFO"
                }
            )
            item = response.get('Item')
            if item:
                return item.get('org_id')
            return None
        except ClientError as e:
            print(f"Error fetching organization by name: {e.response['Error']['Message']}")
            return None

    def create_organization(self, org_name):
        org_id = str(uuid.uuid4())
        slug = org_name.lower().replace(' ', '-')
        
        # 1. Create the lookup item
        lookup_item = {
            'PK': f"ORG_NAME#{slug}",
            'SK': "INFO",
            'org_id': org_id,
            'name': org_name
        }
        
        # 2. Create the main organization item
        org_item = {
            'PK': f"ORG#{org_id}",
            'SK': "METADATA",
            'name': org_name,
            'slug': slug,
            'created_at': datetime.datetime.now().isoformat()
        }
        
        try:
            # Use a transaction to ensure both are created
            self.dynamodb.meta.client.transact_write_items(
                TransactItems=[
                    {
                        'Put': {
                            'TableName': settings.DYNAMO_TABLE_NAME,
                            'Item': lookup_item,
                            'ConditionExpression': 'attribute_not_exists(PK)' # Ensure unique name
                        }
                    },
                    {
                        'Put': {
                            'TableName': settings.DYNAMO_TABLE_NAME,
                            'Item': org_item
                        }
                    }
                ]
            )
            return org_id
        except ClientError as e:
            print(f"Error creating organization: {e.response['Error']['Message']}")
            # Check if it failed because name exists, in that case return existing ID
            if e.response['Error']['Code'] == 'TransactionCanceledException':
                # Attempt to fetch existing ID
                return self.get_organization_id_by_name(org_name)
            return None

    # --- Existing methods ---
    def get_product_families(self, org_id):
        try:
            response = self.table.query(
                KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
                ExpressionAttributeValues={
                    ':pk': f"ORG#{org_id}",
                    ':sk': "FAMILY#"
                }
            )
            return response.get('Items', [])
        except ClientError as e:
            print(f"Error fetching families: {e.response['Error']['Message']}")
            return []

    def get_master_items(self, org_id, category=None):
        try:
            sk_prefix = f"ITEM#{category}#" if category else "ITEM#"
            response = self.table.query(
                KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
                ExpressionAttributeValues={
                    ':pk': f"ORG#{org_id}",
                    ':sk': sk_prefix
                }
            )
            return response.get('Items', [])
        except ClientError as e:
            print(f"Error fetching master items: {e.response['Error']['Message']}")
            return []

    def create_product_family(self, org_id, data):
        family_id = str(uuid.uuid4())
        item = {
            'PK': f"ORG#{org_id}",
            'SK': f"FAMILY#{data.get('category')}#{family_id}",
            'type': 'PRODUCT_FAMILY',
            'name': data.get('name'),
            'category': data.get('category'), # e.g., 'KITCHEN', 'BEDROOM'
            'default_items': data.get('default_items', []),
            'base_margin': Decimal(str(data.get('base_margin', 0.0))),
        }
        try:
            self.table.put_item(Item=item)
            return item
        except ClientError as e:
            print(f"Error creating product family: {e.response['Error']['Message']}")
            return None

    def get_product_family(self, org_id, category, family_id):
        try:
            response = self.table.get_item(
                Key={
                    'PK': f"ORG#{org_id}",
                    'SK': f"FAMILY#{category}#{family_id}"
                }
            )
            return response.get('Item')
        except ClientError as e:
            print(f"Error getting product family: {e.response['Error']['Message']}")
            return None

    def update_product_family(self, org_id, category, family_id, data):
        update_expression = "SET #n = :name, category = :category, default_items = :default_items, base_margin = :base_margin"
        expression_attribute_names = {
            '#n': 'name'
        }
        expression_attribute_values = {
            ':name': data.get('name'),
            ':category': data.get('category'),
            ':default_items': data.get('default_items'),
            ':base_margin': Decimal(str(data.get('base_margin', 0.0))),
        }
        try:
            response = self.table.update_item(
                Key={
                    'PK': f"ORG#{org_id}",
                    'SK': f"FAMILY#{category}#{family_id}"
                },
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values,
                ReturnValues="UPDATED_NEW"
            )
            return response.get('Attributes')
        except ClientError as e:
            print(f"Error updating product family: {e.response['Error']['Message']}")
            return None

    def delete_product_family(self, org_id, category, family_id):
        try:
            self.table.delete_item(
                Key={
                    'PK': f"ORG#{org_id}",
                    'SK': f"FAMILY#{category}#{family_id}"
                }
            )
            return True
        except ClientError as e:
            print(f"Error deleting product family: {e.response['Error']['Message']}")
            return False

    def create_master_item(self, org_id, data):
        item_id = str(uuid.uuid4())
        item = {
            'PK': f"ORG#{org_id}",
            'SK': f"ITEM#{data.get('category')}#{item_id}",
            'type': 'MASTER_ITEM',
            'name': data.get('name'),
            'category': data.get('category'),
            'unit_price': Decimal(str(data.get('unit_price'))),
            'unit_type': data.get('unit_type'),
        }
        try:
            self.table.put_item(Item=item)
            return item
        except ClientError as e:
            print(f"Error creating master item: {e.response['Error']['Message']}")
            return None

    def get_master_item(self, org_id, category, item_id):
        try:
            response = self.table.get_item(
                Key={
                    'PK': f"ORG#{org_id}",
                    'SK': f"ITEM#{category}#{item_id}"
                }
            )
            return response.get('Item')
        except ClientError as e:
            print(f"Error getting master item: {e.response['Error']['Message']}")
            return None

    def update_master_item(self, org_id, category, item_id, data):
        update_expression = "SET #n = :name, category = :category, unit_price = :unit_price, unit_type = :unit_type"
        expression_attribute_names = {
            '#n': 'name'
        }
        expression_attribute_values = {
            ':name': data.get('name'),
            ':category': data.get('category'),
            ':unit_price': Decimal(str(data.get('unit_price'))),
            ':unit_type': data.get('unit_type'),
        }
        try:
            response = self.table.update_item(
                Key={
                    'PK': f"ORG#{org_id}",
                    'SK': f"ITEM#{category}#{item_id}"
                },
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values,
                ReturnValues="UPDATED_NEW"
            )
            return response.get('Attributes')
        except ClientError as e:
            print(f"Error updating master item: {e.response['Error']['Message']}")
            return None

    def create_product(self, org_id, data):
        product_id = str(uuid.uuid4())
        family_id = data.get('family_id')

        item = {
            'PK': f"ORG#{org_id}",
            'SK': f"PRODUCT#{product_id}",
            'type': 'PRODUCT',
            'name': data.get('name'),
            'description': data.get('description'),
            'price': Decimal(str(data.get('price'))),
            'family_id': str(family_id) if family_id else None,
        }
        # Add GSI for family_id lookup if family_id is present
        if item['family_id']:
            item['GSI2PK'] = f"FAMILY#{item['family_id']}"
            item['GSI2SK'] = f"PRODUCT#{product_id}"

        try:
            self.table.put_item(Item=item)
            return item
        except ClientError as e:
            print(f"Error creating product: {e.response['Error']['Message']}")
            return None

    def get_product(self, org_id, product_id):
        try:
            response = self.table.get_item(
                Key={
                    'PK': f"ORG#{org_id}",
                    'SK': f"PRODUCT#{product_id}"
                }
            )
            return response.get('Item')
        except ClientError as e:
            print(f"Error getting product: {e.response['Error']['Message']}")
            return None

    def get_products(self, org_id):
        try:
            response = self.table.query(
                KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
                ExpressionAttributeValues={
                    ':pk': f"ORG#{org_id}",
                    ':sk': "PRODUCT#"
                }
            )
            return response.get('Items', [])
        except ClientError as e:
            print(f"Error fetching products: {e.response['Error']['Message']}")
            return []

    def update_product(self, org_id, product_id, data):
        update_expression = "SET #n = :name, description = :description, price = :price, family_id = :family_id"
        expression_attribute_names = {
            '#n': 'name'
        }
        expression_attribute_values = {
            ':name': data.get('name'),
            ':description': data.get('description'),
            ':price': Decimal(str(data.get('price'))),
            ':family_id': data.get('family_id'),
        }
        try:
            response = self.table.update_item(
                Key={
                    'PK': f"ORG#{org_id}",
                    'SK': f"PRODUCT#{product_id}"
                },
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values,
                ReturnValues="UPDATED_NEW"
            )

            # If family_id is part of the update, also update GSI2PK
            if 'family_id' in data:
                if data['family_id']:
                    self.table.update_item(
                        Key={'PK': f"ORG#{org_id}", 'SK': f"PRODUCT#{product_id}"},
                        UpdateExpression="SET GSI2PK = :gsi2pk, GSI2SK = :gsi2sk",
                        ExpressionAttributeValues={
                            ':gsi2pk': f"FAMILY#{data['family_id']}",
                            ':gsi2sk': f"PRODUCT#{product_id}",
                        }
                    )
                else: # family_id is None, remove GSI2PK
                     self.table.update_item(
                        Key={'PK': f"ORG#{org_id}", 'SK': f"PRODUCT#{product_id}"},
                        UpdateExpression="REMOVE GSI2PK, GSI2SK"
                    )

            return response.get('Attributes')
        except ClientError as e:
            print(f"Error updating product: {e.response['Error']['Message']}")
            return None

    def delete_product(self, org_id, product_id):
        try:
            self.table.delete_item(
                Key={
                    'PK': f"ORG#{org_id}",
                    'SK': f"PRODUCT#{product_id}"
                }
            )
            return True
        except ClientError as e:
            print(f"Error deleting product: {e.response['Error']['Message']}")
            return False

    def get_products_by_family(self, org_id, category, family_id):
        """
        This method requires a Global Secondary Index (GSI) on the table.
        GSI Name: Family-Product-Index (or similar)
        Partition Key: GSI2PK (String) - Stores value like 'FAMILY#<category>#<family_id>'
        Sort Key: GSI2SK (String) - Stores value like 'PRODUCT#<product_id>'
        """
        try:
            response = self.table.query(
                IndexName='Family-Product-Index', # IMPORTANT: This index must be created on the DynamoDB table
                KeyConditionExpression='GSI2PK = :gsi_pk AND begins_with(GSI2SK, :gsi_sk)',
                # We also need to filter by org_id for security, since GSI key does not contain it.
                FilterExpression='PK = :pk',
                ExpressionAttributeValues={
                    ':gsi_pk': f"FAMILY#{family_id}",
                    ':gsi_sk': "PRODUCT#",
                    ':pk': f"ORG#{org_id}"
                }
            )
            return response.get('Items', [])
        except ClientError as e:
            # If the index doesn't exist, this will fail.
            print(f"Error fetching products by family (check for GSI 'Family-Product-Index'): {e.response['Error']['Message']}")
            return []
