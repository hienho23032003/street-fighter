const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = 3000;

// Get local IPv4 addresses for LAN sharing
function getLocalIpAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(iface.address);
            }
        }
    }
    return addresses.length > 0 ? addresses[0] : 'localhost';
}

const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.txt': 'text/plain'
};

const server = http.createServer((req, res) => {
    let reqUrl = decodeURI(req.url.split('?')[0]);

    // API: return server IP info
    if (reqUrl === '/api/info') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            ip: getLocalIpAddresses(),
            port: PORT,
            url: `http://${getLocalIpAddresses()}:${PORT}`
        }));
        return;
    }

    if (reqUrl === '/') reqUrl = '/index.html';

    const filePath = path.join(__dirname, reqUrl);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
            res.end(`404 Not Found: ${reqUrl}`);
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache'
        });

        fs.createReadStream(filePath).pipe(res);
    });
});

// WebSocket Realtime Multiplayer Room Engine
const wss = new WebSocketServer({ server });
const rooms = new Map(); // roomId -> { id, p1: ws, p2: ws, state: 'WAITING'|'PLAYING' }

function generateRoomCode() {
    let code;
    do {
        code = Math.floor(1000 + Math.random() * 9000).toString();
    } while (rooms.has(code));
    return code;
}

wss.on('connection', (ws) => {
    ws.roomId = null;
    ws.playerRole = null; // 'p1' or 'p2'

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'CREATE_ROOM': {
                    const roomId = generateRoomCode();
                    rooms.set(roomId, {
                        id: roomId,
                        p1: ws,
                        p2: null,
                        state: 'WAITING'
                    });
                    ws.roomId = roomId;
                    ws.playerRole = 'p1';

                    ws.send(JSON.stringify({
                        type: 'ROOM_CREATED',
                        roomId,
                        role: 'p1',
                        message: `Phòng ${roomId} đã được tạo thành công!`
                    }));
                    console.log(`[Multiplayer] Room created: ${roomId} by Player 1`);
                    break;
                }

                case 'JOIN_ROOM': {
                    const roomId = String(data.roomId).trim();
                    const room = rooms.get(roomId);

                    if (!room) {
                        ws.send(JSON.stringify({
                            type: 'ERROR',
                            message: `Không tìm thấy phòng có mã [${roomId}]. Vui lòng kiểm tra lại!`
                        }));
                        return;
                    }

                    if (room.p2 && room.p2.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: 'ERROR',
                            message: `Phòng [${roomId}] đã đủ 2 người chơi!`
                        }));
                        return;
                    }

                    // Assign P2
                    room.p2 = ws;
                    room.state = 'PLAYING';
                    ws.roomId = roomId;
                    ws.playerRole = 'p2';

                    ws.send(JSON.stringify({
                        type: 'ROOM_JOINED',
                        roomId,
                        role: 'p2',
                        message: `Đã vào phòng ${roomId} thành công!`
                    }));

                    // Broadcast START_MATCH to both players
                    const startPayload = JSON.stringify({
                        type: 'START_MATCH',
                        roomId
                    });

                    if (room.p1 && room.p1.readyState === WebSocket.OPEN) {
                        room.p1.send(startPayload);
                    }
                    if (room.p2 && room.p2.readyState === WebSocket.OPEN) {
                        room.p2.send(startPayload);
                    }

                    console.log(`[Multiplayer] Match started in room: ${roomId}`);
                    break;
                }

                case 'PLAYER_INPUT': {
                    if (!ws.roomId) return;
                    const room = rooms.get(ws.roomId);
                    if (!room) return;

                    const opponent = ws.playerRole === 'p1' ? room.p2 : room.p1;
                    if (opponent && opponent.readyState === WebSocket.OPEN) {
                        opponent.send(JSON.stringify({
                            type: 'OPPONENT_INPUT',
                            role: ws.playerRole,
                            controls: data.controls
                        }));
                    }
                    break;
                }

                case 'SYNC_STATE': {
                    if (!ws.roomId || ws.playerRole !== 'p1') return;
                    const room = rooms.get(ws.roomId);
                    if (!room || !room.p2 || room.p2.readyState !== WebSocket.OPEN) return;

                    room.p2.send(JSON.stringify({
                        type: 'HOST_STATE_SYNC',
                        state: data.state
                    }));
                    break;
                }

                case 'REMATCH_REQ': {
                    if (!ws.roomId) return;
                    const room = rooms.get(ws.roomId);
                    if (!room) return;

                    const opponent = ws.playerRole === 'p1' ? room.p2 : room.p1;
                    if (opponent && opponent.readyState === WebSocket.OPEN) {
                        opponent.send(JSON.stringify({
                            type: 'OPPONENT_REMATCH_REQ'
                        }));
                    }
                    break;
                }

                case 'REMATCH_ACCEPT': {
                    if (!ws.roomId) return;
                    const room = rooms.get(ws.roomId);
                    if (!room) return;

                    const startPayload = JSON.stringify({
                        type: 'START_MATCH',
                        roomId: ws.roomId
                    });

                    if (room.p1 && room.p1.readyState === WebSocket.OPEN) {
                        room.p1.send(startPayload);
                    }
                    if (room.p2 && room.p2.readyState === WebSocket.OPEN) {
                        room.p2.send(startPayload);
                    }
                    break;
                }
            }
        } catch (e) {
            console.error('WebSocket parse error:', e);
        }
    });

    ws.on('close', () => {
        if (ws.roomId) {
            const room = rooms.get(ws.roomId);
            if (room) {
                const opponent = ws.playerRole === 'p1' ? room.p2 : room.p1;
                if (opponent && opponent.readyState === WebSocket.OPEN) {
                    opponent.send(JSON.stringify({
                        type: 'OPPONENT_DISCONNECTED',
                        message: 'Đối thủ đã thoát khỏi phòng đấu!'
                    }));
                }
                rooms.delete(ws.roomId);
                console.log(`[Multiplayer] Room closed: ${ws.roomId}`);
            }
        }
    });
});

const localIp = getLocalIpAddresses();
server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`⚡ STREET FIGHTER GAME SERVER RUNNING ⚡`);
    console.log(`> Máy cục bộ (Local): http://localhost:${PORT}`);
    console.log(`> Máy khác cùng Wi-Fi (LAN): http://${localIp}:${PORT}`);
    console.log(`=======================================================`);
});
