import os
import sys

# Ensure backend directory is in python search path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from config import Config
from services.detection_service import DetectionService

def create_app():
  """Create and configure VisionTrack AI Flask App."""
  Config.init_app()

  app = Flask(__name__)
  app.config['MAX_CONTENT_LENGTH'] = Config.MAX_CONTENT_LENGTH

  # Enable CORS for all frontend cross-origin requests
  CORS(app)

  # Lazy initialization of detection service
  detection_service = None

  def get_service():
    nonlocal detection_service
    if detection_service is None:
      detection_service = DetectionService()
    return detection_service

  # --------------------------------------------------------------------------
  # ROUTES & ENDPOINTS
  # --------------------------------------------------------------------------

  @app.route('/', methods=['GET'])
  def index():
    """Welcome Root Endpoint."""
    return jsonify({
      'service': 'VisionTrack AI API',
      'version': '1.0.0',
      'status': 'online',
      'endpoints': [
        '/api/health',
        '/api/detect/image',
        '/api/detect/video',
        '/api/webcam/start',
        '/api/webcam/stop'
      ]
    }), 200

  @app.route('/api/health', methods=['GET'])
  def health_check():
    """Health check endpoint."""
    service = get_service()
    return jsonify({
      'status': 'healthy',
      'model_loaded': service.is_model_loaded(),
      'service': 'VisionTrack AI'
    }), 200

  @app.route('/api/detect/image', methods=['POST'])
  def detect_image():
    """Process uploaded image file and return YOLOv8 object detections."""
    if 'file' not in request.files and 'image' not in request.files:
      return jsonify({
        'error': 'Bad Request',
        'message': 'No image file uploaded. Expected file field "file" or "image".'
      }), 400

    file_obj = request.files.get('file') or request.files.get('image')

    try:
      service = get_service()
      results = service.process_image(file_obj)
      return jsonify(results), 200
    except ValueError as e:
      return jsonify({'error': 'Bad Request', 'message': str(e)}), 400
    except Exception as e:
      return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500

  @app.route('/api/detect/video', methods=['POST'])
  def detect_video():
    """Process uploaded video file and return detection output video reference."""
    if 'file' not in request.files and 'video' not in request.files:
      return jsonify({
        'error': 'Bad Request',
        'message': 'No video file uploaded. Expected file field "file" or "video".'
      }), 400

    file_obj = request.files.get('file') or request.files.get('video')

    try:
      service = get_service()
      results = service.process_video(file_obj)
      return jsonify(results), 200
    except ValueError as e:
      return jsonify({'error': 'Bad Request', 'message': str(e)}), 400
    except Exception as e:
      return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500

  @app.route('/api/webcam/start', methods=['POST'])
  def start_webcam():
    """Webcam stream start placeholder endpoint."""
    return jsonify({
      'status': 'success',
      'message': 'Webcam stream started',
      'active': True
    }), 200

  @app.route('/api/webcam/stop', methods=['POST'])
  def stop_webcam():
    """Webcam stream stop placeholder endpoint."""
    return jsonify({
      'status': 'success',
      'message': 'Webcam stream stopped',
      'active': False
    }), 200

  @app.route('/outputs/<path:filename>', methods=['GET'])
  def serve_output(filename):
    """Serve output media files from backend outputs directory."""
    return send_from_directory(Config.OUTPUT_FOLDER, filename)

  # --------------------------------------------------------------------------
  # GLOBAL ERROR HANDLERS
  # --------------------------------------------------------------------------

  @app.errorhandler(400)
  def bad_request(e):
    return jsonify({
      'error': 'Bad Request',
      'message': getattr(e, 'description', 'Invalid request payload or parameters.'),
      'status': 400
    }), 400

  @app.errorhandler(404)
  def not_found(e):
    return jsonify({
      'error': 'Not Found',
      'message': 'The requested endpoint or resource does not exist.',
      'status': 404
    }), 404

  @app.errorhandler(405)
  def method_not_allowed(e):
    return jsonify({
      'error': 'Method Not Allowed',
      'message': 'The HTTP method is not allowed for this route.',
      'status': 405
    }), 405

  @app.errorhandler(500)
  def internal_server_error(e):
    return jsonify({
      'error': 'Internal Server Error',
      'message': getattr(e, 'description', 'An internal server error occurred.'),
      'status': 500
    }), 500

  return app


app = create_app()

if __name__ == '__main__':
  app.run(host='0.0.0.0', port=5000, debug=True)
