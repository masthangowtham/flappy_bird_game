const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const menuOverlay = document.getElementById("menuOverlay");
const friendGrid = document.getElementById("friendGrid");

// --- RESPONSIVE CANVAS LOGIC ---
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Set initial size

// --- GAME VARIABLES ---
let frames = 0; 
let score = 0; 
let bestScore = 0;
// State: -1 = Menu, 0 = Get Ready, 1 = Playing, 2 = Game Over
let gameState = -1; 

// --- FRIEND CONFIGURATION ---
// Update these names as you add photos to the F1-F10 folders
const friends = [
    { id: "F1", name: "Harish" },
    { id: "F2", name: "Dheeraj" },
    { id: "F3", name: "Friend 3" },
    { id: "F4", name: "Friend 4" },
    { id: "F5", name: "Friend 5" },
    { id: "F6", name: "Friend 6" },
    { id: "F7", name: "Friend 7" },
    { id: "F8", name: "Friend 8" },
    { id: "F9", name: "Friend 9" },
    { id: "F10", name: "Friend 10" }
];

// --- ASSETS ---
const birdImg = new Image();
const pipeTopImg = new Image(); pipeTopImg.src = "assets/images/pipe-top.png";
const pipeBottomImg = new Image(); pipeBottomImg.src = "assets/images/pipe-bottom.png";

const wingSound = new Audio();
const pointSound = new Audio();
const hitSound = new Audio();
const dieSound = new Audio();
const bgmSound = new Audio();
bgmSound.loop = true;
bgmSound.volume = 0.6;
wingSound.volume = 1;
pointSound.volume = 1;
hitSound.volume = 1;
dieSound.volume = 1;

// --- INITIALIZE MENU ---
function setupMenu() {
    friends.forEach(friend => {
        const btn = document.createElement("button");
        btn.className = "friend-btn";
        btn.innerText = friend.name;
        btn.onclick = () => selectFriend(friend.id);
        friendGrid.appendChild(btn);
    });
}

// --- DYNAMIC LOADING ---
function selectFriend(friendId) {
    birdImg.src = `assets/images/${friendId}/bird.png`;
    wingSound.src = `assets/sounds/${friendId}/wing.wav`;
    pointSound.src = `assets/sounds/${friendId}/point.wav`;
    hitSound.src = `assets/sounds/${friendId}/hit.wav`;
    dieSound.src = `assets/sounds/${friendId}/die.wav`;
    bgmSound.src = `assets/sounds/${friendId}/bgm.mp3`;

    menuOverlay.style.display = "none";
    canvas.style.display = "block";
    
    // Recalculate bird starting position based on screen
    bird.reset();
    pipes.reset();
    score = 0;
    gameState = 0; 
    
    if (frames === 0) loop(); 
}

// --- GAME OBJECTS ---
const bird = {
    x: 50, 
    y: 150, 
    width: 40,   // Perfect size for a transparent floating head
    height: 40, 
    velocity: 0, 
    gravity: 0.3, // Tuned for taller screens
    jump: -6.5,   // Tuned for taller screens
    
    draw: function() {
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
        wingSound.play().catch(() => {}); // Catch autoplay restrictions cleanly
    },
    
    reset: function() { 
        this.y = canvas.height / 2.5; // Start near the vertical middle
        this.velocity = 0; 
    }
};

const pipes = {
    position: [], 
    width: 60, 
    height: 800, // Make them extremely tall so they never cut off on big screens
    dx: 3,       // Speed
    
    draw: function() {
        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            let topYPos = p.y;
            let bottomYPos = p.y + this.height + p.gap;
            
            if (pipeTopImg.complete && pipeTopImg.naturalHeight !== 0) {
                ctx.drawImage(pipeTopImg, p.x, topYPos, this.width, this.height);
            } else { 
                ctx.fillStyle = "green"; 
                ctx.fillRect(p.x, topYPos, this.width, this.height); 
            }
            
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
        
        // Spawn interval based on screen width
        let spawnRate = canvas.width > 600 ? 120 : 90; 
        
        if (frames % spawnRate === 0) {
            // Dynamic gap: 25% of screen height + 50px buffer
            let dynamicGap = (canvas.height * 0.25) + 50;
            
            this.position.push({
                x: canvas.width,
                y: Math.random() * (canvas.height / 2) - (this.height - 50),
                gap: dynamicGap,
                passed: false
            });
        }
        
        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            p.x -= this.dx;
            
            let bottomPipeYPos = p.y + this.height + p.gap;
            let tolerance = Math.floor(bird.width * 0.15); 
            
            // Collision Detection
            if (bird.x + bird.width - tolerance > p.x && 
                bird.x + tolerance < p.x + this.width && 
                (bird.y + tolerance < p.y + this.height || 
                 bird.y + bird.height - tolerance > bottomPipeYPos)) {
                triggerGameOver();
            }
            
            // Score tracking
            if (p.x + this.width < bird.x && !p.passed) {
                score++;
                pointSound.play().catch(() => {});
                bestScore = Math.max(score, bestScore);
                p.passed = true;
            }
            
            // Remove off-screen pipes
            if (p.x + this.width <= 0) {
                this.position.shift(); 
                i--;
            }
        }
    },
    reset: function() { this.position = []; }
};

// --- CORE FUNCTIONS ---
function triggerGameOver() {
    if (gameState === 1) {
        bgmSound.pause();
        bgmSound.currentTime = 0;
        hitSound.play().catch(() => {});
        setTimeout(() => dieSound.play().catch(() => {}), 300);
    }
    gameState = 2;
}

function drawUI() {
    ctx.fillStyle = "white"; 
    ctx.strokeStyle = "black"; 
    ctx.lineWidth = 2;
    ctx.textAlign = "center";
    
    let centerX = canvas.width / 2;
    
    if (gameState === 0) {
        ctx.font = "30px Arial";
        ctx.fillText("Tap to Start", centerX, canvas.height / 2 + 50); 
        ctx.strokeText("Tap to Start", centerX, canvas.height / 2 + 50);
    } 
    
    if (gameState === 1 || gameState === 2) {
        ctx.font = "50px Arial";
        ctx.fillText(score, centerX, 80); 
        ctx.strokeText(score, centerX, 80);
    }
    
    if (gameState === 2) {
        ctx.font = "40px Arial";
        ctx.fillText("Game Over", centerX, canvas.height / 2 - 40); 
        ctx.strokeText("Game Over", centerX, canvas.height / 2 - 40);
        
        ctx.font = "25px Arial";
        ctx.fillText("Best: " + bestScore, centerX, canvas.height / 2 + 10); 
        ctx.strokeText("Best: " + bestScore, centerX, canvas.height / 2 + 10);
        
        ctx.font = "20px Arial";
        ctx.fillText("Tap top half to Restart", centerX, canvas.height / 2 + 60);
        
        ctx.fillStyle = "yellow";
        ctx.fillText("Tap bottom half for Menu", centerX, canvas.height / 2 + 100);
    }
}

// --- INPUT HANDLING ---
function handleInput(e) {
    if (e.type !== 'keydown') e.preventDefault();
    
    switch(gameState) {
        case 0: // Get Ready
            gameState = 1;
            bird.flap();
            bgmSound.play().catch(() => console.log("Audio blocked"));
            break;
        case 1: // Playing
            bird.flap(); break;
        case 2: // Game Over
            if (e.type === 'mousedown' || e.type === 'touchstart') {
                let rect = canvas.getBoundingClientRect();
                let clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
                let y = clientY - rect.top;
                
                // If they tap the bottom half of the screen, go to Menu
                if (y > canvas.height / 2 + 50) { 
                    gameState = -1;
                    canvas.style.display = "none";
                    menuOverlay.style.display = "flex";
                    return;
                }
            }
            // Standard restart
            bird.reset(); pipes.reset(); score = 0; gameState = 0; break;
    }
}

canvas.addEventListener("mousedown", handleInput);
canvas.addEventListener("touchstart", handleInput, {passive: false});
document.addEventListener("keydown", function(e) {
    if(e.code === "Space" || e.code === "ArrowUp") handleInput(e);
});

// --- MAIN LOOP ---
function loop() {
    if (gameState !== -1) { 
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        bird.update(); pipes.update();
        pipes.draw(); bird.draw(); drawUI();
    }
    frames++;
    requestAnimationFrame(loop);
}

// Start the app
setupMenu();
