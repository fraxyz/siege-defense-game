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

// A cache for pre-rendered sprites
const spriteCache = {};
