import os
import shutil
import cv2
import numpy as np
from ultralytics import YOLO
from config import Config
from utils import cv2_to_base64

class YOLODetector:
  """YOLOv8 Engine for image and video object detection & inference."""

  PEOPLE_CLASSES = {'person'}
  VEHICLE_CLASSES = {'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'bicycle'}
  ANIMAL_CLASSES = {'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe'}

  def __init__(self, model_path=None):
    Config.init_app()
    self.model_path = model_path or Config.MODEL_PATH
    self._ensure_model_exists()
    self.model = YOLO(self.model_path)

  def _ensure_model_exists(self):
    """Download YOLOv8 weights automatically if not found locally."""
    if not os.path.exists(self.model_path):
      print(f"[VisionTrack AI] Model missing at {self.model_path}. Auto-downloading YOLOv8n...")
      # Downloading default ultralytics model
      temp_model = YOLO('yolov8n.pt')
      # Ensure target folder exists and move/copy weights if downloaded to current working dir
      if os.path.exists('yolov8n.pt') and self.model_path != os.path.abspath('yolov8n.pt'):
        shutil.move('yolov8n.pt', self.model_path)
      print(f"[VisionTrack AI] YOLOv8n model ready at {self.model_path}")

  def _categorize_class(self, class_name):
    """Categorize detected COCO class into high-level groups."""
    c_lower = class_name.lower()
    if c_lower in self.PEOPLE_CLASSES:
      return 'people'
    elif c_lower in self.VEHICLE_CLASSES:
      return 'vehicles'
    elif c_lower in self.ANIMAL_CLASSES:
      return 'animals'
    return 'other'

  def detect_image(self, image_input, conf_threshold=0.25):
    """Perform YOLOv8 detection on an image input (filepath or BGR numpy array)."""
    if isinstance(image_input, str):
      image_np = cv2.imread(image_input)
    else:
      image_np = image_input

    if image_np is None or image_np.size == 0:
      raise ValueError("Invalid or empty image input.")

    # Perform YOLOv8 inference
    results = self.model(image_np, conf=conf_threshold)[0]

    # Get annotated frame with bounding boxes
    annotated_np = results.plot()

    detected_objects = []
    category_counts = {'people': 0, 'vehicles': 0, 'animals': 0, 'other': 0}
    total_conf = 0.0

    boxes = results.boxes
    if boxes is not None and len(boxes) > 0:
      for idx, box in enumerate(boxes):
        cls_id = int(box.cls[0].item())
        cls_name = self.model.names.get(cls_id, f"class_{cls_id}")
        conf = float(box.conf[0].item())
        xyxy = [round(v, 2) for v in box.xyxy[0].tolist()]
        category = self._categorize_class(cls_name)

        category_counts[category] += 1
        total_conf += conf

        detected_objects.append({
          'tracking_id': idx + 101,
          'class': cls_name,
          'category': category,
          'confidence': round(conf, 4),
          'confidence_pct': f"{round(conf * 100)}%",
          'bbox': xyxy
        })

    total_count = len(detected_objects)
    avg_conf = round(total_conf / total_count, 4) if total_count > 0 else 0.0

    # Encode annotated image to base64
    base64_img = cv2.to_base64(annotated_np) if hasattr(cv2, 'to_base64') else cv2_to_base64(annotated_np)

    return {
      'success': True,
      'object_count': total_count,
      'objects': detected_objects,
      'categories': category_counts,
      'people_count': category_counts['people'],
      'vehicles_count': category_counts['vehicles'],
      'animals_count': category_counts['animals'],
      'avg_confidence': avg_conf,
      'avg_confidence_pct': f"{round(avg_conf * 100)}%",
      'image_base64': base64_img
    }

  def detect_video(self, video_path, output_path, conf_threshold=0.25):
    """Process video frame-by-frame, writing annotated video to output_path."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
      raise ValueError(f"Could not open input video file: {video_path}")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

    # Prepare VideoWriter
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    total_frames = 0
    object_count_history = []

    try:
      while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
          break

        total_frames += 1

        # Run inference on current frame
        results = self.model(frame, conf=conf_threshold)[0]
        annotated_frame = results.plot()

        # Write annotated frame
        out.write(annotated_frame)
        object_count_history.append(len(results.boxes))
    finally:
      cap.release()
      out.release()

    avg_objects_per_frame = round(sum(object_count_history) / len(object_count_history), 2) if object_count_history else 0

    return {
      'success': True,
      'status': 'completed',
      'output_filename': os.path.basename(output_path),
      'output_path': output_path,
      'total_frames_processed': total_frames,
      'avg_objects_per_frame': avg_objects_per_frame
    }
