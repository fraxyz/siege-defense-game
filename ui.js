// === UI & SCALING LOGIC ===
const gameContainer = document.getElementById('game-container');
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const LOGICAL_WIDTH = 450;
const LOGICAL_HEIGHT = 900;
const LOGICAL_ASPECT_RATIO = LOGICAL_WIDTH / LOGICAL_HEIGHT;

function handleResize() {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const screenAspectRatio = screenWidth / screenHeight;
  let newWidth, newHeight;
  if (screenAspectRatio > LOGICAL_ASPECT_RATIO) {
    newHeight = screenHeight;
    newWidth = newHeight * LOGICAL_ASPECT_RATIO;
  } else {
    newWidth = screenWidth;
    newHeight = newWidth / LOGICAL_ASPECT_RATIO;
  }
  gameContainer.style.width = `${newWidth}px`;
  gameContainer.style.height = `${newHeight}px`;
  const scaleFactor = newWidth / LOGICAL_WIDTH;
  document.documentElement.style.setProperty('--scale-factor', scaleFactor);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  const logicalScaleX = canvas.width / LOGICAL_WIDTH;
  const logicalScaleY = canvas.height / LOGICAL_HEIGHT;
  ctx.setTransform(logicalScaleX, 0, 0, logicalScaleY, 0, 0);
}
