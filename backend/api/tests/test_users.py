"""Tests for /api/users/ endpoints."""
import uuid

from rest_framework import status
from rest_framework.test import APITestCase

from .factories import create_user


class UserCreateTests(APITestCase):
    url = '/api/users/'

    def payload(self, **overrides):
        data = {
            'first_name': 'Ada',
            'last_name': 'Lovelace',
            'email': 'ada@example.com',
            'phone': '+919876543210',
        }
        data.update(overrides)
        return data

    def test_create_user_success(self):
        response = self.client.post(self.url, self.payload(), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['full_name'], 'Ada Lovelace')
        self.assertEqual(response.data['email'], 'ada@example.com')
        self.assertIn('id', response.data)

    def test_email_is_normalised_to_lowercase(self):
        response = self.client.post(
            self.url, self.payload(email='ADA@Example.COM'), format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['email'], 'ada@example.com')

    def test_invalid_email_rejected(self):
        response = self.client.post(
            self.url, self.payload(email='not-an-email'), format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_email_rejected(self):
        create_user(email='ada@example.com')
        response = self.client.post(self.url, self.payload(), format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_phone_with_letters_rejected(self):
        response = self.client.post(
            self.url, self.payload(phone='98abc12345'), format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_phone_too_short_rejected(self):
        response = self.client.post(
            self.url, self.payload(phone='12345'), format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_fields_rejected(self):
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserRetrieveTests(APITestCase):
    def test_get_user_by_id(self):
        user = create_user(first_name='Grace', last_name='Hopper')
        response = self.client.get(f'/api/users/{user.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['full_name'], 'Grace Hopper')

    def test_get_unknown_user_returns_404(self):
        response = self.client.get(f'/api/users/{uuid.uuid4()}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_users(self):
        create_user()
        create_user()
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_delete_not_allowed(self):
        user = create_user()
        response = self.client.delete(f'/api/users/{user.id}/')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
