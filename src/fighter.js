// Fighter Character Class & Combat Physics Engine
class Fighter {
    constructor(config) {
        this.id = config.id; // 'p1' or 'p2'
        this.name = config.name; // 'BRAWLER GIRL' or 'ENEMY PUNK'
        this.charType = config.charType; // 'GIRL' or 'PUNK'
        this.isAI = config.isAI || false;

        // Position & Physics
        this.x = config.x || 200;
        this.y = config.y || 340;
        this.groundY = 340;
        this.vx = 0;
        this.vy = 0;
        this.gravity = 0.75;
        this.speed = config.speed || 4.2;
        this.jumpForce = config.jumpForce || -13.5;
        this.facing = config.facing || 1; // 1: right, -1: left

        // Scale & Dimensions
        this.scale = config.scale || 3.0;
        this.palette = config.palette || '1P'; // '1P' (Original) or '2P' (Alt Outfit)
        this.width = 40 * this.scale;
        this.height = 55 * this.scale;

        // Health & Energy Stats
        this.maxHp = 100;
        this.hp = 100;
        this.displayHp = 100; // Fast red bar
        this.bufferedHp = 100; // Smooth yellow trailing bar
        this.energy = 0; // Super Meter 0 - 100
        this.roundsWon = 0;

        // Combat States
        this.state = 'IDLE'; // IDLE, WALK, JUMP, BLOCK, ATTACK_1, ATTACK_2, SPECIAL, HURT, KO, VICTORY
        this.isGrounded = true;
        this.isBlocking = false;
        this.hitStunTimer = 0;
        this.attackHasHit = false; // Prevents hitting multiple times per attack frame
        this.comboHits = 0;
        this.comboResetTimer = 0;

        // Animation
        this.currentAnim = 'idle';
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.frameInterval = 8; // Ticks per frame
        this.animLoop = true;

        // Custom properties per character
        this.attackCooldown = 0;
    }

    setCharacter(charType, palette = '1P') {
        this.charType = charType;
        this.name = charType === 'GIRL' ? 'BRAWLER GIRL' : 'ENEMY PUNK';
        this.palette = palette;
        this.speed = charType === 'GIRL' ? 4.8 : 4.2;
        this.jumpForce = charType === 'GIRL' ? -14 : -13;
        this.setAnimation('idle', 9, true);
    }

    resetForNewRound(startX, facing) {
        this.x = startX;
        this.y = this.groundY;
        this.vx = 0;
        this.vy = 0;
        this.facing = facing;
        this.hp = this.maxHp;
        this.displayHp = this.maxHp;
        this.bufferedHp = this.maxHp;
        this.state = 'IDLE';
        this.isGrounded = true;
        this.isBlocking = false;
        this.hitStunTimer = 0;
        this.attackHasHit = false;
        this.comboHits = 0;
        this.setAnimation('idle', 8, true);
    }

    setAnimation(animName, frameInterval = 8, loop = true) {
        if (this.currentAnim === animName && this.state !== 'HURT') return;
        this.currentAnim = animName;
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.frameInterval = frameInterval;
        this.animLoop = loop;
    }

    // Input handlers
    handleInput(controls, opponent) {
        if (this.state === 'HURT' || this.state === 'KO' || this.state === 'VICTORY') return;

        // Face opponent in neutral/walk states
        if (this.isGrounded && !this.state.startsWith('ATTACK') && this.state !== 'SPECIAL') {
            this.facing = (opponent.x >= this.x) ? 1 : -1;
        }

        // Allow Combo Canceling during attacks if super is ready
        if (this.state === 'ATTACK_1') {
            if (controls.special && this.energy >= 100) {
                this.performSpecial();
                return;
            }
            if (controls.attack2) {
                this.performHeavyAttack();
                return;
            }
            return;
        }

        if (this.state === 'ATTACK_2') {
            if (controls.special && this.energy >= 100) {
                this.performSpecial();
                return;
            }
            return;
        }

        if (this.state === 'SPECIAL') {
            return;
        }

        // 1. Actions / Attacks
        if (controls.special && this.energy >= 100) {
            this.performSpecial();
            return;
        }

        if (controls.attack2) {
            this.performHeavyAttack();
            return;
        }

        if (controls.attack1) {
            this.performLightAttack();
            return;
        }

        // 2. Blocking / Crouching
        if (controls.down && this.isGrounded) {
            this.state = 'BLOCK';
            this.isBlocking = true;
            this.vx = 0;
            this.setAnimation('block', 10, true);
            return;
        } else {
            this.isBlocking = false;
        }

        // 3. Jumping
        if (controls.up && this.isGrounded) {
            this.vy = this.jumpForce;
            this.isGrounded = false;
            this.state = 'JUMP';
            this.setAnimation('jump', 8, false);
            if (window.soundManager) window.soundManager.playJump();
        }

        // 4. Horizontal Movement
        if (controls.left) {
            this.vx = -this.speed;
            if (this.isGrounded && this.state !== 'JUMP') {
                this.state = 'WALK';
                this.setAnimation('walk', 6, true);
            }
        } else if (controls.right) {
            this.vx = this.speed;
            if (this.isGrounded && this.state !== 'JUMP') {
                this.state = 'WALK';
                this.setAnimation('walk', 6, true);
            }
        } else {
            this.vx = 0;
            if (this.isGrounded && this.state !== 'JUMP') {
                this.state = 'IDLE';
                this.setAnimation('idle', 9, true);
            }
        }
    }

    performLightAttack() {
        this.attackHasHit = false;
        if (!this.isGrounded) {
            // Air Light Attack (Jump Kick / Air Jab)
            this.state = 'ATTACK_1';
            if (this.charType === 'GIRL') {
                this.setAnimation('jump_kick', 6, false);
            } else {
                this.setAnimation('punch', 6, false);
            }
            if (window.soundManager) window.soundManager.playJab();
            return;
        }

        this.vx = 0;
        this.state = 'ATTACK_1';
        if (this.charType === 'GIRL') {
            this.setAnimation('jab', 5, false);
        } else {
            this.setAnimation('punch', 6, false);
        }
        if (window.soundManager) window.soundManager.playJab();
    }

    performHeavyAttack() {
        this.attackHasHit = false;
        if (!this.isGrounded) {
            // Jump Kick
            this.state = 'ATTACK_2';
            this.setAnimation('jump_kick', 6, false);
            if (window.soundManager) window.soundManager.playHeavy();
            return;
        }

        // Ground Heavy Attack (Kick)
        this.vx = 0;
        this.state = 'ATTACK_2';
        this.setAnimation('kick', 6, false);
        if (window.soundManager) window.soundManager.playHeavy();
    }

    performSpecial() {
        if (this.energy < 100) return; // Phải đủ 100% nộ mới được tung chiêu
        this.energy = 0; // Trừ sạch thanh nộ về 0%
        this.attackHasHit = false;
        this.state = 'SPECIAL';

        if (this.charType === 'GIRL') {
            // Super Dive Kick (Bay vút lên rồi bổ gót siêu thanh)
            this.vy = -7.0;
            this.vx = this.facing * 10.0;
            this.isGrounded = false;
            this.setAnimation('dive_kick', 4, false);
        } else {
            // Super Dash Tackle (Lao húc cực mạnh)
            this.vx = this.facing * 12.0;
            this.setAnimation('dash_tackle', 5, false);
        }
        if (window.soundManager) window.soundManager.playSpecial();
    }

    // Physical update loop (60 FPS)
    update(opponent, stageWidth = 960) {
        // Cooldowns & timers
        if (this.comboResetTimer > 0) {
            this.comboResetTimer--;
            if (this.comboResetTimer === 0) {
                this.comboHits = 0;
            }
        }

        // Buffered HP smooth decay
        if (this.bufferedHp > this.hp) {
            this.bufferedHp -= 0.5;
            if (this.bufferedHp < this.hp) this.bufferedHp = this.hp;
        }
        this.displayHp = this.hp;

        // Apply hit stun recovery
        if (this.state === 'HURT') {
            this.hitStunTimer--;
            if (this.hitStunTimer <= 0) {
                if (this.hp <= 0) {
                    this.state = 'KO';
                } else {
                    this.state = 'IDLE';
                    this.setAnimation('idle', 9, true);
                }
            }
        }

        // Apply Physics
        this.x += this.vx;
        this.y += this.vy;

        // Gravity
        if (!this.isGrounded) {
            this.vy += this.gravity;
            if (this.y >= this.groundY) {
                this.y = this.groundY;
                this.vy = 0;
                this.isGrounded = true;
                if (this.state === 'JUMP' || this.state === 'SPECIAL' || this.state === 'ATTACK_1') {
                    this.state = 'IDLE';
                    this.setAnimation('idle', 9, true);
                }
            }
        }

        // Pushbox collision (Fighters cannot pass through each other)
        const minDistance = 50;
        const dx = this.x - opponent.x;
        if (Math.abs(dx) < minDistance && Math.abs(this.y - opponent.y) < 60) {
            const push = (minDistance - Math.abs(dx)) / 2;
            if (dx > 0) {
                this.x += push;
                opponent.x -= push;
            } else {
                this.x -= push;
                opponent.x += push;
            }
        }

        // Arena Stage boundaries
        const margin = 40;
        if (this.x < margin) this.x = margin;
        if (this.x > stageWidth - margin) this.x = stageWidth - margin;

        // Animation Progression
        this.updateAnimation();

        // Check active Hitbox collisions against opponent
        if ((this.state.startsWith('ATTACK') || this.state === 'SPECIAL') && !this.attackHasHit) {
            this.checkHitbox(opponent);
        }
    }

    updateAnimation() {
        this.frameTimer++;
        if (this.frameTimer >= this.frameInterval) {
            this.frameTimer = 0;
            const frames = window.spriteManager.getAnimationFrames(this.charType, this.currentAnim);
            
            if (frames.length > 0) {
                if (this.frameIndex < frames.length - 1) {
                    this.frameIndex++;
                } else if (this.animLoop) {
                    this.frameIndex = 0;
                } else {
                    // Non-looping animation finished
                    if (this.state.startsWith('ATTACK') || this.state === 'SPECIAL') {
                        this.state = 'IDLE';
                        this.setAnimation('idle', 9, true);
                    }
                }
            }
        }
    }

    // Get current Hurtbox (Area where fighter can be hit)
    getHurtbox() {
        return {
            x: this.x - (this.width / 2.5),
            y: this.y - this.height + 15,
            width: this.width * 0.8,
            height: this.height - 15
        };
    }

    // Get active Hitbox during attacks
    getHitbox() {
        if (!this.state.startsWith('ATTACK') && this.state !== 'SPECIAL') return null;

        let hitX = this.facing === 1 ? this.x + 10 : this.x - 70;
        let hitY = this.y - (this.height * 0.65);
        let hitW = 60;
        let hitH = 35;
        let damage = 8;
        let knockback = 4;
        let hitStun = 14;

        if (this.state === 'ATTACK_1') {
            damage = this.charType === 'GIRL' ? 3 : 4;
            knockback = 3.5;
            hitStun = 12;
        } else if (this.state === 'ATTACK_2') {
            damage = this.charType === 'GIRL' ? 6 : 7;
            hitW = 75;
            hitH = 45;
            knockback = 5.5;
            hitStun = 16;
        } else if (this.state === 'SPECIAL') {
            damage = this.charType === 'GIRL' ? 10 : 12;
            hitW = 85;
            hitH = 50;
            knockback = 7.5;
            hitStun = 22;
        }

        return {
            x: hitX,
            y: hitY,
            width: hitW,
            height: hitH,
            damage,
            knockback,
            hitStun
        };
    }

    checkHitbox(opponent) {
        const hitbox = this.getHitbox();
        if (!hitbox) return;

        const hurtbox = opponent.getHurtbox();

        // AABB Collision check
        if (
            hitbox.x < hurtbox.x + hurtbox.width &&
            hitbox.x + hitbox.width > hurtbox.x &&
            hitbox.y < hurtbox.y + hurtbox.height &&
            hitbox.y + hitbox.height > hurtbox.y
        ) {
            // Hit landed!
            this.attackHasHit = true;
            const hitPointX = (hitbox.x + hitbox.width / 2 + hurtbox.x + hurtbox.width / 2) / 2;
            const hitPointY = (hitbox.y + hitbox.height / 2 + hurtbox.y + hurtbox.height / 2) / 2;

            const isBlocked = opponent.isBlocking;
            opponent.takeHit(
                hitbox.damage,
                this.facing * hitbox.knockback,
                hitbox.hitStun,
                isBlocked,
                hitPointX,
                hitPointY
            );

            // Attacker gains energy & combo
            this.energy = Math.min(100, this.energy + 8);
            if (!isBlocked) {
                this.comboHits++;
                this.comboResetTimer = 70;
            }
        }
    }

    takeHit(damage, knockbackX, hitStun, isBlocked, hitX, hitY) {
        if (this.state === 'KO' || this.state === 'VICTORY') return;

        if (isBlocked) {
            // Block reduces damage by 85% and minimizes knockback
            const blockedDmg = Math.max(1, Math.round(damage * 0.15));
            this.hp = Math.max(0, this.hp - blockedDmg);
            this.vx = knockbackX * 0.3;
            if (window.soundManager) window.soundManager.playBlock();
            if (window.gameInstance) {
                window.gameInstance.spawnSpark(hitX, hitY, 'block');
            }
        } else {
            // Full impact
            this.hp = Math.max(0, this.hp - damage);
            this.vx = knockbackX;
            this.hitStunTimer = hitStun;
            this.state = 'HURT';
            this.setAnimation('hurt', 6, false);
            this.energy = Math.min(100, this.energy + 4);

            if (window.soundManager) window.soundManager.playHit();
            if (window.gameInstance) {
                window.gameInstance.spawnSpark(hitX, hitY, 'hit');
                window.gameInstance.triggerScreenShake(Math.min(15, damage * 0.6));
            }

            if (this.hp <= 0) {
                this.state = 'KO';
                this.setAnimation('hurt', 10, false);
                if (window.soundManager) window.soundManager.playKO();
            }
        }
    }

    draw(ctx) {
        // 1. Draw Shadow under feet
        const shadowImg = window.spriteManager.getImage('shadow');
        if (shadowImg) {
            const shadowWidth = 60;
            const shadowHeight = 16;
            ctx.drawImage(
                shadowImg,
                this.x - shadowWidth / 2,
                this.groundY + 30,
                shadowWidth,
                shadowHeight
            );
        }

        // 2. Draw Fighter Sprite Frame
        const frames = window.spriteManager.getAnimationFrames(this.charType, this.currentAnim);
        let frameImg = frames[this.frameIndex] || frames[0];

        if (frameImg) {
            ctx.save();
            ctx.translate(Math.round(this.x), Math.round(this.y));
            
            // Brawler Girl faces right by default; Enemy Punk faces left by default in raw assets
            const spriteDir = this.charType === 'GIRL' ? this.facing : -this.facing;
            ctx.scale(spriteDir * this.scale, this.scale);

            // Palette Swap (2P Alt Outfit for mirror match)
            if (this.palette === '2P') {
                ctx.filter = 'hue-rotate(180deg) saturate(1.3)';
            }

            // Center sprite horizontally and bottom-align to ground
            const drawW = frameImg.width;
            const drawH = frameImg.height;

            // Optional: Super Special Aura Glow
            if (this.energy >= 100) {
                ctx.shadowColor = this.charType === 'GIRL' ? '#00f2fe' : '#ff0844';
                ctx.shadowBlur = 15;
            }

            ctx.drawImage(frameImg, -drawW / 2, -drawH + 10);
            ctx.restore();
        }
    }
}

window.Fighter = Fighter;
