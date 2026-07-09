import uuid

from django.db import models


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------
class User(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    email = models.CharField(max_length=254, unique=True)   # CharField, not EmailField per spec
    phone = models.CharField(max_length=15, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.first_name} {self.last_name} <{self.email}>"


# ---------------------------------------------------------------------------
# Workspace
# ---------------------------------------------------------------------------
class Workspace(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='owned_workspaces'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workspaces'
        ordering = ['-created_at']

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# WorkspaceMember
# ---------------------------------------------------------------------------
class WorkspaceMember(models.Model):
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        EDITOR = 'editor', 'Editor'
        VIEWER = 'viewer', 'Viewer'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name='members'
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='memberships'
    )
    role = models.CharField(
        max_length=10, choices=Role.choices, default=Role.VIEWER
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workspace_members'
        ordering = ['-joined_at']
        constraints = [
            models.UniqueConstraint(
                fields=['workspace', 'user'],
                name='unique_workspace_member'
            )
        ]

    def __str__(self):
        return f"{self.user} in {self.workspace} as {self.role}"


# ---------------------------------------------------------------------------
# Document
# ---------------------------------------------------------------------------
class Document(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        PUBLISHED = 'published', 'Published'
        ARCHIVED = 'archived', 'Archived'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    content = models.TextField()
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name='documents'
    )
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='documents'
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.DRAFT
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'documents'
        ordering = ['-updated_at']

    def __str__(self):
        return self.title


# ---------------------------------------------------------------------------
# DocumentVersion
# ---------------------------------------------------------------------------
class DocumentVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document, on_delete=models.CASCADE, related_name='versions'
    )
    content = models.TextField()           # Snapshot of content at save time
    version_number = models.PositiveIntegerField()
    saved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='saved_versions'
    )
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'document_versions'
        ordering = ['version_number']

    def __str__(self):
        return f"{self.document.title} v{self.version_number}"


# ---------------------------------------------------------------------------
# Comment
# ---------------------------------------------------------------------------
class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document, on_delete=models.CASCADE, related_name='comments'
    )
    author = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='comments'
    )
    content = models.TextField()
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='replies'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'comments'
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author} on {self.document}"


# ---------------------------------------------------------------------------
# Tag
# ---------------------------------------------------------------------------
class Tag(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    documents = models.ManyToManyField(
        Document, related_name='tags', blank=True
    )

    class Meta:
        db_table = 'tags'
        ordering = ['name']

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# AuditLog
# ---------------------------------------------------------------------------
class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='audit_logs'
    )
    action = models.CharField(max_length=50)        # e.g. 'created', 'updated'
    model_name = models.CharField(max_length=100)   # e.g. 'Document'
    object_id = models.CharField(max_length=100)    # UUID as string
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.actor} {self.action} {self.model_name}:{self.object_id}"
