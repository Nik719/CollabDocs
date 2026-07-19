"""Tests for /api/workspaces/ endpoints."""
import uuid

from rest_framework import status
from rest_framework.test import APITestCase

from api.models import WorkspaceMember

from .factories import create_comment, create_document, create_user, create_workspace


class WorkspaceCreateTests(APITestCase):
    url = '/api/workspaces/'

    def test_create_workspace_auto_adds_owner_as_admin(self):
        owner = create_user()
        response = self.client.post(
            self.url, {'name': 'Engineering', 'owner': str(owner.id)}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        member = WorkspaceMember.objects.get(workspace_id=response.data['id'])
        self.assertEqual(member.user, owner)
        self.assertEqual(member.role, WorkspaceMember.Role.ADMIN)

    def test_create_with_unknown_owner_rejected(self):
        response = self.client.post(
            self.url, {'name': 'Ghost', 'owner': str(uuid.uuid4())}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_with_short_name_rejected(self):
        owner = create_user()
        response = self.client.post(
            self.url, {'name': 'X', 'owner': str(owner.id)}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class WorkspaceRetrieveTests(APITestCase):
    def test_detail_includes_member_count(self):
        workspace = create_workspace()
        response = self.client.get(f'/api/workspaces/{workspace.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['member_count'], 1)
        self.assertIn('owner_name', response.data)

    def test_list_workspaces(self):
        create_workspace()
        create_workspace()
        response = self.client.get('/api/workspaces/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)


class WorkspaceMemberTests(APITestCase):
    def setUp(self):
        self.workspace = create_workspace()
        self.url = f'/api/workspaces/{self.workspace.id}/members/'

    def test_add_member(self):
        user = create_user()
        response = self.client.post(
            self.url, {'user': str(user.id), 'role': 'editor'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['role'], 'editor')
        self.assertEqual(response.data['user_detail']['id'], str(user.id))

    def test_add_duplicate_member_returns_409(self):
        user = create_user()
        self.client.post(self.url, {'user': str(user.id), 'role': 'viewer'}, format='json')
        response = self.client.post(
            self.url, {'user': str(user.id), 'role': 'editor'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('error', response.data)

    def test_add_unknown_user_returns_404(self):
        response = self.client.post(
            self.url, {'user': str(uuid.uuid4()), 'role': 'viewer'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_add_member_invalid_role_rejected(self):
        user = create_user()
        response = self.client.post(
            self.url, {'user': str(user.id), 'role': 'superuser'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_members(self):
        self.client.post(
            self.url, {'user': str(create_user().id), 'role': 'viewer'}, format='json'
        )
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # owner + added member

    def test_members_unknown_workspace_returns_404(self):
        response = self.client.get(f'/api/workspaces/{uuid.uuid4()}/members/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class WorkspaceSummaryTests(APITestCase):
    def test_summary_counts(self):
        workspace = create_workspace()
        doc1 = create_document(workspace=workspace)
        doc2 = create_document(workspace=workspace)
        create_comment(document=doc1)
        create_comment(document=doc2)
        create_comment(document=doc2)

        response = self.client.get(f'/api/workspaces/{workspace.id}/summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['document_count'], 2)
        self.assertEqual(response.data['member_count'], 1)
        self.assertEqual(response.data['total_comments'], 3)

    def test_summary_unknown_workspace_returns_404(self):
        response = self.client.get(f'/api/workspaces/{uuid.uuid4()}/summary/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
