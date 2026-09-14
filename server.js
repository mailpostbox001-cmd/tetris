const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

io.on('connection', (socket) => {
  socket.on('joinRoom', ({ roomId, userId }) => {
    socket.join(roomId);
    socket.roomId = roomId;

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    const room = rooms.get(roomId);
    room.add(socket.id);

    // Якщо в кімнаті з'явилося 2 гравці — даємо старт
    if (room.size === 2) {
      io.to(roomId).emit('gameStart', { ready: true });
    }
  });

  // Передача матриці поля опоненту
  socket.on('updateGrid', (grid) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('enemyGrid', grid);
    }
  });

  // Передача сміттєвих ліній
  socket.on('sendGarbage', (amount) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('receiveGarbage', amount);
    }
  });

  // Сигнал поразки/перемоги
  socket.on('playerGameOver', () => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('opponentWon');
    }
  });

  socket.on('disconnect', () => {
    if (socket.roomId && rooms.has(socket.roomId)) {
      const room = rooms.get(socket.roomId);
      room.delete(socket.id);
      if (room.size === 0) {
        rooms.delete(socket.roomId);
      } else {
        socket.to(socket.roomId).emit('opponentDisconnected');
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
