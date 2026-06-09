/**
 * Routes – Menu, Categories, Allergens, Additives, Import
 */
const router = require('express').Router();
const DB = require('../db');
const { getCurrentLicense } = require('../services/license.js');
const { extractDomain } = require('../helpers.js');
const logger = require('../core/logger.js');
const validate = require('../validation/validate.js');
const { menuItemSchema, menuReorderSchema, categorySchema, anyObjectSchema, anyArraySchema } = require('../validation/schemas.js');
const { requireRole } = require('../core/middleware.js');

async function getMaxDishes(DB, domain) {
    try {
        const lic = await getCurrentLicense(DB, domain);
        if (!lic.isExpired && lic.limits?.max_dishes) return lic.limits.max_dishes;
    } catch (_) {}
    return 30; // FREE-Plan Default
}

/**
 * Stellt sicher dass eine Kategorie (label-String) in der categories-Tabelle existiert.
 * Falls nicht, wird sie automatisch angelegt.
 */
async function ensureCategoryExists(catLabel) {
    if (!catLabel || typeof catLabel !== 'string') return;
    const label = catLabel.trim();
    if (!label) return;
    try {
        const existing = await DB.getCategories();
        const alreadyExists = Array.isArray(existing) && existing.some(
            c => (c.label || '').trim().toLowerCase() === label.toLowerCase()
        );
        if (!alreadyExists) {
            const id = label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_') || Date.now().toString();
            await DB.addCategory({ id, label, icon: 'utensils', active: true, sort_order: existing.length || 0 });
            logger.info({ label }, '[categories] Auto-angelegt');
        }
    } catch (e) {
        logger.warn({ err: e }, '[categories] ensureCategoryExists Fehler');
    }
}

module.exports = (requireAuth, requireLicense) => {
    // --- Menu ---
    router.get('/menu', async (req, res) => {
        try {
            const result = await DB.getMenu();
            res.json(Array.isArray(result) ? result : []);
        } catch(e) {
            logger.error({ err: e }, 'GET /menu Fehler');
            res.status(500).json({ success: false, reason: 'Interner Serverfehler.' });
        }
    });

    router.post('/menu', requireAuth, requireRole('admin'), requireLicense('menu_edit'), validate(menuItemSchema), async (req, res) => {
        try {
            const domain = extractDomain(req);
            let lic = null;
            try { lic = await getCurrentLicense(DB, domain); } catch (_) {}
            const maxDishes = lic?.limits?.max_dishes ?? 30;
            const menu = await DB.getMenu();
            if (menu.length >= maxDishes)
                return res.status(403).json({ success: false, reason: `Ihr ${lic?.label || lic?.type || 'Free'}-Plan erlaubt maximal ${maxDishes} Speisen.` });
            const m = req.body;
            if (typeof m.number === 'undefined' && typeof m.nr !== 'undefined') m.number = m.nr;
            if (typeof m.number === 'string') m.number = m.number.trim() || null;
            m.id = m.id || Date.now().toString();
            if (m.cat) await ensureCategoryExists(m.cat);
            await DB.addMenu(m);
            res.json({ success: true, id: m.id });
        } catch(e) {
            logger.error({ err: e }, 'POST /menu Fehler');
            res.status(500).json({ success: false, reason: 'Interner Serverfehler.' });
        }
    });

    router.put('/menu/:id', requireAuth, requireRole('admin'), requireLicense('menu_edit'), validate(anyObjectSchema), async (req, res) => {
        try {
            const body = req.body;
            if (typeof body.number === 'undefined' && typeof body.nr !== 'undefined') body.number = body.nr;
            if (typeof body.number === 'string') body.number = body.number.trim() || null;
            if (body.cat) await ensureCategoryExists(body.cat);
            const updated = await DB.updateMenu(req.params.id, body);
            if (!updated) return res.status(404).json({ success: false, reason: 'Gericht nicht gefunden.' });
            res.json({ success: true, item: updated });
        } catch(e) {
            logger.error({ err: e }, 'PUT /menu/:id Fehler');
            res.status(500).json({ success: false, reason: 'Interner Serverfehler.' });
        }
    });

    router.delete('/menu/:id', requireAuth, requireRole('admin'), requireLicense('menu_edit'), async (req, res) => {
        try { await DB.deleteMenu(req.params.id); res.json({ success: true }); }
        catch(e) {
            logger.error({ err: e }, 'DELETE /menu/:id Fehler');
            res.status(500).json({ success: false, reason: 'Interner Serverfehler.' });
        }
    });

    router.post('/menu/reorder', requireAuth, requireRole('admin'), validate(menuReorderSchema), async (req, res) => {
        try {
            const { ids } = req.body;
            if (!Array.isArray(ids)) return res.status(400).json({ success: false });
            const menu = await DB.getMenu();
            const reordered = ids.map(id => menu.find(d => String(d.id) === String(id))).filter(Boolean);
            menu.forEach(d => { if (!ids.includes(String(d.id))) reordered.push(d); });
            await DB.saveMenu(reordered);
            res.json({ success: true });
        } catch(e) {
            logger.error({ err: e }, 'POST /menu/reorder Fehler');
            res.status(500).json({ success: false, reason: 'Interner Serverfehler.' });
        }
    });

    // --- Categories ---
    router.get('/categories', async (req, res) => {
        try {
            const dbCats = await DB.getCategories();
            const safeCats = Array.isArray(dbCats) ? dbCats : [];

            const menuItems = await DB.getMenu();
            const menuCatLabels = Array.isArray(menuItems)
                ? [...new Set(menuItems.map(m => (m.cat || '').trim()).filter(Boolean))]
                : [];

            const existingLabels = new Set(safeCats.map(c => (c.label || '').trim().toLowerCase()));

            for (const label of menuCatLabels) {
                if (!existingLabels.has(label.toLowerCase())) {
                    try {
                        const id = label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_') || Date.now().toString();
                        await DB.addCategory({ id, label, icon: 'utensils', active: true, sort_order: safeCats.length });
                        safeCats.push({ id, label, icon: 'utensils', active: 1, sort_order: safeCats.length });
                        existingLabels.add(label.toLowerCase());
                        logger.info({ label }, '[categories] Migriert aus Gerichten');
                    } catch (e) { /* doppelter insert – ignorieren */ }
                }
            }

            res.json(safeCats);
        } catch(e) {
            logger.error({ err: e }, 'GET /categories Fehler');
            res.json([]);
        }
    });

    router.post('/categories', requireAuth, requireRole('admin'), validate(categorySchema), async (req, res) => {
        try {
            const c = req.body;
            if (!c.label) return res.status(400).json({ success: false, reason: 'Label erforderlich.' });
            c.id = c.id || c.label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_') || Date.now().toString();
            await DB.addCategory(c);
            res.json({ success: true, id: c.id });
        } catch(e) {
            logger.error({ err: e }, 'POST /categories Fehler');
            res.status(500).json({ success: false, reason: 'Interner Serverfehler.' });
        }
    });

    router.put('/categories/:id', requireAuth, requireRole('admin'), validate(anyObjectSchema), async (req, res) => {
        try {
            const updated = await DB.updateCategory(req.params.id, req.body);
            if (!updated) return res.status(404).json({ success: false, reason: 'Kategorie nicht gefunden.' });
            res.json({ success: true, item: updated });
        } catch(e) {
            logger.error({ err: e }, 'PUT /categories/:id Fehler');
            res.status(500).json({ success: false, reason: 'Interner Serverfehler.' });
        }
    });

    router.delete('/categories/:id', requireAuth, requireRole('admin'), async (req, res) => {
        try { await DB.deleteCategory(req.params.id); res.json({ success: true }); }
        catch(e) {
            logger.error({ err: e }, 'DELETE /categories/:id Fehler');
            res.status(500).json({ success: false, reason: 'Interner Serverfehler.' });
        }
    });

    // --- Allergens / Additives ---
    router.get('/allergens', async (req, res) => {
        try {
            const result = await DB.getKV('allergens', {});
            res.json((result && typeof result === 'object' && !Array.isArray(result)) ? result : {});
        } catch(e) { res.json({}); }
    });
    router.post('/allergens', requireAuth, requireRole('admin'), validate(anyObjectSchema), async (req, res) => {
        try { await DB.setKV('allergens', req.body); res.json({ success: true }); }
        catch(e) {
            logger.error({ err: e }, 'POST /allergens Fehler');
            res.status(500).json({ success: false, reason: 'Interner Serverfehler.' });
        }
    });
    router.get('/additives', async (req, res) => {
        try {
            const result = await DB.getKV('additives', {});
            res.json((result && typeof result === 'object' && !Array.isArray(result)) ? result : {});
        } catch(e) { res.json({}); }
    });
    router.post('/additives', requireAuth, requireRole('admin'), validate(anyObjectSchema), async (req, res) => {
        try { await DB.setKV('additives', req.body); res.json({ success: true }); }
        catch(e) {
            logger.error({ err: e }, 'POST /additives Fehler');
            res.status(500).json({ success: false, reason: 'Interner Serverfehler.' });
        }
    });

    // --- Import ---
    router.post('/menu/import', requireAuth, requireRole('admin'), validate(anyObjectSchema), async (req, res) => {
        try {
            const { menu, categories, allergens, additives } = req.body;
            const domain    = extractDomain(req);
            const maxDishes = await getMaxDishes(DB, domain);

            if (menu && Array.isArray(menu) && menu.length > maxDishes) {
                return res.status(403).json({
                    success: false,
                    reason: `Ihr Plan erlaubt maximal ${maxDishes} Speisen. Die Backup-Datei enthält ${menu.length} Einträge.`,
                    limit: maxDishes, current: menu.length
                });
            }
            if (menu && Array.isArray(menu))               await DB.saveMenu(menu);
            if (categories && Array.isArray(categories))   await DB.saveCategories(categories);
            if (allergens && typeof allergens === 'object') await DB.setKV('allergens', allergens);
            if (additives && typeof additives === 'object') await DB.setKV('additives', additives);
            res.json({ success: true });
        } catch(e) {
            logger.error({ err: e }, '[menu/import] Fehler');
            res.status(500).json({ success: false, reason: 'Interner Serverfehler.' });
        }
    });

    router.get('/menu/export-translations', requireAuth, requireRole('admin'), async (req, res) => {
        try {
            const menu = await DB.getMenu();
            const cats = await DB.getCategories();

            const exportData = {
                categories: cats.map(c => ({
                    label: c.label,
                    translations: c.translations || {}
                })),
                dishes: menu.map(item => ({
                    name:         item.name,
                    desc:         item.desc || '',
                    translations: item.translations || {}
                }))
            };

            res.attachment('translations-export.json');
            res.send(exportData);
        } catch (e) {
            logger.error({ err: e }, 'GET /menu/export-translations Fehler');
            res.status(500).json({ success: false, reason: 'Interner Serverfehler.' });
        }
    });

    router.post('/menu/import-translations', requireAuth, requireRole('admin'), validate(anyObjectSchema), async (req, res) => {
        try {
            let importData = req.body;
            let categories = [];
            let dishes = [];

            if (Array.isArray(importData)) {
                dishes = importData;
            } else if (importData && typeof importData === 'object') {
                categories = importData.categories || [];
                dishes = importData.dishes || [];
            } else {
                return res.status(400).json({ success: false, reason: 'Ungültiges Format.' });
            }

            const currentMenu = await DB.getMenu();
            const currentCats = await DB.getCategories();

            let updatedDishes = 0;
            let updatedCats   = 0;
            let skipped = 0;
            const notFound = [];

            for (const entry of categories) {
                if (!entry.label) continue;
                const match = currentCats.find(c => c.label.trim().toLowerCase() === entry.label.trim().toLowerCase());
                if (match) {
                    const merged = { ...(match.translations || {}), ...(entry.translations || {}) };
                    await DB.updateCategory(match.id, { translations: merged });
                    updatedCats++;
                }
            }

            for (const entry of dishes) {
                if (!entry.name) { skipped++; continue; }

                const match = currentMenu.find(m => m.name.trim().toLowerCase() === entry.name.trim().toLowerCase());
                if (match) {
                    const merged = { ...(match.translations || {}), ...(entry.translations || {}) };
                    await DB.updateMenu(match.id, { translations: merged });
                    updatedDishes++;
                } else {
                    notFound.push(entry.name);
                }
            }

            res.json({
                success: true,
                updated: updatedDishes,
                updated_categories: updatedCats,
                skipped,
                not_found: notFound
            });
        } catch (e) {
            logger.error({ err: e }, 'POST /menu/import-translations Fehler');
            res.status(500).json({ success: false, reason: 'Interner Serverfehler.' });
        }
    });

    return router;
};
