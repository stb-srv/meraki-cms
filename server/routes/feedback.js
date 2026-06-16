/**
 * Routes – Gäste-Feedback / Bewertungen
 *
 *   GET    /api/feedback        → Liste der Bewertungen (Admin, Dashboard-Widget)
 *   POST   /api/feedback        → Neue Bewertung (öffentlich, von Gästen)
 *   DELETE /api/feedback/:id    → Bewertung löschen (Admin)
 */
const router = require('express').Router();
const DB = require('../db');

module.exports = (requireAuth) => {
    router.get('/feedback', requireAuth, async (req, res) => {
        try { res.json(await DB.getFeedback() || []); }
        catch(e) { res.status(500).json({ success: false, reason: e.message }); }
    });

    router.post('/feedback', async (req, res) => {
        try {
            const { guest_name, rating, comment } = req.body || {};
            const r = parseInt(rating, 10);
            if (!r || r < 1 || r > 5) {
                return res.status(400).json({ success: false, reason: 'Bewertung (rating) muss zwischen 1 und 5 liegen.' });
            }
            await DB.addFeedback({
                guest_name: (guest_name || '').toString().slice(0, 255),
                rating: r,
                comment: (comment || '').toString().slice(0, 2000),
            });
            res.json({ success: true });
        } catch(e) { res.status(500).json({ success: false, reason: e.message }); }
    });

    router.delete('/feedback/:id', requireAuth, async (req, res) => {
        try { await DB.deleteFeedback(req.params.id); res.json({ success: true }); }
        catch(e) { res.status(500).json({ success: false, reason: e.message }); }
    });

    return router;
};
