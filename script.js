(() => {
  const canvas = document.getElementById("game-board");
  const ctx = canvas.getContext("2d");

  const startButton = document.getElementById("start-button");
  const pauseButton = document.getElementById("pause-button");
  const resetButton = document.getElementById("reset-button");
  const restartButton = document.getElementById("restart-button");
  const overlay = document.getElementById("overlay");
  const overlayMessage = document.getElementById("overlay-message");

  const scoreEl = document.getElementById("score");
  const highScoreEl = document.getElementById("high-score");
  const speedEl = document.getElementById("speed");

  const controlButtons = document.querySelectorAll("[data-direction]");

  const GRID_SIZE = 24;
  const INITIAL_LENGTH = 4;
  const INITIAL_SPEED = 6; // moves per second
  const SPEED_INCREMENT = 0.25;
  const MAX_SPEED = 18;
  const SCORE_PER_FOOD = 10;

  const directionVectors = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const keyDirectionMap = {
    ArrowUp: "up",
    KeyW: "up",
    ArrowDown: "down",
    KeyS: "down",
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
  };

  const state = {
    snake: [],
    direction: directionVectors.right,
    queuedDirection: directionVectors.right,
    food: null,
    running: false,
    paused: false,
    gameOver: false,
    score: 0,
    highScore: 0,
    speed: INITIAL_SPEED,
    tickLength: 1000 / INITIAL_SPEED,
    lastTick: 0,
    growth: 0,
  };

  let animationFrameId = null;
  let directionQueuedThisTick = false;
  let touchStartPoint = null;

  function loadHighScore() {
    const stored = Number(window.localStorage.getItem("snake:high-score"));
    return Number.isFinite(stored) ? stored : 0;
  }

  function persistHighScore(value) {
    window.localStorage.setItem("snake:high-score", String(value));
  }

  function resetState() {
    state.snake = createInitialSnake();
    state.direction = directionVectors.right;
    state.queuedDirection = directionVectors.right;
    state.food = spawnFood();
    state.running = false;
    state.paused = false;
    state.gameOver = false;
    state.score = 0;
    state.speed = INITIAL_SPEED;
    state.tickLength = 1000 / INITIAL_SPEED;
    state.lastTick = 0;
    state.growth = 0;
    directionQueuedThisTick = false;
    updateScoreboard();
    drawFrame();
  }

  function createInitialSnake() {
    const center = Math.floor(GRID_SIZE / 2);
    const segments = [];
    for (let i = INITIAL_LENGTH - 1; i >= 0; i -= 1) {
      segments.push({ x: center - i, y: center });
    }
    return segments;
  }

  function spawnFood() {
    const occupied = new Set(state.snake.map((segment) => `${segment.x},${segment.y}`));
    let attempts = 0;

    while (attempts < 250) {
      const position = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const key = `${position.x},${position.y}`;
      if (!occupied.has(key)) {
        return position;
      }
      attempts += 1;
    }

    return null;
  }

  function startGame() {
    if (state.running && !state.gameOver) {
      return;
    }

    if (state.gameOver) {
      resetState();
    }

    hideOverlay();
    state.running = true;
    state.paused = false;
    state.gameOver = false;
    state.lastTick = 0;
    startButton.disabled = true;
    pauseButton.disabled = false;
    pauseButton.textContent = "Pause";
    scheduleNextFrame();
  }

  function scheduleNextFrame() {
    cancelAnimationFrame(animationFrameId);
    if (state.running) {
      animationFrameId = requestAnimationFrame(gameLoop);
    }
  }

  function gameLoop(timestamp) {
    if (!state.running) {
      return;
    }

    if (state.paused) {
      state.lastTick = timestamp;
      animationFrameId = requestAnimationFrame(gameLoop);
      return;
    }

    if (!state.lastTick) {
      state.lastTick = timestamp;
    }

    const elapsed = timestamp - state.lastTick;
    if (elapsed >= state.tickLength) {
      state.lastTick = timestamp;
      stepGame();
      drawFrame();
      directionQueuedThisTick = false;
    }

    animationFrameId = requestAnimationFrame(gameLoop);
  }

  function stepGame() {
    state.direction = state.queuedDirection;
    const nextHead = {
      x: state.snake[0].x + state.direction.x,
      y: state.snake[0].y + state.direction.y,
    };

    if (isCollision(nextHead)) {
      handleGameOver();
      return;
    }

    state.snake.unshift(nextHead);

    const ateFood = state.food && nextHead.x === state.food.x && nextHead.y === state.food.y;
    if (ateFood) {
      state.score += SCORE_PER_FOOD;
      state.growth += 1;
      boostSpeed();
      updateScoreboard();
      state.food = spawnFood();
      if (!state.food) {
        handleVictory();
        return;
      }
    }

    if (state.growth > 0) {
      state.growth -= 1;
    } else {
      state.snake.pop();
    }
  }

  function isCollision(position) {
    const hitWall =
      position.x < 0 || position.x >= GRID_SIZE || position.y < 0 || position.y >= GRID_SIZE;
    if (hitWall) {
      return true;
    }

    return state.snake.some((segment) => segment.x === position.x && segment.y === position.y);
  }

  function boostSpeed() {
    if (state.speed >= MAX_SPEED) {
      return;
    }
    state.speed = Math.min(MAX_SPEED, state.speed + SPEED_INCREMENT);
    state.tickLength = 1000 / state.speed;
    updateSpeedDisplay();
  }

  function updateScoreboard() {
    scoreEl.textContent = state.score;
    updateHighScore();
    updateSpeedDisplay();
  }

  function updateHighScore() {
    if (state.score > state.highScore) {
      state.highScore = state.score;
      persistHighScore(state.highScore);
    }
    highScoreEl.textContent = state.highScore;
  }

  function updateSpeedDisplay() {
    speedEl.textContent = `${state.speed.toFixed(1)}×`;
  }

  function handleGameOver() {
    state.running = false;
    state.gameOver = true;
    cancelAnimationFrame(animationFrameId);
    pauseButton.disabled = true;
    pauseButton.textContent = "Pause";
    startButton.disabled = false;
    updateScoreboard();
    showOverlay(`Game over! Final score: ${state.score}`, { showRestart: true });
  }

  function handleVictory() {
    state.running = false;
    state.gameOver = true;
    cancelAnimationFrame(animationFrameId);
    pauseButton.disabled = true;
    pauseButton.textContent = "Pause";
    startButton.disabled = false;
    updateScoreboard();
    showOverlay(`Unstoppable! You filled the board. Final score: ${state.score}`, {
      showRestart: true,
    });
  }

  function pauseGame() {
    if (!state.running || state.gameOver) {
      return;
    }
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? "Resume" : "Pause";
    if (!state.paused) {
      scheduleNextFrame();
    }
  }

  function resetGame() {
    resetState();
    startButton.disabled = false;
    pauseButton.disabled = true;
    pauseButton.textContent = "Pause";
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    showOverlay("Ready when you are! Press Start to play.", { showRestart: false });
  }

  function drawFrame() {
    const cellSize = canvas.width / GRID_SIZE;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawGrid(cellSize);
    drawFood(cellSize);
    drawSnake(cellSize);
  }

  function drawGrid(cell) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;

    for (let i = 1; i < GRID_SIZE; i += 1) {
      const offset = i * cell;
      ctx.beginPath();
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, offset);
      ctx.lineTo(canvas.width, offset);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawFood(cell) {
    if (!state.food) {
      return;
    }
    ctx.save();
    const padding = cell * 0.15;
    const x = state.food.x * cell + padding;
    const y = state.food.y * cell + padding;
    const size = cell - padding * 2;

    const gradient = ctx.createRadialGradient(
      x + size * 0.35,
      y + size * 0.35,
      size * 0.2,
      x + size * 0.5,
      y + size * 0.5,
      size
    );
    gradient.addColorStop(0, "#ff9f1c");
    gradient.addColorStop(1, "#ff5714");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    drawRoundedRect(ctx, x, y, size, size, size * 0.2);
    ctx.fill();
    ctx.restore();
  }

  function drawSnake(cell) {
    ctx.save();
    state.snake.forEach((segment, index) => {
      const x = segment.x * cell;
      const y = segment.y * cell;

      const isHead = index === 0;
      const radius = cell * 0.35;
      const padding = cell * 0.1;
      const size = cell - padding * 2;

      const hue = 120;
      const lightness = isHead ? 60 : Math.max(35, 60 - index * 1.5);
      ctx.fillStyle = `hsl(${hue}, 85%, ${lightness}%)`;

      ctx.beginPath();
      drawRoundedRect(ctx, x + padding, y + padding, size, size, radius);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawRoundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.moveTo(x + r, y);
    context.lineTo(x + width - r, y);
    context.arcTo(x + width, y, x + width, y + r, r);
    context.lineTo(x + width, y + height - r);
    context.arcTo(x + width, y + height, x + width - r, y + height, r);
    context.lineTo(x + r, y + height);
    context.arcTo(x, y + height, x, y + height - r, r);
    context.lineTo(x, y + r);
    context.arcTo(x, y, x + r, y, r);
    context.closePath();
  }

  function queueDirection(directionName) {
    if (directionName === "pause") {
      pauseGame();
      return;
    }
    const nextDirection = directionVectors[directionName];
    if (!nextDirection) {
      return;
    }

    if (
      nextDirection.x === -state.direction.x &&
      nextDirection.y === -state.direction.y &&
      state.snake.length > 1
    ) {
      return;
    }

    if (directionQueuedThisTick && state.running && !state.paused) {
      return;
    }

    directionQueuedThisTick = true;
    state.queuedDirection = nextDirection;
  }

  function registerEvents() {
    startButton.addEventListener("click", startGame);
    pauseButton.addEventListener("click", pauseGame);
    resetButton.addEventListener("click", resetGame);
    restartButton.addEventListener("click", () => {
      resetGame();
      startGame();
    });

    document.addEventListener("keydown", (event) => {
      if (event.code === "Escape") {
        event.preventDefault();
        pauseGame();
        return;
      }
      const directionName = keyDirectionMap[event.code];
      if (!directionName) {
        return;
      }
      event.preventDefault();
      queueDirection(directionName);
    });

    controlButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const { direction } = button.dataset;
        queueDirection(direction);
      });
    });

    canvas.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length !== 1) {
          return;
        }
        touchStartPoint = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      },
      { passive: true }
    );

    canvas.addEventListener(
      "touchend",
      (event) => {
        if (!touchStartPoint || event.changedTouches.length !== 1) {
          touchStartPoint = null;
          return;
        }
        const touchEndPoint = {
          x: event.changedTouches[0].clientX,
          y: event.changedTouches[0].clientY,
        };
        const deltaX = touchEndPoint.x - touchStartPoint.x;
        const deltaY = touchEndPoint.y - touchStartPoint.y;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (Math.max(absX, absY) > 20) {
          if (absX > absY) {
            queueDirection(deltaX > 0 ? "right" : "left");
          } else {
            queueDirection(deltaY > 0 ? "down" : "up");
          }
        }
        touchStartPoint = null;
      },
      { passive: true }
    );

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state.running && !state.paused) {
        pauseGame();
      }
    });
  }

  function showOverlay(message, { showRestart = false } = {}) {
    overlayMessage.textContent = message;
    overlay.hidden = false;
    restartButton.hidden = !showRestart;
    restartButton.setAttribute("aria-hidden", String(!showRestart));
  }

  function hideOverlay() {
    overlay.hidden = true;
  }

  function init() {
    state.highScore = loadHighScore();
    resetState();
    showOverlay("Ready when you are! Press Start to play.", { showRestart: false });
    registerEvents();
  }

  init();
})();
