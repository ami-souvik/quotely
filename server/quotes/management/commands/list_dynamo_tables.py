import boto3
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Lists all DynamoDB tables in the configured region.'

    def handle(self, *args, **options):
        try:
            endpoint_url = getattr(settings, 'DYNAMODB_ENDPOINT_URL', None)
            
            if endpoint_url:
                dynamodb = boto3.client(
                    'dynamodb',
                    endpoint_url=endpoint_url,
                    region_name=getattr(settings, 'AWS_REGION', None),
                    aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', None),
                    aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', None),
                )
            else:
                # When deploying to AWS, endpoint_url is not needed.
                # boto3 will use the region from the environment.
                dynamodb = boto3.client('dynamodb')

            response = dynamodb.list_tables()
            table_names = response.get('TableNames', [])

            if table_names:
                self.stdout.write(self.style.SUCCESS('DynamoDB tables found:'))
                for table_name in table_names:
                    self.stdout.write(f'- {table_name}')
            else:
                self.stdout.write(self.style.WARNING('No DynamoDB tables found in the region.'))

        except Exception as e:
            self.stderr.write(self.style.ERROR(f'An error occurred: {e}'))
