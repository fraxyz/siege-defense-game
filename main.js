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
    const unitType = state.placing;
    if (!unitType) return;
    const unitDef = UNIT_DEFS[unitType];
    
    if (!state.ghost || !state.ghost.valid || state.gold < unitDef.cost) {
      state.placing = null; state.ghost = null; return;
    }
    
    const newUnit = createUnit(unitType, state.ghost.x, state.ghost.y);
    if (newUnit) { 
        state.units.push(newUnit); 
        state.gold -= unitDef.cost;
        document.getElementById('gold-badge').textContent = `💰 ${state.gold}`;
    }

    state.placing = null; state.ghost = null;
});

// === INITIALIZATION ===
function init() {
    state.currentWaveActive = false; 
    
    document.getElementById('gold-badge').textContent = `💰 ${state.gold}`;
    document.getElementById('hp-badge').textContent = `❤️ ${state.hp}`;
    document.getElementById('wave-badge').textContent = `🌊 ${state.wave}`;
    
    // MODIFIED: Call the new manager function
    preRenderAllSprites();

    state.terrain = new Terrain('grasslands');
    state.backgroundCache = state.terrain.preRender();
    window.addEventListener('resize', handleResize);
    handleResize();
    requestAnimationFrame(loop);
}

init();
