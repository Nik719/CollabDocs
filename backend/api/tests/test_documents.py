"""Tests for /api/documents/ endpoints — CRUD, versioning, stats, tags, filters."""
import uuid

from rest_framework import status
from rest_framework.test import APITestCase

from api.models import AuditLog, Document, DocumentVersion, Tag

from .factories import create_comment, create_document, create_user, create_workspace


class DocumentCreateTests(APITestCase):
    url = '/api/documents/'

    def setUp(self):
        self.workspace = create_workspace()
        self.author = self.workspace.owner

    def payload(self, **overrides):
        data = {
            'title': 'Design Doc',
            'content': 'v1 content',
            'workspace': str(self.workspace.id),
            'created_by': str(self.author.id),
        }
        data.update(overrides)
        return data

    def test_create_document_creates_first_version(self):
        response = self.client.post(self.url, self.payload(), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        versions = DocumentVersion.objects.filter(document_id=response.data['id'])
        self.assertEqual(versions.count(), 1)
        version = versions.first()
        self.assertEqual(version.version_number, 1)
        self.assertEqual(version.content, 'v1 content')
        self.assertEqual(version.saved_by, self.author)

    def test_create_document_writes_created_audit_log(self):
        response = self.client.post(self.url, self.payload(), format='json')
        log = AuditLog.objects.get(object_id=response.data['id'])
        self.assertEqual(log.action, 'created')
        self.assertEqual(log.model_name, 'Document')
        self.assertEqual(log.actor, self.author)

    def test_create_with_unknown_workspace_rejected(self):
        response = self.client.post(
            self.url, self.payload(workspace=str(uuid.uuid4())), format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_with_empty_title_rejected(self):
        response = self.client.post(self.url, self.payload(title='  '), format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_with_invalid_status_rejected(self):
        response = self.client.post(
            self.url, self.payload(status='deleted'), format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class DocumentUpdateTests(APITestCase):
    def setUp(self):
        self.document = create_document(content='original')
        self.url = f'/api/documents/{self.document.id}/'
        # Document created via factory has no version yet; the API path
        # creates version 1 on POST. Snapshot one manually for parity.
        DocumentVersion.objects.create(
            document=self.document,
            content='original',
            version_number=1,
            saved_by=self.document.created_by,
        )

    def test_put_update_creates_new_version(self):
        payload = {
            'title': self.document.title,
            'content': 'updated content',
            'workspace': str(self.document.workspace_id),
            'created_by': str(self.document.created_by_id),
            'status': 'published',
        }
        response = self.client.put(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'published')

        versions = self.document.versions.order_by('version_number')
        self.assertEqual(versions.count(), 2)
        self.assertEqual(versions.last().version_number, 2)
        self.assertEqual(versions.last().content, 'updated content')

    def test_update_writes_updated_audit_log(self):
        payload = {
            'title': self.document.title,
            'content': 'x',
            'workspace': str(self.document.workspace_id),
        }
        self.client.put(self.url, payload, format='json')
        actions = list(
            AuditLog.objects.filter(object_id=str(self.document.id))
            .values_list('action', flat=True)
        )
        self.assertIn('updated', actions)

    def test_update_records_saved_by_on_version(self):
        editor = create_user()
        payload = {
            'title': self.document.title,
            'content': 'edited by someone else',
            'workspace': str(self.document.workspace_id),
            'saved_by': str(editor.id),
        }
        response = self.client.put(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.document.versions.latest('saved_at').saved_by, editor)


class DocumentListFilterTests(APITestCase):
    def setUp(self):
        self.ws_a = create_workspace()
        self.ws_b = create_workspace()
        self.doc_draft = create_document(
            workspace=self.ws_a, title='Alpha spec', content='postgres notes'
        )
        self.doc_published = create_document(
            workspace=self.ws_a, title='Beta guide', content='django tips',
            status='published',
        )
        self.doc_other = create_document(workspace=self.ws_b, title='Gamma plan')
        tag = Tag.objects.create(name='python')
        tag.documents.add(self.doc_published)

    def test_filter_by_workspace(self):
        response = self.client.get(f'/api/documents/?workspace={self.ws_a.id}')
        self.assertEqual(len(response.data), 2)

    def test_filter_by_status(self):
        response = self.client.get('/api/documents/?status=published')
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Beta guide')

    def test_filter_by_tag(self):
        response = self.client.get('/api/documents/?tag=python')
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Beta guide')

    def test_search_matches_title_or_content(self):
        # 'postgres' appears only in doc_draft's CONTENT; 'Beta' only in title.
        response = self.client.get('/api/documents/?search=postgres')
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Alpha spec')

        response = self.client.get('/api/documents/?search=beta')
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Beta guide')

    def test_combined_filters(self):
        response = self.client.get(
            f'/api/documents/?workspace={self.ws_a.id}&status=draft'
        )
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Alpha spec')

    def test_invalid_workspace_uuid_returns_400(self):
        response = self.client.get('/api/documents/?workspace=not-a-uuid')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class DocumentVersionsEndpointTests(APITestCase):
    def test_versions_listed_in_order(self):
        workspace = create_workspace()
        response = self.client.post(
            '/api/documents/',
            {
                'title': 'Doc', 'content': 'v1',
                'workspace': str(workspace.id),
                'created_by': str(workspace.owner.id),
            },
            format='json',
        )
        doc_id = response.data['id']
        self.client.put(
            f'/api/documents/{doc_id}/',
            {'title': 'Doc', 'content': 'v2', 'workspace': str(workspace.id)},
            format='json',
        )

        response = self.client.get(f'/api/documents/{doc_id}/versions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        numbers = [v['version_number'] for v in response.data]
        self.assertEqual(numbers, [1, 2])
        self.assertEqual(response.data[0]['content'], 'v1')
        self.assertEqual(response.data[1]['content'], 'v2')

    def test_versions_unknown_document_returns_404(self):
        response = self.client.get(f'/api/documents/{uuid.uuid4()}/versions/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class DocumentStatsTests(APITestCase):
    def test_stats_counts(self):
        workspace = create_workspace()
        user_b = create_user()
        response = self.client.post(
            '/api/documents/',
            {
                'title': 'Doc', 'content': 'v1',
                'workspace': str(workspace.id),
                'created_by': str(workspace.owner.id),
            },
            format='json',
        )
        doc_id = response.data['id']
        self.client.put(
            f'/api/documents/{doc_id}/',
            {
                'title': 'Doc', 'content': 'v2',
                'workspace': str(workspace.id), 'saved_by': str(user_b.id),
            },
            format='json',
        )
        create_comment(document=Document.objects.get(pk=doc_id))

        response = self.client.get(f'/api/documents/{doc_id}/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['version_count'], 2)
        self.assertEqual(response.data['comment_count'], 1)
        self.assertEqual(response.data['contributor_count'], 2)

    def test_stats_unknown_document_returns_404(self):
        response = self.client.get(f'/api/documents/{uuid.uuid4()}/stats/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_contributor_count_dedupes_same_user_across_versions(self):
        """Regression test: DocumentVersion's default ``ordering =
        ['version_number']`` used to leak into the contributor_count
        query's SELECT DISTINCT once chained with .values_list(...)
        .distinct(), so the same user saving twice was counted twice."""
        workspace = create_workspace()
        response = self.client.post(
            '/api/documents/',
            {
                'title': 'Doc', 'content': 'v1',
                'workspace': str(workspace.id),
                'created_by': str(workspace.owner.id),
            },
            format='json',
        )
        doc_id = response.data['id']
        self.client.put(
            f'/api/documents/{doc_id}/',
            {
                'title': 'Doc', 'content': 'v2',
                'workspace': str(workspace.id), 'saved_by': str(workspace.owner.id),
            },
            format='json',
        )

        response = self.client.get(f'/api/documents/{doc_id}/stats/')
        self.assertEqual(response.data['version_count'], 2)
        self.assertEqual(response.data['contributor_count'], 1)


class DocumentTagsTests(APITestCase):
    def setUp(self):
        self.document = create_document()
        self.url = f'/api/documents/{self.document.id}/tags/'

    def test_add_tags_normalises_and_attaches(self):
        response = self.client.post(
            self.url, {'tags': ['  Python ', 'DJANGO']}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(sorted(response.data['tags']), ['django', 'python'])
        self.assertEqual(self.document.tags.count(), 2)

    def test_add_existing_tag_reuses_it(self):
        Tag.objects.create(name='python')
        self.client.post(self.url, {'tags': ['python']}, format='json')
        self.assertEqual(Tag.objects.filter(name='python').count(), 1)

    def test_empty_tags_rejected(self):
        response = self.client.post(self.url, {'tags': []}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_list_tags_rejected(self):
        response = self.client.post(self.url, {'tags': 'python'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_tags_unknown_document_returns_404(self):
        response = self.client.post(
            f'/api/documents/{uuid.uuid4()}/tags/', {'tags': ['x']}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
