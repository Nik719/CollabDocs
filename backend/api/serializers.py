from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email as django_validate_email
from rest_framework import serializers

from .models import (
    AuditLog,
    Comment,
    Document,
    DocumentVersion,
    Tag,
    User,
    Workspace,
    WorkspaceMember,
)


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------
class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'full_name', 'email', 'phone', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()

    def validate_email(self, value):
        """Custom validation — the model stores email as CharField per spec,
        so full RFC validation happens here at the serializer boundary."""
        value = value.lower().strip()
        try:
            django_validate_email(value)
        except DjangoValidationError:
            raise serializers.ValidationError(
                "Enter a valid email address."
            ) from None
        return value

    def validate_phone(self, value):
        digits = value.replace('+', '').replace('-', '').replace(' ', '')
        if not digits.isdigit():
            raise serializers.ValidationError("Phone number must contain only digits, +, -, or spaces.")
        if len(digits) < 7 or len(digits) > 15:
            raise serializers.ValidationError("Phone number must be between 7 and 15 digits.")
        return value


# ---------------------------------------------------------------------------
# Workspace
# ---------------------------------------------------------------------------
class WorkspaceSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = ['id', 'name', 'owner', 'owner_name', 'is_active', 'created_at', 'member_count']
        read_only_fields = ['id', 'created_at']

    def get_member_count(self, obj):
        # Annotation injected by the view when available, else fallback
        if hasattr(obj, 'member_count'):
            return obj.member_count
        return obj.members.count()

    def get_owner_name(self, obj):
        return f"{obj.owner.first_name} {obj.owner.last_name}".strip()

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Workspace name must be at least 2 characters.")
        return value


# ---------------------------------------------------------------------------
# WorkspaceMember
# ---------------------------------------------------------------------------
class WorkspaceMemberSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)
    workspace_name = serializers.SerializerMethodField()

    class Meta:
        model = WorkspaceMember
        fields = ['id', 'workspace', 'workspace_name', 'user', 'user_detail', 'role', 'joined_at']
        read_only_fields = ['id', 'joined_at']
        # Duplicate membership is handled in the view by catching
        # IntegrityError from the (workspace, user) UniqueConstraint and
        # returning 409 Conflict, per the assignment brief — so DRF's
        # auto-generated unique-together validator (which would 400) is off.
        validators = []

    def get_workspace_name(self, obj):
        return obj.workspace.name

    def validate_role(self, value):
        valid = [r.value for r in WorkspaceMember.Role]
        if value not in valid:
            raise serializers.ValidationError(
                f"Invalid role. Choose from: {', '.join(valid)}"
            )
        return value


# ---------------------------------------------------------------------------
# DocumentVersion (nested + standalone)
# ---------------------------------------------------------------------------
class DocumentVersionSerializer(serializers.ModelSerializer):
    saved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = DocumentVersion
        fields = ['id', 'document', 'content', 'version_number', 'saved_by', 'saved_by_name', 'saved_at']
        read_only_fields = ['id', 'version_number', 'saved_at']

    def get_saved_by_name(self, obj):
        if obj.saved_by:
            return f"{obj.saved_by.first_name} {obj.saved_by.last_name}".strip()
        return None


# ---------------------------------------------------------------------------
# Tag (slim for nesting)
# ---------------------------------------------------------------------------
class TagSerializer(serializers.ModelSerializer):
    document_count = serializers.SerializerMethodField()

    class Meta:
        model = Tag
        fields = ['id', 'name', 'document_count']
        read_only_fields = ['id']
        # Duplicate names return 409 Conflict via the view's IntegrityError
        # handler (names are lowercased in validate_name, so the default
        # case-sensitive UniqueValidator could not catch all duplicates anyway).
        extra_kwargs = {'name': {'validators': []}}

    def get_document_count(self, obj):
        return obj.documents.count()

    def validate_name(self, value):
        value = value.strip().lower()
        if len(value) < 1:
            raise serializers.ValidationError("Tag name cannot be empty.")
        return value


# ---------------------------------------------------------------------------
# Document
# ---------------------------------------------------------------------------
class DocumentSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()
    workspace_name = serializers.SerializerMethodField()
    version_count = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'content', 'workspace', 'workspace_name',
            'created_by', 'created_by_name', 'status', 'updated_at',
            'tags', 'version_count'
        ]
        read_only_fields = ['id', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return None

    def get_workspace_name(self, obj):
        return obj.workspace.name

    def get_version_count(self, obj):
        if hasattr(obj, 'version_count'):
            return obj.version_count
        return obj.versions.count()

    def validate_title(self, value):
        value = value.strip()
        if len(value) < 1:
            raise serializers.ValidationError("Document title cannot be empty.")
        return value

    def validate_status(self, value):
        valid = [s.value for s in Document.Status]
        if value not in valid:
            raise serializers.ValidationError(
                f"Invalid status. Choose from: {', '.join(valid)}"
            )
        return value


# ---------------------------------------------------------------------------
# Comment
# ---------------------------------------------------------------------------
class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'document', 'author', 'author_name', 'content', 'parent', 'replies', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_author_name(self, obj):
        if obj.author:
            return f"{obj.author.first_name} {obj.author.last_name}".strip()
        return None

    def get_replies(self, obj):
        """Return immediate replies for top-level comments."""
        if obj.parent is None:
            children = obj.replies.select_related('author').all()
            return CommentSerializer(children, many=True).data
        return []

    def validate(self, attrs):
        parent = attrs.get('parent')
        document = attrs.get('document')
        if parent and parent.document != document:
            raise serializers.ValidationError(
                {"parent": "Parent comment must belong to the same document."}
            )
        return attrs


# ---------------------------------------------------------------------------
# AuditLog
# ---------------------------------------------------------------------------
class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ['id', 'actor', 'actor_name', 'action', 'model_name', 'object_id', 'timestamp']
        read_only_fields = ['id', 'timestamp']

    def get_actor_name(self, obj):
        if obj.actor:
            return f"{obj.actor.first_name} {obj.actor.last_name}".strip()
        return None
