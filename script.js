const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const tooltip = document.getElementById('tooltip');
const imagePath = 'human.png'; // 이미지 경로

const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

let landmarksData = []; // 랜드마크 데이터를 저장할 배열
let highlightedLandmark = null; // 현재 강조된 랜드마크 (초기값 없음)
let originalWidth, originalHeight; // 이미지 원본 크기

// 이미지를 Canvas에 로드하고 Facemesh 처리
const image = new Image();
image.src = imagePath;
image.onload = () => {
  originalWidth = image.width;
  originalHeight = image.height;

  canvasElement.width = originalWidth;
  canvasElement.height = originalHeight;

  canvasCtx.drawImage(image, 0, 0, originalWidth, originalHeight);

  // Mediapipe로 이미지 처리
  faceMesh.send({ image: canvasElement }).then(() => {
    console.log("Facemesh processing completed");
  });

  // 창 크기 변경 감지
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas(); // 초기 크기 설정
};

faceMesh.onResults((results) => {
  landmarksData = []; // 랜드마크 데이터 초기화

  if (results.multiFaceLandmarks) {
    results.multiFaceLandmarks.forEach((landmarks) => {
      landmarks.forEach((landmark, index) => {
        const x = landmark.x * originalWidth;
        const y = landmark.y * originalHeight;

        // 랜드마크 데이터를 배열에 저장
        landmarksData.push({ x, y, index });
      });
    });
  }

  drawLandmarks(); // 랜드마크 그리기
});

function drawLandmarks() {
  const scaleX = canvasElement.width / originalWidth;
  const scaleY = canvasElement.height / originalHeight;

  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(image, 0, 0, canvasElement.width, canvasElement.height);

  landmarksData.forEach((landmark) => {
    canvasCtx.beginPath();

    const scaledX = landmark.x * scaleX;
    const scaledY = landmark.y * scaleY;

    if (highlightedLandmark === landmark.index) {
      // 강조된 랜드마크의 스타일
      canvasCtx.arc(scaledX, scaledY, 7, 0, 2 * Math.PI);
      canvasCtx.fillStyle = 'magenta'; // 강조 색상
    } else {
      // 기본 랜드마크의 스타일
      canvasCtx.arc(scaledX, scaledY, 3, 0, 2 * Math.PI);
      canvasCtx.fillStyle = "#39FF14"; // 기본 색상
    }

    canvasCtx.fill();
  });
}

function resizeCanvas() {
  // 브라우저 창 크기에 맞게 캔버스 크기 설정
  const aspectRatio = originalWidth / originalHeight;

  if (window.innerWidth / window.innerHeight > aspectRatio) {
    canvasElement.height = window.innerHeight;
    canvasElement.width = window.innerHeight * aspectRatio;
  } else {
    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerWidth / aspectRatio;
  }

  drawLandmarks(); // 크기 조정 후 다시 그리기
}

// 마우스 이벤트는 한 번만 등록
canvasElement.addEventListener('mousemove', (e) => {
  const rect = canvasElement.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  let tooltipShown = false;
  let currentHighlight = null; // 현재 하이라이트할 랜드마크

  const scaleX = canvasElement.width / originalWidth;
  const scaleY = canvasElement.height / originalHeight;

  // 저장된 랜드마크 데이터와 비교
  for (const landmark of landmarksData) {
    const scaledX = landmark.x * scaleX;
    const scaledY = landmark.y * scaleY;

    const distance = Math.sqrt((mouseX - scaledX) ** 2 + (mouseY - scaledY) ** 2);
    if (distance < 5) {
      // Tooltip 및 강조 상태 설정
      tooltip.style.left = `${e.clientX}px`;
      tooltip.style.top = `${e.clientY}px`;
      tooltip.style.display = 'block';
      tooltip.innerText = `Landmark: ${landmark.index}`;
      tooltipShown = true;

      currentHighlight = landmark.index; // 현재 마우스가 가리키는 랜드마크
      break; // 첫 번째로 가까운 랜드마크만 처리
    }
  }

  // 랜드마크 근처가 아니면 Tooltip 숨김
  if (!tooltipShown) {
    tooltip.style.display = 'none';
  }

  // 강조된 랜드마크를 업데이트
  if (highlightedLandmark !== currentHighlight) {
    highlightedLandmark = currentHighlight; // 업데이트된 랜드마크
    drawLandmarks(); // 상태 업데이트 후 다시 그리기
  }
});