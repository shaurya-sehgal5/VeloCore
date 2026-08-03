const { Server } = require('socket.io');
const config = require("./env");
let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`📡 [WebSocket Connection]: Client browser attached with socket ID: ${socket.id}`);

    socket.on('join-deployment-stream', (deploymentId) => {
      console.log("JOIN ROOM:", deploymentId);
      socket.join(deploymentId);
      console.log(`🚪 [WebSocket Room]: Socket ${socket.id} safely entered workspace room: ${deploymentId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 [WebSocket Connection]: Client detached: ${socket.id}`);
    });
  });
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io context infrastructure has not been initialized yet.');
  }
  return io;
};

module.exports = { initSocket, getIO };