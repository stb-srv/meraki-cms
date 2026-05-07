const socketIO = require('socket.io');

function setupSocket(server, DB, CONFIG) {
    const io = socketIO(server);
    const ADMIN_SECRET = CONFIG.ADMIN_SECRET;

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.['x-admin-token'];
        if (!token) return next(new Error('Authentifizierung erforderlich'));
        try {
            socket.admin = require('jsonwebtoken').verify(token, ADMIN_SECRET);
            next();
        } catch (e) {
            next(new Error('Ungültiger Token'));
        }
    });

    return io;
}

module.exports = setupSocket;
