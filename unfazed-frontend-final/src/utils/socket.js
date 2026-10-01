import { io } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const socket = io(SOCKET_URL, { autoConnect: false, auth: {} });
let consumers = 0;
let activeToken = '';

export const acquireSocket = (token) => {
  if (!token) return false;
  if (activeToken && activeToken !== token && socket.connected) socket.disconnect();
  activeToken = token;
  socket.auth = { token };
  consumers += 1;
  if (!socket.connected) socket.connect();
  return true;
};

export const releaseSocket = () => {
  consumers = Math.max(0, consumers - 1);
  if (consumers === 0 && socket.connected) {
    socket.disconnect();
    activeToken = '';
  }
};

export const getSocket = () => socket;
export default socket;
