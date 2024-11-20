const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const tooltip = document.getElementById('tooltip');
const uploadButton = document.getElementById('upload-button');
const fileInput = document.getElementById('file-input');

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
let highlightedLandmark = null; // 현재 강조된 랜드마크
let currentImage = new Image(); // 현재 이미지 객체

// 기본 이미지 로드
function loadDefaultImage() {
  currentImage.src = 'human.png';
  currentImage.onload = () => {
    renderImageAndProcess(currentImage);
  };
}

// 업로드 버튼 클릭 시 파일 선택 창 열기
uploadButton.addEventListener('click', () => {
  fileInput.click();
});

// 파일 선택 이벤트 처리
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      currentImage = new Image(); // 새로운 이미지 객체 생성
      currentImage.src = e.target.result;
      currentImage.onload = () => {
        renderImageAndProcess(currentImage); // 이미지 렌더링 및 처리
      };
    };
    reader.readAsDataURL(file);
  }
});

function renderImageAndProcess(image) {
  const uploadContainer = document.querySelector('.upload-container'); // 버튼 영역
  const uploadContainerHeight = uploadContainer.offsetHeight; // 버튼 영역 높이 계산

  // 창 높이에서 버튼 영역 높이를 제외한 유효 높이 계산
  const availableHeight = window.innerHeight - uploadContainerHeight;
  console.log('availableHeight = ' + availableHeight)
  console.log('window.innerHeight = ' + window.innerHeight)
  console.log('uploadContainerHeight = ' + uploadContainerHeight)
  // 가로와 세로 크기를 직접 비교하여 캔버스 크기 조정
  if (image.height > availableHeight) {
    // 이미지 높이가 화면 높이보다 큰 경우: 높이를 기준으로 축소
    canvasElement.height = availableHeight;
    canvasElement.width = (availableHeight / image.height) * image.width;
  } else if (image.width > window.innerWidth) {
    // 이미지 너비가 화면 너비보다 큰 경우: 너비를 기준으로 축소
    canvasElement.width = window.innerWidth;
    canvasElement.height = (window.innerWidth / image.width) * image.height;
  } else {
    // 이미지가 화면 안에 들어가는 경우: 원본 크기 유지
    canvasElement.width = image.width;
    canvasElement.height = image.height;
  }

  // 캔버스 초기화 및 이미지 렌더링
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(image, 0, 0, canvasElement.width, canvasElement.height);

  // FaceMesh로 이미지 처리 시작
  faceMesh.send({ image: canvasElement }).then(() => {
    console.log('FaceMesh processing started.');
  });
}

// 창 크기 변경 시 캔버스와 이미지 크기를 다시 조정
window.addEventListener('resize', () => {
  if (currentImage) {
    renderImageAndProcess(currentImage);
  }
});

// 창 크기 변경 시 캔버스와 이미지 크기를 다시 조정
window.addEventListener('resize', () => {
  if (currentImage) {
    renderImageAndProcess(currentImage);
  }
});

// FaceMesh 결과 처리
faceMesh.onResults((results) => {
  landmarksData = []; // 랜드마크 데이터 초기화

  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    console.log('FaceMesh detected landmarks:', results.multiFaceLandmarks);
    results.multiFaceLandmarks[0].forEach((landmark, index) => {
      const x = landmark.x * canvasElement.width;
      const y = landmark.y * canvasElement.height;

      // 랜드마크 데이터를 배열에 저장
      landmarksData.push({ x, y, index });
    });
  } else {
    console.log('No landmarks detected.');
  }

  drawLandmarks(); // 결과가 있을 때만 랜드마크 그리기
});

// FaceMesh 비동기 작업 완료 후에만 랜드마크를 렌더링
function processImage(image) {
  // FaceMesh에 이미지를 전달하고 결과 처리 완료 시 `drawLandmarks` 호출
  faceMesh.send({ image: canvasElement }).then(() => {
    console.log('FaceMesh completed.');
    if (landmarksData.length > 0) {
      drawLandmarks();
    }
  });
}

// 업로드된 이미지를 캔버스에 렌더링하고 처리
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      currentImage = new Image(); // 새로운 이미지 객체 생성
      currentImage.src = e.target.result;
      currentImage.onload = () => {
        renderImageAndProcess(currentImage); // 이미지 렌더링 및 처리
      };
    };
    reader.readAsDataURL(file);
  }
});

// 랜드마크와 이미지 다시 그리기
function drawLandmarks() {
  // 캔버스 초기화 및 이미지 다시 그리기
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(currentImage, 0, 0, canvasElement.width, canvasElement.height);

  // 랜드마크 그리기
  landmarksData.forEach((landmark) => {
    canvasCtx.beginPath();

    if (highlightedLandmark === landmark.index) {
      // 강조된 랜드마크
      canvasCtx.arc(landmark.x, landmark.y, 7, 0, 2 * Math.PI);
      canvasCtx.fillStyle = 'magenta';
    } else {
      // 일반 랜드마크
      canvasCtx.arc(landmark.x, landmark.y, 3, 0, 2 * Math.PI);
      canvasCtx.fillStyle = '#39FF14';
    }

    canvasCtx.fill();
  });
}

// 마우스 이동 이벤트 처리
canvasElement.addEventListener('mousemove', (e) => {
  const rect = canvasElement.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  let tooltipShown = false;
  let currentHighlight = null;

  // 랜드마크와 마우스 좌표 비교
  for (const landmark of landmarksData) {
    const distance = Math.sqrt((mouseX - landmark.x) ** 2 + (mouseY - landmark.y) ** 2);
    if (distance < 10) {
      tooltip.style.left = `${e.clientX}px`;
      tooltip.style.top = `${e.clientY}px`;
      tooltip.style.display = 'block';
      tooltip.innerText = `Landmark: ${landmark.index}`;
      tooltipShown = true;
      currentHighlight = landmark.index;
      break;
    }
  }

  // 랜드마크 근처가 아니면 Tooltip 숨기기
  if (!tooltipShown) {
    tooltip.style.display = 'none';
  }

  // 강조된 랜드마크 업데이트
  if (highlightedLandmark !== currentHighlight) {
    highlightedLandmark = currentHighlight;
    drawLandmarks(); // 강조된 랜드마크 다시 그리기
  }
});

// 기본 이미지 로드
loadDefaultImage();