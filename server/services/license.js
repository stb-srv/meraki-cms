/**
 * Meraki CMS – License Plan Definitions, Token Verification & Helpers
 *
 * Der RSA Public Key wird beim Start automatisch vom Lizenzserver geladen
 * (GET /api/v1/public-key). Nur wenn das fehlschlägt, wird der eingebettete
 * Fallback-Key verwendet. LICENSE_PUBLIC_KEY in .env überschreibt beides.
 */

const jwt    = require('jsonwebtoken');
const logger = require('../core/logger.js');
const { PLAN_DEFINITIONS: SHARED_PLANS } = require('@meraki/plans');

const MERAKI_PUBLIC_KEY_FALLBACK = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAutES8Xqif1PpLJU9ClMJ
rGfeCoUVOOni5/WiwGFdTd5ygYyie22fBheBA2fRek6xXDfGtC/QdIg7zbqI/0eQ
V7DCcytIGJSfPRNW4t6cb7oRUVTbo74jia5GUDyJNLJPQDsPVWDvi6rpB+/hv+Uh
rL3UQbHYwoJi/H5R2uwPsd9JaznGoygWhmaWpueXQkxYMRlupUWD1hT+OBSYWBnI
l7NUVsJ8pDOE2u9REwVgBnJEbdA39YnZ2NB4W/5JZPLsM8pkp1QO32THcHixFUvC
N+xMcoOA3fRdAICdI6kI9LccR4hzr7Btf/8Wbk0erF48Xw5NjFj0CZcRIjegiq2m
HQIDAQAB
-----END PUBLIC KEY-----`;

// Aktiver Public Key – wird durch initPublicKey() überschrieben
let MERAKI_PUBLIC_KEY = (process.env.LICENSE_PUBLIC_KEY || '').trim() || null;

if (MERAKI_PUBLIC_KEY) {
    logger.info('RSA Public Key aus LICENSE_PUBLIC_KEY Env-Variable geladen.');
} else {
    logger.info('LICENSE_PUBLIC_KEY nicht gesetzt – Public Key wird beim Start vom Lizenzserver abgerufen.');
    MERAKI_PUBLIC_KEY = MERAKI_PUBLIC_KEY_FALLBACK;
}

/**
 * Ruft den RSA Public Key vom Lizenzserver ab und cached ihn.
 * Wird einmalig beim Start durch den LicenseChecker aufgerufen.
 * Gibt true zurück wenn erfolgreich, false bei Fehler (Fallback bleibt aktiv).
 */
const initPublicKey = async (licenseServerUrl) => {
    // Wenn manuell via Env gesetzt → nicht überschreiben
    if ((process.env.LICENSE_PUBLIC_KEY || '').trim()) {
        logger.info('Public Key aus Env – kein automatischer Abruf nötig.');
        return true;
    }

    const url = `${(licenseServerUrl || 'https://licens-prod.stb-srv.de').replace(/\/+$/, '')}/api/v1/public-key`;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const key = (data.public_key || data.publicKey || '').trim();
        if (!key || !key.includes('BEGIN PUBLIC KEY')) {
            throw new Error('Antwort enthält keinen gültigen PEM-Key.');
        }
        MERAKI_PUBLIC_KEY = key;
        logger.info({ url }, 'RSA Public Key erfolgreich vom Lizenzserver geladen.');
        return true;
    } catch (e) {
        logger.warn({ err: e }, 'Public Key-Abruf fehlgeschlagen – Fallback-Key aktiv.');
        MERAKI_PUBLIC_KEY = MERAKI_PUBLIC_KEY_FALLBACK;
        return false;
    }
};

/**
 * PLAN_DEFINITIONS — aus @meraki/plans (gemeinsame Quelle mit dem Lizenzserver)
 */
const PLAN_DEFINITIONS = SHARED_PLANS;

const getPlan = (type) => {
    if (!type) return PLAN_DEFINITIONS['FREE'];
    const normalizedType = type.toUpperCase()
        .replace(/\+/g, '_PLUS')
        .replace(/\s+/g, '_');
    return PLAN_DEFINITIONS[normalizedType] || PLAN_DEFINITIONS['FREE'];
};

const FREE_RESULT = (extra = {}) => ({
    key: null, status: 'free', customer: 'Testmodus',
    type: 'FREE', label: 'Free',
    expiresAt: null, isTrial: false, isExpired: false, trialDaysLeft: 0,
    modules: PLAN_DEFINITIONS.FREE.modules,
    limits: { max_dishes: PLAN_DEFINITIONS.FREE.menu_items, max_tables: PLAN_DEFINITIONS.FREE.max_tables },
    plan: PLAN_DEFINITIONS.FREE,
    ...extra
});

const verifyLicenseToken = (token, host = null) => {
    if (!token || typeof token !== 'string') return null;
    try {
        const payload = jwt.verify(token, MERAKI_PUBLIC_KEY, { algorithms: ['RS256'] });
        if (payload.domain && host) {
            const normalizeHost = (h) => (h || '').replace(/:\d+$/, '').toLowerCase().trim();
            const tokenDomain  = normalizeHost(payload.domain);
            const currentHost  = normalizeHost(host);
            const isLocal = ['localhost', '127.0.0.1', '::1'].includes(currentHost);
            if (!isLocal && tokenDomain !== currentHost) {
                logger.warn({ tokenDomain, currentHost }, 'License domain mismatch');
                return null;
            }
        }
        return payload;
    } catch (e) {
        if (e.name !== 'JsonWebTokenError' && e.name !== 'TokenExpiredError') {
            logger.error({ err: e }, 'License token verification error');
        }
        return null;
    }
};

const getLastKnownLicense = (lic) => {
    if (!lic || !lic.key) return null;
    const type = lic.lastKnownType || lic.type || null;
    if (!type || type === 'FREE') return null;

    const plan    = getPlan(type);
    const modules = lic.lastKnownModules || plan.modules;
    const limits  = lic.lastKnownLimits  || { max_dishes: plan.menu_items, max_tables: plan.max_tables };

    logger.warn({ type, since: lic.lastKnownAt || 'unbekannt' }, '[Offline-Fallback] Lizenzserver nicht erreichbar – nutze letzten bekannten Plan.');

    return {
        key:      lic.key,
        status:   'active_offline',
        customer: lic.customer || 'Unbekannt',
        type, label: plan.label + ' (Offline)',
        expiresAt: lic.expiresAt || null,
        modules, limits,
        isTrial: false, isExpired: false, trialDaysLeft: 0, plan,
        domain:  lic.domain || null,
        offline: true
    };
};

const getCurrentLicense = async (DB, host = null) => {
    const settings = await DB.getKV('settings', {});
    const lic      = settings.license || {};

    // Gesperrtes CMS: Wenn locked=true, immer FREE zurückgeben
    if (lic.locked) {
        logger.error({ reason: lic.lockedReason || 'unbekannt' }, '[LOCKED] CMS ist gesperrt – Lizenz deaktiviert.');
        return FREE_RESULT({ status: 'locked', isExpired: true });
    }

    if (lic.isTrial) {
        const plan      = getPlan(lic.type);
        const now       = new Date();
        const expiresAt = lic.expiresAt ? new Date(lic.expiresAt) : null;
        const isExpired = expiresAt ? expiresAt < now : false;
        const trialDaysLeft = !isExpired && expiresAt
            ? Math.max(0, Math.ceil((expiresAt - now) / 86400000))
            : 0;

        if (isExpired) return FREE_RESULT({ isTrial: true, isExpired: true, status: 'expired', key: lic.key });

        return {
            key: lic.key, status: lic.status || 'trial',
            customer: lic.customer || 'Trial', type: lic.type || 'FREE',
            label: plan.label, expiresAt: lic.expiresAt,
            modules: plan.modules,
            limits: { max_dishes: plan.menu_items, max_tables: plan.max_tables },
            isTrial: true, isExpired: false, trialDaysLeft, plan
        };
    }

    const token   = lic.licenseToken || null;
    const payload = verifyLicenseToken(token, host);

    if (payload) {
        const plan      = getPlan(payload.type);
        const now       = new Date();
        const expiresAt = payload.exp ? new Date(payload.exp * 1000) : null;
        const isExpired = expiresAt ? expiresAt < now : false;

        if (isExpired) {
            logger.warn({ expiresAt: expiresAt?.toISOString() }, 'License token expired.');
            const offline = getLastKnownLicense(lic);
            if (offline) return offline;
            return FREE_RESULT({ isExpired: true, status: 'expired', key: payload.license_key || lic.key });
        }

        return {
            key:      payload.license_key || lic.key,
            status:   'active',
            customer: payload.customer_name || lic.customer || 'Unbekannt',
            type:     payload.type     || 'FREE',
            label:    plan.label,
            expiresAt: expiresAt?.toISOString() || null,
            modules: (payload.allowed_modules && Object.keys(payload.allowed_modules).length > 0)
                ? payload.allowed_modules
                : plan.modules,
            limits: {
                max_dishes: payload.limits?.max_dishes ?? plan.menu_items,
                max_tables: payload.limits?.max_tables ?? plan.max_tables
            },
            isTrial: false, isExpired: false, trialDaysLeft: 0, plan,
            domain:  payload.domain || null
        };
    }

    if (lic.key) {
        const offline = getLastKnownLicense(lic);
        if (offline) return offline;
        logger.warn('License key present but no valid fallback available – falling back to FREE.');
    }

    return FREE_RESULT();
};

module.exports = { PLAN_DEFINITIONS, getPlan, getCurrentLicense, verifyLicenseToken, initPublicKey, MERAKI_PUBLIC_KEY };
