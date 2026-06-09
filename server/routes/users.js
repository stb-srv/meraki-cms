/**
 * Routes – Users
 */
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const DB = require('../db');
const Mailer = require('../services/mailer.js');
const logger = require('../core/logger.js');
const validate = require('../validation/validate.js');
const { userSchema, anyObjectSchema } = require('../validation/schemas.js');
const { requireRole } = require('../core/middleware.js');

module.exports = (requireAuth) => {
    router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
        try {
            const users = await DB.getUsers();
            const safeUsers = (users || []).map(u => { const copy = { ...u }; delete copy.pass; return copy; });
            res.json(safeUsers);
        } catch(e) { logger.error({ err: e }, 'Users route Fehler'); res.status(500).json({ success: false, reason: 'Interner Serverfehler.' }); }
    });

    router.post('/', requireAuth, requireRole('admin'), validate(userSchema), async (req, res) => {
        try {
            const u = req.body;
            const users = await DB.getUsers();
            const existing = (users || []).find(x => x.user === u.user);
            if (existing) return res.status(400).json({ success: false, reason: 'Benutzername existiert bereits.' });
            const plainPass = crypto.randomBytes(12).toString('hex');
            u.pass = await bcrypt.hash(plainPass, 12);
            u.require_password_change = 1;
            await DB.addUser(u);
            if (u.email) Mailer.sendUserCredentials(u.email, u.name, u.user, plainPass, DB).catch(e => logger.error({ err: e }, 'Mailer Fehler beim User-Anlegen'));
            res.json({ success: true });
        } catch(e) { logger.error({ err: e }, 'Users route Fehler'); res.status(500).json({ success: false, reason: 'Interner Serverfehler.' }); }
    });

    router.put('/:user', requireAuth, requireRole('admin'), validate(anyObjectSchema), async (req, res) => {
        try {
            const { pass, recovery_codes, ...safeUpdate } = req.body;
            await DB.updateUser(req.params.user, safeUpdate);
            res.json({ success: true });
        } catch(e) { logger.error({ err: e }, 'Users route Fehler'); res.status(500).json({ success: false, reason: 'Interner Serverfehler.' }); }
    });

    router.delete('/:user', requireAuth, requireRole('admin'), async (req, res) => {
        try {
            if (req.params.user === req.admin.user)
                return res.status(400).json({ success: false, reason: 'Kann sich selbst nicht löschen.' });
            await DB.deleteUser(req.params.user);
            res.json({ success: true });
        } catch(e) { logger.error({ err: e }, 'Users route Fehler'); res.status(500).json({ success: false, reason: 'Interner Serverfehler.' }); }
    });

    router.post('/:user/reset', requireAuth, requireRole('admin'), validate(anyObjectSchema), async (req, res) => {
        try {
            const users = await DB.getUsers();
            const target = (users || []).find(x => x.user === req.params.user);
            if (!target) return res.status(404).json({ success: false, reason: 'Benutzer nicht gefunden.' });
            if (!target.email) return res.status(400).json({ success: false, reason: 'Benutzer hat keine E-Mail Adresse hinterlegt.' });
            const plainPass = crypto.randomBytes(12).toString('hex');
            const hashed = await bcrypt.hash(plainPass, 12);
            await DB.setUserPass(target.user, hashed, true);
            Mailer.sendUserCredentials(target.email, target.name, target.user, plainPass, DB).catch(e => logger.error({ err: e }, 'Mailer Fehler beim Passwort-Reset'));
            res.json({ success: true });
        } catch(e) { logger.error({ err: e }, 'Users route Fehler'); res.status(500).json({ success: false, reason: 'Interner Serverfehler.' }); }
    });

    return router;
};
