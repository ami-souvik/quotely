from rest_framework import serializers

class StatelessUserSerializer(serializers.Serializer):
    id = serializers.CharField()
    username = serializers.CharField()
    email = serializers.EmailField()
    role = serializers.CharField()
    org_id = serializers.SerializerMethodField()
    org_name = serializers.SerializerMethodField()

    def get_org_id(self, obj):
        return obj.organization.id if obj.organization else None

    def get_org_name(self, obj):
        return obj.organization.name if obj.organization else None