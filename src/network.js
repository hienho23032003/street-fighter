// WebRTC P2P Multiplayer Controller (Zero Backend required, 100% Netlify Compatible)
class NetworkManager {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.isConnected = false;
        this.isOnline = false;
        this.roomId = null;
        this.myRole = null; // 'p1' (Host - Girl) or 'p2' (Joiner - Punk)
        this.opponentControls = {
            left: false,
            right: false,
            up: false,
            down: false,
            attack1: false,
            attack2: false,
            special: false
        };

        this.onRoomCreatedCallback = null;
        this.onRoomJoinedCallback = null;
        this.onMatchStartCallback = null;
        this.onErrorCallback = null;
        this.onOpponentDisconnectCallback = null;
    }

    generateCode() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }

    // Host a new Room (Player 1)
    createRoom() {
        return new Promise((resolve) => {
            if (this.peer) {
                try { this.peer.destroy(); } catch (e) {}
            }

            const code = this.generateCode();
            const peerId = `sf-room-${code}`;

            this.peer = new Peer(peerId, {
                debug: 1,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });

            this.peer.on('open', (id) => {
                this.roomId = code;
                this.myRole = 'p1';
                this.isOnline = true;
                this.isConnected = true;

                if (this.onRoomCreatedCallback) {
                    this.onRoomCreatedCallback({ roomId: code, role: 'p1' });
                }
                resolve(code);
            });

            this.peer.on('connection', (conn) => {
                this.conn = conn;
                this.setupConnectionHandlers();

                this.conn.on('open', () => {
                    // Start match for both host and peer
                    this.conn.send({ type: 'START_MATCH', roomId: this.roomId });
                    if (this.onMatchStartCallback) {
                        this.onMatchStartCallback({ roomId: this.roomId, role: 'p1' });
                    }
                });
            });

            this.peer.on('error', (err) => {
                console.error('[WebRTC Host Error]', err);
                if (err.type === 'unavailable-id') {
                    // Retry with new code if collision
                    this.createRoom().then(resolve);
                } else {
                    if (this.onErrorCallback) {
                        this.onErrorCallback(`Lỗi kết nối máy chủ phòng: ${err.type || err.message}`);
                    }
                }
            });
        });
    }

    // Join an existing Room (Player 2)
    joinRoom(code) {
        return new Promise((resolve) => {
            if (this.peer) {
                try { this.peer.destroy(); } catch (e) {}
            }

            const cleanCode = String(code).trim();
            const targetPeerId = `sf-room-${cleanCode}`;

            this.peer = new Peer({
                debug: 1,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });

            this.peer.on('open', (myId) => {
                this.roomId = cleanCode;
                this.myRole = 'p2';
                this.isOnline = true;

                this.conn = this.peer.connect(targetPeerId, {
                    reliable: true
                });

                this.setupConnectionHandlers();

                this.conn.on('open', () => {
                    this.isConnected = true;
                    if (this.onRoomJoinedCallback) {
                        this.onRoomJoinedCallback({ roomId: cleanCode, role: 'p2' });
                    }
                    resolve(true);
                });
            });

            this.peer.on('error', (err) => {
                console.error('[WebRTC Join Error]', err);
                if (this.onErrorCallback) {
                    this.onErrorCallback(`Không thể kết nối tới phòng [${cleanCode}]. Vui lòng kiểm tra lại mã phòng!`);
                }
                resolve(false);
            });
        });
    }

    setupConnectionHandlers() {
        if (!this.conn) return;

        this.conn.on('data', (data) => {
            if (!data) return;

            switch (data.type) {
                case 'START_MATCH':
                    if (this.onMatchStartCallback) {
                        this.onMatchStartCallback(data);
                    }
                    break;

                case 'PLAYER_INPUT':
                    this.opponentControls = data.controls || this.opponentControls;
                    break;

                case 'SYNC_STATE':
                    if (window.gameInstance && this.myRole === 'p2') {
                        window.gameInstance.syncHostState(data.state);
                    }
                    break;

                case 'REMATCH_REQ':
                    if (window.gameInstance) {
                        window.gameInstance.startNewMatch('ONLINE');
                    }
                    break;
            }
        });

        this.conn.on('close', () => {
            this.isConnected = false;
            this.isOnline = false;
            if (this.onOpponentDisconnectCallback) {
                this.onOpponentDisconnectCallback('Đối thủ đã ngắt kết nối hoặc rời phòng!');
            }
        });

        this.conn.on('error', (err) => {
            console.warn('[WebRTC Data Error]', err);
        });
    }

    sendInput(controls) {
        if (!this.conn || !this.isConnected || !this.isOnline) return;
        try {
            this.conn.send({
                type: 'PLAYER_INPUT',
                controls
            });
        } catch (e) {}
    }

    sendStateSync(state) {
        if (!this.conn || !this.isConnected || !this.isOnline || this.myRole !== 'p1') return;
        try {
            this.conn.send({
                type: 'SYNC_STATE',
                state
            });
        } catch (e) {}
    }

    leaveRoom() {
        this.isOnline = false;
        this.isConnected = false;
        this.roomId = null;
        this.myRole = null;
        if (this.conn) {
            try { this.conn.close(); } catch (e) {}
            this.conn = null;
        }
        if (this.peer) {
            try { this.peer.destroy(); } catch (e) {}
            this.peer = null;
        }
    }
}

window.networkManager = new NetworkManager();
