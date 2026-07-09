"""Tests for the request logging middleware and API docs endpoints."""
from rest_framework import status
from rest_framework.test import APITestCase


class RequestLoggingMiddlewareTests(APITestCase):
    def test_request_is_logged_with_method_path_status_duration(self):
        with self.assertLogs('collabdocs.requests', level='INFO') as captured:
            self.client.get('/api/users/')

        self.assertEqual(len(captured.records), 1)
        message = captured.records[0].getMessage()
        self.assertIn('[CollabDocs] GET /api/users/', message)
        self.assertIn('→ 200', message)
        self.assertIn('ms)', message)


class ApiDocsTests(APITestCase):
    def test_openapi_schema_is_served(self):
        response = self.client.get('/api/schema/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_swagger_ui_is_served(self):
        response = self.client.get('/api/docs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
