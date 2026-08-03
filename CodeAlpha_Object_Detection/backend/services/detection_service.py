import os
from config import Config
from detector import YOLODetector
from tracker import ObjectTracker
from utils import allowed_file, save_upload_file

class DetectionService:
  """Dedicated AI Detection Service encapsulating inference workflows."""

  def __init__(self, detector=None, tracker=None):
    Config.init_app()
    self.detector = detector or YOLODetector()
    self.tracker = tracker or ObjectTracker()

  def is_model_loaded(self):
    """Check if YOLO model is initialized."""
    return self.detector is not None and hasattr(self.detector, 'model')

  def process_image(self, file_storage):
    """Validate image upload, execute detection inference, clean up temp file."""
    if not file_storage or not file_storage.filename:
      raise ValueError("No image file provided in request.")

    if not allowed_file(file_storage.filename, allowed_types='image'):
      raise ValueError(f"Invalid image format. Allowed formats: {Config.ALLOWED_IMAGE_EXTENSIONS}")

    # Save temp upload file
    temp_path, _ = save_upload_file(file_storage, Config.UPLOAD_FOLDER)

    try:
      # Perform AI detection
      results = self.detector.detect_image(temp_path)
      return results
    finally:
      # Clean up temp file
      if os.path.exists(temp_path):
        os.remove(temp_path)

  def process_video(self, file_storage):
    """Validate video upload, run video detection, output processed video."""
    if not file_storage or not file_storage.filename:
      raise ValueError("No video file provided in request.")

    if not allowed_file(file_storage.filename, allowed_types='video'):
      raise ValueError(f"Invalid video format. Allowed formats: {Config.ALLOWED_VIDEO_EXTENSIONS}")

    # Save uploaded video
    upload_path, filename = save_upload_file(file_storage, Config.UPLOAD_FOLDER)
    output_filename = f"processed_{filename}"
    output_path = os.path.join(Config.OUTPUT_FOLDER, output_filename)

    # Perform video frame detection & annotation
    results = self.detector.detect_video(upload_path, output_path)
    results['output_url'] = f"/outputs/{output_filename}"

    return results
