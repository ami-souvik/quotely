from django.urls import path
from .views import UserMeView

urlpatterns = [
    # path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    # path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserMeView.as_view(), name='user_me'),
]
