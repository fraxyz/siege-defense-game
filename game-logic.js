// 4. PLACEMENT & WAVE LOGIC
function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    const physicalX = clientX - rect.left;
    const physicalY = clientY - rect.top;
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
    if (state.spawning) return; // Prevent starting if a wave is already spawning
    
    state.spawning = true;
    state.currentWaveActive = true; // Mark wave as active
    state.waveTimer = 0; // Reset wave timer
    
    const baseWaveDuration = 30; // Base duration in seconds for wave 1
    // Scale wave duration based on wave number, e.g., slightly longer for higher waves
    state.waveDuration = baseWaveDuration + (state.wave - 1) * 5; 

    const enemiesToSpawn = (10 + state.wave * 2) * state.waveDifficulty;
    const spawnInterval = state.waveDuration / (enemiesToSpawn * state.waveDifficulty);
    
    const enemyDef = ENEMY_DEFS.grunt;
    const enemyRadius = enemyDef.size / 2;
    const spawnableWidth = LOGICAL_WIDTH - (enemyRadius * 2);
    const startY = enemyRadius; 
    
    // Clear existing enemies at the start of a new wave if any somehow survived
    state.enemies = []; 
    
    for (let i = 0; i < enemiesToSpawn; i++) {
        setTimeout(() => {
            // Only spawn if the wave is still active and game is not over
            if (state.currentWaveActive && !state.isGameOver) {
                const startX = (Math.random() * spawnableWidth) + enemyRadius;
                state.enemies.push(new Enemy(startX, startY, enemyDef));
            }
            if (i === enemiesToSpawn - 1) {
                state.spawning = false; // All enemies scheduled to spawn
            }
        }, i * spawnInterval * 1000); // Convert to milliseconds
    }
}

// 5. MAIN GAME LOOP
function update(dt) {
    if (state.isGameOver) {
        cancelAnimationFrame(state.animationFrameId);
        return;
    }

    // Update wave timer if wave is active
    if (state.currentWaveActive) {
        state.waveTimer += dt;
        // Ensure waveTimer doesn't exceed duration
        state.waveTimer = Math.min(state.waveTimer, state.waveDuration);
    }

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
            // Potentially add XP here for player when implemented
        }
    }
    state.enemies = survivingEnemies;
    
    if (defeatedEnemiesGold > 0) {
        state.gold += defeatedEnemiesGold;
        document.getElementById('gold-badge').textContent = `💰 ${state.gold}`;
    }
    
    // Check wave completion based on duration OR all enemies defeated
    // Wave ends if duration is over OR all enemies are defeated AND spawning has finished
    const waveEndedByTime = state.currentWaveActive && state.waveTimer >= state.waveDuration;
    const allEnemiesDefeated = state.currentWaveActive && !state.spawning && state.enemies.length === 0;

    if (waveEndedByTime || allEnemiesDefeated) {
        const goldReward = state.wave * 100;
        state.gold += goldReward;
        state.wave += 1;
        state.currentWaveActive = false; 
        state.spawning = false; // Reset spawning state
        state.waveTimer = 0; // Reset timer for next wave

        document.getElementById('gold-badge').textContent = `💰 ${state.gold}`;
        // Wave number is now in the overlay, updated in draw()
        
        const startWaveBtn = document.getElementById('start-wave-btn');
        startWaveBtn.disabled = false;
        startWaveBtn.textContent = '▶';
    }
    
    // Update Castle HP bar
    const castleHpBar = document.getElementById('castle-hp-bar');
    if (castleHpBar) {
        const hpPercentage = (state.hp / state.maxHp) * 100;
        castleHpBar.style.width = `${hpPercentage}%`;
    }

    // Update Wave Progress bar
    const waveProgressBar = document.getElementById('wave-progress-bar');
    if (waveProgressBar && state.currentWaveActive) {
        const progressPercentage = (state.waveTimer / state.waveDuration) * 100;
        waveProgressBar.style.width = `${progressPercentage}%`;
        // Hide if wave is not active
        waveProgressBar.style.display = 'block';
    } else if (waveProgressBar) {
        waveProgressBar.style.display = 'none'; // Hide when wave is not active
    }

    // Update Wave Number overlay
    const waveNumberOverlay = document.getElementById('wave-number-overlay');
    if (waveNumberOverlay) {
        waveNumberOverlay.textContent = `🌊 ${state.wave}`;
    }

    if (state.hp <= 0) {
        state.isGameOver = true;
        if (typeof setUIDisabled === 'function') setUIDisabled(true);
        if (typeof showGameOverPopup === 'function') showGameOverPopup();
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
        const sprite = spriteCache[state.placing];
        if (sprite) {
            const drawX = state.ghost.x - sprite.width / 2;
            const drawY = state.ghost.y - sprite.height / 2;
            ctx.drawImage(sprite, drawX, drawY);
        } else {
            const tempUnit = createUnit(state.placing, state.ghost.x, state.ghost.y);
            if(tempUnit) tempUnit.draw(ctx);
        }
        ctx.globalAlpha = 1.0;
        // Draw placement and range circles in screen coordinates to avoid ellipse distortion
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset to identity
        // Convert logical coordinates to screen coordinates
        const scaleX = canvas.width / LOGICAL_WIDTH;
        const scaleY = canvas.height / LOGICAL_HEIGHT;
        const ghostScreenX = state.ghost.x * scaleX;
        const ghostScreenY = state.ghost.y * scaleY;
        // Placement circle
        ctx.beginPath();
        ctx.arc(ghostScreenX, ghostScreenY, 18 * scaleX, 0, Math.PI * 2);
        ctx.strokeStyle = state.ghost.valid ? 'white' : 'red';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Range circle
        const def = UNIT_DEFS[state.placing];
        if (def && def.range) {
            ctx.beginPath();
            ctx.arc(ghostScreenX, ghostScreenY, def.range * scaleX, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.setLineDash([6, 6]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.restore();
	}
}


function loop(timestamp) {
  if (!state.lastTime) { state.lastTime = timestamp; }
  const dt = (timestamp - state.lastTime) / 1000;
  state.lastTime = timestamp;
  update(dt);
  draw();
  state.animationFrameId = requestAnimationFrame(loop);
}