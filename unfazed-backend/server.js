require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const app = require('./src/app');
const connectDB = require('./src/config/db');
const initChatSocket = require('./src/sockets/chatSocket');
const { runNotificationSweep } = require('./src/services/notificationService');

const PORT = process.env.PORT || 5000;
const SWEEP_INTERVAL_MS = Number(process.env.NOTIFICATION_SWEEP_INTERVAL_MS || 15 * 60 * 1000);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const allowed = String(process.env.CORS_ORIGIN || '*').split(',').map((value) => value.trim()).filter(Boolean);
      if (!origin || allowed.includes('*') || allowed.includes(origin)) return callback(null, true);
      return callback(new Error('CORS origin not allowed'));
    },
  },
});

initChatSocket(io);

let sweepRunning = false;
const runSweep = async () => {
  if (sweepRunning) return;
  sweepRunning = true;
  try {
    await runNotificationSweep();
  } catch (err) {
    console.error('[notification-sweep] failed:', err.message);
  } finally {
    sweepRunning = false;
  }
};

const start = async () => {
  await connectDB();
  setTimeout(runSweep, 5000);
  setInterval(runSweep, SWEEP_INTERVAL_MS);
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

start().catch((error) => {
  console.error(`[startup] ${error.message}`);
  process.exit(1);
});
