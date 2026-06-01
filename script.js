const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const tooltip = document.getElementById('tooltip');
const uploadButton = document.getElementById('upload-button');
const fileInput = document.getElementById('file-input');
const statusPill = document.getElementById('status-pill');
const landmarkList = document.getElementById('landmark-list');
const landmarkSearch = document.getElementById('landmark-search');
const imageTitle = document.getElementById('image-title');
const imageMeta = document.getElementById('image-meta');
const emptyState = document.getElementById('empty-state');

const controls = {
  points: document.getElementById('toggle-points'),
  mesh: document.getElementById('toggle-mesh'),
  regions: document.getElementById('toggle-regions'),
  labels: document.getElementById('toggle-labels'),
  mirror: document.getElementById('toggle-mirror'),
  pointSize: document.getElementById('point-size'),
  focusIndex: document.getElementById('focus-index'),
  regionFilter: document.getElementById('region-filter'),
};

const stats = {
  landmarks: document.getElementById('stat-landmarks'),
  faces: document.getElementById('stat-faces'),
  width: document.getElementById('stat-width'),
  height: document.getElementById('stat-height'),
};

const landmarkRegions = {
  faceOval: {
    label: 'Face oval',
    color: '#0f8b8d',
    indexes: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
  },
  leftEye: {
    label: 'Left eye',
    color: '#2f80ed',
    indexes: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
  },
  rightEye: {
    label: 'Right eye',
    color: '#9b51e0',
    indexes: [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466],
  },
  lips: {
    label: 'Lips',
    color: '#d64550',
    indexes: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 185, 40, 39, 37, 0, 267, 269, 270, 409, 78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308],
  },
  nose: {
    label: 'Nose',
    color: '#f29f05',
    indexes: [1, 2, 4, 5, 6, 19, 45, 48, 64, 94, 97, 98, 115, 168, 195, 197, 220, 275, 278, 294, 326, 327, 344, 440],
  },
};

const regionByIndex = new Map();
Object.entries(landmarkRegions).forEach(([key, region]) => {
  region.indexes.forEach((index) => regionByIndex.set(index, { key, ...region }));
});

const meshConnections = [
  ...landmarkRegions.faceOval.indexes.map((index, i, arr) => [index, arr[(i + 1) % arr.length]]),
  ...landmarkRegions.leftEye.indexes.map((index, i, arr) => [index, arr[(i + 1) % arr.length]]),
  ...landmarkRegions.rightEye.indexes.map((index, i, arr) => [index, arr[(i + 1) % arr.length]]),
  ...landmarkRegions.lips.indexes.map((index, i, arr) => [index, arr[(i + 1) % arr.length]]),
  [1, 4], [4, 5], [5, 195], [195, 197], [98, 97], [97, 2], [2, 326], [326, 327],
];

const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.55,
  minTrackingConfidence: 0.55,
});

const state = {
  currentImage: new Image(),
  currentFileName: 'human.png',
  landmarks: [],
  faceCount: 0,
  highlightedIndex: null,
  selectedIndex: null,
  processingToken: 0,
  originalSize: { width: 0, height: 0 },
};

function setStatus(label, type = 'ready') {
  statusPill.textContent = label;
  statusPill.style.background = type === 'error' ? '#fff1f2' : '#e9f7f7';
  statusPill.style.color = type === 'error' ? '#b42318' : '#0b6e70';
}

function getRegion(index) {
  return regionByIndex.get(index) || { key: 'other', label: 'Unmapped', color: '#17b26a' };
}

function getVisibleLandmarks() {
  const selectedRegion = controls.regionFilter.value;
  if (selectedRegion === 'all') {
    return state.landmarks;
  }

  return state.landmarks.filter((landmark) => getRegion(landmark.index).key === selectedRegion);
}

function fitCanvasToViewport(image) {
  const sidebarVisible = window.innerWidth > 900;
  const horizontalPadding = sidebarVisible ? 430 : 40;
  const verticalPadding = sidebarVisible ? 150 : 430;
  const maxWidth = Math.max(320, window.innerWidth - horizontalPadding);
  const maxHeight = Math.max(320, window.innerHeight - verticalPadding);
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);

  canvasElement.width = Math.round(image.width * scale);
  canvasElement.height = Math.round(image.height * scale);
}

function drawImage() {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  if (controls.mirror.checked) {
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);
  }

  canvasCtx.drawImage(state.currentImage, 0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.restore();
}

function mirrorX(x) {
  return controls.mirror.checked ? canvasElement.width - x : x;
}

function drawMesh(landmarkMap) {
  if (!controls.mesh.checked) return;

  canvasCtx.save();
  canvasCtx.lineWidth = 1.15;
  canvasCtx.strokeStyle = 'rgba(25, 32, 46, 0.4)';

  meshConnections.forEach(([from, to]) => {
    const start = landmarkMap.get(from);
    const end = landmarkMap.get(to);
    if (!start || !end) return;

    canvasCtx.beginPath();
    canvasCtx.moveTo(mirrorX(start.x), start.y);
    canvasCtx.lineTo(mirrorX(end.x), end.y);
    canvasCtx.stroke();
  });

  canvasCtx.restore();
}

function drawLandmarks() {
  drawImage();

  const visibleLandmarks = getVisibleLandmarks();
  const landmarkMap = new Map(state.landmarks.map((landmark) => [landmark.index, landmark]));
  drawMesh(landmarkMap);

  if (!controls.points.checked) {
    renderLandmarkList();
    return;
  }

  const pointSize = Number(controls.pointSize.value);
  canvasCtx.save();
  canvasCtx.textAlign = 'center';
  canvasCtx.textBaseline = 'middle';
  canvasCtx.font = '10px Inter, Arial, sans-serif';

  visibleLandmarks.forEach((landmark) => {
    const region = getRegion(landmark.index);
    const x = mirrorX(landmark.x);
    const isFocused = landmark.index === state.highlightedIndex || landmark.index === state.selectedIndex;
    const radius = isFocused ? pointSize + 5 : pointSize;

    canvasCtx.beginPath();
    canvasCtx.arc(x, landmark.y, radius, 0, Math.PI * 2);
    canvasCtx.fillStyle = controls.regions.checked ? region.color : '#17b26a';
    canvasCtx.globalAlpha = isFocused ? 1 : 0.88;
    canvasCtx.fill();

    if (isFocused) {
      canvasCtx.lineWidth = 3;
      canvasCtx.strokeStyle = '#ffffff';
      canvasCtx.stroke();
    }

    if (controls.labels.checked && (isFocused || landmark.index % 10 === 0)) {
      canvasCtx.globalAlpha = 1;
      canvasCtx.fillStyle = '#19202e';
      canvasCtx.fillText(String(landmark.index), x, landmark.y - radius - 8);
    }
  });

  canvasCtx.restore();
  renderLandmarkList();
}

function updateStats() {
  stats.landmarks.textContent = state.landmarks.length;
  stats.faces.textContent = state.faceCount;
  stats.width.textContent = `${canvasElement.width}px`;
  stats.height.textContent = `${canvasElement.height}px`;
}

function renderLandmarkList() {
  const query = landmarkSearch.value.trim().toLowerCase();
  const visible = getVisibleLandmarks()
    .filter((landmark) => {
      const region = getRegion(landmark.index);
      return !query || String(landmark.index).includes(query) || region.label.toLowerCase().includes(query);
    })
    .slice(0, 80);

  if (!visible.length) {
    landmarkList.innerHTML = '<div class="landmark-meta">No matching landmarks.</div>';
    return;
  }

  landmarkList.innerHTML = visible.map((landmark) => {
    const region = getRegion(landmark.index);
    const activeClass = landmark.index === state.selectedIndex ? ' is-active' : '';
    return `
      <button class="landmark-card${activeClass}" type="button" data-index="${landmark.index}">
        <span class="landmark-index">${landmark.index}</span>
        <span class="landmark-meta">
          <b>${region.label}</b>
          x ${landmark.x.toFixed(1)} | y ${landmark.y.toFixed(1)} | z ${landmark.z.toFixed(3)}
        </span>
      </button>
    `;
  }).join('');
}

function updateImageMeta() {
  imageTitle.textContent = state.currentFileName;
  imageMeta.textContent = `${state.originalSize.width} x ${state.originalSize.height} source | ${canvasElement.width} x ${canvasElement.height} canvas`;
}

async function renderImageAndProcess(image) {
  const token = ++state.processingToken;
  setStatus('Scanning');
  emptyState.style.display = 'block';

  state.originalSize = { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height };
  fitCanvasToViewport(image);
  drawImage();
  updateStats();
  updateImageMeta();

  try {
    await faceMesh.send({ image: canvasElement });
    if (token === state.processingToken) {
      setStatus('Ready');
    }
  } catch (error) {
    console.error(error);
    setStatus('Error', 'error');
  }
}

function loadDefaultImage() {
  state.currentFileName = 'human.png';
  state.currentImage = new Image();
  state.currentImage.onload = () => renderImageAndProcess(state.currentImage);
  state.currentImage.onerror = () => setStatus('Image error', 'error');
  state.currentImage.src = 'human.png';
}

function handleFileUpload(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    state.currentFileName = file.name;
    state.currentImage = new Image();
    state.currentImage.onload = () => renderImageAndProcess(state.currentImage);
    state.currentImage.onerror = () => setStatus('Image error', 'error');
    state.currentImage.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportJson() {
  const payload = {
    image: state.currentFileName,
    generatedAt: new Date().toISOString(),
    sourceSize: state.originalSize,
    canvasSize: { width: canvasElement.width, height: canvasElement.height },
    faceCount: state.faceCount,
    landmarks: state.landmarks.map((landmark) => ({
      index: landmark.index,
      x: Number(landmark.x.toFixed(3)),
      y: Number(landmark.y.toFixed(3)),
      z: Number(landmark.z.toFixed(6)),
      region: getRegion(landmark.index).label,
    })),
  };

  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    `faceup-${Date.now()}.json`,
  );
}

function exportPng() {
  canvasElement.toBlob((blob) => {
    if (blob) {
      downloadBlob(blob, `faceup-${Date.now()}.png`);
    }
  }, 'image/png');
}

function findNearestLandmark(mouseX, mouseY) {
  let nearest = null;
  let nearestDistance = Infinity;

  getVisibleLandmarks().forEach((landmark) => {
    const x = mirrorX(landmark.x);
    const distance = Math.hypot(mouseX - x, mouseY - landmark.y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = landmark;
    }
  });

  return nearestDistance <= 14 ? nearest : null;
}

faceMesh.onResults((results) => {
  const faceLandmarks = results.multiFaceLandmarks?.[0] || [];
  state.faceCount = results.multiFaceLandmarks?.length || 0;
  state.landmarks = faceLandmarks.map((landmark, index) => ({
    index,
    x: landmark.x * canvasElement.width,
    y: landmark.y * canvasElement.height,
    z: landmark.z,
  }));

  emptyState.style.display = state.landmarks.length ? 'none' : 'block';
  updateStats();
  drawLandmarks();
});

uploadButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (event) => handleFileUpload(event.target.files[0]));

document.getElementById('download-json').addEventListener('click', exportJson);
document.getElementById('download-png').addEventListener('click', exportPng);
document.getElementById('reset-view').addEventListener('click', loadDefaultImage);

Object.values(controls).forEach((control) => {
  control.addEventListener('input', () => {
    if (control === controls.focusIndex) {
      const value = Number(controls.focusIndex.value);
      state.selectedIndex = Number.isInteger(value) && value >= 0 ? value : null;
    }
    drawLandmarks();
  });
});

landmarkSearch.addEventListener('input', renderLandmarkList);

landmarkList.addEventListener('click', (event) => {
  const card = event.target.closest('[data-index]');
  if (!card) return;

  state.selectedIndex = Number(card.dataset.index);
  controls.focusIndex.value = state.selectedIndex;
  drawLandmarks();
});

canvasElement.addEventListener('mousemove', (event) => {
  const rect = canvasElement.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  const nearest = findNearestLandmark(mouseX, mouseY);

  if (!nearest) {
    tooltip.style.display = 'none';
    if (state.highlightedIndex !== null) {
      state.highlightedIndex = null;
      drawLandmarks();
    }
    return;
  }

  const region = getRegion(nearest.index);
  tooltip.style.left = `${event.clientX + 12}px`;
  tooltip.style.top = `${event.clientY + 12}px`;
  tooltip.style.display = 'block';
  tooltip.innerHTML = `<b>Landmark ${nearest.index}</b><br>${region.label}<br>x ${nearest.x.toFixed(1)} | y ${nearest.y.toFixed(1)}`;

  if (state.highlightedIndex !== nearest.index) {
    state.highlightedIndex = nearest.index;
    drawLandmarks();
  }
});

canvasElement.addEventListener('mouseleave', () => {
  tooltip.style.display = 'none';
  state.highlightedIndex = null;
  drawLandmarks();
});

window.addEventListener('resize', () => {
  if (state.currentImage.complete) {
    renderImageAndProcess(state.currentImage);
  }
});

loadDefaultImage();
