/**
 * Routes – Gäste-Feedback / Bewertungen
 *
 *   GET    /api/feedback        → Liste der Bewertungen (Admin, Dashboard-Widget)
 *   POST   /api/feedback        → Neue Bewertung (öffentlich, von Gästen; rate-limited + validiert)
 *   DELETE /api/feedback/:id    → Bewertung löschen (Admin)
 */
const router = require('express').Router();
const DB = require('../db');
const validate = require('../validation/validate.js');
const { feedbackSchema } = require('../validation/schemas.js');
const { requireRole, feedbackLimiter } = require('../core/middleware.js');
const logger = require('../core/logger.js');

module.exports = (requireAuth) => {
    router.get('/feedback', requireAuth, async (req, res) => {
        try {
            res.json((await DB.getFeedback()) || []);
        } catch (e) {
            logger.error({ err: e }, 'GET /feedback Fehler');
            res.status(500).json({ success: false, reason: 'Interner Serverfehler.' });
        }
    });

    router.post('/feedback', feedbackLimiter, validate(feedbackSchema), async (req, res) => {
        try {
            const { guest_name, rating, comment } = req.body || {};
            const r = parseInt(rating, 10);
            if (!r || r < 1 || r > 5) {
                return res.status(400).json({
                    success: false,
                    reason: 'Bewertung (rating) muss zwischen 1 und 5 liegen.',
                });
            }
            await DB.addFeedback({
                guest_name: (guest_name || '').toString().slice(0, 255),
                rating: r,
                comment: (comment || '').toString().slice(0, 2000),
            });
            res.json({ success: true });
        } catch (e) {
            logger.error({ err: e }, 'POST /feedback Fehler');
            res.status(500).json({ success: false, reason: 'Interner Serverfehler.' });
        }
    });

    router.delete('/feedback/:id', requireAuth, requireRole('admin'), async (req, res) => {
        try {
            await DB.deleteFeedback(req.params.id);
            try {
                if (DB.addAuditLog)
                    await DB.addAuditLog({
                        actor: req.admin?.user || req.admin?.name || null,
                        action: 'feedback.delete',
                        entity: 'feedback',
                        entity_id: req.params.id,
                    });
            } catch (_) {}
            res.json({ success: true });
        } catch (e) {
            logger.error({ err: e }, 'DELETE /feedback/:id Fehler');
            res.status(500).json({ success: false, reason: 'Interner Serverfehler.' });
        }
    });

    return router;
};
