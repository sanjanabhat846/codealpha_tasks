import io
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Ensure backend path is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app

class VisionTrackBackendTestCase(unittest.TestCase):
  """Test suite for VisionTrack AI Flask Backend API."""

  def setUp(self):
    """Set up Flask test client before each test."""
    self.app = create_app()
    self.app.config['TESTING'] = True
    self.client = self.app.test_client()

  def test_root_endpoint(self):
    """Test root GET / route."""
    response = self.client.get('/')
    self.assertEqual(response.status_code, 200)
    data = response.get_json()
    self.assertEqual(data['service'], 'VisionTrack AI API')
    self.assertEqual(data['status'], 'online')

  def test_health_endpoint(self):
    """Test health GET /api/health route."""
    response = self.client.get('/api/health')
    self.assertEqual(response.status_code, 200)
    data = response.get_json()
    self.assertEqual(data['status'], 'healthy')
    self.assertEqual(data['service'], 'VisionTrack AI')
    self.assertIn('model_loaded', data)

  def test_webcam_start_endpoint(self):
    """Test POST /api/webcam/start route."""
    response = self.client.post('/api/webcam/start')
    self.assertEqual(response.status_code, 200)
    data = response.get_json()
    self.assertEqual(data['status'], 'success')
    self.assertTrue(data['active'])

  def test_webcam_stop_endpoint(self):
    """Test POST /api/webcam/stop route."""
    response = self.client.post('/api/webcam/stop')
    self.assertEqual(response.status_code, 200)
    data = response.get_json()
    self.assertEqual(data['status'], 'success')
    self.assertFalse(data['active'])

  def test_invalid_file_upload(self):
    """Test POST /api/detect/image with invalid text file."""
    data = {'file': (io.BytesIO(b"dummy text content"), 'invalid_file.txt')}
    response = self.client.post('/api/detect/image', data=data, content_type='multipart/form-data')
    self.assertEqual(response.status_code, 400)
    json_data = response.get_json()
    self.assertEqual(json_data['error'], 'Bad Request')

  def test_missing_file_upload(self):
    """Test POST /api/detect/image with missing file payload."""
    response = self.client.post('/api/detect/image')
    self.assertEqual(response.status_code, 400)
    json_data = response.get_json()
    self.assertEqual(json_data['error'], 'Bad Request')

  def test_not_found_404(self):
    """Test requesting a non-existent endpoint returns 404 JSON."""
    response = self.client.get('/api/non_existent_route')
    self.assertEqual(response.status_code, 404)
    data = response.get_json()
    self.assertEqual(data['error'], 'Not Found')

  def test_method_not_allowed_405(self):
    """Test sending invalid HTTP method to GET /api/health returns 405 JSON."""
    response = self.client.post('/api/health')
    self.assertEqual(response.status_code, 405)
    data = response.get_json()
    self.assertEqual(data['error'], 'Method Not Allowed')

  @patch('services.detection_service.DetectionService.process_image')
  def test_mock_image_detection(self, mock_process_image):
    """Test POST /api/detect/image with mocked detection service."""
    mock_process_image.return_value = {
      'success': True,
      'object_count': 2,
      'objects': [
        {'tracking_id': 101, 'class': 'person', 'confidence': 0.98},
        {'tracking_id': 102, 'class': 'car', 'confidence': 0.95}
      ],
      'image_base64': 'data:image/jpeg;base64,mockedbase64string'
    }

    data = {'file': (io.BytesIO(b"fake_image_bytes"), 'sample.jpg')}
    response = self.client.post('/api/detect/image', data=data, content_type='multipart/form-data')
    self.assertEqual(response.status_code, 200)
    res_json = response.get_json()
    self.assertTrue(res_json['success'])
    self.assertEqual(res_json['object_count'], 2)


if __name__ == '__main__':
  unittest.main()
