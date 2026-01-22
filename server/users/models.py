from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models
from django.conf import settings
import uuid

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