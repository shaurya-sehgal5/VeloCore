const { Server } = require('socket.io');

let io = null;

/**
 * 📡 INITIALIZE SOCKET.IO NETWORK HUB:
 * Binds the real-time server layer onto our HTTP instance and establishes
 * an explicit CORS security bridge for local development environments.
 */
const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      // Allows connection handshakes from both localhost and native loopback IP variations
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`📡 [WebSocket Connection]: Client browser attached with socket ID: ${socket.id}`);

    /**
     * 🚪 ROOM JOINING ROUTINE:
     * Isolates the client browser into a specific deployment ID channel.
     * This ensures you only receive logs for the specific project you clicked deploy on.
     */
    socket.on('join-deployment-stream', (deploymentId) => {
      socket.join(deploymentId);
      console.log(`🚪 [WebSocket Room]: Socket ${socket.id} safely entered workspace room: ${deploymentId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 [WebSocket Connection]: Client detached: ${socket.id}`);
    });
  });

  return io;
};

/**
 * 🧪 RETRIEVE SOCKET INSTANCE EXTEXT:
 * Provides access to the established IO instance across other service layers
 * (like build.service.js) so the container loop can emit data streams at will.
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io context infrastructure has not been initialized yet.');
  }
  return io;
};

module.exports = { initSocket, getIO };