const express = require('express');
const bcrypt = require('bcryptjs');
const DB = require('../db.js');

const router = express.Router();

/**
 * POST /api/v1/setup
 * Einmalige Ersteinrichtung: Admin-Account + Restaurant-Name speichern.
 * Danach wird Setup deaktiviert (isSetupDone = true in settings).
 */
router.post('/', async (req, res) => {
    try {
        // Prüfen ob Setup schon durchgeführt wurde
        // Wir nutzen getKV('settings') um den Status zu prüfen
        const settings = await DB.getKV('settings', {});
        if (settings.isSetupDone === true || settings.isSetupDone === 'true') {
            return res.status(403).json({ success: false, message: 'Setup wurde bereits abgeschlossen.' });
        }

        const { adminName, adminEmail, adminPassword, restaurantName, licenseKey } = req.body;

        if (!adminEmail || !adminPassword || !restaurantName) {
            return res.status(400).json({ success: false, message: 'adminEmail, adminPassword und restaurantName sind erforderlich.' });
        }

        // Admin-Passwort hashen
        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        // Admin-User anlegen
        // Wir nutzen adminEmail als Benutzernamen (user)
        await DB.addUser({
            user: adminEmail,
            pass: hashedPassword,
            name: adminName || 'Administrator',
            email: adminEmail,
            role: 'admin',
            require_password_change: 0
        });

        // Restaurant-Name + LicenseKey speichern (in branding und settings)
        const branding = await DB.getKV('branding', {});
        branding.name = restaurantName;
        await DB.setKV('branding', branding);

        if (licenseKey) {
            settings.license = { key: licenseKey, status: 'active', type: 'PRO' };
        }

        // Setup als abgeschlossen markieren
        settings.isSetupDone = true;
        await DB.setKV('settings', settings);

        return res.json({ success: true, message: 'Setup erfolgreich abgeschlossen.' });

    } catch (err) {
        console.error('[setup]', err);
        return res.status(500).json({ success: false, message: 'Fehler beim Setup: ' + err.message });
    }
});

module.exports = router;
