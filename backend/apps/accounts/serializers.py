from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.db.models import Q

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """Serializer for user profile and details."""
    full_name = serializers.CharField(read_only=True)
    app_role = serializers.SerializerMethodField()
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)
    phone = serializers.CharField(source='phone_number', required=False, allow_blank=True, allow_null=True)
    organization = serializers.CharField(source='company_name', required=False, allow_blank=True, allow_null=True)
    created_date = serializers.DateTimeField(source='date_joined', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'app_role', 'is_staff', 'is_superuser', 'phone_number', 'phone', 'company_name', 'organization',
            'city', 'bio', 'is_verified', 'date_joined', 'created_date'
        ]
        read_only_fields = ['id', 'is_verified', 'full_name', 'app_role', 'is_staff', 'is_superuser', 'date_joined', 'created_date']

    def get_app_role(self, obj):
        if obj.role == 'ADMIN' or obj.is_staff or obj.is_superuser:
            return 'admin'
        return obj.role.lower()


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer to register a new user with full name, username, email,
    account type (buyer/seller), and password confirmation.
    """
    full_name = serializers.CharField(write_only=True, required=True, trim_whitespace=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=True)
    role = serializers.ChoiceField(
        choices=[User.RoleChoices.BUYER, User.RoleChoices.SELLER],
        default=User.RoleChoices.BUYER
    )

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'role',
            'password', 'password_confirm', 'company_name', 'phone_number',
            'city', 'bio'
        ]
        read_only_fields = ['id']

    def validate_username(self, value):
        trimmed = value.strip()
        if not trimmed:
            raise serializers.ValidationError("Username cannot be blank.")
        if len(trimmed) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        if User.objects.filter(username__iexact=trimmed).exists():
            raise serializers.ValidationError("This username is already taken. Please choose another.")
        return trimmed

    def validate_email(self, value):
        trimmed = value.strip().lower()
        if not trimmed:
            raise serializers.ValidationError("Email address is required.")
        if User.objects.filter(email__iexact=trimmed).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return trimmed

    def validate(self, attrs):
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm')

        if password != password_confirm:
            raise serializers.ValidationError({'password_confirm': "Passwords do not match."})

        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        full_name = validated_data.pop('full_name', '').strip()
        password = validated_data.pop('password')

        first_name = full_name
        last_name = ''
        if ' ' in full_name:
            first_name, last_name = full_name.split(' ', 1)

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=validated_data.get('role', User.RoleChoices.BUYER),
            company_name=validated_data.get('company_name', ''),
            phone_number=validated_data.get('phone_number', ''),
            city=validated_data.get('city', ''),
            bio=validated_data.get('bio', '')
        )
        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer to validate login credentials supporting both username and email.
    """
    username = serializers.CharField(required=True, trim_whitespace=True)
    password = serializers.CharField(required=True, write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        login_input = attrs.get('username')
        password = attrs.get('password')

        if not login_input or not password:
            raise serializers.ValidationError('Both username/email and password are required.')

        user_match = User.objects.filter(
            Q(username__iexact=login_input) | Q(email__iexact=login_input)
        ).first()

        if not user_match:
            raise serializers.ValidationError('Invalid username/email or password.')

        user = authenticate(username=user_match.username, password=password)
        if not user:
            raise serializers.ValidationError('Invalid username/email or password.')

        if not user.is_active:
            raise serializers.ValidationError('This user account is disabled.')

        attrs['user'] = user
        return attrs
