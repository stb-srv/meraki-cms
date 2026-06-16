/**
 * Meraki CMS – Gäste-Feedback Modul
 * Zeigt eingegangene Bewertungen als Feed im Dashboard.
 */
import { apiGet } from './api.js';
import { showToast } from './utils.js';

export async function renderFeedbackWidget(container) {
    let reviews = [];
    try {
        reviews = await apiGet('feedback') || [];
    } catch(e) { return; }

    if (reviews.length === 0) return;

    const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

    const widget = document.createElement('div');
    widget.className = 'glass-panel';
    widget.style.cssText = `padding:24px 28px; margin-bottom:28px;`;

    widget.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
            <h3 style="font-size:1rem; font-weight:800; color:var(--primary); margin:0;">
                ⭐ Gäste-Bewertungen
            </h3>
            <div style="background:rgba(200,169,110,.15); color:var(--accent); padding:4px 14px;
                        border-radius:20px; font-size:.85rem; font-weight:800;">
                ⭐ ${avg} / 5.0
            </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:10px; max-height:280px; overflow-y:auto;">
            ${reviews.slice(0, 10).map(r => `
                <div style="padding:12px 14px; background:var(--bg-inset); border-radius:10px;
                            border:1px solid var(--border);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span style="font-weight:700; font-size:.88rem; color:var(--text);">
                            ${r.guest_name || 'Anonymer Gast'}
                        </span>
                        <span style="color:#facc15; font-size:.88rem;">
                            ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
                        </span>
                    </div>
                    ${r.comment ? `<p style="font-size:.82rem; color:var(--text-muted); margin:0;">${r.comment}</p>` : ''}
                    <div style="font-size:.72rem; color:var(--text-subtle); margin-top:4px;">
                        ${new Date(r.created_at).toLocaleDateString('de-DE')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    container.appendChild(widget);
}
