/**
 * Responsive-Tables-Helper
 *
 * Stempelt jeder <td> einer `.premium-table` das passende `data-label` aus der
 * zugehörigen <th>-Spalte. Die CSS-Karten-Ansicht (responsive.css, ≤560px) zeigt
 * dieses Label über `td::before { content: attr(data-label) }` an.
 *
 * Zentral aufgerufen aus app.js (MutationObserver auf #content-view), damit alle
 * Module ohne eigene Anpassung profitieren. Idempotent gehalten, um
 * Observer-Schleifen zu vermeiden.
 */

export function enhanceTables(root = document) {
    const tables = root.querySelectorAll('table.premium-table');
    tables.forEach((table) => {
        const headers = Array.from(table.querySelectorAll('thead th')).map((th) =>
            (th.textContent || '').trim()
        );
        if (!headers.length) return;

        table.querySelectorAll('tbody tr').forEach((tr) => {
            const cells = tr.children;
            for (let i = 0; i < cells.length; i++) {
                const cell = cells[i];
                if (cell.tagName !== 'TD') continue;
                // Bereits gesetzt? -> überspringen (Idempotenz)
                if (cell.dataset.label != null) continue;
                cell.dataset.label = headers[i] || '';
            }
        });
    });
}
