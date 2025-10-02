// === GAME LOGIC ===

// 1. GAME STATE
const state = {
    gold: 200,
    hp: 500, // Increased HP
    maxHp: 500, // New: Store max HP for the bar
    playerXp: 0, // New: Player XP
    playerLevel: 1, // New: Player Level
    wave: 1,
    waveDifficulty: 1,
    units: [],
    enemies: [],
    projectiles: [],
    placing: null,
    ghost: null,
    lastTime: 0,
    terrain: null,
    spawning: false,
    currentWaveActive: false, // Renamed from currentWaveActive for clarity
    waveDuration: 0, // New: Total duration for the current wave
    waveTimer: 0,    // New: Timer for tracking wave progress
    backgroundCache: null,
    isGameOver: false,
    animationFrameId: null,
};

// A cache for pre-rendered sprites
const spriteCache = {};