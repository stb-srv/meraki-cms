/**
 * Meraki – Cookie Consent Manager
 * DSGVO Art. 7 / ePrivacy-Richtlinie / EuGH Planet49 konform
 *
 * Öffentliche API: window.MerakiConsent
 *   .init()              – Initialisierung, Banner bei Bedarf anzeigen
 *   .hasConsent(cat)     – true/false
 *   .showPreferences()   – Banner erneut anzeigen (für Footer-Link)
 *   .revokeAll()         – Alle nicht-notwendigen Einwilligungen widerrufen
 *   .on(event, fn)       – Event abonnieren
 *
 * Erweiterung neuer Dienste:
 *   <script type="text/plain" data-consent-category="analytics" data-src="/js/matomo.js"></script>
 *   → Wird nach Einwilligung automatisch geladen
 *
 * Events:
 *   consent:given    – { choices }
 *   consent:revoked  – {}
 *   category:enabled – { category }
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'meraki_consent';
    const CONFIG_URL = '/api/cookie-config';
    const LOG_URL = '/api/cookie-consent';
    const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // 12 Monate

    let _config = null;
    let _choices = null;
    let _handlers = {};

    // ── Hilfsfunktionen ──────────────────────────────────────────────────────

    function emit(event, data) {
        (_handlers[event] || []).forEach((fn) => {
            try {
                fn(data);
            } catch (e) {}
        });
    }

    function loadStored() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function saveStored(choices, version, consentId) {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    version: version || (_config && _config.version) || '1.0',
                    timestamp: Date.now(),
                    choices,
                    consent_id: consentId || null,
                })
            );
        } catch (e) {}
    }

    function needsConsent(stored) {
        if (!stored) return true;
        if (stored.version !== ((_config && _config.version) || '1.0')) return true;
        if (Date.now() - stored.timestamp > MAX_AGE_MS) return true;
        return false;
    }

    function buildDefaultChoices() {
        const choices = {};
        if (!_config || !_config.categories) return choices;
        for (const [id, cat] of Object.entries(_config.categories)) {
            choices[id] = cat.required ? true : false;
        }
        return choices;
    }

    // ── Script-Blocking: Activate deferred scripts ──────────────────────────
    function activateScripts(category) {
        document.querySelectorAll(`[data-consent-category="${category}"]`).forEach((el) => {
            if (el.dataset.activated) return;
            el.dataset.activated = 'true';
            const src = el.dataset.src;
            if (src) {
                const s = document.createElement('script');
                s.src = src;
                s.defer = true;
                document.head.appendChild(s);
            }
            // Inline-Script
            if (el.textContent.trim()) {
                try {
                    eval(el.textContent);
                } catch (e) {}
            }
        });
    }

    function applyChoices(choices) {
        for (const [cat, granted] of Object.entries(choices)) {
            if (granted) {
                activateScripts(cat);
                emit('category:enabled', { category: cat });
            }
        }
    }

    // ── Consent-Log an Server senden ─────────────────────────────────────────
    async function logConsent(choices, source) {
        try {
            const res = await fetch(LOG_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    choices,
                    config_version: _config ? _config.version : '1.0',
                    source: source || 'banner',
                }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.id) {
                    // Consent-ID nachträglich in localStorage aktualisieren
                    try {
                        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
                        stored.consent_id = data.id;
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
                    } catch (e) {}
                }
            }
        } catch (e) {}
    }

    // ── Banner UI ─────────────────────────────────────────────────────────────

    function getBanner() {
        return document.getElementById('cookie-banner');
    }
    function getOverview() {
        return document.getElementById('cookie-view-overview');
    }
    function getSettings() {
        return document.getElementById('cookie-view-settings');
    }

    function renderCategories() {
        const container = document.getElementById('cookie-categories-dynamic');
        if (!container || !_config) return;
        container.innerHTML = '';

        // Datum der letzten Einwilligung anzeigen (DSK-Empfehlung)
        const stored = loadStored();
        if (stored && stored.timestamp) {
            const dateStr = new Date(stored.timestamp).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
            const existingInfo = container.parentElement.querySelector('.consent-date-info');
            if (!existingInfo) {
                const infoEl = document.createElement('p');
                infoEl.className = 'consent-date-info';
                infoEl.style.cssText = 'font-size:0.75rem;color:#999;margin-bottom:12px;';
                infoEl.textContent = `Letzte Einwilligung: ${dateStr} Uhr`;
                if (stored.consent_id) {
                    infoEl.textContent += ` · ID: ${stored.consent_id.slice(0, 8)}…`;
                }
                container.parentElement.insertBefore(infoEl, container);
            }
        }

        for (const [id, cat] of Object.entries(_config.categories || {})) {
            const checked = cat.required ? true : (_choices && _choices[id]) || false;
            const disabled = cat.required ? 'disabled' : '';
            const labelClass = cat.required ? 'switch disabled' : 'switch';

            const cookieDetails = (cat.cookies || [])
                .map(
                    (c) =>
                        `<span class="cookie-detail-item">${c.name} · ${c.provider} · ${c.duration}</span>`
                )
                .join('');

            container.insertAdjacentHTML(
                'beforeend',
                `
                <div class="cookie-cat-item" data-cat="${id}">
                    <div class="cat-info">
                        <strong>${cat.label}</strong>
                        <span>${cat.description}</span>
                        ${cookieDetails ? `<div class="cookie-details">${cookieDetails}</div>` : ''}
                    </div>
                    <label class="${labelClass}" aria-label="${cat.label} ${cat.required ? '(immer aktiv)' : 'ein- oder ausschalten'}">
                        <input type="checkbox" id="cookie-cat-${id}" ${checked ? 'checked' : ''} ${disabled}>
                        <span class="slider round"></span>
                        ${cat.required ? '<span class="always-on-label">Immer aktiv</span>' : ''}
                    </label>
                </div>
            `
            );
        }
    }

    function showBanner() {
        const banner = getBanner();
        if (!banner) return;
        // Banner-Text aktualisieren
        const textEl = document.getElementById('cookie-text');
        if (textEl && _config && _config.banner_text) textEl.textContent = _config.banner_text;
        banner.style.display = 'flex';
        banner.setAttribute('aria-hidden', 'false');
        document.getElementById('cookie-view-overview') &&
            (document.getElementById('cookie-view-overview').style.display = '');
        document.getElementById('cookie-view-settings') &&
            (document.getElementById('cookie-view-settings').style.display = 'none');
        renderCategories();
        // Fokus für Accessibility
        setTimeout(() => {
            const firstBtn = banner.querySelector('button');
            if (firstBtn) firstBtn.focus();
        }, 100);
    }

    function hideBanner() {
        const banner = getBanner();
        if (!banner) return;
        banner.style.display = 'none';
        banner.setAttribute('aria-hidden', 'true');
        // Trigger-Button wieder anzeigen
        const trigger = document.getElementById('cookie-settings-trigger');
        if (trigger) trigger.style.display = 'flex';
    }

    // ── Aktionen (aufgerufen vom HTML) ────────────────────────────────────────

    async function acceptAll() {
        if (!_config) return;
        const choices = {};
        for (const id of Object.keys(_config.categories || {})) choices[id] = true;
        _choices = choices;
        saveStored(choices);
        applyChoices(choices);
        await logConsent(choices, 'accept_all');
        emit('consent:given', { choices });
        hideBanner();
    }

    async function rejectNonEssential() {
        if (!_config) return;
        const choices = buildDefaultChoices(); // nur notwendige = true
        _choices = choices;
        saveStored(choices);
        applyChoices(choices);
        await logConsent(choices, 'reject_all');
        emit('consent:given', { choices });
        hideBanner();
    }

    async function saveCustom() {
        if (!_config) return;
        const choices = {};
        for (const id of Object.keys(_config.categories || {})) {
            const cat = _config.categories[id];
            if (cat.required) {
                choices[id] = true;
            } else {
                const el = document.getElementById(`cookie-cat-${id}`);
                choices[id] = el ? el.checked : false;
            }
        }
        _choices = choices;
        saveStored(choices);
        applyChoices(choices);
        await logConsent(choices, 'custom');
        emit('consent:given', { choices });
        hideBanner();
    }

    function revokeAll() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}
        _choices = null;
        logConsent(buildDefaultChoices(), 'revoked');
        emit('consent:revoked', {});
        if (_config) showBanner();
    }

    function toggleView(showSettings) {
        const ov = getOverview();
        const sv = getSettings();
        if (!ov || !sv) return;
        ov.style.display = showSettings ? 'none' : '';
        sv.style.display = showSettings ? '' : 'none';
        if (showSettings) renderCategories();
    }

    // ── Globale Handler (kompatibel mit bestehendem HTML) ────────────────────
    window.acceptAllCookies = acceptAll;
    window.rejectNonEssential = rejectNonEssential;
    window.saveCustomCookies = saveCustom;
    window.toggleCookieView = toggleView;
    window.showCookieBanner = (force) => {
        if (force) {
            const trigger = document.getElementById('cookie-settings-trigger');
            if (trigger) trigger.style.display = 'none';
            toggleView(true);
            showBanner();
        }
    };

    // ── Öffentliche API ──────────────────────────────────────────────────────
    window.MerakiConsent = {
        hasConsent(category) {
            if (!_choices) return false;
            return _choices[category] === true;
        },
        showPreferences() {
            const trigger = document.getElementById('cookie-settings-trigger');
            if (trigger) trigger.style.display = 'none';
            toggleView(true);
            showBanner();
        },
        revokeAll,
        on(event, fn) {
            if (!_handlers[event]) _handlers[event] = [];
            _handlers[event].push(fn);
        },
        getChoices() {
            return _choices ? { ..._choices } : null;
        },
        getConfig() {
            return _config ? { ..._config } : null;
        },
    };

    // ── Init ─────────────────────────────────────────────────────────────────
    async function init() {
        try {
            const res = await fetch(CONFIG_URL);
            _config = res.ok ? await res.json() : null;
        } catch (e) {
            // Fallback: Banner ohne Server-Config anzeigen
            _config = {
                version: '1.0',
                banner_text: 'Wir nutzen Cookies, um das Nutzererlebnis zu verbessern.',
                privacy_url: '',
                categories: {
                    necessary: {
                        id: 'necessary',
                        label: 'Technisch notwendig',
                        description: 'Für den Betrieb der Website erforderlich.',
                        required: true,
                        cookies: [],
                    },
                },
            };
        }

        const stored = loadStored();

        if (!needsConsent(stored)) {
            // Consent bereits gegeben und noch gültig
            _choices = stored.choices;
            applyChoices(_choices);
            // Trigger-Button anzeigen
            const trigger = document.getElementById('cookie-settings-trigger');
            if (trigger) trigger.style.display = 'flex';
        } else {
            // Kein oder abgelaufener/veralteter Consent → Banner zeigen
            _choices = buildDefaultChoices();
            // Trigger verstecken während Banner aktiv
            const trigger = document.getElementById('cookie-settings-trigger');
            if (trigger) trigger.style.display = 'none';
            showBanner();
        }
    }

    // Starten sobald DOM bereit
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
