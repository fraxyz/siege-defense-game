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
    const waveSize = 20;
    const spawnInterval = 1000;
    const enemyDef = ENEMY_DEFS.grunt;
    const enemyRadius = enemyDef.size / 2;
    const spawnableWidth = LOGICAL_WIDTH - (enemyRadius * 2);
    const startY = enemyRadius; 
    
    state.currentWaveActive = true; 
    
    for (let i = 0; i < waveSize; i++) {
        setTimeout(() => {
            const startX = (Math.random() * spawnableWidth) + enemyRadius;
            state.enemies.push(new Enemy(startX, startY, enemyDef));
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
    
    let defeatedEnemiesGold = 0;
    const survivingEnemies = [];
    for (const enemy of state.enemies) {
        if (enemy.hp > 0) {
            survivingEnemies.push(enemy);
        } else {
            defeatedEnemiesGold += enemy.def.goldValue;
        }
    }
    state.enemies = survivingEnemies;
    
    if (defeatedEnemiesGold > 0) {
        state.gold += defeatedEnemiesGold;
        document.getElementById('gold-badge').textContent = `💰 ${state.gold}`;
    }
    
    if (state.currentWaveActive && !state.spawning && state.enemies.length === 0 && state.lastTime !== 0) {
        const goldReward = state.wave * 100;
        state.gold += goldReward;
        state.wave += 1;
        state.currentWaveActive = false; 
        
        document.getElementById('gold-badge').textContent = `💰 ${state.gold}`;
        document.getElementById('wave-badge').textContent = `🌊 ${state.wave}`;
        
        const startWaveBtn = document.getElementById('start-wave-btn');
        startWaveBtn.disabled = false;
        startWaveBtn.textContent = `Start Wave ${state.wave} ▶`;
    }
    
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
        
        const def = UNIT_DEFS[state.placing];
        if (def && def.range) {
            ctx.beginPath();
            ctx.arc(state.ghost.x, state.ghost.y, def.range, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.setLineDash([6, 6]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
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
