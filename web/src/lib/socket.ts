/**
 * Socket.IO-Singleton (Port von cms/modules/realtime.js).
 * Verbindet authentifiziert (JWT) und reicht Server-Events typisiert weiter.
 * UI-Komponenten abonnieren via useSocket()-Hook statt globaler CustomEvents.
 */
import { io, type Socket } from 'socket.io-client';
import { getAuthToken } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
    if (socket) return socket;
    socket = io({
        transports: ['websocket', 'polling'],
        auth: { token: getAuthToken() || '' },
        autoConnect: true,
    });
    return socket;
}

export function disconnectSocket(): void {
    socket?.disconnect();
    socket = null;
}

/** Server-Events (siehe server/routes/orders.js & cart.js – nur diese werden emittiert). */
export type RealtimeEvent = 'new_order' | 'order-updated';
