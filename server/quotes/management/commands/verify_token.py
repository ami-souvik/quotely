from django.core.management.base import BaseCommand
from django_cognito_jwt import JSONWebTokenAuthentication
from rest_framework.request import Request
from django.http import HttpRequest

class Command(BaseCommand):
    help = 'Verify Cognito Token'

    def add_arguments(self, parser):
        parser.add_argument('token', type=str)

    def handle(self, *args, **options):
        token = options['token']
        auth = JSONWebTokenAuthentication()
        
        # Mock request with header
        request = HttpRequest()
        request.META['HTTP_AUTHORIZATION'] = f'Bearer {token}'
        
        try:
            print(f"Verifying token...")
            user, auth_token = auth.authenticate(request)
            print(f"Success! User: {user}")
            print(f"User Email: {user.email}")
            print(f"User Org: {getattr(user, 'organization', 'None')}")
        except Exception as e:
            print(f"Authentication Failed!")
            print(f"Error Type: {type(e).__name__}")
            print(f"Error Message: {str(e)}")
            import traceback
            traceback.print_exc()
