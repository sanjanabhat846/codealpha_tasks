"""
Unit and Integration Tests for FAQGenie AI Backend REST API using Python unittest
"""

import unittest
import json
from backend.app import create_app


class TestFAQGenieAPI(unittest.TestCase):

    def setUp(self):
        """Set up Flask test client before each test."""
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()

    def test_home_endpoint(self):
        """Test GET / returns 200 OK and service metadata."""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['service'], 'FAQGenie AI API')
        self.assertEqual(data['status'], 'running')

    def test_health_check_endpoint(self):
        """Test GET /api/health returns 200 OK and healthy status."""
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['model_loaded'])

    def test_chat_password_reset(self):
        """Test POST /chat returns exact matching password reset answer."""
        payload = {"message": "How can I reset my password?"}
        response = self.client.post('/chat', json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('answer', data)
        self.assertEqual(
            data['answer'],
            "Click on the Forgot Password link on the login page to reset your password."
        )

    def test_chat_working_hours(self):
        """Test POST /chat for working hours question."""
        payload = {"message": "What are your working hours?"}
        response = self.client.post('/api/chat', json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('answer', data)
        self.assertTrue(len(data['answer']) > 0)

    def test_chat_low_confidence_fallback(self):
        """Test POST /chat returns fallback string for random irrelevant text."""
        payload = {"message": "quantum electrodynamics astrophysics black hole"}
        response = self.client.post('/chat', json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(
            data['answer'],
            "I'm sorry, I couldn't find a matching answer."
        )

    def test_chat_invalid_content_type(self):
        """Test POST /chat with non-JSON content type returns 400 Bad Request."""
        response = self.client.post('/chat', data="plain text message", content_type='text/plain')
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertIn('error', data)

    def test_chat_missing_message_key(self):
        """Test POST /chat with missing 'message' field returns 400 Bad Request."""
        response = self.client.post('/chat', json={"query": "hello"})
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertIn('error', data)
        self.assertIn("Missing required field: 'message'", data['error'])

    def test_chat_empty_message(self):
        """Test POST /chat with empty message returns 400 Bad Request."""
        response = self.client.post('/chat', json={"message": "   "})
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertIn('error', data)
        self.assertIn("cannot be empty", data['error'])


if __name__ == '__main__':
    unittest.main()
