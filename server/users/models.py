from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models
from django.conf import settings
import uuid
import boto3

class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class CustomUserManager(UserManager):
    def get_or_create_for_cognito(self, payload):
        cognito_id = payload['sub']
        print(f"DEBUG: Token Payload Keys: {list(payload.keys())}")
        
        # Extract attributes
        org_name = payload.get('custom:org_name')
        role = payload.get('custom:role', 'EMPLOYEE')

        # Fallback if attributes missing (e.g. scope issue)
        if not org_name:
            print("WARNING: 'custom:org_name' not found in token. Attempting fallback to Boto3.")
            try:
                client = boto3.client('cognito-idp', 
                    region_name=settings.COGNITO_AWS_REGION,
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
                )
                lookup_key = payload.get('cognito:username', cognito_id)
                
                user_info = client.admin_get_user(
                    UserPoolId=settings.COGNITO_USER_POOL,
                    Username=lookup_key
                )
                for attr in user_info.get('UserAttributes', []):
                    if attr['Name'] == 'custom:org_name':
                        org_name = attr['Value']
                        print(f"DEBUG: Found org_name via Boto3: {org_name}")
                    elif attr['Name'] == 'custom:role':
                        role = attr['Value']
            except Exception as e:
                print(f"Error fetching user from Cognito via Boto3: {e}")

        # Ensure role is valid (simple validation)
        if role not in ['ADMIN', 'EMPLOYEE']:
            role = 'EMPLOYEE'

        try:
            user = self.get(username=cognito_id)
            # Update role if changed
            if user.role != role:
                user.role = role
                user.save(update_fields=['role'])
            return user
        except self.model.DoesNotExist:
            # Handle Organization mapping
            organization = None
            if org_name:
                slug = org_name.lower().replace(' ', '-')
                organization, _ = Organization.objects.get_or_create(
                    slug=slug,
                    defaults={'name': org_name}
                )

            user = self.create_user(
                username=cognito_id,
                email=payload.get('email', ''),
                first_name=payload.get('given_name', ''),
                last_name=payload.get('family_name', ''),
                is_active=True,
                organization=organization,
                role=role
            )
            return user

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, 
        on_delete=models.CASCADE, 
        related_name='users',
        null=True,
        blank=True
    )
    role = models.CharField(
        max_length=20,
        choices=[('ADMIN', 'Admin'), ('EMPLOYEE', 'Employee')],
        default='EMPLOYEE'
    )
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='custom_user_set',
        blank=True,
        verbose_name='groups',
        help_text='The groups this user belongs to.',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='custom_user_set',
        blank=True,
        verbose_name='user permissions',
        help_text='Specific permissions for this user.',
    )

    objects = CustomUserManager()

    def __str__(self):
        return f"{self.username} ({self.organization.name if self.organization else 'No Org'})"