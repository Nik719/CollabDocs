"""Tests for /api/tags/ endpoints."""
from rest_framework import status
from rest_framework.test import APITestCase

from .factories import create_document, create_tag


class TagTests(APITestCase):
    url = '/api/tags/'

    def test_create_tag_normalised_to_lowercase(self):
        response = self.client.post(self.url, {'name': '  Python '}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'python')

    def test_duplicate_tag_returns_409(self):
        create_tag(name='python')
        response = self.client.post(self.url, {'name': 'python'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('error', response.data)

    def test_case_variant_duplicate_returns_409(self):
        create_tag(name='python')
        response = self.client.post(self.url, {'name': 'Python'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_empty_name_rejected(self):
        response = self.client.post(self.url, {'name': '   '}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_tags_includes_document_count(self):
        tag = create_tag(name='django')
        tag.documents.add(create_document())
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['name'], 'django')
        self.assertEqual(response.data[0]['document_count'], 1)
