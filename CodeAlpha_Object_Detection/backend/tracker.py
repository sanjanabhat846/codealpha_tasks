class ObjectTracker:
  """Modular Object Tracker placeholder interface for multi-object tracking (ByteTrack ready)."""

  def __init__(self, tracking_method='bytetrack'):
    self.tracking_method = tracking_method
    self.active_tracks = {}
    self.next_track_id = 101

  def update(self, detections, frame=None):
    """Update object trajectories given frame detections.

    Args:
        detections (list): List of detection dicts containing bbox and confidence.
        frame (np.ndarray, optional): Current image frame matrix.

    Returns:
        list: Tracked objects with persistent tracking IDs.
    """
    tracked_objects = []
    for det in detections:
      track_id = self.next_track_id
      self.next_track_id += 1

      tracked_det = dict(det)
      tracked_det['tracking_id'] = track_id
      tracked_det['status'] = 'tracking'
      tracked_objects.append(tracked_det)
      self.active_tracks[track_id] = tracked_det

    return tracked_objects

  def reset(self):
    """Reset tracking memory state."""
    self.active_tracks.clear()
    self.next_track_id = 101
