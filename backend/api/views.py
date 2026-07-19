"""
API ViewSets.

Thin HTTP layer: request parsing, response shaping and status codes.
Business rules (atomic flows, versioning, tagging) live in ``services.py``;
query-parameter filtering lives in ``filters.py``.

Per the assignment brief: ``ModelViewSet`` for standard CRUD, ``@action``
decorators for custom endpoints, overridden ``create()``/``update()`` where
side effects are required, and ``select_related``/``prefetch_related`` on
every endpoint returning nested data.
"""
from django.db import IntegrityError
from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from . import services
from .filters import filter_audit_logs, filter_documents, validate_uuid
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
from .serializers import (
    AuditLogSerializer,
    CommentSerializer,
    DocumentSerializer,
    DocumentVersionSerializer,
    TagSerializer,
    UserSerializer,
    WorkspaceMemberSerializer,
    WorkspaceSerializer,
)
from .utils import error_response, get_or_none


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
class UserViewSet(viewsets.ModelViewSet):
    """
    POST /api/users/       — Create a user
    GET  /api/users/{id}/  — Get user by ID
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    http_method_names = ['get', 'post', 'head', 'options']


# ---------------------------------------------------------------------------
# Workspaces
# ---------------------------------------------------------------------------
class WorkspaceViewSet(viewsets.ModelViewSet):
    """
    POST /api/workspaces/               — Create workspace (owner auto-added as admin)
    GET  /api/workspaces/               — List workspaces with member counts
    GET  /api/workspaces/{id}/          — Get workspace with member count
    POST /api/workspaces/{id}/members/  — Add a member
    GET  /api/workspaces/{id}/members/  — List all members
    GET  /api/workspaces/{id}/summary/  — Doc count, member count, total comments
    """
    serializer_class = WorkspaceSerializer

    def get_queryset(self):
        return Workspace.objects.select_related('owner').annotate(
            member_count=Count('members', distinct=True)
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.create_workspace_with_owner(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post', 'get'], url_path='members')
    def members(self, request, pk=None):
        workspace = get_or_none(Workspace, pk=pk)
        if workspace is None:
            return error_response('Workspace not found.', status.HTTP_404_NOT_FOUND)

        if request.method == 'GET':
            members = WorkspaceMember.objects.filter(
                workspace=workspace
            ).select_related('user', 'workspace')
            return Response(WorkspaceMemberSerializer(members, many=True).data)

        # POST — add a member
        data = request.data.copy()
        data['workspace'] = str(workspace.id)

        user_id = data.get('user')
        if get_or_none(User, pk=user_id) is None:
            return error_response(
                f"User with id '{user_id}' does not exist.", status.HTTP_404_NOT_FOUND
            )

        serializer = WorkspaceMemberSerializer(data=data)
        serializer.is_valid(raise_exception=True)

        try:
            member = serializer.save()
        except IntegrityError:
            # UniqueConstraint (workspace, user) — duplicate membership.
            return error_response(
                'This user is already a member of the workspace.',
                status.HTTP_409_CONFLICT,
            )
        return Response(
            WorkspaceMemberSerializer(member).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['get'], url_path='summary')
    def summary(self, request, pk=None):
        workspace = get_or_none(Workspace, pk=pk)
        if workspace is None:
            return error_response('Workspace not found.', status.HTTP_404_NOT_FOUND)

        data = Workspace.objects.filter(pk=pk).annotate(
            doc_count=Count('documents', distinct=True),
            member_count=Count('members', distinct=True),
            total_comments=Count('documents__comments', distinct=True),
        ).values('doc_count', 'member_count', 'total_comments').first()

        return Response({
            'workspace_id': str(workspace.id),
            'workspace_name': workspace.name,
            'document_count': data['doc_count'],
            'member_count': data['member_count'],
            'total_comments': data['total_comments'],
        })


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------
class DocumentViewSet(viewsets.ModelViewSet):
    """
    POST /api/documents/               — Create document + first version (atomic)
    PUT  /api/documents/{id}/          — Update document → new version (atomic)
    GET  /api/documents/               — List (filter: workspace, status, tag, search)
    GET  /api/documents/{id}/versions/ — All versions in order
    GET  /api/documents/{id}/stats/    — Version count, comment count, contributor count
    POST /api/documents/{id}/tags/     — Add tags to a document
    """
    serializer_class = DocumentSerializer

    def get_queryset(self):
        queryset = Document.objects.select_related(
            'workspace', 'created_by'
        ).prefetch_related('tags')
        return filter_documents(queryset, self.request.query_params)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        saved_by = serializer.validated_data.get('created_by')
        services.create_document_with_version(serializer, saved_by=saved_by)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        saved_by_id = request.data.get('saved_by') or request.data.get('created_by')
        saved_by = get_or_none(User, pk=saved_by_id) if saved_by_id else None

        services.update_document_with_version(serializer, saved_by=saved_by)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='versions')
    def versions(self, request, pk=None):
        document = get_or_none(Document, pk=pk)
        if document is None:
            return error_response('Document not found.', status.HTTP_404_NOT_FOUND)

        versions = DocumentVersion.objects.filter(
            document=document
        ).select_related('saved_by').order_by('version_number')
        return Response(DocumentVersionSerializer(versions, many=True).data)

    @action(detail=True, methods=['get'], url_path='stats')
    def stats(self, request, pk=None):
        document = get_or_none(Document, pk=pk)
        if document is None:
            return error_response('Document not found.', status.HTTP_404_NOT_FOUND)

        data = Document.objects.filter(pk=pk).annotate(
            version_count=Count('versions', distinct=True),
            comment_count=Count('comments', distinct=True),
        ).values('version_count', 'comment_count').first()

        # values_list — only IDs are needed to count unique contributors.
        # order_by() clears DocumentVersion's default ``version_number``
        # ordering: left in place, Django folds it into the SELECT DISTINCT
        # column list (to keep ORDER BY valid alongside DISTINCT), which
        # silently defeats de-duplication on saved_by_id alone.
        contributor_ids = DocumentVersion.objects.filter(
            document=document
        ).order_by().values_list('saved_by_id', flat=True).distinct()
        contributor_count = sum(1 for cid in contributor_ids if cid is not None)

        return Response({
            'document_id': str(document.id),
            'title': document.title,
            'version_count': data['version_count'],
            'comment_count': data['comment_count'],
            'contributor_count': contributor_count,
        })

    @action(detail=True, methods=['post'], url_path='tags')
    def add_tags(self, request, pk=None):
        document = get_or_none(Document, pk=pk)
        if document is None:
            return error_response('Document not found.', status.HTTP_404_NOT_FOUND)

        tag_names = request.data.get('tags', [])
        if not isinstance(tag_names, list) or len(tag_names) == 0:
            return error_response(
                "Provide a non-empty list of tag names under the 'tags' key.",
                status.HTTP_400_BAD_REQUEST,
            )

        added = services.add_tags_to_document(document, tag_names)
        return Response(
            {'message': f'Added {len(added)} tag(s) to document.', 'tags': added},
            status=status.HTTP_200_OK,
        )


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------
class CommentViewSet(viewsets.ModelViewSet):
    """
    POST /api/comments/               — Add top-level or reply comment
    GET  /api/comments/?document={id} — List threaded comments for a document
    """
    serializer_class = CommentSerializer

    def get_queryset(self):
        queryset = Comment.objects.select_related('author', 'document', 'parent')
        document_id = self.request.query_params.get('document')
        if document_id:
            # Top-level comments only; replies are nested by the serializer.
            queryset = queryset.filter(
                document=validate_uuid(document_id, 'document'),
                parent__isnull=True,
            )
        return queryset

    def create(self, request, *args, **kwargs):
        document_id = request.data.get('document')
        if document_id and get_or_none(Document, pk=document_id) is None:
            return error_response('Document not found.', status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.save()
        return Response(
            CommentSerializer(comment).data, status=status.HTTP_201_CREATED
        )


# ---------------------------------------------------------------------------
# Tags
# ---------------------------------------------------------------------------
class TagViewSet(viewsets.ModelViewSet):
    """
    POST /api/tags/  — Create a tag
    GET  /api/tags/  — List all tags
    """
    queryset = Tag.objects.all()
    serializer_class = TagSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            tag = serializer.save()
        except IntegrityError:
            # Safety net for races; normal duplicates are caught by the
            # serializer's unique validator (400).
            return error_response(
                'A tag with this name already exists.', status.HTTP_409_CONFLICT
            )
        return Response(TagSerializer(tag).data, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Audit logs (read-only)
# ---------------------------------------------------------------------------
class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/audit-logs/  — List logs (filter: actor, from, to, model)
    """
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        queryset = AuditLog.objects.select_related('actor')
        return filter_audit_logs(queryset, self.request.query_params)
