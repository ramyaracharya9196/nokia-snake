// Sound FX using Web Audio API
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(type) {
  try {
    initAudio();
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (type === 'click') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, now);
      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'eat') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(950, now);
      osc.frequency.setValueAtTime(1420, now + 0.06);
      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'gameover') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.5);
      gainNode.gain.setValueAtTime(0.18, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'select') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(750, now);
      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.start(now);
      osc.stop(now + 0.07);
    }
  } catch (e) {
    console.warn("Web Audio not supported or blocked by security policies", e);
  }
}

// Views and Navigation
const views = {
  menu: document.getElementById('menu-screen'),
  game: document.getElementById('game-screen'),
  gameover: document.getElementById('gameover-screen'),
  highscores: document.getElementById('highscores-screen'),
  controls: document.getElementById('controls-screen')
};

let currentView = 'menu';

function showView(viewName) {
  currentView = viewName;
  Object.keys(views).forEach(key => {
    if (key === viewName) {
      views[key].classList.remove('hidden');
    } else {
      views[key].classList.add('hidden');
    }
  });
  playSound('select');
}

// Menu State
let menuIndex = 0;
const menuOptions = document.querySelectorAll('.menu-option');

function updateMenu() {
  menuOptions.forEach((opt, idx) => {
    if (idx === menuIndex) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }
  });
}

function handleMenuNavigation(direction) {
  if (direction === 'up') {
    menuIndex = (menuIndex - 1 + menuOptions.length) % menuOptions.length;
    playSound('click');
  } else if (direction === 'down') {
    menuIndex = (menuIndex + 1) % menuOptions.length;
    playSound('click');
  }
  updateMenu();
}

function selectMenuOption() {
  const activeOpt = menuOptions[menuIndex].getAttribute('data-option');
  if (activeOpt === 'play') {
    startGame();
  } else if (activeOpt === 'highscores') {
    loadHighScores();
    showView('highscores');
  } else if (activeOpt === 'controls') {
    showView('controls');
  }
}

// High Scores LocalStorage logic
function loadHighScores() {
  let scores = JSON.parse(localStorage.getItem('nokia_snake_scores')) || [0, 0, 0];
  document.getElementById('hs-val-1').innerText = String(scores[0]).padStart(4, '0');
  document.getElementById('hs-val-2').innerText = String(scores[1]).padStart(4, '0');
  document.getElementById('hs-val-3').innerText = String(scores[2]).padStart(4, '0');
}

function saveHighScore(newScore) {
  let scores = JSON.parse(localStorage.getItem('nokia_snake_scores')) || [0, 0, 0];
  let isNewHigh = newScore > scores[0];
  scores.push(newScore);
  scores.sort((a, b) => b - a);
  scores = scores.slice(0, 3);
  localStorage.setItem('nokia_snake_scores', JSON.stringify(scores));
  return isNewHigh;
}

// Game Settings & Variables
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const GRID_SIZE = 10;
const COLS = canvas.width / GRID_SIZE; // 20 cols
const ROWS = canvas.height / GRID_SIZE; // 15 rows

let snake = [];
let dir = { x: 1, y: 0 };
let nextDir = { x: 1, y: 0 };
let food = { x: 0, y: 0 };
let score = 0;
let gameInterval = null;
let isPaused = false;
let gameRunning = false;

// Expose internal state to global scope for testing (helps Playwright find snake & food)
window.getGameState = function() {
  return {
    gameRunning,
    isPaused,
    score,
    snake: [...snake],
    food: { ...food },
    currentView
  };
};

function startGame() {
  showView('game');
  snake = [
    { x: 10, y: 7 },
    { x: 9, y: 7 },
    { x: 8, y: 7 }
  ];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  isPaused = false;
  gameRunning = true;
  updateScoreDisplay();
  spawnFood();
  
  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(gameStep, 150); // Ticks every 150ms for solid arcade feel
  
  drawGame();
}

function gameStep() {
  if (isPaused || !gameRunning) return;
  
  // Set direct movement buffer
  dir = nextDir;
  
  // Next head step
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  
  // Bound limit check
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    gameOver();
    return;
  }
  
  // Snake segment self-collision check
  for (let i = 0; i < snake.length; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) {
      gameOver();
      return;
    }
  }
  
  // Add new head segment
  snake.unshift(head);
  
  // Food step
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    updateScoreDisplay();
    playSound('eat');
    spawnFood();
  } else {
    // Pop tail if no food eaten
    snake.pop();
  }
  
  drawGame();
}

function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Outer frame boundary
  ctx.strokeStyle = '#1b2612';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
  
  // Draw snake
  ctx.fillStyle = '#1b2612';
  for (let i = 0; i < snake.length; i++) {
    // Render distinct squares with small border gaps
    ctx.fillRect(
      snake[i].x * GRID_SIZE + 1,
      snake[i].y * GRID_SIZE + 1,
      GRID_SIZE - 2,
      GRID_SIZE - 2
    );
  }
  
  // Draw food (Pixelated cross/bug)
  ctx.fillStyle = '#1b2612';
  const fx = food.x * GRID_SIZE;
  const fy = food.y * GRID_SIZE;
  
  ctx.fillRect(fx + 3, fy + 3, 4, 4); // Core dot
  ctx.fillRect(fx + 1, fy + 1, 2, 2); // Diagonals
  ctx.fillRect(fx + 7, fy + 1, 2, 2);
  ctx.fillRect(fx + 1, fy + 7, 2, 2);
  ctx.fillRect(fx + 7, fy + 7, 2, 2);
}

function spawnFood() {
  let validPosition = false;
  let attempts = 0;
  while (!validPosition && attempts < 100) {
    food = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS)
    };
    
    // Check if food coordinates fall on the snake
    validPosition = true;
    for (let i = 0; i < snake.length; i++) {
      if (snake[i].x === food.x && snake[i].y === food.y) {
        validPosition = false;
        break;
      }
    }
    attempts++;
  }
}

function updateScoreDisplay() {
  document.getElementById('score-label').innerText = 'Score:' + String(score).padStart(4, '0');
  let scores = JSON.parse(localStorage.getItem('nokia_snake_scores')) || [0];
  const hi = Math.max(scores[0], score);
  document.getElementById('highscore-label').innerText = 'HI:' + String(hi).padStart(4, '0');
}

function gameOver() {
  gameRunning = false;
  clearInterval(gameInterval);
  playSound('gameover');
  
  const isNewHigh = saveHighScore(score);
  document.getElementById('final-score').innerText = score;
  
  const highMsg = document.getElementById('new-highscore-msg');
  if (isNewHigh && score > 0) {
    highMsg.classList.remove('hidden');
  } else {
    highMsg.classList.add('hidden');
  }
  
  showView('gameover');
}

// Controller logic
function handleDirectionChange(newDir) {
  if (!gameRunning || isPaused) return;
  // Prevent turning back into self
  if (newDir.x !== 0 && dir.x === 0) {
    nextDir = newDir;
    playSound('click');
  }
  if (newDir.y !== 0 && dir.y === 0) {
    nextDir = newDir;
    playSound('click');
  }
}

function handleInput(key) {
  initAudio();
  
  if (currentView === 'menu') {
    if (key === 'UP') handleMenuNavigation('up');
    else if (key === 'DOWN') handleMenuNavigation('down');
    else if (key === 'SELECT') selectMenuOption();
  } else if (currentView === 'game') {
    if (key === 'UP') handleDirectionChange({ x: 0, y: -1 });
    else if (key === 'DOWN') handleDirectionChange({ x: 0, y: 1 });
    else if (key === 'LEFT') handleDirectionChange({ x: -1, y: 0 });
    else if (key === 'RIGHT') handleDirectionChange({ x: 1, y: 0 });
    else if (key === 'SELECT') {
      isPaused = !isPaused;
      playSound('select');
    } else if (key === 'BACK') {
      gameRunning = false;
      clearInterval(gameInterval);
      showView('menu');
    }
  } else if (currentView === 'gameover') {
    if (key === 'SELECT') {
      startGame();
    } else if (key === 'BACK') {
      showView('menu');
    }
  } else if (currentView === 'highscores' || currentView === 'controls') {
    if (key === 'BACK' || key === 'SELECT') {
      showView('menu');
    }
  }
}

// Keyboard input binding
document.addEventListener('keydown', (e) => {
  let mappedKey = null;
  let btnId = null;
  
  switch(e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
    case '2':
      mappedKey = 'UP';
      btnId = 'btn-2';
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
    case '8':
      mappedKey = 'DOWN';
      btnId = 'btn-8';
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
    case '4':
      mappedKey = 'LEFT';
      btnId = 'btn-4';
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
    case '6':
      mappedKey = 'RIGHT';
      btnId = 'btn-6';
      break;
    case 'Enter':
    case ' ':
    case '5':
      mappedKey = 'SELECT';
      btnId = 'btn-5';
      break;
    case 'Escape':
    case 'Backspace':
    case 'c':
    case 'C':
      mappedKey = 'BACK';
      btnId = 'btn-c';
      break;
  }
  
  if (mappedKey) {
    e.preventDefault();
    handleInput(mappedKey);
    
    // Highlight the pressed button in UI
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.classList.add('pressed');
      setTimeout(() => btn.classList.remove('pressed'), 100);
    }
  }
});

// Touch and click buttons mapping
document.querySelectorAll('.nokia-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.getAttribute('data-key');
    const id = btn.id;
    
    let mappedKey = null;
    if (key === '2' || id === 'btn-scroll-up') mappedKey = 'UP';
    else if (key === '8' || id === 'btn-scroll-down') mappedKey = 'DOWN';
    else if (key === '4') mappedKey = 'LEFT';
    else if (key === '6') mappedKey = 'RIGHT';
    else if (key === '5' || id === 'btn-menu') mappedKey = 'SELECT';
    else if (key === 'c' || id === 'btn-c') mappedKey = 'BACK';
    
    // Visual flash on button click
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 100);
    
    if (mappedKey) {
      handleInput(mappedKey);
    } else {
      playSound('click');
    }
  });
});

// Load high scores immediately at start
loadHighScores();
updateMenu();
