const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- GAME VARIABLES ---
let frames = 0;
let score = 0;
let bestScore = 0;
// State: 0 = Get Ready, 1 = Playing, 2 = Game Over
let gameState = 0; 

// --- ASSETS: IMAGES ---
const birdImg = new Image();
birdImg.src = "assets/images/bird.png";

const pipeTopImg = new Image();
pipeTopImg.src = "assets/images/pipe-top.png";

const pipeBottomImg = new Image();
pipeBottomImg.src = "assets/images/pipe-bottom.png";

// --- ASSETS: SOUNDS ---
const wingSound = new Audio("assets/sounds/wing.wav");
const pointSound = new Audio("assets/sounds/point.wav");
const hitSound = new Audio("assets/sounds/hit.wav");
const dieSound = new Audio("assets/sounds/die.wav");

// --- GAME OBJECTS ---
const bird = {
    x: 50,
    y: 150,
    width: 34,
    height: 24,
    velocity: 0,
    gravity: 0.25,
    jump: -4.6,
    
    draw: function() {
        // Fallback to a yellow square if the image doesn't load
        if (birdImg.complete && birdImg.naturalHeight !== 0) {
            ctx.drawImage(birdImg, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = "yellow";
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    },
    
    update: function() {
        if (gameState === 1) {
            this.velocity += this.gravity;
            this.y += this.velocity;
            
            // Floor collision
            if (this.y + this.height >= canvas.height) {
                this.y = canvas.height - this.height;
                triggerGameOver();
            }
            // Ceiling collision
            if (this.y <= 0) {
                this.y = 0;
                this.velocity = 0;
            }
        }
    },
    
    flap: function() {
        this.velocity = this.jump;
        wingSound.play();
    },
    
    reset: function() {
        this.y = 150;
        this.velocity = 0;
    }
};

const pipes = {
    position: [],
    width: 53,
    height: 400,
    gap: 120, // Space between top and bottom pipe
    dx: 2,    // Speed of pipes moving left
    
    draw: function() {
        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            let topYPos = p.y;
            let bottomYPos = p.y + this.height + this.gap;
            
            // Draw Top Pipe
            if (pipeTopImg.complete && pipeTopImg.naturalHeight !== 0) {
                ctx.drawImage(pipeTopImg, p.x, topYPos, this.width, this.height);
            } else {
                ctx.fillStyle = "green";
                ctx.fillRect(p.x, topYPos, this.width, this.height);
            }
            
            // Draw Bottom Pipe
            if (pipeBottomImg.complete && pipeBottomImg.naturalHeight !== 0) {
                ctx.drawImage(pipeBottomImg, p.x, bottomYPos, this.width, this.height);
            } else {
                ctx.fillStyle = "green";
                ctx.fillRect(p.x, bottomYPos, this.width, this.height);
            }
        }
    },
    
    update: function() {
        if (gameState !== 1) return;
        
        // Add new pipes every 100 frames
        if (frames % 100 === 0) {
            this.position.push({
                x: canvas.width,
                y: Math.random() * (canvas.height/2) - (this.height - 50),
                passed: false // <--- NEW: Flag to track if score was counted
            });
        }
        
        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            p.x -= this.dx;
            
            // Collision Detection (AABB)
            let bottomPipeYPos = p.y + this.height + this.gap;
            let tolerance = 4; 
            
            if (bird.x + bird.width - tolerance > p.x && 
                bird.x + tolerance < p.x + this.width && 
                (bird.y + tolerance < p.y + this.height || 
                 bird.y + bird.height - tolerance > bottomPipeYPos)) {
                triggerGameOver();
            }
            
            // NEW SCORE LOGIC: Check if bird passed the pipe and it hasn't been counted yet
            if (p.x + this.width < bird.x && !p.passed) {
                score++;
                pointSound.play();
                bestScore = Math.max(score, bestScore);
                p.passed = true; // Mark as passed so it only counts once
            }
            
            // Remove pipes that go off screen
            if (p.x + this.width <= 0) {
                this.position.shift();
                i--; // Adjust index after removing an element
            }
        }
    },
    
    reset: function() {
        this.position = [];
    }
};

// --- CORE FUNCTIONS ---
function triggerGameOver() {
    if (gameState === 1) {
        hitSound.play();
        setTimeout(() => dieSound.play(), 300); // Play die sound slightly after hit
    }
    gameState = 2;
}

function drawUI() {
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    
    if (gameState === 0) {
        ctx.font = "30px Arial";
        ctx.fillText("Tap to Start", 80, 200);
        ctx.strokeText("Tap to Start", 80, 200);
    } 
    
    if (gameState === 1 || gameState === 2) {
        ctx.font = "40px Arial";
        ctx.fillText(score, canvas.width/2 - 10, 50);
        ctx.strokeText(score, canvas.width/2 - 10, 50);
    }
    
    if (gameState === 2) {
        ctx.font = "30px Arial";
        ctx.fillText("Game Over", 85, 200);
        ctx.strokeText("Game Over", 85, 200);
        
        ctx.font = "20px Arial";
        ctx.fillText("Best: " + bestScore, 120, 240);
        ctx.strokeText("Best: " + bestScore, 120, 240);
        
        ctx.font = "15px Arial";
        ctx.fillText("Tap to Restart", 110, 280);
    }
}

// --- INPUT HANDLING ---
function handleInput(e) {
    if (e.type !== 'keydown') e.preventDefault(); // Prevent double firing on touch/click
    
    switch(gameState) {
        case 0: // Get Ready
            gameState = 1;
            bird.flap();
            break;
        case 1: // Playing
            bird.flap();
            break;
        case 2: // Game Over
            bird.reset();
            pipes.reset();
            score = 0;
            gameState = 0;
            break;
    }
}

// Listen for Clicks, Touches, and Spacebar
canvas.addEventListener("mousedown", handleInput);
canvas.addEventListener("touchstart", handleInput, {passive: false});
document.addEventListener("keydown", function(e) {
    if(e.code === "Space" || e.code === "ArrowUp") handleInput(e);
});

// --- GAME LOOP ---
function loop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update logic
    bird.update();
    pipes.update();
    
    // Draw elements
    pipes.draw();
    bird.draw();
    drawUI();
    
    frames++;
    requestAnimationFrame(loop);
}

// Start the loop
loop();
