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

class Combatant extends Entity {
    constructor(x, y, maxHp) {
        super(x, y);
        this.maxHp = maxHp;
        this.hp = maxHp;
        this.xp = 0;
        this.xpToNextLevel = 100;
    }

    drawStatusBar(ctx, current, max, color, yOffset) {
        if (current <= 0 && max > 0 && color !== '#3b82f6') {
            return;
        }

        const BAR_WIDTH = 30; 
        const BAR_HEIGHT = 4;
        const x = this.x - (BAR_WIDTH / 2);
        const y = this.y + yOffset;
        
        if (color === '#3b82f6') {
            ctx.fillStyle = '#000000';
        } else {
            ctx.fillStyle = '#000000A0';
        }
        ctx.fillRect(x, y, BAR_WIDTH, BAR_HEIGHT);

        const currentWidth = (current / max) * BAR_WIDTH;
        
        if (color === '#3b82f6') {
            ctx.fillStyle = '#cccccc';
        } else {
            ctx.fillStyle = color;
        }
        
        ctx.fillRect(x, y, currentWidth, BAR_HEIGHT);

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, BAR_WIDTH, BAR_HEIGHT);
    }
}

class Projectile extends Entity {
    constructor(owner, target, def) {
        super(owner.x, owner.y);
        this.ownerId = owner.id;
        this.def = def;
        this.isAlive = true;
        this.startX = owner.x;
        this.startY = owner.y;
        this.maxRangeSq = owner.def.range * owner.def.range;
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        this.vx = Math.cos(angle) * this.def.speed;
        this.vy = Math.sin(angle) * this.def.speed;
        this.angle = angle;
    }

    update(dt, state) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        for (const enemy of state.enemies) {
            if (Math.hypot(this.x - enemy.x, this.y - enemy.y) < (this.def.size + enemy.def.size / 2)) {
                enemy.hp -= this.def.damage;
                this.isAlive = false;
                return;
            }
        }
        
        const distanceTraveledSq = (this.x - this.startX)**2 + (this.y - this.startY)**2;
        if (distanceTraveledSq >= this.maxRangeSq) {
            this.isAlive = false;
            return;
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

class Arrow extends Projectile {
    constructor(owner, target, def) {
        super(owner, target, def);
    }
    
    draw(ctx) {
        ctx.fillStyle = this.def.color;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        const size = this.def.size; 
        const halfWidth = size / 2.5; 
        ctx.beginPath();
        ctx.moveTo(size, 0); 
        ctx.lineTo(0, -halfWidth); 
        ctx.lineTo(0, halfWidth);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

class Enemy extends Combatant {
    constructor(x, y, def) {
        super(x, y, def.hp); 
        this.def = def;
        this.animationTimer = Math.random() * 10;
        this.attackCooldown = 0;
    }

    update(dt, state) {
        this.animationTimer += dt;
        const wallY = state.terrain.style.wallPosition;

        if (this.y >= wallY) {
            this.y = wallY;
            this.attackCooldown = Math.max(0, this.attackCooldown - dt);
            if (this.attackCooldown === 0) {
                state.hp = Math.max(0, state.hp - this.def.damage);
                document.getElementById('hp-badge').textContent = `❤️ ${state.hp}`;
                this.attackCooldown = 1 / this.def.attackRate;
            }
            return; 
        }
        
        this.y = Math.min(this.y + this.def.speed * dt, wallY);
    }

    draw(ctx) {
        // --- MODIFIED: Use a DYNAMIC key to find the correct sprite ---
        const spriteKey = this.def.name.toLowerCase();
        const sprite = spriteCache[spriteKey];

        // If a pre-rendered sprite exists for this enemy type, draw it.
        if (sprite) {
            const bobSpeed = 10;
            const bobAmount = 2;
            const bobOffset = Math.sin(this.animationTimer * bobSpeed) * bobAmount;

            const drawX = this.x - sprite.width / 2;
            const drawY = this.y - sprite.height / 2 + bobOffset;

            ctx.drawImage(sprite, drawX, drawY);
        } else {
            // Fallback for any enemy that hasn't been pre-rendered.
            // In a real game, you would have the manual drawing logic here.
            // For now, we'll just draw a placeholder so it's not invisible.
            ctx.fillStyle = 'magenta';
            ctx.fillRect(this.x - this.def.size / 2, this.y - this.def.size / 2, this.def.size, this.def.size);
            console.warn(`Sprite not found for: ${spriteKey}. Drawing placeholder.`);
        }
        // -----------------------------------------------------------------
		
		// Draw the enemy health bar (this remains unchanged)
		this.drawStatusBar(ctx, this.hp, this.maxHp, '#ef4444', -this.def.size * 0.8);
    }
}

class Unit extends Combatant {
    constructor(x, y, def) { 
        super(x, y, 100);
        this.def = def; 
    }
	
    update(dt, state) { /* default update for units */ }
    draw(ctx) { /* implemented by subclasses */ }
	
	drawStatusBars(ctx, unitScale) {
        const scale = unitScale || 1.5; 
        const unitHeight = 40 * scale; 
        
        const hpBarYOffset = -unitHeight * 0.8;
        this.drawStatusBar(ctx, this.hp, this.maxHp, '#34d399', hpBarYOffset);

        const xpBarYOffset = hpBarYOffset + 4 + 1; 
        this.drawStatusBar(ctx, this.xp, this.xpToNextLevel, '#3b82f6', xpBarYOffset); 
    }
}


class Archer extends Unit {
    constructor(x, y, def) {
        super(x, y, def);
        this.fireCooldown = 1 / this.def.fireRate;
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
                state.projectiles.push(new Arrow(this, nearestEnemy, this.def.projectile));
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
        
		this.drawStatusBars(ctx, scale);
    }
}

function createUnit(type, x, y) {
    if (type === 'archer') return new Archer(x, y, UNIT_DEFS[type]);
    return null;
}
