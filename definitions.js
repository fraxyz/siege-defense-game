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
      fireRate: 0.6,
      projectile: {
          damage: 15,
          speed: 250,
          size: 12,
          color: '#4b5563',
          type: 'Arrow'
      }
    },
};

const ENEMY_DEFS = {
    grunt: {
        name: 'Grunt',
        hp: 50,
        speed: 50,
        size: 40, // Collision/logic size.
        damage: 5,
        attackRate: 0.5,
        goldValue: 10,
        spriteUrl: './grunt.svg',
        // --- MODIFIED LINES ---
        spriteWidth: 500,  // Updated to match new SVG's viewBox width
        spriteHeight: 500, // Updated to match new SVG's viewBox height
    },
};

// This function loads the SVG image and pre-renders it.
// It returns a Promise that resolves when the image is loaded and drawn.
function preRenderGrunt() {
    return new Promise((resolve, reject) => {
        const def = ENEMY_DEFS.grunt;
        const img = new Image();
        img.src = def.spriteUrl;

        img.onload = () => {
            const offscreenCanvas = document.createElement('canvas');

            const aspectRatio = def.spriteWidth / def.spriteHeight;
            const renderHeight = 90;
            const renderWidth = renderHeight * aspectRatio;

            offscreenCanvas.width = renderWidth;
            offscreenCanvas.height = renderHeight;
            const ctx = offscreenCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0, renderWidth, renderHeight);

            spriteCache.grunt = offscreenCanvas;
            console.log('Grunt SVG sprite pre-rendered.');
            resolve();
        };

        img.onerror = (err) => {
            console.error(`Failed to load sprite: ${def.spriteUrl}`);
            reject(err);
        };
    });
}


// A manager function to handle all sprite pre-rendering
// It now returns a Promise that resolves when all sprites are loaded.
function preRenderAllSprites() {
    const promises = [
        preRenderGrunt()
        // When we add new enemies, we'll add their pre-render promises here.
    ];
    return Promise.all(promises);
}