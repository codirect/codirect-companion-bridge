const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: process.env.PORT || 8081 });

const ALLOWED_TYPES = ['action', 'telemetry', 'ping'];

// Map to store app-to-companion pairs
const rooms = new Map();
console.log("Running")

wss.on('connection', (ws, req) => {
    console.log('CONNECTED', req.socket.remoteAddress);

    let roomId = null;

    ws.on('message', (msg) => {

        let data;
        try {
            data = JSON.parse(msg);
        } catch (e) {
            return;
        }

        // Client identifies which session it belongs to
        if (data.type === 'join') {
            const isValidId = /^[a-zA-Z0-9-]{8,40}$/.test(data.roomId);
            if (!isValidId) return;

            roomId = data.roomId;
            if (!rooms.has(roomId)) rooms.set(roomId, new Set());
            rooms.get(roomId).add(ws);
            console.log(`Client joined room: ${roomId}`);
        }

        // Forward messages to others in the same room
        if (roomId && rooms.has(roomId)) {
            if (ALLOWED_TYPES.includes(data.type)) {
                for (let client of rooms.get(roomId)) {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(data));
                    }
                }
            }
        }
    });

    ws.on('close', () => {
        if (roomId && rooms.has(roomId)) rooms.get(roomId).delete(ws);
        console.log('WS CLOSED');
    });

    wss.on('error', (err) => {
        console.error(err);
    });
});