from rest_framework import authentication
from rest_framework import exceptions
from django_cognito_jwt.authentication import JSONWebTokenAuthentication
from quotes.services import DynamoDBService

class OrganizationStub:
    def __init__(self, id, name):
        self.id = id
        self.name = name

class StatelessUser:
    def __init__(self, user_id, email, role, org_id, org_name):
        self.id = user_id
        self.pk = user_id
        self.email = email
        self.username = user_id
        self.role = role
        self.is_authenticated = True
        self.is_active = True
        self.is_staff = (role == 'ADMIN')
        self.is_superuser = False
        
        self.organization = OrganizationStub(org_id, org_name) if org_id else None

    def __str__(self):
        return self.username

class DynamoDBAuthentication(JSONWebTokenAuthentication):
    def authenticate_credentials(self, payload):
        # 1. Extract standard claims
        user_id = payload.get('sub') or payload.get('username')
        email = payload.get('email', '')
        
        # 2. Extract custom attributes
        role = payload.get('custom:role', 'EMPLOYEE')
        org_name = payload.get('custom:org_name')
        org_id = payload.get('custom:org_id')

        if not user_id:
            raise exceptions.AuthenticationFailed('Invalid token: no user ID found.')

        # 3. Resolve Organization ID
        # If org_id is missing but org_name is present, we need to resolve it via DynamoDB
        if not org_id and org_name:
            service = DynamoDBService()
            # Check if organization exists in DynamoDB
            org_id = service.get_organization_id_by_name(org_name)
            
            if not org_id:
                # Create organization if it doesn't exist
                org_id = service.create_organization(org_name)
        
        # 4. Create Stateless User
        user = StatelessUser(
            user_id=user_id,
            email=email,
            role=role,
            org_id=org_id,
            org_name=org_name
        )

        return user
