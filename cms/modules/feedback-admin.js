/**
 * Gäste-Bewertungen verwalten (Moderation).
 * Nutzt GET /api/feedback und DELETE /api/feedback/:id.
 */
import { apiGet, apiDelete } from './api.js';
import { showConfirm, showToast } from './utils.js';

function stars(n) {
    const r = Math.max(0, Math.min(5, parseInt(n) || 0));
    return `<span style="color:#facc15; white-space:nowrap;">${'★'.repeat(r)}${'☆'.repeat(5 - r)}</span>`;
}

export async function renderFeedback(container, titleEl) {
    titleEl.innerHTML = '<i class="fas fa-star"></i> Gäste-Bewertungen';
    container.innerHTML = `<div class="glass-panel" style="padding:40px; text-align:center; opacity:.6;"><i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top:12px;">Bewertungen werden geladen…</p></div>`;

    let reviews = await apiGet('feedback').catch(() => []);
    if (!Array.isArray(reviews)) reviews = [];

    const draw = () => {
        const avg = reviews.length
            ? (reviews.reduce((s, r) => s + (parseInt(r.rating) || 0), 0) / reviews.length).toFixed(
                  1
              )
            : '—';
        const rows = reviews
            .map(
                (r) => `
            <tr>
                <td data-label="Gast"><strong>${r.guest_name || 'Anonymer Gast'}</strong></td>
                <td data-label="Bewertung">${stars(r.rating)}</td>
                <td data-label="Kommentar"><span style="opacity:.8;">${r.comment ? String(r.comment).replace(/</g, '&lt;') : '<i style="opacity:.4;">—</i>'}</span></td>
                <td data-label="Datum"><small style="opacity:.6;">${r.created_at ? new Date(r.created_at).toLocaleDateString('de-DE') : ''}</small></td>
                <td data-label="" style="text-align:right;">
                    <button class="btn-icon danger" data-del="${r.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`
            )
            .join('');

        container.innerHTML = `
            <div class="glass-panel" style="padding:30px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
                    <div>
                        <h3 style="margin-bottom:4px;">Gäste-Bewertungen</h3>
                        <p style="color:var(--text-muted); font-size:.85rem;">Bewertungen moderieren und unpassende Einträge entfernen.</p>
                    </div>
                    <div class="badge-status active" style="font-size:1rem;"><i class="fas fa-star"></i> ${avg} / 5.0 · ${reviews.length} Bewertungen</div>
                </div>
                ${
                    reviews.length === 0
                        ? `<div style="padding:60px; text-align:center; opacity:.4;"><i class="fas fa-star fa-3x" style="margin-bottom:14px;"></i><br>Noch keine Bewertungen erhalten.</div>`
                        : `<table class="cms-table">
                        <thead><tr><th>Gast</th><th>Bewertung</th><th>Kommentar</th><th>Datum</th><th style="text-align:right;">Aktion</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>`
                }
            </div>`;

        container.querySelectorAll('[data-del]').forEach((btn) => {
            btn.onclick = async () => {
                if (
                    !(await showConfirm(
                        'Bewertung löschen?',
                        'Diese Bewertung wird unwiderruflich entfernt.'
                    ))
                )
                    return;
                const res = await apiDelete('feedback/' + btn.dataset.del);
                if (res?.success) {
                    reviews = reviews.filter((r) => String(r.id) !== String(btn.dataset.del));
                    showToast('Bewertung gelöscht.');
                    draw();
                } else {
                    showToast(res?.reason || 'Löschen fehlgeschlagen', 'error');
                }
            };
        });
    };

    draw();
}
