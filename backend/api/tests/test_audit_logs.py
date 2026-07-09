"""Tests for /api/audit-logs/ — signal-driven writes and filtered reads."""
import uuid
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import AuditLog

from .factories import create_document, create_workspace


class AuditLogSignalTests(APITestCase):
    def test_document_create_and_update_write_logs(self):
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

        actions = list(
            AuditLog.objects.filter(object_id=doc_id)
            .order_by('timestamp')
            .values_list('action', flat=True)
        )
        self.assertEqual(actions, ['created', 'updated'])


class AuditLogListFilterTests(APITestCase):
    url = '/api/audit-logs/'

    def setUp(self):
        self.document = create_document()  # factory create → signal writes a log
        self.actor = self.document.created_by

    def test_list_logs(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['model_name'], 'Document')

    def test_filter_by_actor(self):
        response = self.client.get(f'{self.url}?actor={self.actor.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            all(str(log['actor']) == str(self.actor.id) for log in response.data)
        )

        response = self.client.get(f'{self.url}?actor={uuid.uuid4()}')
        self.assertEqual(response.data, [])

    def test_filter_by_model_name(self):
        response = self.client.get(f'{self.url}?model=document')
        self.assertGreaterEqual(len(response.data), 1)
        response = self.client.get(f'{self.url}?model=nonexistent')
        self.assertEqual(response.data, [])

    def test_filter_by_date_range(self):
        yesterday = (timezone.now() - timedelta(days=1)).date().isoformat()
        tomorrow = (timezone.now() + timedelta(days=1)).date().isoformat()

        response = self.client.get(f'{self.url}?from={yesterday}&to={tomorrow}')
        self.assertGreaterEqual(len(response.data), 1)

        response = self.client.get(f'{self.url}?to={yesterday}')
        self.assertEqual(response.data, [])

    def test_invalid_actor_uuid_returns_400(self):
        response = self.client.get(f'{self.url}?actor=not-a-uuid')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_date_returns_400(self):
        response = self.client.get(f'{self.url}?from=notadate')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_audit_logs_are_read_only(self):
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
