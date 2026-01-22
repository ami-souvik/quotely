from rest_framework import serializers
from .models import User, Organization

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'slug']

class UserSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)
    org_id = serializers.CharField(source='organization.id', read_only=True)
    org_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'organization', 'org_id', 'org_name']
