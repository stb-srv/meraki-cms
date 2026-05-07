const http = require('http');
const path = require('path');
const fs = require('fs');

const CONFIG = require('./config.js');
const logger = require('./server/logger.js');
const DB = require('./server/db.js');
const { requireAuth: makeRequireAuth, requireLicense } = require('./server/middleware.js');
const { startCron } = require('./server/cron.js');
const { version: APP_VERSION } = require('./package.json');

const setupSocket = require('./server/socket.js');
const createApp = require('./server/app.js');

const PORT = CONFIG.PORT || 5000;
const PLUGINS_DIR = path.join(__dirname, 'plugins');
const requireAuth = makeRequireAuth(CONFIG.ADMIN_SECRET);

startCron();

const server = http.createServer();
const io = setupSocket(server, DB, CONFIG);
const app = createApp(CONFIG, io);
server.on('request', app);

async function start() {
    try {
        const enabledPlugins = await DB.getKV('plugins', []);
        enabledPlugins.filter(p => p.enabled).forEach(p => {
            const safeId = path.basename(p.id);
            const resolvedPath = path.resolve(PLUGINS_DIR, safeId, 'server.js');
            if (!resolvedPath.startsWith(path.resolve(PLUGINS_DIR))) return logger.warn({ plugin: safeId }, 'Plugin abgelehnt: Path Traversal erkannt');
            if (fs.existsSync(resolvedPath)) {
                try {
                    logger.info({ plugin: safeId, path: resolvedPath }, 'Plugin geladen');
                    const plug = require(resolvedPath);
                    if (typeof plug === 'function') plug(app, { DB, requireAuth, requireLicense });
                } catch(e) { logger.error({ err: e, plugin: safeId }, 'Plugin load failed'); }
            }
        });
    } catch(e) { logger.warn({ err: e }, 'Plugin-Loader Fehler'); }

    server.listen(PORT, () => {
        const allowedOrigins = (CONFIG.CORS_ORIGINS || process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
        logger.info({ version: APP_VERSION, port: PORT, licenseServer: CONFIG.LICENSE_SERVER_URL, cors: allowedOrigins }, 'OPA-CMS gestartet');
    });
}

start().catch(e => {
    logger.fatal({ err: e }, 'Server-Start fehlgeschlagen');
    process.exit(1);
});
