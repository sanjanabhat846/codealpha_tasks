import base64
import os
import uuid
import cv2
import numpy as np
from werkzeug.utils import secure_filename
from config import Config


def allowed_file(filename, allowed_types=None):
  """Validate if the file extension is allowed."""
  if not filename or '.' not in filename:
    return False

  ext = filename.rsplit('.', 1)[1].lower()

  if allowed_types == 'image':
    return ext in Config.ALLOWED_IMAGE_EXTENSIONS
  elif allowed_types == 'video':
    return ext in Config.ALLOWED_VIDEO_EXTENSIONS

  return ext in Config.ALLOWED_EXTENSIONS


def sanitize_filename(filename):
  """Sanitize filename and prepend unique UUID prefix to avoid collisions."""
  clean_name = secure_filename(filename)
  if not clean_name:
    clean_name = 'upload_media'

  ext = clean_name.rsplit('.', 1)[1].lower() if '.' in clean_name else 'tmp'
  name_without_ext = clean_name.rsplit('.', 1)[0]
  unique_prefix = uuid.uuid4().hex[:8]

  return f'{name_without_ext}_{unique_prefix}.{ext}'


def save_upload_file(file_storage, target_dir):
  """Save Werkzeug FileStorage object safely to target directory."""
  Config.init_app()
  filename = sanitize_filename(file_storage.filename)
  filepath = os.path.join(target_dir, filename)
  file_storage.save(filepath)
  return filepath, filename


def cv2_to_base64(image_np, format_ext='.jpg'):
  """Convert OpenCV BGR image array to Base64 data URL string."""
  if image_np is None or image_np.size == 0:
    return None

  success, encoded_img = cv2.imencode(format_ext, image_np)
  if not success:
    return None

  b64_bytes = base64.b64encode(encoded_img.tobytes()).decode('utf-8')
  mime_type = 'jpeg' if format_ext.lower() in ['.jpg', '.jpeg'] else 'png'
  return f'data:image/{mime_type};base64,{b64_bytes}'


def base64_to_cv2(b64_string):
  """Convert Base64 image data URL string back to OpenCV BGR numpy array."""
  if ',' in b64_string:
    b64_string = b64_string.split(',')[1]

  img_bytes = base64.b64decode(b64_string)
  nparr = np.frombuffer(img_bytes, np.uint8)
  return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
