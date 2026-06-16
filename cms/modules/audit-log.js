/**
 * Änderungsprotokoll / Audit-Log (Phase 6)
 * Zeigt server-seitig protokollierte Admin-Aktionen (GET /api/audit-log).
 */
import { apiGet } from './api.js';

const ACTION_META = {
    'menu.update':        { icon: 'fa-pen',    color: 'var(--primary)',     label: 'Gericht geändert' },
    'menu.bulk.enable':   { icon: 'fa-eye',    color: 'var(--widget-ok)',   label: 'Gerichte aktiviert' },
    'menu.bulk.disable':  { icon: 'fa-eye-slash', color: 'var(--text-muted)', label: 'Gerichte deaktiviert' },
    'menu.bulk.delete':   { icon: 'fa-trash',  color: 'var(--widget-danger)', label: 'Gerichte gelöscht' },
    'menu.bulk.set_category': { icon: 'fa-tags', color: 'var(--accent)',    label: 'Kategorie zugewiesen' },
};

function metaFor(action) {
    return ACTION_META[action] || { icon: 'fa-clipboard-list', color: 'var(--text-muted)', label: action };
}

function relTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
    if (min < 1) return 'gerade eben';
    if (min < 60) return `vor ${min} Min.`;
    if (h < 24) return `vor ${h} Std.`;
    if (d < 30) return `vor ${d} Tag${d > 1 ? 'en' : ''}`;
    return new Date(iso).toLocaleDateString('de-DE');
}

let auditFilter = '';

export async function renderAuditLog(container, titleEl) {
    titleEl.innerHTML = '<i class="fas fa-clipboard-list"></i> Änderungsprotokoll';
    container.innerHTML = `<div class="glass-panel" style="padding:40px; text-align:center; opacity:.6;"><i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top:12px;">Protokoll wird geladen…</p></div>`;

    let log = await apiGet('audit-log').catch(() => []);
    if (!Array.isArray(log)) log = [];

    const draw = () => {
        const filtered = auditFilter
            ? log.filter(e => JSON.stringify(e).toLowerCase().includes(auditFilter.toLowerCase()))
            : log;

        const rows = filtered.map(e => {
            const m = metaFor(e.action);
            const detail = e.detail && typeof e.detail === 'object'
                ? Object.entries(e.detail).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ')
                : '';
            return `<tr>
                <td data-label="Aktion"><span style="display:inline-flex; align-items:center; gap:8px;"><i class="fas ${m.icon}" style="color:${m.color};"></i> ${m.label}</span></td>
                <td data-label="Benutzer">${e.actor || '<i style="opacity:.4;">System</i>'}</td>
                <td data-label="Objekt"><small style="opacity:.7;">${e.entity || ''} ${e.entity_id ? '#' + String(e.entity_id).slice(0, 24) : ''}</small></td>
                <td data-label="Details"><small style="opacity:.6;">${detail}</small></td>
                <td data-label="Zeit" title="${e.ts ? new Date(e.ts).toLocaleString('de-DE') : ''}"><small>${relTime(e.ts)}</small></td>
            </tr>`;
        }).join('');

        container.innerHTML = `
            <div class="glass-panel" style="padding:30px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
                    <div>
                        <h3 style="margin-bottom:4px;">Änderungsprotokoll</h3>
                        <p style="color:var(--text-muted); font-size:.85rem;">Wer hat wann was geändert – für den Mehrbenutzerbetrieb.</p>
                    </div>
                    <div style="position:relative; min-width:240px;">
                        <i class="fas fa-search" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); opacity:.3;"></i>
                        <input type="text" class="input-styled" id="audit-search" placeholder="Filtern…" value="${auditFilter}" style="padding-left:42px;">
                    </div>
                </div>
                ${log.length === 0
                    ? `<div style="padding:60px; text-align:center; opacity:.4;"><i class="fas fa-clipboard-list fa-3x" style="margin-bottom:14px;"></i><br>Noch keine protokollierten Änderungen.</div>`
                    : `<table class="cms-table">
                        <thead><tr><th>Aktion</th><th>Benutzer</th><th>Objekt</th><th>Details</th><th>Zeit</th></tr></thead>
                        <tbody>${rows || '<tr><td colspan="5" style="text-align:center; opacity:.5; padding:30px;">Kein Treffer.</td></tr>'}</tbody>
                    </table>`}
            </div>
        `;
        const s = container.querySelector('#audit-search');
        if (s) s.oninput = (e) => { auditFilter = e.target.value; draw(); };
    };

    draw();
}
