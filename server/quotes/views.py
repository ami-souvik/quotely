from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .services import DynamoDBService
from .serializers import ProductFamilySerializer, MasterItemSerializer, ProductSerializer
from .permissions import IsAdmin
from weasyprint import HTML, CSS
from io import BytesIO

class ProductFamilyListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        families = service.get_product_families(org_id)
        serializer = ProductFamilySerializer(families, many=True) # Corrected: remove `data=`
        return Response(serializer.data)

    def post(self, request):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = ProductFamilySerializer(data=request.data)
        if serializer.is_valid():
            family_data = serializer.validated_data
            try:
                created_family = service.create_product_family(org_id, family_data)
                if created_family:
                    return Response(created_family, status=status.HTTP_201_CREATED)
                return Response({"error": "Failed to create product family in service"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ProductFamilyDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request, category, family_id):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        family = service.get_product_family(org_id, category, family_id)
        if family:
            return Response(family)
        return Response({"error": "Product family not found"}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, category, family_id):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = ProductFamilySerializer(data=request.data)
        if serializer.is_valid():
            updated_family = service.update_product_family(org_id, category, family_id, serializer.validated_data)
            if updated_family:
                return Response(updated_family)
            return Response({"error": "Failed to update product family"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, category, family_id):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        if service.delete_product_family(org_id, category, family_id):
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response({"error": "Failed to delete product family"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MasterItemListView(APIView):
    def get(self, request):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        category = request.query_params.get('category')
        
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        items = service.get_master_items(org_id, category)
        return Response(items)

    def post(self, request):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = MasterItemSerializer(data=request.data)
        if serializer.is_valid():
            item_data = serializer.validated_data
            created_item = service.create_master_item(org_id, item_data)
            if created_item:
                return Response(created_item, status=status.HTTP_201_CREATED)
            return Response({"error": "Failed to create master item"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MasterItemDetailView(APIView):
    def get(self, request, category, item_id):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        item = service.get_master_item(org_id, category, item_id)
        if item:
            return Response(item)
        return Response({"error": "Master item not found"}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, category, item_id):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = MasterItemSerializer(data=request.data)
        if serializer.is_valid():
            updated_item = service.update_master_item(org_id, category, item_id, serializer.validated_data)
            if updated_item:
                return Response(updated_item)
            return Response({"error": "Failed to update master item"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, category, item_id):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        # For now, we'll just return a success
        return Response(status=status.HTTP_204_NO_CONTENT)

class QuotationCreateView(APIView):
    def post(self, request):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        quote_id = service.create_quotation(org_id, str(request.user.id), request.data)
        if quote_id:
            # Fetch the newly created quote to return a complete snapshot
            created_quote = service.get_quotation(org_id, quote_id)
            if created_quote:
                return Response(created_quote, status=status.HTTP_201_CREATED)
            return Response({"error": "Quote created but failed to retrieve"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({"error": "Failed to create quotation"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class QuotationDetailView(APIView):
    def get(self, request, quote_id):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        quote = service.get_quotation(org_id, quote_id)
        if quote:
            return Response(quote)
        return Response({"error": "Quotation not found"}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, quote_id):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        # We might want to validate the data similar to create.
        # For now, passing request.data directly to service which expects similar structure to create.
        updated_quote = service.update_quotation(org_id, quote_id, request.data)
        if updated_quote:
            return Response(updated_quote)
        return Response({"error": "Failed to update quotation"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, quote_id):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        if service.delete_quotation(org_id, quote_id):
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response({"error": "Failed to delete quotation"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class QuotationGeneratePDFView(APIView):
    def post(self, request, quote_id):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        quote = service.get_quotation(org_id, quote_id)
        if not quote:
            return Response({"error": "Quotation not found"}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            # Assuming quote['snapshot'] contains the data needed for PDF
            html_content = service.generate_quote_pdf_html(quote['snapshot'], org_name=request.organization.name)
            pdf_bytes = HTML(string=html_content).write_pdf(stylesheets=[CSS(string='@page { size: A4; margin: 1cm; }')])
            
            s3_pdf_link = service.upload_pdf_to_s3(BytesIO(pdf_bytes), org_id, quote_id)
            
            if s3_pdf_link:
                service.update_quotation_s3_link(org_id, quote_id, s3_pdf_link)
                return Response({"message": "PDF generated and uploaded", "s3_pdf_link": s3_pdf_link}, status=status.HTTP_200_OK)
            return Response({"error": "Failed to upload PDF to S3"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            print(f"Error generating PDF: {e}")
            return Response({"error": f"Error generating PDF: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class QuotationPresignedURLView(APIView):
    def get(self, request, quote_id):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        quote = service.get_quotation(org_id, quote_id)
        if not quote or not quote.get('s3_pdf_link'):
            return Response({"error": "Quotation not found or PDF not generated"}, status=status.HTTP_404_NOT_FOUND)
        
        presigned_url = service.get_presigned_s3_url(org_id, quote_id)
        if presigned_url:
            return Response({"presigned_url": presigned_url}, status=status.HTTP_200_OK)
        return Response({"error": "Failed to generate presigned URL"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserQuotationListView(APIView):
    def get(self, request):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        user_id = str(request.user.id) # Ensure user_id is a string
        
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        quotations = service.get_user_quotations(org_id, user_id)
        # You might want to serialize this data further if needed
        return Response(quotations)

class ProductListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        products = service.get_products(org_id)
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)

    def post(self, request):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = ProductSerializer(data=request.data)
        if serializer.is_valid():
            product_data = serializer.validated_data
            try:
                created_product = service.create_product(org_id, product_data)
                if created_product:
                    # The service returns the full item, which we can pass to the serializer
                    return Response(ProductSerializer(created_product).data, status=status.HTTP_201_CREATED)
                return Response({"error": "Failed to create product in service"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ProductDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request, product_id):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        product = service.get_product(org_id, product_id)
        if product:
            serializer = ProductSerializer(product)
            return Response(serializer.data)
        return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, product_id):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = ProductSerializer(data=request.data)
        if serializer.is_valid():
            updated_product = service.update_product(org_id, product_id, serializer.validated_data)
            if updated_product:
                # The service returns the updated attributes, let's fetch the full product to be safe
                product = service.get_product(org_id, product_id)
                return Response(ProductSerializer(product).data)
            return Response({"error": "Failed to update product"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, product_id):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        if service.delete_product(org_id, product_id):
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response({"error": "Failed to delete product"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProductListByFamilyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, category, family_id):
        service = DynamoDBService()
        org_id = request.organization.id if request.organization else None
        if not org_id:
            return Response({"error": "No organization associated with user"}, status=status.HTTP_400_BAD_REQUEST)
        
        products = service.get_products_by_family(org_id, category, family_id)
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)
