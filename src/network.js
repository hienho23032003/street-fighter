// Client Network Controller (WebSocket Multiplayer Engine)
class NetworkManager {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.roomId = null;
        this.myRole = null; // 'p1' (Girl) or 'p2' (Punk)
        this.isOnline = false;
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

    connect() {
        return new Promise((resolve, reject) => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                resolve(true);
                return;
            }

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host || 'localhost:3000';
            const wsUrl = `${protocol}//${host}`;

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.isConnected = true;
                console.log('[Network] Connected to Game Server WebSocket');
                resolve(true);
            };

            this.ws.onerror = (err) => {
                console.error('[Network] WebSocket error:', err);
                this.isConnected = false;
                reject(err);
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                this.isOnline = false;
                console.log('[Network] Disconnected from Game Server');
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (e) {
                    console.error('[Network] Error handling message:', e);
                }
            };
        });
    }

    handleMessage(data) {
        switch (data.type) {
            case 'ROOM_CREATED':
                this.roomId = data.roomId;
                this.myRole = data.role;
                this.isOnline = true;
                if (this.onRoomCreatedCallback) this.onRoomCreatedCallback(data);
                break;

            case 'ROOM_JOINED':
                this.roomId = data.roomId;
                this.myRole = data.role;
                this.isOnline = true;
                if (this.onRoomJoinedCallback) this.onRoomJoinedCallback(data);
                break;

            case 'START_MATCH':
                if (this.onMatchStartCallback) this.onMatchStartCallback(data);
                break;

            case 'OPPONENT_INPUT':
                this.opponentControls = data.controls;
                break;

            case 'HOST_STATE_SYNC':
                // Client P2 syncs canonical HP/positions from Host P1 if needed
                if (window.gameInstance && this.myRole === 'p2') {
                    window.gameInstance.syncHostState(data.state);
                }
                break;

            case 'OPPONENT_DISCONNECTED':
                if (this.onOpponentDisconnectCallback) {
                    this.onOpponentDisconnectCallback(data.message);
                } else {
                    alert(data.message || 'Đối thủ đã thoát phòng!');
                }
                break;

            case 'ERROR':
                if (this.onErrorCallback) this.onErrorCallback(data.message);
                else alert(data.message);
                break;
        }
    }

    async createRoom() {
        await this.connect();
        this.ws.send(JSON.stringify({ type: 'CREATE_ROOM' }));
    }

    async joinRoom(roomId) {
        await this.connect();
        this.ws.send(JSON.stringify({
            type: 'JOIN_ROOM',
            roomId: String(roomId).trim()
        }));
    }

    sendInput(controls) {
        if (!this.isConnected || !this.isOnline || !this.ws) return;
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'PLAYER_INPUT',
                controls
            }));
        }
    }

    sendStateSync(state) {
        if (!this.isConnected || !this.isOnline || this.myRole !== 'p1' || !this.ws) return;
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'SYNC_STATE',
                state
            }));
        }
    }

    leaveRoom() {
        this.isOnline = false;
        this.roomId = null;
        this.myRole = null;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

window.networkManager = new NetworkManager();
