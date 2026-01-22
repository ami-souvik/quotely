from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import StatelessUserSerializer

# DB-dependent views are disabled for serverless execution
# class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
#    ...

# class CustomTokenObtainPairView(TokenObtainPairView):
#     serializer_class = CustomTokenObtainPairSerializer

class UserMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = StatelessUserSerializer(request.user)
        return Response(serializer.data)