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
            speed: 4.0,
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

        // Keys state tracker
        this.keys = {};
        this.setupInput();

        // Bind global instance for access by fighters/particles
        window.gameInstance = this;
    }

    setupInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'KeyP' && (this.gameState === 'PLAYING' || this.gameState === 'PAUSED')) {
                if (this.gameMode !== 'ONLINE') {
                    this.togglePause();
                }
            }
            // Prevent scrolling on arrow keys and space
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    getLocalPrimaryControls() {
        return {
            left: this.keys['KeyA'] || this.keys['ArrowLeft'] || false,
            right: this.keys['KeyD'] || this.keys['ArrowRight'] || false,
            up: this.keys['KeyW'] || this.keys['ArrowUp'] || false,
            down: this.keys['KeyS'] || this.keys['ArrowDown'] || false,
            attack1: this.keys['KeyJ'] || this.keys['Numpad1'] || this.keys['KeyU'] || false,
            attack2: this.keys['KeyK'] || this.keys['Numpad2'] || this.keys['KeyI'] || false,
            special: this.keys['KeyL'] || this.keys['Numpad3'] || this.keys['KeyO'] || false
        };
    }

    getP1Controls() {
        if (this.gameMode === 'ONLINE') {
            if (window.networkManager.myRole === 'p1') {
                const controls = {
                    left: this.keys['KeyA'] || false,
                    right: this.keys['KeyD'] || false,
                    up: this.keys['KeyW'] || false,
                    down: this.keys['KeyS'] || false,
                    attack1: this.keys['KeyJ'] || false,
                    attack2: this.keys['KeyK'] || false,
                    special: this.keys['KeyL'] || false
                };
                window.networkManager.sendInput(controls);
                return controls;
            } else {
                return window.networkManager.opponentControls;
            }
        }

        return {
            left: this.keys['KeyA'] || false,
            right: this.keys['KeyD'] || false,
            up: this.keys['KeyW'] || false,
            down: this.keys['KeyS'] || false,
            attack1: this.keys['KeyJ'] || false,
            attack2: this.keys['KeyK'] || false,
            special: this.keys['KeyL'] || false
        };
    }

    getP2Controls() {
        if (this.gameMode === 'ONLINE') {
            if (window.networkManager.myRole === 'p2') {
                const controls = this.getLocalPrimaryControls();
                window.networkManager.sendInput(controls);
                return controls;
            } else {
                return window.networkManager.opponentControls;
            }
        }

        if (this.gameMode === 'PVE') {
            return this.aiController.update(this.player2, this.player1);
        }

        return {
            left: this.keys['ArrowLeft'] || false,
            right: this.keys['ArrowRight'] || false,
            up: this.keys['ArrowUp'] || false,
            down: this.keys['ArrowDown'] || false,
            attack1: this.keys['Numpad1'] || this.keys['KeyU'] || false,
            attack2: this.keys['Numpad2'] || this.keys['KeyI'] || false,
            special: this.keys['Numpad3'] || this.keys['KeyO'] || false
        };
    }

    startNewMatch(mode = 'PVP', aiDifficulty = 'NORMAL') {
        this.gameMode = mode;
        this.player2.isAI = (mode === 'PVE');
        if (mode === 'PVE') {
            this.aiController.setDifficulty(aiDifficulty);
        }

        this.player1.roundsWon = 0;
        this.player2.roundsWon = 0;
        this.currentRound = 1;

        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('multiplayerModal').classList.add('hidden');
        document.getElementById('victoryModal').classList.add('hidden');

        // Update name badge in online mode
        const p1NameEl = document.querySelector('.fighter-name.p1');
        const p2NameEl = document.querySelector('.fighter-name.p2');
        if (mode === 'ONLINE') {
            if (window.networkManager.myRole === 'p1') {
                if (p1NameEl) p1NameEl.innerText = 'BRAWLER GIRL (YOU)';
                if (p2NameEl) p2NameEl.innerText = 'ENEMY PUNK (P2)';
            } else {
                if (p1NameEl) p1NameEl.innerText = 'BRAWLER GIRL (P1)';
                if (p2NameEl) p2NameEl.innerText = 'ENEMY PUNK (YOU)';
            }
        } else {
            if (p1NameEl) p1NameEl.innerText = 'BRAWLER GIRL';
            if (p2NameEl) p2NameEl.innerText = mode === 'PVE' ? `ENEMY PUNK (${aiDifficulty})` : 'ENEMY PUNK';
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
        this.player1.x = state.p1X;
        this.player1.y = state.p1Y;
        this.player2.x = state.p2X;
        this.player2.y = state.p2Y;
        this.roundTimer = state.timer;
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
        if (this.gameMode === 'ONLINE' && window.networkManager.myRole === 'p1') {
            this.syncTick++;
            if (this.syncTick % 10 === 0) {
                window.networkManager.sendStateSync({
                    p1Hp: this.player1.hp,
                    p2Hp: this.player2.hp,
                    p1X: this.player1.x,
                    p1Y: this.player1.y,
                    p2X: this.player2.x,
                    p2Y: this.player2.y,
                    timer: this.roundTimer
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

// Global initialization & Network Event Bindings
window.addEventListener('DOMContentLoaded', async () => {
    const game = new Game();

    const progressBar = document.getElementById('loadingProgress');
    const loadingScreen = document.getElementById('loadingScreen');
    const startScreen = document.getElementById('startScreen');
    const multiplayerModal = document.getElementById('multiplayerModal');

    // Fetch server IP info for LAN sharing
    fetch('/api/info')
        .then(r => r.json())
        .then(data => {
            const lanIpEl = document.getElementById('lanIpDisplay');
            if (lanIpEl && data.url) {
                lanIpEl.innerText = data.url;
            }
        })
        .catch(() => {});

    await window.spriteManager.loadAllAssets((progress) => {
        if (progressBar) progressBar.style.width = `${Math.round(progress * 100)}%`;
    });

    if (loadingScreen) loadingScreen.classList.add('hidden');
    if (startScreen) startScreen.classList.remove('hidden');
    game.gameState = 'MENU';

    // Start game loop
    game.loop();

    // Setup Network Manager Callbacks
    window.networkManager.onRoomCreatedCallback = (data) => {
        document.getElementById('hostWaitingView').classList.remove('hidden');
        document.getElementById('joinInputView').classList.add('hidden');
        document.getElementById('roomCodeDisplay').innerText = data.roomId;
    };

    window.networkManager.onRoomJoinedCallback = (data) => {
        document.getElementById('joinInputView').innerHTML = `
            <p style="font-size: 11px; color: var(--arcade-cyan); margin: 15px 0;">
                Đã vào phòng <b>${data.roomId}</b>! Đang chờ bắt đầu...
            </p>
        `;
    };

    window.networkManager.onMatchStartCallback = (data) => {
        multiplayerModal.classList.add('hidden');
        game.startNewMatch('ONLINE');
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

    // Mode Selection Buttons
    document.getElementById('btnPvp').addEventListener('click', () => {
        game.startNewMatch('PVP');
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

    document.getElementById('btnPveEasy').addEventListener('click', () => {
        game.startNewMatch('PVE', 'EASY');
    });

    document.getElementById('btnPveNormal').addEventListener('click', () => {
        game.startNewMatch('PVE', 'NORMAL');
    });

    document.getElementById('btnPveHard').addEventListener('click', () => {
        game.startNewMatch('PVE', 'HARD');
    });

    document.getElementById('btnRematch').addEventListener('click', () => {
        if (game.gameMode === 'ONLINE') {
            game.startNewMatch('ONLINE');
        } else {
            game.startNewMatch(game.gameMode, game.aiController.difficulty);
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
