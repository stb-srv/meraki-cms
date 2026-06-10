'use strict';

/**
 * @meraki/plans — Einzige Quelle der Wahrheit für alle Lizenz-Plan-Definitionen.
 * Wird von meraki-cms (CommonJS) und meraki-licens (ESM) gleichermaßen genutzt.
 *
 * Modul-Namen als Konstanten verwenden um Tipp-Fehler zu vermeiden:
 *   const { PLAN_MODULES } = require('@meraki/plans');
 *   requireLicense(PLAN_MODULES.RESERVATIONS);
 */

const PLAN_MODULES = Object.freeze({
    MENU_EDIT:      'menu_edit',
    ORDERS_KITCHEN: 'orders_kitchen',
    RESERVATIONS:   'reservations',
    CUSTOM_DESIGN:  'custom_design',
    ANALYTICS:      'analytics',
    QR_PAY:         'qr_pay',
    ONLINE_ORDERS:  'online_orders',
    MULTILANGUAGE:  'multilanguage',
    SEASONAL_MENU:  'seasonal_menu',
    BACKUP:         'backup',
    IMAGE_AI:       'image_ai',
});

const PLAN_DEFINITIONS = Object.freeze({
    TRIAL: {
        label: 'Trial (30 Tage)',
        menu_items: 50,
        max_tables: 8,
        expires_days: 30,
        modules: Object.freeze({
            menu_edit:      true,
            multilanguage:  false,
            seasonal_menu:  false,
            orders_kitchen: true,
            reservations:   true,
            custom_design:  false,
            analytics:      false,
            qr_pay:         false,
            online_orders:  false,
            backup:         false,
            image_ai:       false,
        }),
        note: 'Kostenloser Testzeitraum',
    },
    FREE: {
        label: 'Free',
        menu_items: 30,
        max_tables: 5,
        expires_days: 36500,
        modules: Object.freeze({
            menu_edit:      true,
            multilanguage:  false,
            seasonal_menu:  false,
            orders_kitchen: false,
            reservations:   false,
            custom_design:  false,
            analytics:      false,
            qr_pay:         false,
            online_orders:  false,
            backup:         false,
            image_ai:       false,
        }),
        note: 'Kostenlos zum Testen',
    },
    STARTER: {
        label: 'Starter',
        menu_items: 60,
        max_tables: 10,
        expires_days: 365,
        modules: Object.freeze({
            menu_edit:      true,
            multilanguage:  true,
            seasonal_menu:  false,
            orders_kitchen: true,
            reservations:   true,
            custom_design:  false,
            analytics:      false,
            qr_pay:         false,
            online_orders:  false,
            backup:         false,
            image_ai:       false,
        }),
        note: 'Für kleine Cafés & Imbisse',
    },
    PRO: {
        label: 'Pro',
        menu_items: 150,
        max_tables: 25,
        expires_days: 365,
        modules: Object.freeze({
            menu_edit:      true,
            multilanguage:  true,
            seasonal_menu:  true,
            orders_kitchen: true,
            reservations:   true,
            custom_design:  true,
            analytics:      false,
            qr_pay:         true,
            online_orders:  false,
            backup:         false,
            image_ai:       false,
        }),
        note: 'Für Restaurants',
    },
    PRO_PLUS: {
        label: 'Pro+',
        menu_items: 300,
        max_tables: 50,
        expires_days: 365,
        modules: Object.freeze({
            menu_edit:      true,
            multilanguage:  true,
            seasonal_menu:  true,
            orders_kitchen: true,
            reservations:   true,
            custom_design:  true,
            analytics:      true,
            qr_pay:         true,
            online_orders:  true,
            backup:         true,
            image_ai:       true,
        }),
        note: 'Für große Restaurants',
    },
    ENTERPRISE: {
        label: 'Enterprise',
        menu_items: 999,
        max_tables: 999,
        expires_days: 365,
        modules: Object.freeze({
            menu_edit:      true,
            multilanguage:  true,
            seasonal_menu:  true,
            orders_kitchen: true,
            reservations:   true,
            custom_design:  true,
            analytics:      true,
            qr_pay:         true,
            online_orders:  true,
            backup:         true,
            image_ai:       true,
        }),
        note: 'Für Ketten & Hotels',
    },
});

module.exports = { PLAN_DEFINITIONS, PLAN_MODULES };
