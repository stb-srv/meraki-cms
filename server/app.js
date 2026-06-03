const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const helmet  = require('helmet');
const logger  = require('./logger.js');

const DB      = require('./db.js');
const { requireAuth: makeRequireAuth, requireLicense } = require('./middleware.js');
const { PLAN_DEFINITIONS } = require('./license.js');
const { version: APP_VERSION } = require('../package.json');

module.exports = function(CONFIG, io) {
    const app = express();
    app.set('trust proxy', 1);

    const ADMIN_SECRET = CONFIG.ADMIN_SECRET;
    const LICENSE_SERVER = (CONFIG.LICENSE_SERVER_URL || 'https://licens-prod.stb-srv.de').replace(/\/+$/, '');
    const UPLOADS_DIR  = path.join(__dirname, '..', 'uploads');
    const PLUGINS_DIR  = path.join(__dirname, '..', 'plugins');

    const requireAuth = makeRequireAuth(ADMIN_SECRET);

    // Ensure required directories exist
    [__dirname, UPLOADS_DIR, PLUGINS_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

    try {
        app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc:      ["'self'"],
                    scriptSrc:       ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net'],
                    scriptSrcAttr:   ["'unsafe-inline'"],
                    styleSrc:        ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com'],
                    styleSrcAttr:    ["'unsafe-inline'"],
                    fontSrc:         ["'self'", 'data:', 'https://cdnjs.cloudflare.com', 'https://fonts.gstatic.com'],
                    imgSrc:          ["'self'", 'data:', 'blob:', 'https://maps.gstatic.com', 'https://maps.googleapis.com', 'https://ui-avatars.com', 'https://images.unsplash.com', 'https://images.pexels.com'],
                    connectSrc:      ["'self'", 'ws:', 'wss:', 'https://cdnjs.cloudflare.com', 'https://api.unsplash.com', 'https://api.pexels.com', 'https://generativelanguage.googleapis.com', 'https://licens-prod.stb-srv.de'],
                    frameSrc:        ["'self'", 'https://maps.google.com', 'https://maps.googleapis.com', 'https://www.google.com'],
                    objectSrc:       ["'none'"],
                }
            },
            crossOriginEmbedderPolicy: false,
        }));
        logger.info('Helmet Security-Header aktiv.');
    } catch (e) {
        logger.warn('helmet nicht gefunden – Security-Header deaktiviert.');
    }

    const rawOrigins = CONFIG.CORS_ORIGINS || process.env.CORS_ORIGINS || '';
    const allowedOrigins = rawOrigins ? rawOrigins.split(',').map(o => o.trim()).filter(Boolean) : ['http://localhost:3000', 'http://localhost:5000'];
    app.use(cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error(`CORS: Origin '${origin}' nicht erlaubt.`));
        },
        credentials: true
    }));
    app.use(express.json({ limit: '20mb' }));

    app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const ms = Date.now() - start;
            logger.info({ method: req.method, url: req.originalUrl, status: res.statusCode, ms, ip: req.ip }, `${req.method} ${req.originalUrl} ${res.statusCode} (${ms}ms)`);
        });
        next();
    });

    app.use((req, res, next) => {
        if (CONFIG.SETUP_COMPLETE || req.path === '/api/setup' || req.path === '/api/setup/status' || req.path === '/setup' || req.path.startsWith('/setup-assets')) return next();
        if (req.path.startsWith('/api/')) return res.status(403).json({ success: false, reason: 'SETUP_REQUIRED', message: 'System must be configured first.' });
        res.redirect('/setup');
    });

    app.get('/api/health', (req, res) => {
        const failedPlugins = global._failedPlugins || [];
        res.json({
            status: failedPlugins.length > 0 ? 'degraded' : 'ok',
            version: APP_VERSION,
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
            ...(failedPlugins.length > 0 && { failedPlugins })
        });
    });
    app.get('/api/version', (req, res) => res.json({ version: APP_VERSION }));

    app.use('/api/admin',        require('./routes/auth.js')(ADMIN_SECRET));
    app.use('/api/v1/setup',     require('./routes/setup.js'));
    app.use('/api/users',        require('./routes/users.js')(requireAuth));
    app.use('/api',              require('./routes/menu.js')(requireAuth, requireLicense));
    app.use('/api/orders',       require('./routes/orders.js')(requireAuth, io));
    app.use('/api/reservations', require('./routes/reservations.js')(requireAuth, requireLicense));
    app.use('/api',              require('./routes/tables.js')(requireAuth));
    app.use('/api',              require('./routes/settings.js')(requireAuth, requireLicense, LICENSE_SERVER));
    app.use('/api/upload',       require('./routes/upload.js')(requireAuth, UPLOADS_DIR));
    app.use('/api',              require('./routes/cookie.js')(requireAuth));
    app.use('/api/cart',         require('./routes/cart.js')(requireLicense, io));
    app.use('/api/image-ai',     requireAuth, require('./routes/image-ai.js')(requireAuth, DB));
    app.use('/api/backup',       require('./routes/backup.js')(requireAuth));

    const getInstalledPlugins = () => {
        if (!fs.existsSync(PLUGINS_DIR)) return [];
        return fs.readdirSync(PLUGINS_DIR)
            .filter(f => fs.statSync(path.join(PLUGINS_DIR, f)).isDirectory())
            .map(dir => { try { return JSON.parse(fs.readFileSync(path.join(PLUGINS_DIR, dir, 'plugin.json'))); } catch(e) { return null; } })
            .filter(Boolean);
    };

    app.get('/api/plugins', requireAuth, async (req, res) => {
        try {
            const installed  = getInstalledPlugins();
            const dbPlugins  = await DB.getKV('plugins', []);
            res.json(installed.map(p => { const dbP = dbPlugins.find(x => x.id === p.id); return { ...p, enabled: dbP ? dbP.enabled : false }; }));
        } catch(e) { res.status(500).json({ success: false, reason: e.message }); }
    });

    app.post('/api/plugins/toggle', requireAuth, async (req, res) => {
        try {
            let dbPlugins = await DB.getKV('plugins', []);
            const { id, enabled } = req.body;
            const idx = dbPlugins.findIndex(p => p.id === id);
            if (idx > -1) dbPlugins[idx].enabled = enabled; else dbPlugins.push({ id, enabled });
            await DB.setKV('plugins', dbPlugins);
            res.json({ success: true });
        } catch(e) { res.status(500).json({ success: false, reason: e.message }); }
    });

    app.post('/api/setup', async (req, res) => {
        if (CONFIG.SETUP_COMPLETE) return res.status(403).json({ success: false, reason: 'Already configured' });
        const clientIp = req.ip || req.connection.remoteAddress;
        const isLocal = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';
        if (!isLocal) {
            logger.warn({ ip: clientIp }, 'Remote setup attempt blocked');
            return res.status(403).json({ success: false, reason: 'Setup is only allowed from localhost (127.0.0.1) for security reasons.' });
        }
        try {
            const { restaurantName, licenseServer, adminSecret, smtp, adminUser, adminPass, adminEmail } = req.body;
            if (!adminPass || adminPass.length < 12) return res.status(400).json({ success: false, reason: 'Admin-Passwort ist erforderlich und muss mindestens 12 Zeichen lang sein.' });
            const licenseServerUrl = (licenseServer || 'https://licens-prod.stb-srv.de').replace(/\/+$/, '');
            const trialPlan = PLAN_DEFINITIONS['FREE'];
            const trialLicense = {
                key: 'OPA-TRIAL-' + crypto.randomBytes(4).toString('hex').toUpperCase() + '-' + new Date().getFullYear(),
                status: 'trial', customer: restaurantName || 'Trial', type: 'FREE', label: trialPlan.label,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                modules: trialPlan.modules, limits: { max_dishes: trialPlan.menu_items, max_tables: trialPlan.max_tables },
                isTrial: true
            };
            const newConfig = { LICENSE_SERVER_URL: licenseServerUrl, ADMIN_SECRET: adminSecret || crypto.randomBytes(32).toString('hex'), SMTP: smtp || {}, SETUP_COMPLETE: true };
            const configPath = path.join(__dirname, '..', 'config.json');
            fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 4));
            Object.assign(CONFIG, newConfig);
            const settings = await DB.getKV('settings', {});
            settings.license = trialLicense;
            if (smtp && smtp.host) settings.smtp = smtp;
            await DB.setKV('settings', settings);
            if (restaurantName) { const b = await DB.getKV('branding', {}); b.name = restaurantName; await DB.setKV('branding', b); }
            const finalAdminUser = adminUser || 'admin';
            const hash = await bcrypt.hash(adminPass, 12);
            const plainRecoveryCodes = [], hashedCodes = [];
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            for (let i = 0; i < 3; i++) {
                let code = 'OPA-';
                for (let j=0;j<4;j++) code += chars[Math.floor(Math.random()*chars.length)]; code += '-';
                for (let j=0;j<4;j++) code += chars[Math.floor(Math.random()*chars.length)];
                plainRecoveryCodes.push(code); hashedCodes.push(await bcrypt.hash(code, 12));
            }
            await DB.addUser({ user: finalAdminUser, pass: hash, name: 'Setup', last_name: 'Admin', email: adminEmail || '', role: 'admin', require_password_change: 0, recovery_codes: hashedCodes });
            res.json({ success: true, trial: trialLicense, message: 'Setup abgeschlossen.', recovery_codes: plainRecoveryCodes });
        } catch (e) {
            logger.error({ err: e }, 'Setup error');
            res.status(500).json({ success: false, reason: e.message });
        }
    });

    app.get('/api/setup/status', async (req, res) => {
        try {
            let licenseKey = null;
            if (CONFIG.SETUP_COMPLETE) {
                const settings = await DB.getKV('settings', {});
                if (settings.license && settings.license.key) licenseKey = settings.license.key;
            }
            res.json({ setupComplete: CONFIG.SETUP_COMPLETE, licenseKey });
        } catch (e) { res.json({ setupComplete: CONFIG.SETUP_COMPLETE, licenseKey: null }); }
    });
    
    app.get('/setup', (req, res) => res.sendFile(path.join(__dirname, '..', 'cms', 'setup.html')));

    app.use('/plugins', express.static(PLUGINS_DIR));
    app.use('/uploads', (req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'");
        res.setHeader('X-Frame-Options', 'DENY');
        next();
    }, express.static(UPLOADS_DIR));

    app.use('/admin',   express.static(path.join(__dirname, '..', 'cms')));
    app.use('/',        express.static(path.join(__dirname, '..', 'menu-app')));
    app.use('/',        express.static(path.join(__dirname, '..', 'public')));
    app.get('/status',  (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'status.html')));

    app.use((err, req, res, next) => {
        logger.error({ err, url: req.originalUrl, method: req.method }, 'Unhandled Server Error');
        res.status(err.status || 500).json({ success: false, reason: err.message || 'Interner Serverfehler.' });
    });

    return app;
};
