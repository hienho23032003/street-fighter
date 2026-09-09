// Main Game Orchestration Engine
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.width = 960;
        this.height = 540;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Game Mode: 'PVP' (2 Players Local), 'PVE' (1 Player vs CPU), 'ONLINE' (2 Players 2 Devices)
        this.gameMode = 'PVP';
        this.aiController = new AIController('NORMAL');

        // Fighters
        this.player1 = new Fighter({
            id: 'p1',
            name: 'BRAWLER GIRL',
            charType: 'GIRL',
            x: 240,
            y: 350,
            facing: 1,
            speed: 4.8,
            jumpForce: -14
        });

        this.player2 = new Fighter({
            id: 'p2',
            name: 'ENEMY PUNK',
            charType: 'PUNK',
            x: 720,
            y: 350,
            facing: -1,
            speed: 4.2,
            jumpForce: -13
        });

        // Game State
        this.gameState = 'LOADING'; // LOADING, MENU, COUNTDOWN, PLAYING, ROUND_OVER, MATCH_OVER, PAUSED
        this.currentRound = 1;
        this.maxRounds = 3;
        this.roundTimer = 99;
        this.roundTimerInterval = null;
        this.countdownText = '';
        this.announcementText = '';
        this.announcementSub = '';

        // Screen FX & Particles
        this.particles = [];
        this.screenShake = 0;
        this.slowMoCounter = 0;

        // Prop animations
        this.propTick = 0;
        this.syncTick = 0;

        // Character selection memory
        this.p1ChosenChar = 'GIRL';
        this.p2ChosenChar = 'PUNK';

        // Keys state tracker
        this.keys = {};
        this.lastP1InputJson = '';
        this.lastP2InputJson = '';
        this.setupInput();

        // Bind global instance for access by fighters/particles
        window.gameInstance = this;
    }

    setupInput() {
        this.keys = {};

        const registerKey = (e, isDown) => {
            if (e.code) {
                this.keys[e.code] = isDown;
            }
            if (e.key) {
                this.keys[e.key.toLowerCase()] = isDown;
                this.keys[e.key.toUpperCase()] = isDown;
            }
        };

        window.addEventListener('keydown', (e) => {
            registerKey(e, true);
            if ((e.code === 'KeyP' || e.key === 'p' || e.key === 'P') && (this.gameState === 'PLAYING' || this.gameState === 'PAUSED')) {
                if (this.gameMode !== 'ONLINE') {
                    this.togglePause();
                }
            }
            // Prevent scrolling on arrow keys and space
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            registerKey(e, false);
        });

        // Anti-stuck: Clear keys when tab or window loses focus
        window.addEventListener('blur', () => {
            this.keys = {};
        });
        window.addEventListener('focus', () => {
            this.keys = {};
        });
    }

    isKeyPressed(...keys) {
        for (const k of keys) {
            if (this.keys[k]) return true;
        }
        return false;
    }

    getLocalPrimaryControls() {
        return {
            left: this.isKeyPressed('KeyA', 'a', 'A', 'ArrowLeft', 'arrowleft'),
            right: this.isKeyPressed('KeyD', 'd', 'D', 'ArrowRight', 'arrowright'),
            up: this.isKeyPressed('KeyW', 'w', 'W', 'ArrowUp', 'arrowup', 'Space', ' '),
            down: this.isKeyPressed('KeyS', 's', 'S', 'ArrowDown', 'arrowdown'),
            attack1: this.isKeyPressed('KeyJ', 'j', 'J', 'Numpad1', '1', 'KeyU', 'u', 'U'),
            attack2: this.isKeyPressed('KeyK', 'k', 'K', 'Numpad2', '2', 'KeyI', 'i', 'I'),
            special: this.isKeyPressed('KeyL', 'l', 'L', 'Numpad3', '3', 'KeyO', 'o', 'O')
        };
    }

    getLocalP1Controls() {
        return {
            left: this.isKeyPressed('KeyA', 'a', 'A'),
            right: this.isKeyPressed('KeyD', 'd', 'D'),
            up: this.isKeyPressed('KeyW', 'w', 'W'),
            down: this.isKeyPressed('KeyS', 's', 'S'),
            attack1: this.isKeyPressed('KeyJ', 'j', 'J'),
            attack2: this.isKeyPressed('KeyK', 'k', 'K'),
            special: this.isKeyPressed('KeyL', 'l', 'L')
        };
    }

    getLocalP2Controls() {
        return {
            left: this.isKeyPressed('ArrowLeft', 'arrowleft'),
            right: this.isKeyPressed('ArrowRight', 'arrowright'),
            up: this.isKeyPressed('ArrowUp', 'arrowup'),
            down: this.isKeyPressed('ArrowDown', 'arrowdown'),
            attack1: this.isKeyPressed('Numpad1', '1', 'KeyU', 'u', 'U'),
            attack2: this.isKeyPressed('Numpad2', '2', 'KeyI', 'i', 'I'),
            special: this.isKeyPressed('Numpad3', '3', 'KeyO', 'o', 'O')
        };
    }

    getP1Controls() {
        if (this.gameMode === 'ONLINE') {
            if (window.networkManager && window.networkManager.myRole === 'p1') {
                const controls = this.getLocalPrimaryControls();
                const json = JSON.stringify(controls);
                if (json !== this.lastP1InputJson || this.syncTick % 4 === 0) {
                    this.lastP1InputJson = json;
                    window.networkManager.sendInput(controls);
                }
                return controls;
            } else if (window.networkManager) {
                return window.networkManager.opponentControls;
            }
        }

        if (this.gameMode === 'PVE') {
            return this.getLocalPrimaryControls();
        }

        return this.getLocalP1Controls();
    }

    getP2Controls() {
        if (this.gameMode === 'ONLINE') {
            if (window.networkManager && window.networkManager.myRole === 'p2') {
                const controls = this.getLocalPrimaryControls();
                const json = JSON.stringify(controls);
                if (json !== this.lastP2InputJson || this.syncTick % 4 === 0) {
                    this.lastP2InputJson = json;
                    window.networkManager.sendInput(controls);
                }
                return controls;
            } else if (window.networkManager) {
                return window.networkManager.opponentControls;
            }
        }

        if (this.gameMode === 'PVE') {
            return this.aiController.update(this.player2, this.player1);
        }

        return this.getLocalP2Controls();
    }

    startNewMatch(mode = 'PVP', aiDifficulty = 'NORMAL', p1Char = 'GIRL', p2Char = 'PUNK') {
        this.gameMode = mode;
        this.p1ChosenChar = p1Char;
        this.p2ChosenChar = p2Char;

        // Configure fighters based on character selection
        const isMirrorMatch = (p1Char === p2Char);
        this.player1.setCharacter(p1Char, '1P');
        this.player2.setCharacter(p2Char, isMirrorMatch ? '2P' : '1P');

        this.player2.isAI = (mode === 'PVE');
        if (mode === 'PVE') {
            this.aiController.setDifficulty(aiDifficulty);
        }

        this.player1.roundsWon = 0;
        this.player2.roundsWon = 0;
        this.currentRound = 1;

        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('characterSelectModal').classList.add('hidden');
        document.getElementById('multiplayerModal').classList.add('hidden');
        document.getElementById('victoryModal').classList.add('hidden');

        // Update name badge in HUD with clear BẠN / ĐỐI THỦ indications
        const p1NameEl = document.querySelector('.fighter-name.p1');
        const p2NameEl = document.querySelector('.fighter-name.p2');
        
        if (mode === 'ONLINE') {
            if (window.networkManager && window.networkManager.myRole === 'p1') {
                if (p1NameEl) p1NameEl.innerHTML = `<span class="you-badge">[ BẠN ]</span> ${this.player1.name} (1P)`;
                if (p2NameEl) p2NameEl.innerHTML = `${this.player2.name} (2P) <span class="foe-badge">[ ĐỐI THỦ ]</span>`;
            } else {
                if (p1NameEl) p1NameEl.innerHTML = `<span class="foe-badge">[ ĐỐI THỦ ]</span> ${this.player1.name} (1P)`;
                if (p2NameEl) p2NameEl.innerHTML = `${this.player2.name} (2P) <span class="you-badge">[ BẠN ]</span>`;
            }
        } else if (mode === 'PVE') {
            if (p1NameEl) p1NameEl.innerHTML = `<span class="you-badge">[ BẠN ]</span> ${this.player1.name}`;
            if (p2NameEl) p2NameEl.innerHTML = `${this.player2.name} <span class="foe-badge">[ CPU - ${aiDifficulty} ]</span>`;
        } else {
            if (p1NameEl) p1NameEl.innerText = `${this.player1.name}${isMirrorMatch ? ' (1P)' : ''}`;
            if (p2NameEl) p2NameEl.innerText = `${this.player2.name}${isMirrorMatch ? ' (2P)' : ''}`;
        }

        if (window.soundManager) {
            window.soundManager.init();
            window.soundManager.startBgm();
        }

        this.startRound();
    }

    startRound() {
        this.player1.resetForNewRound(240, 1);
        this.player2.resetForNewRound(720, -1);
        this.particles = [];
        this.roundTimer = 99;
        if (this.roundTimerInterval) clearInterval(this.roundTimerInterval);

        this.gameState = 'COUNTDOWN';
        this.announcementText = `ROUND ${this.currentRound}`;
        this.announcementSub = 'GET READY!';

        if (window.soundManager) window.soundManager.playRoundStart();

        setTimeout(() => {
            this.announcementText = 'FIGHT!';
            this.announcementSub = '';

            setTimeout(() => {
                this.announcementText = '';
                this.gameState = 'PLAYING';
                this.startTimer();
            }, 800);
        }, 1200);

        this.updateHUD();
    }

    startTimer() {
        if (this.roundTimerInterval) clearInterval(this.roundTimerInterval);
        this.roundTimerInterval = setInterval(() => {
            if (this.gameState === 'PLAYING') {
                this.roundTimer--;
                this.updateHUD();
                if (this.roundTimer <= 0) {
                    this.roundTimer = 0;
                    this.endRound('TIMEOUT');
                }
            }
        }, 1000);
    }

    endRound(reason = 'KO') {
        clearInterval(this.roundTimerInterval);
        this.gameState = 'ROUND_OVER';

        let winner = null;
        if (reason === 'TIMEOUT') {
            if (this.player1.hp > this.player2.hp) winner = this.player1;
            else if (this.player2.hp > this.player1.hp) winner = this.player2;
            this.announcementText = 'TIME UP!';
        } else {
            if (this.player1.hp <= 0 && this.player2.hp <= 0) {
                this.announcementText = 'DOUBLE K.O.!';
            } else if (this.player1.hp <= 0) {
                winner = this.player2;
                this.announcementText = 'K.O.!';
            } else {
                winner = this.player1;
                this.announcementText = 'K.O.!';
            }
        }

        if (winner) {
            winner.roundsWon++;
            winner.state = 'VICTORY';
            this.announcementSub = `${winner.name} WINS ROUND!`;
        } else {
            this.announcementSub = 'DRAW ROUND!';
        }

        this.updateHUD();

        setTimeout(() => {
            // Check if match won
            if (this.player1.roundsWon >= 2 || this.player2.roundsWon >= 2) {
                this.endMatch(this.player1.roundsWon >= 2 ? this.player1 : this.player2);
            } else {
                this.currentRound++;
                this.startRound();
            }
        }, 3200);
    }

    endMatch(winner) {
        this.gameState = 'MATCH_OVER';
        this.announcementText = 'VICTORY!';
        this.announcementSub = `${winner.name} IS THE CHAMPION!`;

        const modal = document.getElementById('victoryModal');
        const victorText = document.getElementById('victorName');
        if (victorText) victorText.innerText = winner.name;
        if (modal) modal.classList.remove('hidden');
    }

    togglePause() {
        if (this.gameState === 'PLAYING') {
            this.gameState = 'PAUSED';
            document.getElementById('pauseOverlay').classList.remove('hidden');
        } else if (this.gameState === 'PAUSED') {
            this.gameState = 'PLAYING';
            document.getElementById('pauseOverlay').classList.add('hidden');
        }
    }

    triggerScreenShake(magnitude = 10) {
        this.screenShake = magnitude;
    }

    spawnSpark(x, y, type = 'hit') {
        const count = type === 'hit' ? 12 : 8;
        const color = type === 'hit' ? '#ffdf00' : '#00e5ff';

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 6;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                size: 3 + Math.random() * 4,
                color,
                life: 1.0,
                decay: 0.05 + Math.random() * 0.05
            });
        }
    }

    syncHostState(state) {
        if (!state) return;
        this.player1.hp = state.p1Hp;
        this.player2.hp = state.p2Hp;
        this.player1.bufferedHp = (state.p1BufferedHp !== undefined) ? state.p1BufferedHp : state.p1Hp;
        this.player2.bufferedHp = (state.p2BufferedHp !== undefined) ? state.p2BufferedHp : state.p2Hp;
        this.player1.energy = (state.p1Energy !== undefined) ? state.p1Energy : this.player1.energy;
        this.player2.energy = (state.p2Energy !== undefined) ? state.p2Energy : this.player2.energy;
        this.player1.roundsWon = (state.p1RoundsWon !== undefined) ? state.p1RoundsWon : this.player1.roundsWon;
        this.player2.roundsWon = (state.p2RoundsWon !== undefined) ? state.p2RoundsWon : this.player2.roundsWon;
        
        if (Math.abs(this.player1.x - state.p1X) > 20) this.player1.x = state.p1X;
        if (Math.abs(this.player2.x - state.p2X) > 20) this.player2.x = state.p2X;
        this.player1.y = state.p1Y;
        this.player2.y = state.p2Y;
        this.player1.facing = state.p1Facing || this.player1.facing;
        this.player2.facing = state.p2Facing || this.player2.facing;
        this.player1.comboHits = state.p1Combo || 0;
        this.player2.comboHits = state.p2Combo || 0;
        this.roundTimer = state.timer;
        if (state.gameState && this.gameState !== state.gameState) this.gameState = state.gameState;
        if (state.announcementText !== undefined) this.announcementText = state.announcementText;
        if (state.announcementSub !== undefined) this.announcementSub = state.announcementSub;

        this.updateHUD();
    }

    // Update HUD elements
    updateHUD() {
        // Player 1 HP & Energy
        const p1Bar = document.getElementById('p1HpBar');
        const p1Buffer = document.getElementById('p1HpBuffer');
        const p1Energy = document.getElementById('p1EnergyBar');
        if (p1Bar) p1Bar.style.width = `${Math.max(0, this.player1.hp)}%`;
        if (p1Buffer) p1Buffer.style.width = `${Math.max(0, this.player1.bufferedHp)}%`;
        if (p1Energy) {
            p1Energy.style.width = `${this.player1.energy}%`;
            p1Energy.classList.toggle('full', this.player1.energy >= 100);
        }

        // Player 2 HP & Energy
        const p2Bar = document.getElementById('p2HpBar');
        const p2Buffer = document.getElementById('p2HpBuffer');
        const p2Energy = document.getElementById('p2EnergyBar');
        if (p2Bar) p2Bar.style.width = `${Math.max(0, this.player2.hp)}%`;
        if (p2Buffer) p2Buffer.style.width = `${Math.max(0, this.player2.bufferedHp)}%`;
        if (p2Energy) {
            p2Energy.style.width = `${this.player2.energy}%`;
            p2Energy.classList.toggle('full', this.player2.energy >= 100);
        }

        // Timer
        const timerEl = document.getElementById('roundTimer');
        if (timerEl) timerEl.innerText = this.roundTimer < 10 ? `0${this.roundTimer}` : this.roundTimer;

        // Rounds Won Dots
        const p1R1 = document.getElementById('p1R1');
        const p1R2 = document.getElementById('p1R2');
        if (p1R1) p1R1.classList.toggle('active', this.player1.roundsWon >= 1);
        if (p1R2) p1R2.classList.toggle('active', this.player1.roundsWon >= 2);

        const p2R1 = document.getElementById('p2R1');
        const p2R2 = document.getElementById('p2R2');
        if (p2R1) p2R1.classList.toggle('active', this.player2.roundsWon >= 1);
        if (p2R2) p2R2.classList.toggle('active', this.player2.roundsWon >= 2);

        // Combo counters
        const p1Combo = document.getElementById('p1Combo');
        if (p1Combo) {
            if (this.player1.comboHits > 1) {
                p1Combo.innerText = `${this.player1.comboHits} HITS!`;
                p1Combo.classList.remove('hidden');
            } else {
                p1Combo.classList.add('hidden');
            }
        }

        const p2Combo = document.getElementById('p2Combo');
        if (p2Combo) {
            if (this.player2.comboHits > 1) {
                p2Combo.innerText = `${this.player2.comboHits} HITS!`;
                p2Combo.classList.remove('hidden');
            } else {
                p2Combo.classList.add('hidden');
            }
        }
    }

    update() {
        if (this.gameState === 'PAUSED' || this.gameState === 'LOADING') return;

        this.propTick++;

        // Update Fighters
        const p1Controls = this.getP1Controls();
        const p2Controls = this.getP2Controls();

        if (this.gameState === 'PLAYING') {
            this.player1.handleInput(p1Controls, this.player2);
            this.player2.handleInput(p2Controls, this.player1);
        }

        this.player1.update(this.player2, this.width);
        this.player2.update(this.player1, this.width);

        // In Online Mode, Host (P1) periodically sends state sync
        if (this.gameMode === 'ONLINE' && window.networkManager && window.networkManager.myRole === 'p1') {
            this.syncTick++;
            if (this.syncTick % 4 === 0) {
                window.networkManager.sendStateSync({
                    p1Hp: this.player1.hp,
                    p2Hp: this.player2.hp,
                    p1BufferedHp: this.player1.bufferedHp,
                    p2BufferedHp: this.player2.bufferedHp,
                    p1Energy: this.player1.energy,
                    p2Energy: this.player2.energy,
                    p1RoundsWon: this.player1.roundsWon,
                    p2RoundsWon: this.player2.roundsWon,
                    p1X: this.player1.x,
                    p1Y: this.player1.y,
                    p2X: this.player2.x,
                    p2Y: this.player2.y,
                    p1Facing: this.player1.facing,
                    p2Facing: this.player2.facing,
                    p1State: this.player1.state,
                    p2State: this.player2.state,
                    p1Anim: this.player1.currentAnim,
                    p2Anim: this.player2.currentAnim,
                    p1Combo: this.player1.comboHits,
                    p2Combo: this.player2.comboHits,
                    timer: this.roundTimer,
                    gameState: this.gameState,
                    announcementText: this.announcementText,
                    announcementSub: this.announcementSub
                });
            }
        }

        // Check Round Ending during PLAYING
        if (this.gameState === 'PLAYING') {
            if (this.player1.hp <= 0 || this.player2.hp <= 0) {
                this.endRound('KO');
            }
        }

        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Decay screen shake
        if (this.screenShake > 0) {
            this.screenShake *= 0.85;
            if (this.screenShake < 0.2) this.screenShake = 0;
        }

        this.updateHUD();
    }

    render() {
        this.ctx.save();

        // Apply Screen Shake
        if (this.screenShake > 0) {
            const shakeX = (Math.random() * 2 - 1) * this.screenShake;
            const shakeY = (Math.random() * 2 - 1) * this.screenShake;
            this.ctx.translate(shakeX, shakeY);
        }

        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. Parallax Stage Background (Back layer)
        const backImg = window.spriteManager.getImage('stage_back');
        if (backImg) {
            this.ctx.drawImage(backImg, 0, 0, this.width, this.height);
        }

        // 2. Animated Neon Props
        this.renderProps();

        // 3. Stage Foreground (Street & Floor)
        const foreImg = window.spriteManager.getImage('stage_fore');
        if (foreImg) {
            this.ctx.drawImage(foreImg, 0, 0, this.width, this.height);
        }

        // 4. Render Fighters
        this.player1.draw(this.ctx);
        this.player2.draw(this.ctx);

        // 5. Render Particles
        for (const p of this.particles) {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        this.ctx.globalAlpha = 1.0;

        // 6. Render On-Screen Announcements (Fight!, K.O., Round 1)
        if (this.announcementText) {
            this.ctx.save();
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            this.ctx.font = '900 54px "Orbitron", "Chakra Petch", Impact, sans-serif';
            this.ctx.fillStyle = '#ffe600';
            this.ctx.shadowColor = '#ff0055';
            this.ctx.shadowBlur = 18;
            this.ctx.lineWidth = 6;
            this.ctx.strokeStyle = '#111';
            this.ctx.strokeText(this.announcementText, this.width / 2, this.height / 2 - 20);
            this.ctx.fillText(this.announcementText, this.width / 2, this.height / 2 - 20);

            if (this.announcementSub) {
                this.ctx.font = '700 24px "Chakra Petch", "Orbitron", sans-serif';
                this.ctx.fillStyle = '#ffffff';
                this.ctx.shadowColor = '#00f2fe';
                this.ctx.shadowBlur = 12;
                this.ctx.fillText(this.announcementSub, this.width / 2, this.height / 2 + 45);
            }
            this.ctx.restore();
        }

        this.ctx.restore();
    }

    renderProps() {
        const frameToggle = Math.floor(this.propTick / 25) % 2 === 0;

        // Sushi Neon sign
        const sushiImg = window.spriteManager.getImage(frameToggle ? 'prop_sushi_1' : 'prop_sushi_2');
        if (sushiImg) {
            this.ctx.drawImage(sushiImg, 380, 80, sushiImg.width * 2.5, sushiImg.height * 2.5);
        }

        // Ethereum Neon sign
        const ethImg = window.spriteManager.getImage(frameToggle ? 'prop_eth_1' : 'prop_eth_2');
        if (ethImg) {
            this.ctx.drawImage(ethImg, 560, 110, ethImg.width * 2.5, ethImg.height * 2.5);
        }

        // Banner
        const bannerImg = window.spriteManager.getImage(frameToggle ? 'prop_banner_1' : 'prop_banner_2');
        if (bannerImg) {
            this.ctx.drawImage(bannerImg, 180, 100, bannerImg.width * 2.5, bannerImg.height * 2.5);
        }
    }

    loop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.loop());
    }
}

// Global initialization & UI Events
window.addEventListener('DOMContentLoaded', async () => {
    const game = new Game();

    const progressBar = document.getElementById('loadingProgress');
    const loadingScreen = document.getElementById('loadingScreen');
    const startScreen = document.getElementById('startScreen');
    const multiplayerModal = document.getElementById('multiplayerModal');
    const charSelectModal = document.getElementById('characterSelectModal');

    let pendingMode = 'PVP';
    let pendingDiff = 'NORMAL';
    let selectedCharP1 = 'GIRL';
    let selectedCharP2 = 'PUNK';
    let selectStep = 1; // 1: P1 selecting, 2: P2 selecting

    await window.spriteManager.loadAllAssets((progress) => {
        if (progressBar) progressBar.style.width = `${Math.round(progress * 100)}%`;
    });

    if (loadingScreen) loadingScreen.classList.add('hidden');
    if (startScreen) startScreen.classList.remove('hidden');
    game.gameState = 'MENU';

    // Start game loop
    game.loop();

    // Setup Network Manager Callbacks for WebRTC
    window.networkManager.onRoomCreatedCallback = (data) => {
        document.getElementById('hostWaitingView').classList.remove('hidden');
        document.getElementById('joinInputView').classList.add('hidden');
        document.getElementById('roomCodeDisplay').innerText = data.roomId;
    };

    window.networkManager.onRoomJoinedCallback = (data) => {
        document.getElementById('joinInputView').innerHTML = `
            <p style="font-size: 11px; color: var(--arcade-cyan); margin: 15px 0;">
                Đã vào phòng <b>${data.roomId}</b>! Đang kết nối trận đấu...
            </p>
        `;
    };

    window.networkManager.onMatchStartCallback = (data) => {
        multiplayerModal.classList.add('hidden');
        game.startNewMatch('ONLINE', 'NORMAL', selectedCharP1, selectedCharP2);
    };

    window.networkManager.onErrorCallback = (msg) => {
        alert(msg);
    };

    window.networkManager.onOpponentDisconnectCallback = (msg) => {
        alert(msg || 'Đối thủ đã ngắt kết nối!');
        document.getElementById('victoryModal').classList.add('hidden');
        document.getElementById('multiplayerModal').classList.add('hidden');
        startScreen.classList.remove('hidden');
        game.gameState = 'MENU';
        window.networkManager.leaveRoom();
    };

    // Helper: Show Character Select Modal
    function openCharSelect(mode, diff = 'NORMAL') {
        pendingMode = mode;
        pendingDiff = diff;
        selectStep = 1;
        selectedCharP1 = 'GIRL';
        selectedCharP2 = (mode === 'PVE') ? (Math.random() < 0.5 ? 'PUNK' : 'GIRL') : 'PUNK';

        updateCharCardSelection(selectedCharP1);
        const subtitle = document.getElementById('charSelectSubtitle');
        if (subtitle) {
            subtitle.innerText = mode === 'PVP' ? 'PLAYER 1: CHỌN VÕ SĨ' : 'BẠN HÃY CHỌN VÕ SĨ';
        }

        startScreen.classList.add('hidden');
        charSelectModal.classList.remove('hidden');
    }

    function updateCharCardSelection(charType) {
        const cardGirl = document.getElementById('cardGirl');
        const cardPunk = document.getElementById('cardPunk');
        if (cardGirl) cardGirl.classList.toggle('selected', charType === 'GIRL');
        if (cardPunk) cardPunk.classList.toggle('selected', charType === 'PUNK');
    }

    // Card Selection Click Events
    document.getElementById('cardGirl').addEventListener('click', () => {
        if (selectStep === 1) selectedCharP1 = 'GIRL';
        else selectedCharP2 = 'GIRL';
        updateCharCardSelection('GIRL');
    });

    document.getElementById('cardPunk').addEventListener('click', () => {
        if (selectStep === 1) selectedCharP1 = 'PUNK';
        else selectedCharP2 = 'PUNK';
        updateCharCardSelection('PUNK');
    });

    // Confirm Character Selection
    document.getElementById('btnConfirmChar').addEventListener('click', () => {
        if (pendingMode === 'PVP' && selectStep === 1) {
            // Move to Player 2 Character Selection in local 2P mode
            selectStep = 2;
            selectedCharP2 = 'PUNK';
            updateCharCardSelection(selectedCharP2);
            const subtitle = document.getElementById('charSelectSubtitle');
            if (subtitle) subtitle.innerText = 'PLAYER 2: CHỌN VÕ SĨ';
            return;
        }

        // Start Match with chosen characters
        charSelectModal.classList.add('hidden');
        game.startNewMatch(pendingMode, pendingDiff, selectedCharP1, selectedCharP2);
    });

    document.getElementById('btnBackFromCharSelect').addEventListener('click', () => {
        charSelectModal.classList.add('hidden');
        startScreen.classList.remove('hidden');
    });

    // Mode Selection Buttons
    document.getElementById('btnPvp').addEventListener('click', () => {
        openCharSelect('PVP');
    });

    document.getElementById('btnPveEasy').addEventListener('click', () => {
        openCharSelect('PVE', 'EASY');
    });

    document.getElementById('btnPveNormal').addEventListener('click', () => {
        openCharSelect('PVE', 'NORMAL');
    });

    document.getElementById('btnPveHard').addEventListener('click', () => {
        openCharSelect('PVE', 'HARD');
    });

    document.getElementById('btnOnline').addEventListener('click', () => {
        startScreen.classList.add('hidden');
        multiplayerModal.classList.remove('hidden');
        document.getElementById('hostWaitingView').classList.add('hidden');
        document.getElementById('joinInputView').classList.remove('hidden');
    });

    document.getElementById('btnHostRoom').addEventListener('click', async () => {
        await window.networkManager.createRoom();
    });

    document.getElementById('btnJoinRoom').addEventListener('click', async () => {
        const input = document.getElementById('inputRoomCode');
        const code = input ? input.value.trim() : '';
        if (!code) {
            alert('Vui lòng nhập mã phòng 4 số!');
            return;
        }
        await window.networkManager.joinRoom(code);
    });

    document.getElementById('btnBackFromOnline').addEventListener('click', () => {
        window.networkManager.leaveRoom();
        multiplayerModal.classList.add('hidden');
        startScreen.classList.remove('hidden');
    });

    document.getElementById('btnRematch').addEventListener('click', () => {
        if (game.gameMode === 'ONLINE') {
            game.startNewMatch('ONLINE', 'NORMAL', game.p1ChosenChar, game.p2ChosenChar);
        } else {
            game.startNewMatch(game.gameMode, game.aiController.difficulty, game.p1ChosenChar, game.p2ChosenChar);
        }
    });

    document.getElementById('btnMenu').addEventListener('click', () => {
        if (game.gameMode === 'ONLINE') {
            window.networkManager.leaveRoom();
        }
        document.getElementById('victoryModal').classList.add('hidden');
        document.getElementById('startScreen').classList.remove('hidden');
        game.gameState = 'MENU';
    });

    // Audio Mute toggle
    const btnMute = document.getElementById('btnMute');
    if (btnMute) {
        btnMute.addEventListener('click', () => {
            const isMuted = window.soundManager.toggleMute();
            btnMute.innerText = isMuted ? '🔇 UNMUTE' : '🔊 SOUND';
        });
    }

    // CRT Scanlines Toggle
    const btnCrt = document.getElementById('btnCrt');
    const crtOverlay = document.getElementById('crtOverlay');
    if (btnCrt && crtOverlay) {
        btnCrt.addEventListener('click', () => {
            crtOverlay.classList.toggle('hidden');
            btnCrt.classList.toggle('active');
        });
    }

    // Controls Modal Toggle
    const btnControls = document.getElementById('btnControls');
    const controlsModal = document.getElementById('controlsModal');
    const btnCloseControls = document.getElementById('btnCloseControls');
    if (btnControls && controlsModal && btnCloseControls) {
        btnControls.addEventListener('click', () => {
            controlsModal.classList.remove('hidden');
        });
        btnCloseControls.addEventListener('click', () => {
            controlsModal.classList.add('hidden');
        });
    }
});
