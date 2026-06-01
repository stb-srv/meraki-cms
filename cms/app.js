/**
 * Main Entry Point for OPA-CMS (Modular Version)
 */

import { checkAuth, login, logout } from './modules/auth.js';
import { apiGet } from './modules/api.js';
import { NAV_CONFIG } from './modules/navigation-config.js';
import { initTrialOnboarding, showTrialBanner, initUpgradeModal, showTrialExpiredLock } from './modules/trial.js';
import { showToast } from './modules/utils.js';
import { renderDashboard } from './modules/dashboard.js';
import { renderMenu } from './modules/menu.js';
import { renderReservations, renderArchive } from './modules/reservations.js';
import { renderTableManager } from './modules/tables.js';
import { renderTablePlanner } from './modules/table-planner.js';
import { renderDesigner } from './modules/designer.js';
import { renderSettings } from './modules/settings.js';
import { renderOpeningHours } from './modules/opening.js';
import { renderOrders } from './modules/orders.js';
import { initOrderSettings } from './modules/order-settings.js';
import { renderBackup } from './modules/backup.js';
import { showSetupWizard } from './modules/setup-wizard.js';
import { initRealtime } from './modules/realtime.js';
import { renderShiftPlanner } from './modules/shifts.js';

const loginContainer    = document.getElementById('login-container');
const adminDashboard    = document.getElementById('admin-dashboard');
const loginForm         = document.getElementById('login-form');
const logoutBtn         = document.getElementById('btn-logout');
const contentView       = document.getElementById('content-view');
const viewTitle         = document.getElementById('view-title');
const dashboardToolbar  = document.getElementById('dashboard-toolbar');

let currentView = 'stats';
let tokenExpiryTimer = null;

function scheduleTokenExpiryWarning() {
    if (tokenExpiryTimer) clearTimeout(tokenExpiryTimer);
    const token = sessionStorage.getItem('opa_admin_token');
    if (!token) return;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!payload.exp) return;
        const expiresInMs = (payload.exp * 1000) - Date.now();
        const warnMs = expiresInMs - (5 * 60 * 1000);
        if (warnMs > 0) {
            tokenExpiryTimer = setTimeout(() => {
                showToast('Ihre Sitzung läuft in 5 Minuten ab. Bitte speichern Sie Ihre Arbeit.', 'warning');
            }, warnMs);
        }
    } catch (e) {}
}

/**
 * Erzeugt ein Inline-SVG Avatar mit den Initialen des Nutzers.
 */
function buildInitialsAvatar(name) {
    const parts = name.trim().split(/\s+/);
    const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
    const colors = ['#2b6cb0','#276749','#744210','#702459','#553c9a','#2c7a7b','#9b2c2c'];
    const bg = colors[name.charCodeAt(0) % colors.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">`
        + `<circle cx="18" cy="18" r="18" fill="${bg}"/>`
        + `<text x="18" y="23" text-anchor="middle" font-size="14" font-family="sans-serif" fill="#fff" font-weight="600">${initials}</text>`
        + `</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/** Liest den Benutzernamen aus dem JWT-Token und zeigt ihn im Header an */
function applyUserFromToken() {
    const token = sessionStorage.getItem('opa_admin_token');
    if (!token) return;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const name = payload.name || payload.user || payload.sub || 'Admin';
        const nameEl   = document.getElementById('disp-user-name');
        const avatarEl = document.getElementById('disp-user-avatar');
        if (nameEl)   nameEl.textContent = name;
        if (avatarEl) avatarEl.src = buildInitialsAvatar(name);
    } catch (e) {}
}

async function init() {
    const savedKey = localStorage.getItem('opa_license_key');
    if (!savedKey) {
        try {
            const statusRes = await fetch('/api/setup/status');
            const statusData = await statusRes.json();
            if (statusData.setupComplete) {
                const serverKey = statusData.licenseKey || 'SETUP_DONE';
                localStorage.setItem('opa_license_key', serverKey);
                loginContainer.style.display = 'flex';
                adminDashboard.style.display = 'none';
                const pwdContainer = document.getElementById('password-change-container');
                if (pwdContainer) pwdContainer.style.display = 'none';
                return;
            }
        } catch (e) {}

        loginContainer.style.display = 'none';
        adminDashboard.style.display = 'none';
        const pwdContainer = document.getElementById('password-change-container');
        if (pwdContainer) pwdContainer.style.display = 'none';
        await showSetupWizard(document.body, () => window.location.reload());
        return;
    }

    if (!checkAuth()) {
        loginContainer.style.display = 'flex';
        adminDashboard.style.display = 'none';
        const pwdContainer = document.getElementById('password-change-container');
        if (pwdContainer) pwdContainer.style.display = 'none';
        return;
    }

    const token = sessionStorage.getItem('opa_admin_token');
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.requirePasswordChange) {
                loginContainer.style.display = 'none';
                adminDashboard.style.display = 'none';
                const pwdContainer = document.getElementById('password-change-container');
                if (pwdContainer) pwdContainer.style.display = 'flex';
                return;
            }
        } catch (e) {}
    }

    const pwdContainer = document.getElementById('password-change-container');
    if (pwdContainer) pwdContainer.style.display = 'none';
    loginContainer.style.display = 'none';
    adminDashboard.style.display = 'flex';

    // ── Sidebar Collapse ──────────────────────────────────
    const sidebarToggleBtn = document.getElementById('sidebar-toggle');
    const cmsSidebarEl     = document.getElementById('cms-sidebar');
    if (sidebarToggleBtn && cmsSidebarEl) {
        sidebarToggleBtn.addEventListener('click', () => {
            const isCollapsed = cmsSidebarEl.classList.toggle('collapsed');
            sidebarToggleBtn.setAttribute('aria-label',
                isCollapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen');
            sidebarToggleBtn.setAttribute('title',
                isCollapsed ? 'Ausklappen' : 'Einklappen');
        });
    }

    applyUserFromToken();
    scheduleTokenExpiryWarning();
    switchView('stats');

    const branding = await apiGet('branding');
    if (branding) {
        document.getElementById('disp-res-name').textContent    = branding.name   || 'OPA! Santorini';
        document.getElementById('disp-res-slogan').textContent  = branding.slogan || 'Restaurant Management';
        if (branding.name) document.title = branding.name + ' CMS';

        const cmsLogoEl = document.getElementById('cms-header-logo');
        if (cmsLogoEl && branding.logo) {
            cmsLogoEl.src = branding.logo;
            cmsLogoEl.style.display = 'block';
        }

        if (branding.favicon) {
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.href = branding.favicon;
        }
    }

    const settings = await apiGet('settings') || {};
    updateSidebarVisibility(settings);

    try {
        const licInfo = await apiGet('license/info');
        if (licInfo?.type === 'TRIAL' && licInfo.expires_at) {
            const daysLeft = Math.ceil((new Date(licInfo.expires_at) - Date.now()) / 86400000);
            if (daysLeft <= 0) {
                showTrialExpiredLock(localStorage.getItem('opa_license_key'));
            } else {
                showTrialBanner(daysLeft);
            }
        }
        if (licInfo?.type) {
            const badge    = document.getElementById('license-badge');
            const badgeTxt = document.getElementById('license-badge-text');
            if (badge && badgeTxt) {
                const isTrial  = licInfo.type === 'TRIAL';
                const daysLeft = licInfo.expires_at
                    ? Math.ceil((new Date(licInfo.expires_at) - Date.now()) / 86400000)
                    : null;
                badgeTxt.textContent = isTrial
                    ? `TRIAL · ${daysLeft != null ? daysLeft + ' Tage' : 'aktiv'}`
                    : licInfo.plan_label || licInfo.type;
                badge.style.display     = 'flex';
                badge.style.alignItems  = 'center';
                badge.style.background  = isTrial ? '#fef3c7' : '#f0fdf4';
                badge.style.color       = isTrial ? '#92400e' : '#166534';
                badge.style.borderColor = isTrial ? '#fcd34d' : '#86efac';
                badge.title = `Plan: ${licInfo.plan_label || licInfo.type}`;
            }
        }
    } catch(e) {}
    initUpgradeModal();

    initRealtime();
    window.__opaShowToast = showToast;
    window.updateDashboardBadges = updateOrderBadge;
}

export function updateSidebarVisibility(settings) {
    const enabled = settings.enabledModules || {};
    const legacy = settings.activeModules || {};

    const isModuleActive = (key, legacyKey) => {
        if (enabled[key] !== undefined) return enabled[key] !== false;
        if (legacyKey && legacy[legacyKey] !== undefined) return legacy[legacyKey] !== false;
        return true; 
    };

    // Orders Group
    const ordersGroup = document.getElementById('nav-orders-group');
    if (ordersGroup) ordersGroup.style.display = isModuleActive('orders_kitchen', 'orders') ? '' : 'none';

    // Reservations Group
    const resHeader = document.querySelector('.nav-group-header[data-view="reservations"]');
    if (resHeader) {
        const resGroup = resHeader.closest('.nav-group');
        if (resGroup) resGroup.style.display = isModuleActive('reservations', 'reservations') ? '' : 'none';
    }

    // Individual module items
    const toggleItem = (selector, active) => {
        const el = document.querySelector(selector);
        if (el) el.style.display = active ? '' : 'none';
    };

    toggleItem('.nav-subitem[data-view="menu"][data-tab="daily"]', isModuleActive('daily_specials', 'dailySpecialsEnabled'));
    toggleItem('.nav-subitem[data-view="table-planner"]', isModuleActive('table_planner'));
    toggleItem('.nav-subitem[data-view="qrcodes"]', isModuleActive('qrcodes'));
    toggleItem('.nav-subitem[data-view="shifts"]', isModuleActive('shifts'));
    toggleItem('.nav-subitem[data-view="backup"]', isModuleActive('backup'));
    
    const kitchenDisplay = document.querySelector('.nav-subitem[onclick*="kitchen.html"]');
    if (kitchenDisplay) kitchenDisplay.style.display = isModuleActive('kitchen_display') ? '' : 'none';
}

/**
 * Setzt genau EINEN aktiven Nav-Eintrag.
 * Matching-Logik:
 *  1. Suche sub-item mit passendem view UND tab (exakt)
 *  2. Fallback: sub-item mit passendem view und KEINEM tab gesetzt
 *  3. Fallback: nav-item mit passendem view
 */
function setActiveNavItem(view, tab) {
    // Alle aktiven Klassen entfernen
    document.querySelectorAll('.nav-item, .nav-subitem').forEach(el => el.classList.remove('active'));

    // 1. Exakter Match: view + tab
    if (tab) {
        const exact = document.querySelector(`.nav-subitem[data-view="${view}"][data-tab="${tab}"]`);
        if (exact) { exact.classList.add('active'); return; }
    }

    // 2. Sub-item mit view aber ohne tab (z.B. erster Eintrag einer Gruppe)
    const noTab = document.querySelector(`.nav-subitem[data-view="${view}"]:not([data-tab])`);
    if (noTab) { noTab.classList.add('active'); return; }

    // 3. Fallback auf erstes passendes sub-item mit diesem view
    const first = document.querySelector(`.nav-subitem[data-view="${view}"]`);
    if (first) { first.classList.add('active'); return; }

    // 4. Direkt-Link (nav-item)
    const navItem = document.querySelector(`.nav-item[data-view="${view}"]`);
    if (navItem) navItem.classList.add('active');
}

function getBreadcrumb(view, tab) {
    for (const group of NAV_CONFIG) {
        const items = group.items
            || (group.sections || []).flatMap(s => s.items);
        const match = items.find(i =>
            i.view === view && (tab ? i.tab === tab : !i.tab || i.view === view)
        );
        if (match) return [group.label, match.label];
    }
    return [view];
}

async function switchView(view, tab = null) {
    currentView = view;
    setActiveNavItem(view, tab);
    dashboardToolbar.style.display = 'none';

    const trail = getBreadcrumb(view, tab);
    const trailEl = document.getElementById('breadcrumb-trail');
    if (trailEl && trail) {
        trailEl.innerHTML = trail.filter(Boolean).map((crumb, i) =>
            i < trail.length - 1
                ? `<i class="fas fa-chevron-right" style="font-size:.6rem; opacity:.4; margin:0 6px;"></i><span class="breadcrumb-crumb">${crumb}</span>`
                : `<i class="fas fa-chevron-right" style="font-size:.6rem; opacity:.4; margin:0 6px;"></i><span class="breadcrumb-crumb breadcrumb-crumb--active">${crumb}</span>`
        ).join('');
    }

    switch (view) {
        case 'stats':
            await renderDashboard(contentView, viewTitle, dashboardToolbar);
            break;
        case 'home-editor':
            await renderDesigner(contentView, viewTitle, tab);
            break;
        case 'menu':
            await renderMenu(contentView, viewTitle, tab || 'dishes');
            break;
        case 'reservations':
            await renderReservations(contentView, viewTitle);
            break;
        case 'archive':
            await renderArchive(contentView, viewTitle);
            break;
        case 'tables':
            if (tab === 'qrcodes') {
                viewTitle.innerHTML = '<i class="fas fa-qrcode"></i> QR-Codes';
                contentView.innerHTML = '<div style="padding:40px;text-align:center;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--primary);"></i><p style="margin-top:12px;color:var(--text-muted);">QR-Modul wird geladen...</p></div>';
                let attempts = 0;
                const tryRender = () => {
                    if (window.AdminQR) window.AdminQR.render(contentView, viewTitle);
                    else if (attempts++ < 10) setTimeout(tryRender, 300);
                    else contentView.innerHTML = '<div class="glass-panel" style="padding:40px;text-align:center;"><p style="color:#ef4444;">QR-Modul konnte nicht geladen werden. Bitte Seite neu laden.</p></div>';
                };
                tryRender();
            } else {
                await renderTableManager(contentView, viewTitle);
            }
            break;
        case 'table-planner':
            await renderTablePlanner(contentView, viewTitle);
            break;
        case 'settings':
            await renderSettings(contentView, viewTitle, tab);
            break;
        case 'opening':
            await renderOpeningHours(contentView, viewTitle);
            break;
        case 'orders':
            await renderOrders(contentView, viewTitle);
            break;
        case 'order-settings':
            viewTitle.innerHTML = '<i class="fas fa-shopping-bag"></i> Bestellungen';
            contentView.innerHTML = '<div id="order-settings-root"></div>';
            await initOrderSettings(
                document.getElementById('order-settings-root'),
                { get: (path) => apiGet(path), post: (path, body) => import('./modules/api.js').then(m => m.apiPost(path, body)) },
                await apiGet('license/info')
            );
            break;
        case 'backup':
            await renderBackup(contentView, viewTitle);
            break;
        case 'qrcodes': {
            viewTitle.innerHTML = '<i class="fas fa-qrcode"></i> QR-Codes';
            contentView.innerHTML = '<div style="padding:40px;text-align:center;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--primary);"></i><p style="margin-top:12px;color:var(--text-muted);">QR-Modul wird geladen...</p></div>';
            let attempts = 0;
            const tryRender = () => {
                if (window.AdminQR) window.AdminQR.render(contentView, viewTitle);
                else if (attempts++ < 10) setTimeout(tryRender, 300);
                else contentView.innerHTML = '<div class="glass-panel" style="padding:40px;text-align:center;"><p style="color:#ef4444;">QR-Modul konnte nicht geladen werden. Bitte Seite neu laden.</p></div>';
            };
            tryRender();
            break;
        }
        case 'plugins-manager':
            contentView.innerHTML = `
                <div class="glass-panel" style="padding:60px; text-align:center; opacity:.6;">
                    <i class="fas fa-puzzle-piece" style="font-size:3rem; margin-bottom:20px; display:block;"></i>
                    <h3>Erweiterungen</h3>
                    <p style="margin-top:8px; font-size:.9rem;">Plugin-Verwaltung wird in Kürze verfügbar sein.</p>
                </div>`;
            viewTitle.innerHTML = '<i class="fas fa-puzzle-piece"></i> Erweiterungen';
            break;
        case 'shifts':
            await renderShiftPlanner(contentView, viewTitle);
            break;
        default:
            contentView.innerHTML = `<div style="padding:100px; text-align:center; opacity:.5;"><h3>Ansicht "${view}" wird noch entwickelt.</h3></div>`;
    }
}

// Login
if (loginForm) {
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const btn = loginForm.querySelector('button[type="submit"]');
        const origText = btn ? btn.innerHTML : null;
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Anmelden...'; }

        const res = await login(loginForm.username.value, loginForm.password.value);

        if (btn) { btn.disabled = false; btn.innerHTML = origText; }

        if (res.success) {
            init();
        } else {
            showToast(res.reason || 'Benutzername oder Passwort falsch.', 'error');
        }
    };

    const linkForgot = document.getElementById('link-forgot-pass');
    const linkBack   = document.getElementById('link-back-login');
    const forgotContainer = document.getElementById('forgot-password-container');
    const forgotForm      = document.getElementById('forgot-password-form');

    if (linkForgot) {
        linkForgot.onclick = (e) => {
            e.preventDefault();
            document.getElementById('login-container').style.display = 'none';
            if (forgotContainer) forgotContainer.style.display = 'flex';
        };
    }

    if (linkBack) {
        linkBack.onclick = (e) => {
            e.preventDefault();
            if (forgotContainer) forgotContainer.style.display = 'none';
            document.getElementById('login-container').style.display = 'flex';
        };
    }

    if (forgotForm) {
        forgotForm.onsubmit = async (e) => {
            e.preventDefault();
            const user = document.getElementById('forgot-username').value;
            const btn  = document.getElementById('btn-forgot-submit');
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Sende...'; }

            try {
                const res  = await fetch('/api/admin/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message, 'success');
                    setTimeout(() => {
                        if (forgotContainer) forgotContainer.style.display = 'none';
                        document.getElementById('login-container').style.display = 'flex';
                        if (btn) { btn.disabled = false; btn.innerHTML = 'Neues Passwort anfordern'; }
                    }, 2000);
                } else {
                    showToast(data.reason || 'Fehler beim Senden', 'error');
                    if (btn) { btn.disabled = false; btn.innerHTML = 'Neues Passwort anfordern'; }
                }
            } catch (err) {
                showToast('Verbindungsfehler', 'error');
                if (btn) { btn.disabled = false; btn.innerHTML = 'Neues Passwort anfordern'; }
            }
        };
    }
}

const pwdChangeForm = document.getElementById('password-change-form');
if (pwdChangeForm) {
    pwdChangeForm.onsubmit = async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('new-password').value;
        if (newPassword.length < 6) return showToast('Passwort muss mind. 6 Zeichen haben.', 'error');

        try {
            const token = sessionStorage.getItem('opa_admin_token');
            const res   = await fetch('/api/admin/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
                body: JSON.stringify({ newPassword })
            });
            const data = await res.json();
            if (data.success && data.token) {
                sessionStorage.setItem('opa_admin_token', data.token);
                showToast('Passwort erfolgreich geändert! Willkommen im Dashboard.', 'success');
                scheduleTokenExpiryWarning();
                init();
            } else {
                showToast(data.reason || 'Fehler beim Passwort ändern', 'error');
            }
        } catch (err) {
            showToast('Verbindungsfehler', 'error');
        }
    };
}

if (logoutBtn) logoutBtn.onclick = () => logout();

// ── Sidebar-Gruppen: mehrere gleichzeitig offen, manuell schließbar ──
document.querySelectorAll('.nav-group-header').forEach(header => {
    header.addEventListener('click', (e) => {
        e.preventDefault();
        const group = header.closest('.nav-group');
        group.classList.toggle('open');
        const view = header.dataset.view;
        const tab  = header.dataset.tab || null;
        if (view) switchView(view, tab);
    });
});

// ── Sub-Items ──
document.querySelectorAll('.nav-subitem:not(.nav-subitem--group-label)').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const view = item.dataset.view;
        const tab  = item.dataset.tab || null;
        if (view) switchView(view, tab);
        document.getElementById('cms-sidebar')?.classList.remove('mobile-open');
        document.getElementById('sidebar-overlay')?.classList.remove('visible');
    });
});

// ── Direkt-Links ──
document.querySelectorAll('.nav-item:not(.nav-group-header)').forEach(item => {
    item.addEventListener('click', (e) => {
        const view = item.dataset.view;
        const tab  = item.dataset.tab || null;
        if (view) { e.preventDefault(); switchView(view, tab); }
        document.getElementById('cms-sidebar')?.classList.remove('mobile-open');
        document.getElementById('sidebar-overlay')?.classList.remove('visible');
    });
});

// ── Aktive Gruppe beim Start aufklappen ──
function ensureActiveGroupOpen() {
    document.querySelectorAll('.nav-subitem.active, .nav-item.active').forEach(el => {
        const group = el.closest('.nav-group');
        if (group) group.classList.add('open');
    });
}

// ── Search-Index einmalig aufbauen ──
function buildSearchIndex() {
    const index = [];
    for (const group of NAV_CONFIG) {
        const items = group.items
            || (group.sections || []).flatMap(s => s.items);
        for (const item of items) {
            index.push({
                label:       item.label,
                description: item.description || '',
                keywords:    item.keywords || [],
                group:       item.group || group.label || '',
                view:        item.view,
                tab:         item.tab || null,
                external:    item.external || null,
                icon:        item.icon
            });
        }
    }
    return index;
}
const _searchIndex = buildSearchIndex();
const navSearch = document.getElementById('nav-search');
const navSearchResults = document.getElementById('nav-search-results');

// ── Fuzzy-Suche Hilfsfunktionen ──
function _normalizeText(s) {
    return s.toLowerCase()
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
        .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function _levenshtein(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 99;
    const m = a.length, n = b.length;
    const dp = Array.from({length: m + 1}, (_, i) => i);
    for (let j = 1; j <= n; j++) {
        let prev = j;
        for (let i = 1; i <= m; i++) {
            const curr = a[i - 1] === b[j - 1] ? dp[i - 1] : 1 + Math.min(dp[i - 1], dp[i], prev);
            dp[i - 1] = prev;
            prev = curr;
        }
        dp[m] = prev;
    }
    return dp[m];
}

function _fuzzyScore(query, item) {
    const q = _normalizeText(query);
    if (!q) return 0;

    const haystack = _normalizeText(
        item.label + ' ' + item.description + ' ' + item.keywords.join(' ')
    );
    const labelN = _normalizeText(item.label);

    // Exakter Substring – höchste Priorität
    if (labelN.includes(q)) return 100;
    if (haystack.includes(q)) return 80;

    // Alle Query-Wörter müssen irgendwo matchen
    const qWords = q.split(' ').filter(Boolean);
    const allMatch = qWords.every(w => haystack.includes(w));
    if (allMatch) return 65;

    // Wortanfang-Match (Query-Wort startet Haystack-Wort)
    const hWords = haystack.split(' ').filter(Boolean);
    const prefixMatch = qWords.every(qw =>
        hWords.some(hw => hw.startsWith(qw) || qw.startsWith(hw.slice(0, Math.max(3, hw.length - 1))))
    );
    if (prefixMatch) return 45;

    // Levenshtein ≤ 1 für Query-Wörter ≥ 4 Zeichen
    const fuzzyMatch = qWords.filter(w => w.length >= 4).every(qw =>
        hWords.some(hw => _levenshtein(qw, hw) <= 1)
    );
    if (fuzzyMatch && qWords.some(w => w.length >= 4)) return 25;

    return 0;
}

// ── Zuletzt besucht (sessionStorage) ──
const _RECENT_KEY = 'opa_nav_recent';
function _getRecent() {
    try { return JSON.parse(sessionStorage.getItem(_RECENT_KEY) || '[]'); } catch { return []; }
}
function _addRecent(view, tab) {
    if (!view) return;
    const key = view + (tab ? '/' + tab : '');
    const list = _getRecent().filter(k => k !== key);
    list.unshift(key);
    sessionStorage.setItem(_RECENT_KEY, JSON.stringify(list.slice(0, 5)));
}
function _renderResultItem(m) {
    const action = m.external
        ? `window.open('${m.external}','_blank','width=1280,height=800')`
        : `window.switchTab('${m.view}'${m.tab ? `,'${m.tab}'` : ''})`;
    return `<li class="nav-search-result-item" tabindex="-1"
        data-action="${action.replace(/"/g, '&quot;')}"
        onclick="${action}; _closeNavSearch();">
        <i class="fas ${m.icon}"></i>
        <div>
            <strong>${m.label}</strong>
            <span>${m.group ? m.group + ' · ' : ''}${m.description}</span>
        </div>
    </li>`;
}
window._closeNavSearch = function() {
    if (navSearch) navSearch.value = '';
    if (navSearchResults) navSearchResults.style.display = 'none';
};

function _showRecentItems() {
    const recent = _getRecent();
    if (!recent.length) { navSearchResults.style.display = 'none'; return; }
    const items = recent.map(key => {
        const [v, t] = key.split('/');
        return _searchIndex.find(i => i.view === v && (i.tab || null) === (t || null));
    }).filter(Boolean);
    if (!items.length) { navSearchResults.style.display = 'none'; return; }
    navSearchResults.innerHTML =
        `<li class="nav-search-no-result" style="font-size:.72rem; padding:8px 12px 4px; opacity:.55; pointer-events:none;">Zuletzt besucht</li>` +
        items.map(_renderResultItem).join('');
    navSearchResults.style.display = 'block';
}

function _runSearch(q) {
    if (!q) { _showRecentItems(); return; }
    const scored = _searchIndex
        .map(item => ({ item, score: _fuzzyScore(q, item) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(({ item }) => item);

    if (scored.length) {
        navSearchResults.innerHTML = scored.map(_renderResultItem).join('');
        navSearchResults.style.display = 'block';
    } else {
        navSearchResults.innerHTML = `<li class="nav-search-no-result">Nichts gefunden für „${q}" – Tipp: Englische Begriffe funktionieren auch</li>`;
        navSearchResults.style.display = 'block';
    }
}

// ── Tastatur-Navigation in der Ergebnisliste ──
function _navSearchKeyboard(e) {
    if (navSearchResults.style.display === 'none') return;
    const items = Array.from(navSearchResults.querySelectorAll('.nav-search-result-item'));
    if (!items.length) return;
    const focused = document.activeElement;
    const idx = items.indexOf(focused);
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        (idx < items.length - 1 ? items[idx + 1] : items[0]).focus();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        (idx > 0 ? items[idx - 1] : navSearch).focus();
    } else if (e.key === 'Enter' && idx >= 0) {
        e.preventDefault();
        items[idx].click();
    } else if (e.key === 'Escape') {
        _closeNavSearch();
        navSearch.blur();
    }
}

if (navSearch) {
    navSearch.addEventListener('input', (e) => {
        _runSearch(e.target.value.trim());
    });
    navSearch.addEventListener('focus', () => {
        if (!navSearch.value.trim()) _showRecentItems();
    });
    navSearch.addEventListener('keydown', _navSearchKeyboard);
    navSearchResults.addEventListener('keydown', _navSearchKeyboard);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-search-wrap')) {
            navSearchResults.style.display = 'none';
        }
    });
}

// ── Ctrl+K / Cmd+K fokussiert die Suche ──
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        navSearch?.focus();
        navSearch?.select();
    }
});


// ── Mobile Hamburger ──
const sidebarToggle  = document.getElementById('sidebar-toggle');
const sidebarClose   = document.getElementById('sidebar-close');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const sidebar        = document.getElementById('cms-sidebar');

sidebarToggle?.addEventListener('click', () => {
    sidebar?.classList.add('mobile-open');
    sidebarOverlay?.classList.add('visible');
});
sidebarClose?.addEventListener('click', () => {
    sidebar?.classList.remove('mobile-open');
    sidebarOverlay?.classList.remove('visible');
});
sidebarOverlay?.addEventListener('click', () => {
    sidebar?.classList.remove('mobile-open');
    sidebarOverlay?.classList.remove('visible');
});

// ── Bestellungs-Badge live aktualisieren ──
async function updateOrderBadge() {
    try {
        const orders = await apiGet('orders');
        const pending = (orders || []).filter(o =>
            o.status === 'pending' || o.status === 'new'
        ).length;
        const badge = document.getElementById('nav-orders-badge');
        if (badge) {
            badge.textContent = pending;
            badge.style.display = pending > 0 ? 'inline-flex' : 'none';
        }
    } catch(e) {}
}

updateOrderBadge();
setInterval(updateOrderBadge, 30000);

window.switchTab = (view, tab) => {
    _addRecent(view, tab);
    switchView(view, tab);
    if (view !== 'orders') setTimeout(updateOrderBadge, 500);
    ensureActiveGroupOpen();
};

init();
