const socketIO = require('socket.io');

function setupSocket(server, DB, CONFIG) {
    // server kann null sein – dann wird io losgelöst erzeugt und später per io.attach() gebunden.
    const io = socketIO(server || undefined);
    const ADMIN_SECRET = CONFIG.ADMIN_SECRET;

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.['x-admin-token'];
        if (!token) {
            socket.admin = null; // Gast-Verbindung erlaubt
            return next();
        }
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
