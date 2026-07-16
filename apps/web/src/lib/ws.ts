import { io, Socket } from 'socket.io-client';
import { getToken } from './auth';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    socket = io(API_URL, { auth: { token: getToken() } });
  }
  return socket;
}
