"""Tests for /api/comments/ endpoints — top-level and threaded replies."""
import uuid

from rest_framework import status
from rest_framework.test import APITestCase

from .factories import create_comment, create_document, create_user


class CommentCreateTests(APITestCase):
    url = '/api/comments/'

    def setUp(self):
        self.document = create_document()
        self.author = self.document.created_by

    def test_create_top_level_comment(self):
        response = self.client.post(
            self.url,
            {
                'document': str(self.document.id),
                'author': str(self.author.id),
                'content': 'First!',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data['parent'])
        self.assertIn('author_name', response.data)

    def test_create_reply(self):
        parent = create_comment(document=self.document)
        response = self.client.post(
            self.url,
            {
                'document': str(self.document.id),
                'author': str(self.author.id),
                'content': 'A reply',
                'parent': str(parent.id),
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['parent'], parent.id)

    def test_reply_must_belong_to_same_document(self):
        other_document = create_document()
        parent = create_comment(document=other_document)
        response = self.client.post(
            self.url,
            {
                'document': str(self.document.id),
                'author': str(self.author.id),
                'content': 'Cross-document reply',
                'parent': str(parent.id),
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_document_returns_404(self):
        response = self.client.post(
            self.url,
            {
                'document': str(uuid.uuid4()),
                'author': str(self.author.id),
                'content': 'Orphan',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_missing_content_rejected(self):
        response = self.client.post(
            self.url,
            {'document': str(self.document.id), 'author': str(self.author.id)},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class CommentListTests(APITestCase):
    def setUp(self):
        self.document = create_document()
        self.top1 = create_comment(document=self.document, content='Top 1')
        self.top2 = create_comment(document=self.document, content='Top 2')
        self.reply = create_comment(
            document=self.document, parent=self.top1, content='Reply to 1'
        )

    def test_list_returns_only_top_level_with_nested_replies(self):
        response = self.client.get(f'/api/comments/?document={self.document.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        by_content = {c['content']: c for c in response.data}
        self.assertEqual(len(by_content['Top 1']['replies']), 1)
        self.assertEqual(by_content['Top 1']['replies'][0]['content'], 'Reply to 1')
        self.assertEqual(by_content['Top 2']['replies'], [])

    def test_list_with_invalid_document_uuid_returns_400(self):
        response = self.client.get('/api/comments/?document=nope')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_comment_from_other_document_not_included(self):
        other = create_document()
        create_comment(document=other, content='Elsewhere')
        response = self.client.get(f'/api/comments/?document={self.document.id}')
        contents = [c['content'] for c in response.data]
        self.assertNotIn('Elsewhere', contents)


class CommentAuthorTests(APITestCase):
    def test_author_name_serialised(self):
        user = create_user(first_name='Alan', last_name='Turing')
        document = create_document()
        create_comment(document=document, author=user, content='Hello')
        response = self.client.get(f'/api/comments/?document={document.id}')
        self.assertEqual(response.data[0]['author_name'], 'Alan Turing')
