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

// === GAME LOGIC ===

// 1. GAME STATE
const state = {
    gold: 200,
    hp: 500, // Increased HP
    wave: 1,
    units: [],
    enemies: [],
    projectiles: [],
    placing: null,
    ghost: null,
    lastTime: 0,
    terrain: null,
    spawning: false,
    backgroundCache: null,
    isGameOver: false,
};

// 2. DEFINITIONS
class Decoration {
    constructor({ x, y }) { this.x = x; this.y = y; }
    draw(ctx) { /* implemented by subclasses */ }
}

class Tree extends Decoration {
    constructor({ x, y, size = 1 }) {
        super({ x, y });
        this.size = size;
        this.leafColor = `rgb(${20 + Math.random() * 15}, ${60 + Math.random() * 30}, ${30 + Math.random() * 15})`;
        this.trunkHeight = 40 * this.size * (0.9 + Math.random() * 0.2);
        this.leafRadius = 25 * this.size * (0.9 + Math.random() * 0.2);
    }

    draw(ctx) {
        ctx.fillStyle = '#5c4033';
        ctx.fillRect(this.x - (5 * this.size), this.y, 10 * this.size, this.trunkHeight);
        ctx.fillStyle = this.leafColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y - (10 * this.size), this.leafRadius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Bush extends Decoration {
    draw(ctx) {
        ctx.fillStyle = '#2d5939';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
        ctx.arc(this.x + 10, this.y + 5, 12, 0, Math.PI * 2);
        ctx.arc(this.x - 10, this.y + 5, 12, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Stone extends Decoration {
    constructor({x, y}) {
        super({x, y});
        this.size = 8 + Math.random() * 8;
    }
    draw(ctx) {
        ctx.fillStyle = '#7b7e87';
        ctx.strokeStyle = '#52525b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
}

class Road extends Decoration {
    constructor({ path, width, color }) {
        super({});
        this.path = path;
        this.width = width;
        this.color = color;
    }

    draw(ctx) {
        if (this.path && this.path.length > 1) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.path[0].x, this.path[0].y);
            for (let i = 1; i < this.path.length - 1; i++) {
                const xc = (this.path[i].x + this.path[i + 1].x) / 2;
                const yc = (this.path[i].y + this.path[i + 1].y) / 2;
                ctx.quadraticCurveTo(this.path[i].x, this.path[i].y, xc, yc);
            }
            ctx.lineTo(this.path[this.path.length - 1].x, this.path[this.path.length - 1].y);
            ctx.stroke();
        }
    }
}

const TERRAIN_DEFS = {
    grasslands: {
        name: 'Grasslands',
        skyColor: '#8ca8c0',
        battlefieldColor: '#416d4d',
        wallColor: '#334155',
        wallTopColor: '#475569',
        wallPosition: LOGICAL_HEIGHT * 0.85,
        wallThickness: 15,
        decorations: [
            new Road({
                path: [
                    { x: LOGICAL_WIDTH * 0.5, y: 0 },
                    { x: LOGICAL_WIDTH * 0.4, y: 300 },
                    { x: LOGICAL_WIDTH * 0.6, y: 600 },
                    { x: LOGICAL_WIDTH * 0.5, y: LOGICAL_HEIGHT * 0.85 }
                ],
                width: 70, color: '#7d6c62'
            }),
            new Tree({ x: 50, y: 200, size: 1.2 }),
            new Tree({ x: 400, y: 350, size: 1 }),
            new Tree({ x: 100, y: 600, size: 0.8 }),
            new Bush({ x: 150, y: 450 }),
            new Bush({ x: 350, y: 700 }),
            new Stone({ x: 80, y: 800 }),
            new Stone({ x: 380, y: 100 }),
            new Stone({ x: 350, y: 500 }),
        ]
    }
};

const UNIT_DEFS = {
  archer: { 
      name:'Archer', 
      cost: 50,
      range: 250,
      fireRate: 0.8,
      projectile: { damage: 15, speed: 500, size: 4, color: '#fef08a' }
    },
};

const ENEMY_DEFS = {
    grunt: { name: 'Grunt', hp: 50, speed: 50, color: '#166534', bodyColor: '#14532d', size: 30, damage: 5, attackRate: 0.5 },
};

// 3. GAME ENTITY CLASSES
class Terrain {
    constructor(styleName) {
        this.style = TERRAIN_DEFS[styleName];
    }
    preRender() {
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = LOGICAL_WIDTH;
        offscreenCanvas.height = LOGICAL_HEIGHT;
        const offscreenCtx = offscreenCanvas.getContext('2d');
        this.draw(offscreenCtx);
        return offscreenCanvas;
    }
    draw(ctx) {
        ctx.fillStyle = this.style.skyColor;
        ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
        ctx.fillStyle = this.style.battlefieldColor;
        ctx.fillRect(0, 0, LOGICAL_WIDTH, this.style.wallPosition);
        for (const deco of this.style.decorations) {
            deco.draw(ctx);
        }
        ctx.fillStyle = this.style.wallTopColor;
        ctx.fillRect(0, this.style.wallPosition, LOGICAL_WIDTH, LOGICAL_HEIGHT - this.style.wallPosition);
        ctx.fillStyle = this.style.wallColor;
        ctx.fillRect(0, this.style.wallPosition, LOGICAL_WIDTH, this.style.wallThickness);
    }
}

class Entity {
    static nextId = 1;
    constructor(x, y) {
        this.id = Entity.nextId++;
        this.x = x; this.y = y;
    }
}

class Projectile extends Entity {
    constructor(owner, target, def) {
        super(owner.x, owner.y);
        this.ownerId = owner.id;
        this.def = def;
        this.isAlive = true;

        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        this.vx = Math.cos(angle) * this.def.speed;
        this.vy = Math.sin(angle) * this.def.speed;
    }

    update(dt, state) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        for (const enemy of state.enemies) {
            const distance = Math.hypot(this.x - enemy.x, this.y - enemy.y);
            if (distance < (this.def.size + enemy.def.size / 2)) {
                enemy.hp -= this.def.damage;
                this.isAlive = false;
                return;
            }
        }
        
        if (this.x < 0 || this.x > LOGICAL_WIDTH || this.y < 0 || this.y > LOGICAL_HEIGHT) {
            this.isAlive = false;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.def.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.def.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Enemy extends Entity {
    constructor(x, y, def) {
        super(x, y);
        this.def = def;
        this.hp = def.hp;
        this.animationTimer = Math.random() * 10;
        this.attackCooldown = 0;
    }

    update(dt, state) {
        this.animationTimer += dt;
        const wallY = state.terrain.style.wallPosition;

        if (this.y >= wallY) {
            this.y = wallY;
            // Attack Logic
            this.attackCooldown = Math.max(0, this.attackCooldown - dt);
            if (this.attackCooldown === 0) {
                state.hp = Math.max(0, state.hp - this.def.damage);
                document.getElementById('hp-badge').textContent = `❤️ ${state.hp}`;
                this.attackCooldown = 1 / this.def.attackRate;
            }
            return; 
        }
        
        const nextY = this.y + this.def.speed * dt;
        this.y = Math.min(nextY, wallY);
    }
    draw(ctx) {
        const width = this.def.size;
        const height = this.def.size * 1.2;
        const x = this.x;
        const y = this.y;
        const radius = width / 2;
        const bobSpeed = 10;
        const bobAmount = 2;
        const bobOffset = Math.sin(this.animationTimer * bobSpeed) * bobAmount;
        const drawY = y + bobOffset;
        const rectHeight = height - radius;
        const arcCenterY = drawY - (height / 2) + radius;
        const rectBottomY = drawY + (height / 2);
        ctx.fillStyle = this.def.color;
        ctx.strokeStyle = this.def.bodyColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, arcCenterY, radius, Math.PI, 0);
        ctx.lineTo(x + radius, rectBottomY);
        ctx.lineTo(x - radius, rectBottomY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        const eyeRadius = 2;
        const eyeOffsetX = radius * 0.4;
        const eyeOffsetY = arcCenterY;
        const eyeMoveSpeed = 2;
        const eyeMoveAmount = 1;
        const eyeHorizontalOffset = Math.sin(this.animationTimer * eyeMoveSpeed) * eyeMoveAmount;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x - eyeOffsetX + eyeHorizontalOffset, eyeOffsetY, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + eyeOffsetX + eyeHorizontalOffset, eyeOffsetY, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Unit extends Entity {
    constructor(x, y, def) { super(x, y); this.def = def; }
    update(dt, state) { /* default update for units */ }
    draw(ctx) { /* implemented by subclasses */ }
}
class Archer extends Unit {
    constructor(x, y, def) {
        super(x, y, def);
        this.fireCooldown = 1 / this.def.fireRate; // Initial cooldown
    }
    
    update(dt, state) {
        this.fireCooldown = Math.max(0, this.fireCooldown - dt);

        if (this.fireCooldown === 0 && state.enemies.length > 0) {
            let nearestEnemy = null;
            let minDistanceSq = this.def.range * this.def.range;

            for (const enemy of state.enemies) {
                const distanceSq = (this.x - enemy.x)**2 + (this.y - enemy.y)**2;
                if (distanceSq < minDistanceSq) {
                    minDistanceSq = distanceSq;
                    nearestEnemy = enemy;
                }
            }

            if (nearestEnemy) {
                state.projectiles.push(new Projectile(this, nearestEnemy, this.def.projectile));
                this.fireCooldown = 1 / this.def.fireRate;
            }
        }
    }

    draw(ctx) {
        const baseX = this.x; const baseY = this.y; const scale = 1.5; 
        const faceRadius = 8 * scale; const faceY = baseY - faceRadius - (2 * scale);
        ctx.fillStyle = '#f59e0b'; ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2 * scale;
        ctx.beginPath(); ctx.arc(baseX, faceY, faceRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        const hatTipX = baseX + (2 * scale); const hatTipY = faceY - (22 * scale);
        const hatBaseY = faceY - (faceRadius / 2); const hatLeftX = baseX - (14 * scale);
        const hatRightX = baseX + (10 * scale);
        ctx.fillStyle = '#166534'; ctx.strokeStyle = '#14532d'; ctx.lineWidth = 2 * scale;
        ctx.beginPath(); ctx.moveTo(hatTipX, hatTipY); ctx.lineTo(hatRightX, hatBaseY);
        ctx.lineTo(hatLeftX, hatBaseY); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5 * scale; ctx.beginPath();
        const featherStartX = hatLeftX + (4 * scale); const featherStartY = hatBaseY - (1 * scale);
        ctx.moveTo(featherStartX, featherStartY); ctx.lineTo(featherStartX - (5 * scale), featherStartY - (10 * scale)); ctx.stroke();
    }
}

function createUnit(type, x, y) {
    if (type === 'archer') return new Archer(x, y, UNIT_DEFS[type]);
    return null;
}

// 4. PLACEMENT & WAVE LOGIC
function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const physicalX = e.clientX - rect.left; const physicalY = e.clientY - rect.top;
    const logicalX = (physicalX / rect.width) * LOGICAL_WIDTH;
    const logicalY = (physicalY / rect.height) * LOGICAL_HEIGHT;
    return { x: logicalX, y: logicalY };
}

function getSnappedPlacement(x, y) {
    const wallPosition = state.terrain.style.wallPosition;
    const wallThickness = state.terrain.style.wallThickness;
    if (y < wallPosition + wallThickness) {
        return { x, y, valid: false };
    }
    const isOverlapping = state.units.some(u => Math.hypot(x - u.x, y - u.y) < 30);
    return { x, y, valid: !isOverlapping };
}

function startWave() {
    if (state.spawning) return;
    state.spawning = true;
    const waveSize = 5;
    const spawnInterval = 1000;
    const enemyDef = ENEMY_DEFS.grunt;
    const enemyRadius = enemyDef.size / 2;
    const spawnableWidth = LOGICAL_WIDTH - (enemyRadius * 2);
    const startY = enemyRadius; 
    for (let i = 0; i < waveSize; i++) {
        setTimeout(() => {
            const startX = (Math.random() * spawnableWidth) + enemyRadius;
            const newEnemy = new Enemy(startX, startY, enemyDef);
            state.enemies.push(newEnemy);
            if (i === waveSize - 1) {
                state.spawning = false;
            }
        }, i * spawnInterval);
    }
}

// 5. MAIN GAME LOOP
function update(dt) {
    if (state.isGameOver) return;

    state.units.forEach(u => u.update(dt, state));
    state.enemies.forEach(e => e.update(dt, state));
    state.projectiles.forEach(p => p.update(dt, state));

    state.projectiles = state.projectiles.filter(p => p.isAlive);
    state.enemies = state.enemies.filter(e => e.hp > 0);
    
    if (state.hp <= 0) {
        state.isGameOver = true;
        document.getElementById('game-over-overlay').classList.add('show');
    }
}

function draw() {
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    if (state.backgroundCache) {
        ctx.drawImage(state.backgroundCache, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    }
    
    for (const enemy of state.enemies) { enemy.draw(ctx); }
    for (const unit of state.units) { unit.draw(ctx); }
    for (const projectile of state.projectiles) { projectile.draw(ctx); }
    
    if (state.placing && state.ghost) {
        ctx.globalAlpha = 0.5;
        const tempUnit = createUnit(state.placing, state.ghost.x, state.ghost.y);
        if(tempUnit) tempUnit.draw(ctx);
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.arc(state.ghost.x, state.ghost.y, 18, 0, Math.PI * 2);
        ctx.strokeStyle = state.ghost.valid ? 'white' : 'red';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function loop(timestamp) {
  if (state.isGameOver) return;
  if (!state.lastTime) { state.lastTime = timestamp; }
  const dt = (timestamp - state.lastTime) / 1000;
  state.lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// 6. EVENT LISTENERS
document.getElementById('build-unit-btn').addEventListener('click', () => {
    state.placing = 'archer';
});
const startWaveBtn = document.getElementById('start-wave-btn');
startWaveBtn.addEventListener('click', () => {
    startWave();
    startWaveBtn.disabled = true; 
    startWaveBtn.textContent = 'Wave in Progress...';
});
canvas.addEventListener('pointermove', (e) => {
    if (!state.placing) return;
    state.ghost = getSnappedPlacement(getPointerPos(e).x, getPointerPos(e).y);
});
canvas.addEventListener('pointerleave', () => {
    state.ghost = null;
});
canvas.addEventListener('click', (e) => {
    if (!state.placing || !state.ghost || !state.ghost.valid) {
      state.placing = null; state.ghost = null; return;
    }
    const newUnit = createUnit(state.placing, state.ghost.x, state.ghost.y);
    if (newUnit) { state.units.push(newUnit); }
});

// === INITIALIZATION ===
function init() {
    document.getElementById('hp-badge').textContent = `❤️ ${state.hp}`;
    state.terrain = new Terrain('grasslands');
    state.backgroundCache = state.terrain.preRender();
    window.addEventListener('resize', handleResize);
    handleResize();
    requestAnimationFrame(loop);
}

init();
