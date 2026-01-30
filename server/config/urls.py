from django.urls import path, include
from quotes.views import QuotationPreviewHTMLView

urlpatterns = [
    path('api/auth/', include('users.urls')),
    path('api/quotes/', include('quotes.urls')),
    path('quotes/preview-html', QuotationPreviewHTMLView.as_view(), name='quotation-preview-html-root'),
]