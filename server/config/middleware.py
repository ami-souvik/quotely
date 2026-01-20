from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from users.models import Organization, User

class MultiTenancyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.organization = None
        authenticator = JWTAuthentication()
        try:
            auth_header = request.META.get('HTTP_AUTHORIZATION')
            if auth_header:
                validated_token = authenticator.get_validated_token(auth_header.split(' ')[1])
                user_id = validated_token.get('user_id')
                user = User.objects.get(id=user_id)
                request.user = user

                org_id = validated_token.get('org_id')
                if org_id:
                    request.organization = Organization.objects.filter(id=org_id).first()
        except (InvalidToken, TokenError, User.DoesNotExist):
            pass

        response = self.get_response(request)
        return response
