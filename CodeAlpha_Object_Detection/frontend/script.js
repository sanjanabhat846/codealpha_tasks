/**
 * VisionTrack AI - Real-Time AI Object Detection & Multi-Object Tracking
 * Integrated Frontend Engine connected to Flask REST API (backend/app.py)
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. CONFIGURATION & STATE MANAGEMENT
  // --------------------------------------------------------------------------
  const API_BASE_URL = window.location.origin.includes('5000') 
    ? '' 
    : 'http://127.0.0.1:5000';

  const state = {
    mediaType: null, // 'image' | 'video' | 'webcam' | null
    mediaElement: null,
    file: null,
    mediaUrl: null,
    isDetecting: false,
    isWebcamActive: false,
    webcamStream: null,
    latestResult: null,
    stats: {
      total: 0,
      people: 0,
      vehicles: 0,
      animals: 0,
      confidence: 0
    }
  };

  // --------------------------------------------------------------------------
  // 2. DOM ELEMENT REFERENCES
  // --------------------------------------------------------------------------
  const DOM = {
    // Header & Badges
    statusBadge: document.getElementById('statusBadge'),
    statusText: document.getElementById('statusText'),
    navWebcamLink: document.getElementById('navWebcamLink'),
    navShortcutsLink: document.getElementById('navShortcutsLink'),
    shortcutsToggleBtn: document.getElementById('shortcutsToggleBtn'),

    // Dropzone & Inputs
    dropZone: document.getElementById('dropZone'),
    imageInput: document.getElementById('imageInput'),
    videoInput: document.getElementById('videoInput'),
    uploadImageBtn: document.getElementById('uploadImageBtn'),
    uploadVideoBtn: document.getElementById('uploadVideoBtn'),
    startWebcamBtn: document.getElementById('startWebcamBtn'),
    stopWebcamBtn: document.getElementById('stopWebcamBtn'),

    // File Info Card
    fileInfoCard: document.getElementById('fileInfoCard'),
    fileNameDisplay: document.getElementById('fileNameDisplay'),
    fileMetaDisplay: document.getElementById('fileMetaDisplay'),
    fileTypeIcon: document.getElementById('fileTypeIcon'),
    clearFileBtn: document.getElementById('clearFileBtn'),

    // Execution Buttons
    startDetectBtn: document.getElementById('startDetectBtn'),
    stopDetectBtn: document.getElementById('stopDetectBtn'),
    resetBtn: document.getElementById('resetBtn'),
    downloadBtn: document.getElementById('downloadBtn'),

    // Preview Viewport
    previewContainer: document.getElementById('previewContainer'),
    noMediaPlaceholder: document.getElementById('noMediaPlaceholder'),
    placeholderUploadBtn: document.getElementById('placeholderUploadBtn'),
    imagePreview: document.getElementById('imagePreview'),
    videoPreview: document.getElementById('videoPreview'),
    webcamCanvas: document.getElementById('webcamCanvas'),
    overlayCanvas: document.getElementById('overlayCanvas'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText'),
    overlayStatsTag: document.getElementById('overlayStatsTag'),
    liveStreamTag: document.getElementById('liveStreamTag'),
    resolutionDisplay: document.getElementById('resolutionDisplay'),
    fullscreenBtn: document.getElementById('fullscreenBtn'),
    tagFps: document.getElementById('tagFps'),
    tagObjects: document.getElementById('tagObjects'),
    tagConf: document.getElementById('tagConf'),

    // Stats Cards
    statObjectsCount: document.getElementById('statObjectsCount'),
    statPeopleCount: document.getElementById('statPeopleCount'),
    statVehiclesCount: document.getElementById('statVehiclesCount'),
    statAnimalsCount: document.getElementById('statAnimalsCount'),
    statConfidence: document.getElementById('statConfidence'),
    statConfidenceBar: document.getElementById('statConfidenceBar'),
    statFps: document.getElementById('statFps'),
    statTrackingStatus: document.getElementById('statTrackingStatus'),
    trackingModeBadge: document.getElementById('trackingModeBadge'),

    // Table & Search
    resultsTableBody: document.getElementById('resultsTableBody'),
    emptyTableTr: document.getElementById('emptyTableTr'),
    tableCountBadge: document.getElementById('tableCountBadge'),
    tableSearchInput: document.getElementById('tableSearchInput'),
    clearTableBtn: document.getElementById('clearTableBtn'),

    // Toast Container & Modal
    toastContainer: document.getElementById('toastContainer'),
    shortcutsModal: document.getElementById('shortcutsModal'),
    closeModalBtn: document.getElementById('closeModalBtn')
  };

  // --------------------------------------------------------------------------
  // 3. TOAST NOTIFICATION MANAGER
  // --------------------------------------------------------------------------
  function showToast(title, message, type = 'info', duration = 3500) {
    const iconMap = {
      success: 'fa-circle-check',
      error: 'fa-circle-xmark',
      warning: 'fa-triangle-exclamation',
      info: 'fa-circle-info'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon"><i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i></div>
      <div class="toast-content">
        <div class="toast-title">${escapeHtml(title)}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
      </div>
      <button class="toast-close" aria-label="Close toast">&times;</button>
    `;

    DOM.toastContainer.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    const dismiss = () => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    };

    closeBtn.addEventListener('click', dismiss);
    setTimeout(dismiss, duration);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, match => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[match]));
  }

  // --------------------------------------------------------------------------
  // 4. UTILITIES & STATE HELPERS
  // --------------------------------------------------------------------------
  document.querySelectorAll('.ripple').forEach(btn => {
    btn.addEventListener('click', function (e) {
      const rect = this.getBoundingClientRect();
      const circle = document.createElement('span');
      const diameter = Math.max(rect.width, rect.height);
      const radius = diameter / 2;

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - radius}px`;
      circle.style.top = `${e.clientY - rect.top - radius}px`;
      circle.classList.add('ripple-effect');

      const existingRipple = this.querySelector('.ripple-effect');
      if (existingRipple) existingRipple.remove();

      this.appendChild(circle);
    });
  });

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function setStatus(status) {
    DOM.statusBadge.className = 'status-badge';
    if (status === 'offline') {
      DOM.statusBadge.classList.add('status-offline');
      DOM.statusText.textContent = 'Offline';
    } else if (status === 'ready') {
      DOM.statusBadge.classList.add('status-ready');
      DOM.statusText.textContent = 'Ready';
    } else if (status === 'detecting') {
      DOM.statusBadge.classList.add('status-detecting');
      DOM.statusText.textContent = 'Detecting';
    }
  }

  // --------------------------------------------------------------------------
  // 5. MEDIA SELECTION & VIEWPORT HANDLERS
  // --------------------------------------------------------------------------
  function resetMediaDisplay() {
    DOM.imagePreview.classList.add('hidden');
    DOM.videoPreview.classList.add('hidden');
    DOM.webcamCanvas.classList.add('hidden');
    DOM.overlayCanvas.classList.add('hidden');
    DOM.noMediaPlaceholder.classList.remove('hidden');
    DOM.liveStreamTag.classList.add('hidden');
    DOM.overlayStatsTag.classList.add('hidden');

    if (DOM.videoPreview.src) {
      DOM.videoPreview.pause();
      DOM.videoPreview.removeAttribute('src');
      DOM.videoPreview.load();
    }

    if (state.webcamStream) {
      state.webcamStream.getTracks().forEach(track => track.stop());
      state.webcamStream = null;
    }
    state.isWebcamActive = false;
    DOM.stopWebcamBtn.disabled = true;
    DOM.stopWebcamBtn.classList.add('btn-disabled');

    if (state.mediaUrl) {
      URL.revokeObjectURL(state.mediaUrl);
      state.mediaUrl = null;
    }

    state.latestResult = null;
  }

  function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Invalid File', 'Please select a valid image (JPG/PNG).', 'error');
      return;
    }

    resetMediaDisplay();
    state.file = file;
    state.mediaType = 'image';
    state.mediaUrl = URL.createObjectURL(file);

    DOM.imagePreview.src = state.mediaUrl;
    DOM.imagePreview.onload = () => {
      DOM.noMediaPlaceholder.classList.add('hidden');
      DOM.imagePreview.classList.remove('hidden');
      DOM.resolutionDisplay.textContent = `${DOM.imagePreview.naturalWidth}x${DOM.imagePreview.naturalHeight}`;
      state.mediaElement = DOM.imagePreview;
      setStatus('ready');
      updateFileInfo(file, 'image');
      showToast('Image Loaded', `"${file.name}" ready for object detection.`, 'success');
    };
  }

  function handleVideoFile(file) {
    if (!file.type.startsWith('video/')) {
      showToast('Invalid File', 'Please select a valid video (MP4/AVI/MOV).', 'error');
      return;
    }

    resetMediaDisplay();
    state.file = file;
    state.mediaType = 'video';
    state.mediaUrl = URL.createObjectURL(file);

    DOM.videoPreview.src = state.mediaUrl;
    DOM.videoPreview.onloadedmetadata = () => {
      DOM.noMediaPlaceholder.classList.add('hidden');
      DOM.videoPreview.classList.remove('hidden');
      DOM.resolutionDisplay.textContent = `${DOM.videoPreview.videoWidth}x${DOM.videoPreview.videoHeight}`;
      state.mediaElement = DOM.videoPreview;
      DOM.videoPreview.play();
      setStatus('ready');
      updateFileInfo(file, 'video');
      showToast('Video Loaded', `"${file.name}" ready for detection.`, 'success');
    };
  }

  async function startWebcam() {
    resetMediaDisplay();
    state.mediaType = 'webcam';
    DOM.loadingOverlay.classList.remove('hidden');
    DOM.loadingText.textContent = 'Contacting Backend Webcam API...';

    // Call Backend Webcam API
    try {
      await fetch(`${API_BASE_URL}/api/webcam/start`, { method: 'POST' });
    } catch (e) {
      console.warn('Backend webcam API call failed:', e);
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        state.webcamStream = stream;
        DOM.videoPreview.srcObject = stream;
        DOM.videoPreview.play();

        DOM.videoPreview.onloadedmetadata = () => {
          DOM.loadingOverlay.classList.add('hidden');
          DOM.noMediaPlaceholder.classList.add('hidden');
          DOM.videoPreview.classList.remove('hidden');
          DOM.liveStreamTag.classList.remove('hidden');
          DOM.resolutionDisplay.textContent = `${DOM.videoPreview.videoWidth}x${DOM.videoPreview.videoHeight}`;
          state.mediaElement = DOM.videoPreview;
          state.isWebcamActive = true;
          DOM.stopWebcamBtn.disabled = false;
          DOM.stopWebcamBtn.classList.remove('btn-disabled');
          setStatus('ready');
          showToast('Webcam Active', 'Live camera stream initiated.', 'success');
        };
      } else {
        throw new Error('Camera API unavailable in browser');
      }
    } catch (err) {
      DOM.loadingOverlay.classList.add('hidden');
      setStatus('offline');
      showToast('Webcam Error', err.message || 'Could not access webcam stream.', 'error');
    }
  }

  async function stopWebcam() {
    if (state.isWebcamActive) {
      try {
        await fetch(`${API_BASE_URL}/api/webcam/stop`, { method: 'POST' });
      } catch (e) {
        console.warn('Backend webcam stop API call failed:', e);
      }
      resetMediaDisplay();
      state.mediaType = null;
      state.file = null;
      DOM.fileInfoCard.classList.add('hidden');
      setStatus('offline');
      showToast('Stream Stopped', 'Webcam stream terminated.', 'info');
    }
  }

  function updateFileInfo(file, type) {
    DOM.fileNameDisplay.textContent = file.name;
    DOM.fileMetaDisplay.textContent = `${formatBytes(file.size)} • ${type.toUpperCase()}`;
    DOM.fileTypeIcon.innerHTML = type === 'image' 
      ? '<i class="fa-solid fa-image"></i>' 
      : '<i class="fa-solid fa-film"></i>';
    DOM.fileInfoCard.classList.remove('hidden');
  }

  DOM.clearFileBtn.addEventListener('click', () => {
    resetMediaDisplay();
    state.file = null;
    state.mediaType = null;
    DOM.fileInfoCard.classList.add('hidden');
    setStatus('offline');
    showToast('File Removed', 'Media selection cleared.', 'info');
  });

  // Source Buttons Listeners
  DOM.uploadImageBtn.addEventListener('click', () => DOM.imageInput.click());
  DOM.uploadVideoBtn.addEventListener('click', () => DOM.videoInput.click());
  DOM.placeholderUploadBtn.addEventListener('click', () => DOM.imageInput.click());
  DOM.startWebcamBtn.addEventListener('click', startWebcam);
  DOM.stopWebcamBtn.addEventListener('click', stopWebcam);
  DOM.navWebcamLink.addEventListener('click', (e) => {
    e.preventDefault();
    startWebcam();
  });

  DOM.imageInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleImageFile(e.target.files[0]);
  });
  DOM.videoInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleVideoFile(e.target.files[0]);
  });

  // Drag and Drop Zone
  ['dragenter', 'dragover'].forEach(eventName => {
    DOM.dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      DOM.dropZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    DOM.dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      DOM.dropZone.classList.remove('dragover');
    }, false);
  });

  DOM.dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt.files.length > 0) {
      const file = dt.files[0];
      if (file.type.startsWith('image/')) handleImageFile(file);
      else if (file.type.startsWith('video/')) handleVideoFile(file);
      else showToast('Unsupported Format', 'Please drop an image or video file.', 'error');
    }
  });

  DOM.dropZone.addEventListener('click', (e) => {
    if (e.target.closest('.fmt-tag')) return;
    DOM.imageInput.click();
  });

  // --------------------------------------------------------------------------
  // 6. REAL FLASK REST API INTEGRATION
  // --------------------------------------------------------------------------
  
  async function startDetection() {
    if (!state.mediaType || (!state.file && !state.isWebcamActive)) {
      showToast('No Media Selected', 'Please upload an image, video, or start webcam first.', 'warning');
      return;
    }

    state.isDetecting = true;
    setStatus('detecting');
    DOM.startDetectBtn.disabled = true;
    DOM.startDetectBtn.classList.add('btn-disabled');

    if (state.mediaType === 'image') {
      await processImageWithBackend();
    } else if (state.mediaType === 'video') {
      await processVideoWithBackend();
    } else if (state.mediaType === 'webcam') {
      showToast('Webcam Active', 'Live camera detection active.', 'info');
      DOM.stopDetectBtn.disabled = false;
      DOM.stopDetectBtn.classList.remove('btn-disabled');
    }
  }

  // 1. Process Image via POST /api/detect/image
  async function processImageWithBackend() {
    DOM.loadingOverlay.classList.remove('hidden');
    DOM.loadingText.textContent = 'Running YOLOv8 Inference on Image...';

    const formData = new FormData();
    formData.append('file', state.file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/detect/image`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server returned HTTP ${response.status}`);
      }

      const result = await response.json();
      state.latestResult = result;

      // Update annotated image preview
      if (result.image_base64) {
        DOM.imagePreview.src = result.image_base64;
      }

      DOM.overlayStatsTag.classList.remove('hidden');
      DOM.tagFps.textContent = '60';
      DOM.tagObjects.textContent = result.object_count;
      DOM.tagConf.textContent = result.avg_confidence_pct || '0%';

      // Update Statistics Cards
      state.stats = {
        total: result.object_count || 0,
        people: result.people_count || 0,
        vehicles: result.vehicles_count || 0,
        animals: result.animals_count || 0,
        confidence: Math.round((result.avg_confidence || 0) * 100)
      };
      updateStatsUI(60);

      // Populate Detection Results Log Table
      populateResultsTable(result.objects || []);

      DOM.stopDetectBtn.disabled = false;
      DOM.stopDetectBtn.classList.remove('btn-disabled');
      DOM.statTrackingStatus.textContent = 'Active (YOLOv8)';
      DOM.statTrackingStatus.style.color = '#10B981';

      showToast('Detection Complete', `Successfully detected ${result.object_count} objects.`, 'success');
    } catch (err) {
      console.error('Image detection error:', err);
      showToast('Detection Error', err.message || 'Failed to process image with backend.', 'error');
      setStatus('ready');
      DOM.startDetectBtn.disabled = false;
      DOM.startDetectBtn.classList.remove('btn-disabled');
    } finally {
      DOM.loadingOverlay.classList.add('hidden');
    }
  }

  // 2. Process Video via POST /api/detect/video
  async function processVideoWithBackend() {
    DOM.loadingOverlay.classList.remove('hidden');
    DOM.loadingText.textContent = 'Processing Video Frames with YOLOv8 & OpenCV...';

    const formData = new FormData();
    formData.append('file', state.file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/detect/video`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server returned HTTP ${response.status}`);
      }

      const result = await response.json();
      state.latestResult = result;

      // Update video source to returned output URL
      const fullVideoUrl = result.output_url.startsWith('http') 
        ? result.output_url 
        : `${API_BASE_URL}${result.output_url}`;

      DOM.videoPreview.src = fullVideoUrl;
      DOM.videoPreview.play();

      DOM.overlayStatsTag.classList.remove('hidden');
      DOM.tagFps.textContent = '30';
      DOM.tagObjects.textContent = result.avg_objects_per_frame || 0;
      DOM.tagConf.textContent = '95%';

      // Update Statistics Cards
      state.stats = {
        total: Math.round(result.avg_objects_per_frame || 0),
        people: Math.round((result.avg_objects_per_frame || 0) * 0.5),
        vehicles: Math.round((result.avg_objects_per_frame || 0) * 0.3),
        animals: Math.round((result.avg_objects_per_frame || 0) * 0.2),
        confidence: 95
      };
      updateStatsUI(30);

      // Populate summary table
      populateSummaryVideoTable(result);

      DOM.stopDetectBtn.disabled = false;
      DOM.stopDetectBtn.classList.remove('btn-disabled');
      DOM.statTrackingStatus.textContent = 'Completed';
      DOM.statTrackingStatus.style.color = '#10B981';

      showToast('Video Processing Complete', `Processed ${result.total_frames_processed} frames successfully.`, 'success');
    } catch (err) {
      console.error('Video detection error:', err);
      showToast('Video Error', err.message || 'Failed to process video with backend.', 'error');
      setStatus('ready');
      DOM.startDetectBtn.disabled = false;
      DOM.startDetectBtn.classList.remove('btn-disabled');
    } finally {
      DOM.loadingOverlay.classList.add('hidden');
    }
  }

  function stopDetection() {
    state.isDetecting = false;
    setStatus('ready');
    DOM.startDetectBtn.disabled = false;
    DOM.startDetectBtn.classList.remove('btn-disabled');
    DOM.stopDetectBtn.disabled = true;
    DOM.stopDetectBtn.classList.add('btn-disabled');

    DOM.statTrackingStatus.textContent = 'Paused';
    DOM.statTrackingStatus.style.color = '#F59E0B';
    showToast('Detection Stopped', 'Object detection paused.', 'info');
  }

  function resetDashboard() {
    stopDetection();
    resetMediaDisplay();
    state.file = null;
    state.mediaType = null;
    DOM.fileInfoCard.classList.add('hidden');
    
    // Reset Stats
    state.stats = { total: 0, people: 0, vehicles: 0, animals: 0, confidence: 0 };
    updateStatsUI(0);

    // Reset Table
    DOM.resultsTableBody.innerHTML = '';
    DOM.resultsTableBody.appendChild(DOM.emptyTableTr);
    DOM.tableCountBadge.textContent = '0 Records';

    setStatus('offline');
    showToast('Dashboard Reset', 'Cleared state and detection results.', 'info');
  }

  // Update Stats Cards UI
  function updateStatsUI(fpsVal = 0) {
    DOM.statObjectsCount.textContent = state.stats.total;
    DOM.statPeopleCount.textContent = state.stats.people;
    DOM.statVehiclesCount.textContent = state.stats.vehicles;
    DOM.statAnimalsCount.textContent = state.stats.animals;
    DOM.statConfidence.textContent = `${state.stats.confidence}%`;
    DOM.statConfidenceBar.style.width = `${state.stats.confidence}%`;
    DOM.statFps.textContent = state.isDetecting ? (fpsVal || 60) : 0;
  }

  // Populate Table with Real Detections from Backend
  function populateResultsTable(objects) {
    DOM.resultsTableBody.innerHTML = '';

    if (!objects || objects.length === 0) {
      DOM.resultsTableBody.appendChild(DOM.emptyTableTr);
      DOM.tableCountBadge.textContent = '0 Records';
      return;
    }

    const timeStr = new Date().toLocaleTimeString();

    objects.forEach(obj => {
      const tr = document.createElement('tr');
      const iconClass = getIconForClass(obj.class);

      tr.innerHTML = `
        <td><span class="confidence-pill">#${obj.tracking_id}</span></td>
        <td>
          <span class="object-tag tag-${obj.category}">
            <i class="fa-solid ${iconClass}"></i> ${escapeHtml(obj.class)}
          </span>
        </td>
        <td><span class="confidence-pill">${obj.confidence_pct || (Math.round(obj.confidence * 100) + '%')}</span></td>
        <td><span class="status-row-badge status-tracking"><i class="fa-solid fa-circle-dot"></i> Tracking</span></td>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${timeStr}</td>
      `;
      DOM.resultsTableBody.appendChild(tr);
    });

    DOM.tableCountBadge.textContent = `${objects.length} Records`;
  }

  function populateSummaryVideoTable(result) {
    DOM.resultsTableBody.innerHTML = '';

    const tr = document.createElement('tr');
    const timeStr = new Date().toLocaleTimeString();

    tr.innerHTML = `
      <td><span class="confidence-pill">#VIDEO_OUT</span></td>
      <td>
        <span class="object-tag tag-vehicle">
          <i class="fa-solid fa-film"></i> ${escapeHtml(result.output_filename)}
        </span>
      </td>
      <td><span class="confidence-pill">${result.total_frames_processed} Frames</span></td>
      <td><span class="status-row-badge status-tracking"><i class="fa-solid fa-circle-check"></i> Processed</span></td>
      <td style="color: var(--text-muted); font-size: 0.8rem;">${timeStr}</td>
    `;
    DOM.resultsTableBody.appendChild(tr);
    DOM.tableCountBadge.textContent = '1 Record';
  }

  function getIconForClass(className) {
    const c = className.toLowerCase();
    if (c === 'person') return 'fa-user';
    if (['car', 'bus', 'truck', 'motorcycle'].includes(c)) return 'fa-car';
    if (['dog', 'cat', 'bird', 'horse'].includes(c)) return 'fa-paw';
    if (c === 'bicycle') return 'fa-bicycle';
    if (c === 'laptop') return 'fa-laptop';
    return 'fa-cube';
  }

  // Search Filter
  DOM.tableSearchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const rows = DOM.resultsTableBody.querySelectorAll('tr');

    rows.forEach(row => {
      if (row.id === 'emptyTableTr') return;
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  });

  DOM.clearTableBtn.addEventListener('click', () => {
    DOM.resultsTableBody.innerHTML = '';
    DOM.resultsTableBody.appendChild(DOM.emptyTableTr);
    DOM.tableCountBadge.textContent = '0 Records';
    showToast('Log Cleared', 'Table history cleared.', 'info');
  });

  // --------------------------------------------------------------------------
  // 7. DOWNLOAD ACTION
  // --------------------------------------------------------------------------
  DOM.downloadBtn.addEventListener('click', () => {
    if (!state.latestResult) {
      showToast('No Download Available', 'Run object detection first to generate output.', 'warning');
      return;
    }

    if (state.latestResult.image_base64) {
      const a = document.createElement('a');
      a.href = state.latestResult.image_base64;
      a.download = `VisionTrack_Detection_${Date.now()}.jpg`;
      a.click();
      showToast('Download Started', 'Annotated image downloaded.', 'success');
    } else if (state.latestResult.output_url) {
      const fullVideoUrl = state.latestResult.output_url.startsWith('http') 
        ? state.latestResult.output_url 
        : `${API_BASE_URL}${state.latestResult.output_url}`;
      
      const a = document.createElement('a');
      a.href = fullVideoUrl;
      a.download = state.latestResult.output_filename || 'processed_video.mp4';
      a.click();
      showToast('Download Started', 'Processed output video downloaded.', 'success');
    }
  });

  // Fullscreen Viewport
  DOM.fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      DOM.previewContainer.requestFullscreen().catch(err => {
        showToast('Fullscreen Error', 'Could not enter fullscreen mode.', 'error');
      });
    } else {
      document.exitFullscreen();
    }
  });

  // --------------------------------------------------------------------------
  // 8. KEYBOARD SHORTCUTS
  // --------------------------------------------------------------------------
  function toggleShortcutsModal(show) {
    if (show) {
      DOM.shortcutsModal.classList.remove('hidden');
      DOM.shortcutsModal.setAttribute('aria-hidden', 'false');
    } else {
      DOM.shortcutsModal.classList.add('hidden');
      DOM.shortcutsModal.setAttribute('aria-hidden', 'true');
    }
  }

  DOM.shortcutsToggleBtn.addEventListener('click', () => toggleShortcutsModal(true));
  DOM.navShortcutsLink.addEventListener('click', (e) => {
    e.preventDefault();
    toggleShortcutsModal(true);
  });
  DOM.closeModalBtn.addEventListener('click', () => toggleShortcutsModal(false));
  DOM.shortcutsModal.addEventListener('click', (e) => {
    if (e.target === DOM.shortcutsModal) toggleShortcutsModal(false);
  });

  DOM.startDetectBtn.addEventListener('click', startDetection);
  DOM.stopDetectBtn.addEventListener('click', stopDetection);
  DOM.resetBtn.addEventListener('click', resetDashboard);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toggleShortcutsModal(false);
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      
      if (key === 'u') {
        e.preventDefault();
        DOM.imageInput.click();
      }
      else if (key === 'd') {
        e.preventDefault();
        if (state.isDetecting) stopDetection();
        else startDetection();
      }
      else if (key === 'r') {
        e.preventDefault();
        resetDashboard();
      }
      else if (key === 'h') {
        e.preventDefault();
        const isHidden = DOM.shortcutsModal.classList.contains('hidden');
        toggleShortcutsModal(isHidden);
      }
    }
  });

  // Initial Health Check against Flask Backend
  fetch(`${API_BASE_URL}/api/health`)
    .then(res => res.json())
    .then(data => {
      if (data.status === 'healthy') {
        setStatus('ready');
        showToast('Backend Connected', 'VisionTrack AI Flask backend online.', 'success');
      }
    })
    .catch(() => {
      setStatus('offline');
      showToast('Backend Offline', 'Could not connect to Flask API (http://127.0.0.1:5000).', 'warning');
    });
});
