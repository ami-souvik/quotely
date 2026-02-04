from django.urls import path
from .views import (
    ProductFamilyListView, MasterItemListView, QuotationCreateView,
    ProductFamilyDetailView, MasterItemDetailView,
    QuotationGeneratePDFView, QuotationPresignedURLView, QuotationPreviewHTMLView,
    UserQuotationListView, ProductListView, ProductDetailView, ProductListByFamilyView,
    QuotationDetailView, ProductSettingsView, TemplateSettingsView,
    CustomerListView, CustomerDetailView,
    PDFTemplateListView, PDFTemplateDetailView
)

urlpatterns = [
    # Customer Endpoints
    path('customers/', CustomerListView.as_view(), name='customer-list'),
    path('customers/<str:customer_id>/', CustomerDetailView.as_view(), name='customer-detail'),

    # Product Family Endpoints
    path('families/', ProductFamilyListView.as_view(), name='family-list'),
    path('families/<uuid:family_id>/', ProductFamilyDetailView.as_view(), name='family-detail'),
    path('families/<uuid:family_id>/products/', ProductListByFamilyView.as_view(), name='product-list-by-family'),

    # Product Endpoints
    path('products/', ProductListView.as_view(), name='product-list'),
    path('products/settings/', ProductSettingsView.as_view(), name='product-settings'),
    path('products/<uuid:product_id>/', ProductDetailView.as_view(), name='product-detail'),

    # Master Item Endpoints
    path('items/', MasterItemListView.as_view(), name='item-list'),
    path('items/<str:category>/<uuid:item_id>/', MasterItemDetailView.as_view(), name='item-detail'),

    # PDF Template Endpoints
    path('pdf-templates/', PDFTemplateListView.as_view(), name='pdf-template-list'),
    path('pdf-templates/<uuid:template_id>/', PDFTemplateDetailView.as_view(), name='pdf-template-detail'),

    # Quotation Endpoints
    path('create/', QuotationCreateView.as_view(), name='quotation-create'),
    path('mine/', UserQuotationListView.as_view(), name='user-quotation-list'), # New URL
    path('templates/settings/', TemplateSettingsView.as_view(), name='template-settings'),
    path('<str:quote_id>/', QuotationDetailView.as_view(), name='quotation-detail'),
    path('<str:quote_id>/generate-pdf/', QuotationGeneratePDFView.as_view(), name='quotation-generate-pdf'),
    path('<str:quote_id>/preview-html/', QuotationPreviewHTMLView.as_view(), name='quotation-preview-html'),
    path('<str:quote_id>/presigned-url/', QuotationPresignedURLView.as_view(), name='quotation-presigned-url'),
]