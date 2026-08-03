import os

class Config:
  """Backend configuration parameters for VisionTrack AI."""

  BASE_DIR = os.path.dirname(os.path.abspath(__file__))

  # Storage directories
  UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
  OUTPUT_FOLDER = os.path.join(BASE_DIR, 'outputs')
  MODEL_DIR = os.path.join(BASE_DIR, 'models')
  MODEL_PATH = os.path.join(MODEL_DIR, 'yolov8n.pt')

  # Allowed file extension sets
  ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png'}
  ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'avi', 'mov'}
  ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS

  # Max upload size limit (100 MB)
  MAX_CONTENT_LENGTH = 100 * 1024 * 1024

  @classmethod
  def init_app(cls):
    """Ensure required storage directories exist on server startup."""
    for folder in [cls.UPLOAD_FOLDER, cls.OUTPUT_FOLDER, cls.MODEL_DIR]:
      os.makedirs(folder, exist_ok=True)
