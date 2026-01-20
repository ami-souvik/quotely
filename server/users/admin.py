from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Organization

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ('username', 'email', 'organization', 'role', 'is_staff')
    fieldsets = UserAdmin.fieldsets + (
        ('Organization Info', {'fields': ('organization', 'role')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Organization Info', {'fields': ('organization', 'role')}),
    )

admin.site.register(User, CustomUserAdmin)
admin.site.register(Organization)