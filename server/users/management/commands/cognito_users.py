import boto3
from django.core.management.base import BaseCommand
from django.conf import settings
from django.contrib.auth import get_user_model
import json

User = get_user_model()

class Command(BaseCommand):
    help = 'Manage Users (AWS Cognito or Local DB)'

    def add_arguments(self, parser):
        parser.add_argument('--local', action='store_true', help='Operate on Local DB instead of Cognito')
        
        subparsers = parser.add_subparsers(dest='action', help='Action to perform')

        # List
        subparsers.add_parser('list', help='List all users')

        # Get
        get_parser = subparsers.add_parser('get', help='Get user details')
        get_parser.add_argument('username', type=str, help='Username')

        # Create
        create_parser = subparsers.add_parser('create', help='Create a new user')
        create_parser.add_argument('username', type=str)
        create_parser.add_argument('email', type=str)
        create_parser.add_argument('--temp-password', type=str, default='TempPass123!', help='Temporary password (Cognito only)')
        create_parser.add_argument('--org-name', type=str, help='Organization Name')

        # Update
        update_parser = subparsers.add_parser('update', help='Update user attributes')
        update_parser.add_argument('username', type=str)
        update_parser.add_argument('--org-name', type=str, help='Organization Name')

        # Delete
        delete_parser = subparsers.add_parser('delete', help='Delete a user')
        delete_parser.add_argument('username', type=str)

    def handle(self, *args, **options):
        if options['local']:
            self.handle_local(options)
        else:
            self.handle_cognito(options)

    def handle_local(self, options):
        User = get_user_model() # Ensure correct model is loaded
        action = options['action']
        if action == 'list':
            for user in User.objects.all():
                try:
                    org = user.organization.name if user.organization else "No Org"
                except AttributeError:
                    org = "Error: No organization field"
                    self.stdout.write(self.style.WARNING(f"User type: {type(user)}"))
                
                self.stdout.write(f"{user.username} - {user.email} - Org: {org}")
        
        elif action == 'get':
            try:
                user = User.objects.get(username=options['username'])
                self.stdout.write(f"ID: {user.id}")
                self.stdout.write(f"Username: {user.username}")
                self.stdout.write(f"Email: {user.email}")
                self.stdout.write(f"Organization: {user.organization}")
                self.stdout.write(f"Role: {user.role}")
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR('User not found locally'))

        elif action == 'create':
            try:
                # Use the custom manager logic to simulate Cognito sync/creation
                if hasattr(User.objects, 'get_or_create_for_cognito'):
                    payload = {
                        'sub': options['username'],
                        'email': options['email'],
                        'custom:org_name': options.get('org_name')
                    }
                    user = User.objects.get_or_create_for_cognito(payload)
                    self.stdout.write(self.style.SUCCESS(f"User created/synced locally: {user.username}"))
                else:
                    user = User.objects.create_user(username=options['username'], email=options['email'])
                    self.stdout.write(self.style.SUCCESS(f"User created locally: {user.username}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed: {e}"))

        elif action == 'update':
            # Local update logic (if needed, mainly for org)
            self.stdout.write(self.style.WARNING("Local update not fully implemented, use Django Admin."))

        elif action == 'delete':
            try:
                user = User.objects.get(username=options['username'])
                user.delete()
                self.stdout.write(self.style.SUCCESS(f"User {options['username']} deleted locally"))
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR('User not found locally'))

    def handle_cognito(self, options):
        client = boto3.client(
            'cognito-idp',
            region_name=settings.COGNITO_AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        user_pool_id = settings.COGNITO_USER_POOL

        action = options['action']

        if action == 'list':
            try:
                response = client.list_users(UserPoolId=user_pool_id)
                for user in response.get('Users', []):
                    self.stdout.write(f"{user['Username']} - {user['UserStatus']}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to list Cognito users: {e}"))
        
        elif action == 'get':
            try:
                response = client.admin_get_user(UserPoolId=user_pool_id, Username=options['username'])
                self.stdout.write(json.dumps(response, indent=2, default=str))
            except client.exceptions.UserNotFoundException:
                self.stdout.write(self.style.ERROR('User not found in Cognito'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed: {e}"))

        elif action == 'create':
            attrs = [{'Name': 'email', 'Value': options['email']}, {'Name': 'email_verified', 'Value': 'true'}]
            if options.get('org_name'):
                attrs.append({'Name': 'custom:org_name', 'Value': options['org_name']})
            
            try:
                response = client.admin_create_user(
                    UserPoolId=user_pool_id,
                    Username=options['username'],
                    UserAttributes=attrs,
                    TemporaryPassword=options['temp_password'],
                    MessageAction='SUPPRESS'
                )
                self.stdout.write(self.style.SUCCESS(f"User created in Cognito: {response['User']['Username']}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed: {e}"))

        elif action == 'update':
            attrs = []
            if options.get('org_name'):
                attrs.append({'Name': 'custom:org_name', 'Value': options['org_name']})
            
            if attrs:
                try:
                    client.admin_update_user_attributes(
                        UserPoolId=user_pool_id,
                        Username=options['username'],
                        UserAttributes=attrs
                    )
                    self.stdout.write(self.style.SUCCESS(f"User updated in Cognito: {options['username']}"))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Failed: {e}"))
            else:
                self.stdout.write("No attributes to update.")

        elif action == 'delete':
            try:
                client.admin_delete_user(UserPoolId=user_pool_id, Username=options['username'])
                self.stdout.write(self.style.SUCCESS(f"User {options['username']} deleted from Cognito"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed: {e}"))
