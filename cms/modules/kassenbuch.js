/**
 * Kassenbuch & Tagesabschluss (Phase 6)
 * Aggregiert vorhandene Bestellungen (orders) zu Tages-/Monatskennzahlen
 * und erzeugt einen druckbaren Z-Bon (Tagesabschluss).
 */
import { apiGet } from './api.js';
import { showToast } from './utils.js';

let kbDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
let kbMode = 'day'; // 'day' | 'month'

const TYPE_LABELS = { dine_in: 'Vor Ort', pickup: 'Abholung', delivery: 'Lieferung' };
const fmt = (n) => (parseFloat(n) || 0).toFixed(2) + ' €';

function orderDate(o) {
    const d = new Date(o.timestamp || o.createdAt || o.confirmedAt || 0);
    return isNaN(d) ? null : d;
}
function inSelectedRange(o) {
    const d = orderDate(o);
    if (!d) return false;
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return kbMode === 'day' ? iso === kbDate : iso.slice(0, 7) === kbDate.slice(0, 7);
}

export async function renderKassenbuch(container, titleEl) {
    titleEl.innerHTML = '<i class="fas fa-cash-register"></i> Kassenbuch & Tagesabschluss';
    const ordersRaw = await apiGet('orders').catch(() => []);
    const orders = Array.isArray(ordersRaw) ? ordersRaw : [];

    const draw = () => {
        const sel = orders.filter(inSelectedRange);
        // Nur abgeschlossene/bezahlte Umsätze zählen (storniert ausschließen)
        const counted = sel.filter(
            (o) =>
                !['cancelled', 'canceled', 'storniert', 'rejected'].includes(
                    String(o.status || '').toLowerCase()
                )
        );
        const revenue = counted.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
        const count = counted.length;
        const avg = count ? revenue / count : 0;

        // Aufschlüsselung nach Typ
        const byType = {};
        counted.forEach((o) => {
            const t = o.type || 'dine_in';
            byType[t] = byType[t] || { count: 0, sum: 0 };
            byType[t].count++;
            byType[t].sum += parseFloat(o.total) || 0;
        });

        const periodLabel =
            kbMode === 'day'
                ? new Date(kbDate).toLocaleDateString('de-DE', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                  })
                : new Date(kbDate).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

        const typeRows =
            Object.entries(byType)
                .map(
                    ([t, v]) =>
                        `<div class="widget-list-row"><span>${TYPE_LABELS[t] || t} <small style="opacity:.5;">(${v.count})</small></span><strong>${fmt(v.sum)}</strong></div>`
                )
                .join('') ||
            '<div style="opacity:.5; padding:10px 0;">Keine Umsätze im Zeitraum.</div>';

        const orderRows = counted
            .sort((a, b) => (orderDate(a) || 0) - (orderDate(b) || 0))
            .map((o) => {
                const d = orderDate(o);
                const time = d
                    ? d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                    : '--';
                const dateStr = d ? d.toLocaleDateString('de-DE') : '';
                return `<tr>
                    <td data-label="Zeit">${kbMode === 'month' ? dateStr + ' ' : ''}${time}</td>
                    <td data-label="Beleg">#${String(o.id || '').slice(-6)}</td>
                    <td data-label="Typ">${TYPE_LABELS[o.type] || o.type || 'Vor Ort'}</td>
                    <td data-label="Tisch/Kunde">${o.table_name || o.customerName || '—'}</td>
                    <td data-label="Betrag" style="text-align:right; font-family:var(--font-mono); font-weight:700;">${fmt(o.total)}</td>
                </tr>`;
            })
            .join('');

        container.innerHTML = `
            <div class="kb-toolbar no-print" style="display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:24px;">
                <div class="res-view-toggle" style="display:inline-flex; background:var(--bg-inset); border:1px solid var(--border); border-radius:var(--radius-pill); padding:3px;">
                    <button class="res-view-btn" data-kbmode="day" style="border:none; cursor:pointer; padding:7px 16px; border-radius:var(--radius-pill); font-weight:700; font-size:.78rem; background:${kbMode === 'day' ? 'var(--primary)' : 'transparent'}; color:${kbMode === 'day' ? '#fff' : 'var(--text-muted)'};">Tag</button>
                    <button class="res-view-btn" data-kbmode="month" style="border:none; cursor:pointer; padding:7px 16px; border-radius:var(--radius-pill); font-weight:700; font-size:.78rem; background:${kbMode === 'month' ? 'var(--primary)' : 'transparent'}; color:${kbMode === 'month' ? '#fff' : 'var(--text-muted)'};">Monat</button>
                </div>
                <input type="${kbMode === 'day' ? 'date' : 'month'}" class="input-styled" id="kb-date" value="${kbMode === 'day' ? kbDate : kbDate.slice(0, 7)}" style="width:auto;">
                <button class="btn-secondary" id="kb-print"><i class="fas fa-print"></i> Tagesabschluss drucken</button>
                <button class="btn-secondary" id="kb-csv"><i class="fas fa-file-csv"></i> CSV</button>
            </div>

            <div class="print-only" style="margin-bottom:16px;">
                <h2 style="margin:0;">Tagesabschluss (Z-Bon)</h2>
                <p style="opacity:.7;">${periodLabel} · erstellt ${new Date().toLocaleString('de-DE')}</p>
            </div>

            <div class="stats-grid" style="margin-bottom:24px;">
                <div class="stat-widget accent span-4"><div><h3>Umsatz ${kbMode === 'day' ? 'Tag' : 'Monat'}</h3><div class="value">${fmt(revenue)}</div><p>${periodLabel}</p></div></div>
                <div class="stat-widget span-4"><div class="widget-header"><h3>Bestellungen</h3><i class="fas fa-receipt"></i></div><div class="value">${count}</div></div>
                <div class="stat-widget span-4"><div class="widget-header"><h3>Ø Bonwert</h3><i class="fas fa-calculator"></i></div><div class="value">${fmt(avg)}</div></div>
            </div>

            <div class="stats-grid">
                <div class="glass-panel span-4" style="padding:22px;">
                    <h3 style="margin-bottom:14px; font-size:.95rem;">Nach Bestellart</h3>
                    ${typeRows}
                </div>
                <div class="glass-panel span-8" style="padding:0; overflow:hidden;">
                    <table class="cms-table">
                        <thead><tr><th>Zeit</th><th>Beleg</th><th>Typ</th><th>Tisch/Kunde</th><th style="text-align:right;">Betrag</th></tr></thead>
                        <tbody>${orderRows || '<tr><td colspan="5" style="text-align:center; opacity:.5; padding:40px;">Keine Bestellungen im Zeitraum.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        `;

        container.querySelectorAll('[data-kbmode]').forEach(
            (b) =>
                (b.onclick = () => {
                    kbMode = b.dataset.kbmode;
                    draw();
                })
        );
        const dateInp = container.querySelector('#kb-date');
        if (dateInp)
            dateInp.onchange = (e) => {
                kbDate = kbMode === 'day' ? e.target.value : e.target.value + '-01';
                draw();
            };
        container.querySelector('#kb-print').onclick = () => window.print();
        container.querySelector('#kb-csv').onclick = () => exportCSV(counted);
    };

    draw();
}

function exportCSV(orders) {
    const rows = [['Datum', 'Zeit', 'Beleg', 'Typ', 'Tisch/Kunde', 'Betrag']];
    orders.forEach((o) => {
        const d = new Date(o.timestamp || o.createdAt || 0);
        rows.push([
            isNaN(d) ? '' : d.toLocaleDateString('de-DE'),
            isNaN(d) ? '' : d.toLocaleTimeString('de-DE'),
            '#' + String(o.id || '').slice(-6),
            TYPE_LABELS[o.type] || o.type || '',
            (o.table_name || o.customerName || '').replace(/;/g, ','),
            (parseFloat(o.total) || 0).toFixed(2),
        ]);
    });
    const csv = rows.map((r) => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kassenbuch_${kbDate}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('CSV exportiert.');
}
