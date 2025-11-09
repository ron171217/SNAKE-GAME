// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 600;
canvas.height = 600;

// Game configuration
const GRID_SIZE = 20;
const TILE_SIZE = canvas.width / GRID_SIZE;
const GAME_SPEED = 100; // milliseconds between frames

// Game state
let snake = [];
let food = {};
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameLoop = null;
let isGameRunning = false;
let isPaused = false;

// UI elements
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const finalScoreElement = document.getElementById('finalScore');
const gameOverScreen = document.getElementById('gameOver');
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

// Initialize high score display
highScoreElement.textContent = highScore;

// Initialize snake in the middle of the grid
function initSnake() {
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
}

// Generate random food position
function generateFood() {
    let newFood;
    let validPosition = false;
    
    while (!validPosition) {
        newFood = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
        };
        
        // Check if food is not on snake
        validPosition = !snake.some(segment => 
            segment.x === newFood.x && segment.y === newFood.y
        );
    }
    
    food = newFood;
}

// Draw a rounded rectangle
function drawRoundedRect(x, y, width, height, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
}

// Draw the snake
function drawSnake() {
    snake.forEach((segment, index) => {
        const x = segment.x * TILE_SIZE;
        const y = segment.y * TILE_SIZE;
        
        // Different colors for head and body
        if (index === 0) {
            // Snake head with gradient
            const gradient = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
            gradient.addColorStop(0, '#4ade80');
            gradient.addColorStop(1, '#22c55e');
            drawRoundedRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4, 6, gradient);
            
            // Eyes
            ctx.fillStyle = 'white';
            const eyeSize = 4;
            const eyeOffset = TILE_SIZE / 3;
            
            if (direction.x === 1) { // Right
                ctx.fillRect(x + TILE_SIZE - eyeOffset, y + eyeOffset - 2, eyeSize, eyeSize);
                ctx.fillRect(x + TILE_SIZE - eyeOffset, y + TILE_SIZE - eyeOffset - 2, eyeSize, eyeSize);
            } else if (direction.x === -1) { // Left
                ctx.fillRect(x + eyeOffset - eyeSize, y + eyeOffset - 2, eyeSize, eyeSize);
                ctx.fillRect(x + eyeOffset - eyeSize, y + TILE_SIZE - eyeOffset - 2, eyeSize, eyeSize);
            } else if (direction.y === -1) { // Up
                ctx.fillRect(x + eyeOffset - 2, y + eyeOffset - eyeSize, eyeSize, eyeSize);
                ctx.fillRect(x + TILE_SIZE - eyeOffset - 2, y + eyeOffset - eyeSize, eyeSize, eyeSize);
            } else { // Down
                ctx.fillRect(x + eyeOffset - 2, y + TILE_SIZE - eyeOffset, eyeSize, eyeSize);
                ctx.fillRect(x + TILE_SIZE - eyeOffset - 2, y + TILE_SIZE - eyeOffset, eyeSize, eyeSize);
            }
        } else {
            // Snake body
            const gradient = ctx.createLinearGradient(x, y, x + TILE_SIZE, y + TILE_SIZE);
            gradient.addColorStop(0, '#86efac');
            gradient.addColorStop(1, '#4ade80');
            drawRoundedRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4, 5, gradient);
        }
    });
}

// Draw the food
function drawFood() {
    const x = food.x * TILE_SIZE;
    const y = food.y * TILE_SIZE;
    
    // Food with gradient (looks like an apple)
    const gradient = ctx.createRadialGradient(
        x + TILE_SIZE / 2, y + TILE_SIZE / 2, 2,
        x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE / 2
    );
    gradient.addColorStop(0, '#fca5a5');
    gradient.addColorStop(1, '#ef4444');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Stem
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + TILE_SIZE / 2, y + TILE_SIZE / 4);
    ctx.lineTo(x + TILE_SIZE / 2 + 3, y + TILE_SIZE / 6);
    ctx.stroke();
}

// Draw grid (optional, for better visibility)
function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= GRID_SIZE; i++) {
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(i * TILE_SIZE, 0);
        ctx.lineTo(i * TILE_SIZE, canvas.height);
        ctx.stroke();
        
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(0, i * TILE_SIZE);
        ctx.lineTo(canvas.width, i * TILE_SIZE);
        ctx.stroke();
    }
}

// Update game state
function update() {
    if (isPaused) return;
    
    // Update direction from next direction
    direction = { ...nextDirection };
    
    // Calculate new head position
    const head = { ...snake[0] };
    head.x += direction.x;
    head.y += direction.y;
    
    // Check wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        gameOver();
        return;
    }
    
    // Check self collision
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
    }
    
    // Add new head
    snake.unshift(head);
    
    // Check food collision
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        generateFood();
        
        // Update high score
        if (score > highScore) {
            highScore = score;
            highScoreElement.textContent = highScore;
            localStorage.setItem('snakeHighScore', highScore);
        }
    } else {
        // Remove tail if no food eaten
        snake.pop();
    }
}

// Render game
function render() {
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    drawGrid();
    
    // Draw game elements
    drawFood();
    drawSnake();
}

// Main game loop
function gameLoopFunction() {
    update();
    render();
}

// Start game
function startGame() {
    // Reset game state
    score = 0;
    scoreElement.textContent = score;
    isPaused = false;
    isGameRunning = true;
    
    // Initialize game
    initSnake();
    generateFood();
    
    // Hide start screen
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    // Start game loop
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(gameLoopFunction, GAME_SPEED);
    
    // Initial render
    render();
}

// Game over
function gameOver() {
    isGameRunning = false;
    clearInterval(gameLoop);
    
    // Show game over screen
    finalScoreElement.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

// Pause/Resume game
function togglePause() {
    if (!isGameRunning) return;
    
    isPaused = !isPaused;
    
    if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    } else {
        render();
    }
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    // Prevent default scrolling behavior for arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
    
    if (!isGameRunning && e.code === 'Space') {
        if (startScreen.classList.contains('hidden')) {
            startGame();
        }
        return;
    }
    
    // Pause/Resume
    if (e.code === 'Space') {
        togglePause();
        return;
    }
    
    if (isPaused) return;
    
    // Direction controls (prevent 180-degree turns)
    switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
            if (direction.y === 0) {
                nextDirection = { x: 0, y: -1 };
            }
            break;
        case 'ArrowDown':
        case 'KeyS':
            if (direction.y === 0) {
                nextDirection = { x: 0, y: 1 };
            }
            break;
        case 'ArrowLeft':
        case 'KeyA':
            if (direction.x === 0) {
                nextDirection = { x: -1, y: 0 };
            }
            break;
        case 'ArrowRight':
        case 'KeyD':
            if (direction.x === 0) {
                nextDirection = { x: 1, y: 0 };
            }
            break;
    }
});

// Button event listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Initial render
render();
