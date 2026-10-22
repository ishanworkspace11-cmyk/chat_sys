import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const socket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'],
  withCredentials: true,
  autoConnect: true,
});

socket.on('connect', () => {
  console.log('Socket Connected:', socket.id);
});

socket.on('connect_error', (err) => {
  console.warn('Socket connection error:', err.message);
});

export default socket;
