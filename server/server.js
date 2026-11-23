import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import { randomInt } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' }, pingInterval: 20000, pingTimeout: 45000 });
const rooms = new Map();
const PORT = Number(process.env.PORT || 3000);
const MAX_PLAYERS = 4;

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'Ludo Darwesh', rooms: rooms.size }));
app.get('/status', (_req, res) => res.type('text').send('Ludo Darwesh multiplayer server is running.'));

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do { code = Array.from({ length: 5 }, () => chars[randomInt(chars.length)]).join(''); }
  while (rooms.has(code));
  return code;
}
function publicRoom(room) {
  return { code: room.code, hostId: room.hostId, status: room.status,
    maxPlayers: room.maxPlayers, players: room.players.map(p => ({ id: p.id, name: p.name, color: p.color })) };
}
function sendRoom(room) { io.to(room.code).emit('room:update', publicRoom(room)); }

io.on('connection', socket => {
  socket.on('room:create', ({ name = 'Player', maxPlayers = 4 } = {}, reply = () => {}) => {
    const cap = Math.max(2, Math.min(MAX_PLAYERS, Number(maxPlayers) || 4));
    const code = makeCode();
    const room = { code, hostId: socket.id, status: 'waiting', maxPlayers: cap,
      players: [{ id: socket.id, name: String(name).slice(0, 18), color: 'Pink' }], state: null };
    rooms.set(code, room); socket.join(code);
    reply({ ok: true, room: publicRoom(room) }); sendRoom(room);
  });

  socket.on('room:join', ({ code, name = 'Player' } = {}, reply = () => {}) => {
    const key = String(code || '').trim().toUpperCase();
    const room = rooms.get(key);
    if (!room) return reply({ ok: false, error: 'Room not found.' });
    if (room.status !== 'waiting') return reply({ ok: false, error: 'Game has already started.' });
    if (room.players.length >= room.maxPlayers) return reply({ ok: false, error: 'Room is full.' });
    if (room.players.some(p => p.id === socket.id)) return reply({ ok: true, room: publicRoom(room) });
    const colors = ['Pink', 'Green', 'Yellow', 'Blue'];
    room.players.push({ id: socket.id, name: String(name).slice(0, 18), color: colors[room.players.length] });
    socket.join(key); reply({ ok: true, room: publicRoom(room) }); sendRoom(room);
  });

  socket.on('room:start', ({ code } = {}, reply = () => {}) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room) return reply({ ok: false, error: 'Room not found.' });
    if (room.hostId !== socket.id) return reply({ ok: false, error: 'Only the host can start.' });
    if (room.players.length < 2) return reply({ ok: false, error: 'At least 2 players are required.' });
    room.status = 'playing'; sendRoom(room); reply({ ok: true });
  });

  // Host broadcasts the current game state to every player. The host currently
  // runs the existing game rules; server-side move validation is a future hardening step.
  socket.on('game:action', ({ code, action } = {}) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room || room.status !== 'playing' || !action || typeof action.type !== 'string') return;
    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex < 0) return;
    io.to(room.hostId).emit('game:action', { playerIndex, action });
  });

  socket.on('game:snapshot', ({ code, snapshot } = {}) => {
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room || room.status !== 'playing' || room.hostId !== socket.id) return;
    room.state = snapshot; socket.to(room.code).emit('game:snapshot', snapshot);
  });

  socket.on('disconnect', () => {
    for (const [code, room] of rooms) {
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx < 0) continue;
      room.players.splice(idx, 1);
      if (!room.players.length) rooms.delete(code);
      else {
        if (room.hostId === socket.id) room.hostId = room.players[0].id;
        sendRoom(room);
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => console.log(`Ludo Darwesh server listening on ${PORT}`));
