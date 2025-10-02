function setUIDisabled(disabled) {
    // Disable all buttons in controls, HUD, and unit selection
    document.querySelectorAll('.controls button, .hud button, .unit-button').forEach(btn => {
        btn.disabled = disabled;
        if (disabled) {
            btn.classList.add('disabled');
        } else {
            btn.classList.remove('disabled');
        }
    });
    // Optionally, add a class to the game container to block pointer events
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        if (disabled) {
            gameContainer.classList.add('ui-disabled');
        } else {
            gameContainer.classList.remove('ui-disabled');
        }
    }
}

// Dynamically create and show the game over popup
function showGameOverPopup() {
    // Prevent duplicate popups
    if (document.getElementById('game-over-popup')) return;
    const popup = document.createElement('div');
    popup.className = 'popup show';
    popup.id = 'game-over-popup';
    popup.innerHTML = `
      <div class="popup-content">
        <h2>Game Over</h2>
        <p>Your castle has fallen!</p>
        <button class="action-button primary restart-button" id="restart-btn">Restart Game</button>
      </div>
    `;
    document.getElementById('game-container').appendChild(popup);
    document.getElementById('restart-btn').addEventListener('click', () => {
        popup.remove();
        restartGame();
    });
}
// 6. EVENT LISTENERS
const startWaveBtn = document.getElementById('start-wave-btn');
const placeUnitBtn = document.getElementById('place-unit-btn');
const placeUnitPopup = document.getElementById('place-unit-popup');
const selectedUnitIcon = document.getElementById('selected-unit-icon');

function handleStartWave(e) {
    e.preventDefault();
    startWave();
    startWaveBtn.disabled = true;
}

function openPlaceUnitPopup() {
    placeUnitPopup.classList.add('show');
}

function closePlaceUnitPopup() {
    placeUnitPopup.classList.remove('show');
}

function handlePlaceUnit(unitType) {
    if (unitType) {
        state.placing = unitType;
        const unitDef = UNIT_DEFS[unitType];
        if (unitDef && unitDef.spriteUrl) {
            selectedUnitIcon.style.backgroundImage = `url(${unitDef.spriteUrl})`;
        }
    }
    closePlaceUnitPopup();
}

function clearSelectedUnit() {
    state.placing = null;
    selectedUnitIcon.style.backgroundImage = 'none';
}

function restartGame() {

    // Re-enable UI controls
    if (typeof setUIDisabled === 'function') setUIDisabled(false);

    // Reset game state
    state.gold = 200;
    state.hp = 500;
    state.maxHp = 500;
    state.playerXp = 0;
    state.playerLevel = 1;
    state.wave = 1;
    state.waveDifficulty = 1;
    state.units = [];
    state.enemies = [];
    state.projectiles = [];
    state.placing = null;
    state.ghost = null;
    state.lastTime = 0;
    state.spawning = false;
    state.currentWaveActive = false;
    state.waveDuration = 0;
    state.waveTimer = 0;
    state.isGameOver = false;

    // Reset UI
    document.getElementById('gold-badge').textContent = `💰 ${state.gold}`;
    document.getElementById('xp-badge').textContent = `✨ ${state.playerXp} XP`;
    document.getElementById('level-badge').textContent = `⭐ Lvl ${state.playerLevel}`;
    const castleHpBar = document.getElementById('castle-hp-bar');
    if (castleHpBar) castleHpBar.style.width = '100%';
    const waveProgressBar = document.getElementById('wave-progress-bar');
    if (waveProgressBar) {
        waveProgressBar.style.width = '0%';
        waveProgressBar.style.display = 'none';
    }
    const waveNumberOverlay = document.getElementById('wave-number-overlay');
    if (waveNumberOverlay) waveNumberOverlay.textContent = `🌊 ${state.wave}`;

    // Re-initialize terrain and background
    state.terrain = new Terrain('grasslands');
    state.backgroundCache = state.terrain.preRender();

    // Restart the game loop
    window.cancelAnimationFrame(state.animationFrameId);
    handleResize();
    requestAnimationFrame(loop);
}

startWaveBtn.addEventListener('click', handleStartWave);
placeUnitBtn.addEventListener('click', openPlaceUnitPopup);

placeUnitPopup.addEventListener('click', (e) => {
    if (e.target === placeUnitPopup) {
        closePlaceUnitPopup();
    }
});

document.querySelectorAll('.unit-button').forEach(button => {
    button.addEventListener('click', (e) => handlePlaceUnit(e.currentTarget.dataset.unit));
});

document.addEventListener('click', (e) => {
    if (e.target.closest('.controls') || e.target.closest('.hud')) {
        if (!e.target.closest('#place-unit-btn') && !e.target.closest('.unit-button') && !e.target.closest('#selected-unit-icon')) {
            clearSelectedUnit();
        }
    }
});

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

const handlePointerMove = (e) => {
    if (!state.placing || state.isGameOver) return;
    state.ghost = getSnappedPlacement(getPointerPos(e).x, getPointerPos(e).y);
};

const handlePointerDown = (e) => {
    if (!state.placing || state.isGameOver) return;
    state.ghost = getSnappedPlacement(getPointerPos(e).x, getPointerPos(e).y);
};

canvas.addEventListener('pointerdown', handlePointerDown);
canvas.addEventListener('touchstart', handlePointerDown);
canvas.addEventListener('pointermove', throttle(handlePointerMove, 16));
canvas.addEventListener('touchmove', throttle(handlePointerMove, 16));

canvas.addEventListener('pointerleave', () => {
    state.ghost = null;
});

const handlePointerUp = (e) => {
    if (state.isGameOver) return;
    const unitType = state.placing;
    if (!unitType) return;
    const unitDef = UNIT_DEFS[unitType];
    
    if (!state.ghost || !state.ghost.valid || state.gold < unitDef.cost) {
      return;
    }
    
    const newUnit = createUnit(unitType, state.ghost.x, state.ghost.y);
    if (newUnit) { 
        state.units.push(newUnit); 
        state.gold -= unitDef.cost;
        document.getElementById('gold-badge').textContent = `💰 ${state.gold}`;
    }
    state.ghost = null;
};

canvas.addEventListener('pointerup', handlePointerUp);
canvas.addEventListener('touchend', handlePointerUp);

selectedUnitIcon.addEventListener('click', clearSelectedUnit);

// === INITIALIZATION ===
function init() {
    setUIDisabled(false); // Ensure UI is enabled on game start
    // Initial display of HUD elements
    document.getElementById('gold-badge').textContent = `💰 ${state.gold}`;
    document.getElementById('xp-badge').textContent = `✨ ${state.playerXp} XP`; // New XP badge
    document.getElementById('level-badge').textContent = `⭐ Lvl ${state.playerLevel}`; // New Level badge
    
    // Initialize castle HP bar
    const castleHpBar = document.getElementById('castle-hp-bar');
    if (castleHpBar) {
        castleHpBar.style.width = '100%';
    }
    
    // Initialize wave progress bar
    const waveProgressBar = document.getElementById('wave-progress-bar');
    if (waveProgressBar) {
        waveProgressBar.style.width = '0%'; // Start empty
        waveProgressBar.style.display = 'none'; // Hidden until wave starts
    }
    const waveNumberOverlay = document.getElementById('wave-number-overlay');
    if (waveNumberOverlay) {
        waveNumberOverlay.textContent = `🌊 ${state.wave}`;
    }


    // MODIFIED: Call the new manager function
    preRenderAllSprites().then(() => {
        document.querySelectorAll('.unit-button').forEach(button => {
            const unitType = button.dataset.unit;
            const unitDef = UNIT_DEFS[unitType];
            if (unitDef && unitDef.spriteUrl) {
                button.style.backgroundImage = `url(${unitDef.spriteUrl})`;
            }
        });
    });

    state.terrain = new Terrain('grasslands');
    state.backgroundCache = state.terrain.preRender();
    window.addEventListener('resize', handleResize);
    handleResize();
    requestAnimationFrame(loop);
}

init();
