/**
 * Meraki CMS – Onboarding Checkliste
 * Zeigt nach Trial-Aktivierung eine interaktive Checkliste im Dashboard.
 * Wird ausgeblendet sobald alle Schritte erledigt sind.
 */

const STEPS = [
    {
        id: 'branding',
        label: 'Logo & Branding einrichten',
        view: 'settings',
        tab: 'branding',
        icon: 'fa-palette',
    },
    { id: 'opening', label: 'Öffnungszeiten setzen', view: 'opening', tab: null, icon: 'fa-clock' },
    {
        id: 'first_dish',
        label: 'Erstes Gericht anlegen',
        view: 'menu',
        tab: 'dishes',
        icon: 'fa-hamburger',
    },
    {
        id: 'first_table',
        label: 'Ersten Tisch anlegen',
        view: 'tables',
        tab: null,
        icon: 'fa-chair',
    },
    {
        id: 'smtp',
        label: 'E-Mail / SMTP konfigurieren',
        view: 'settings',
        tab: 'smtp',
        icon: 'fa-envelope',
    },
];

function getProgress() {
    try {
        return JSON.parse(localStorage.getItem('meraki_onboarding') || '{}');
    } catch {
        return {};
    }
}

function saveProgress(progress) {
    localStorage.setItem('meraki_onboarding', JSON.stringify(progress));
}

export function markOnboardingStep(stepId) {
    const p = getProgress();
    p[stepId] = true;
    saveProgress(p);
    // Widget neu rendern falls vorhanden
    const widget = document.getElementById('onboarding-widget');
    if (widget) renderOnboardingWidget(widget.parentElement);
}

export function renderOnboardingWidget(container) {
    const progress = getProgress();

    // Alle erledigt → Widget entfernen
    if (STEPS.every((s) => progress[s.id])) {
        const existing = document.getElementById('onboarding-widget');
        if (existing) existing.remove();
        return;
    }

    // Nur für Trial-Nutzer anzeigen
    const key = localStorage.getItem('meraki_license_key');
    if (!key) return;

    const done = STEPS.filter((s) => progress[s.id]).length;
    const pct = Math.round((done / STEPS.length) * 100);

    const existing = document.getElementById('onboarding-widget');
    if (existing) existing.remove();

    const widget = document.createElement('div');
    widget.id = 'onboarding-widget';
    widget.style.cssText = `
        background:#fff; border-radius:16px; padding:24px 28px;
        box-shadow:0 4px 24px rgba(0,0,0,.08); margin-bottom:28px;
        border:1.5px solid #e5e7eb;
    `;

    widget.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
            <div>
                <h3 style="font-size:1rem; font-weight:800; color:#1b3a5c; margin:0;">
                    🚀 Erste Schritte (${done}/${STEPS.length})
                </h3>
                <p style="font-size:.8rem; color:#6b7280; margin:4px 0 0;">
                    Richten Sie Ihr Restaurant ein um das Beste aus Meraki herauszuholen.
                </p>
            </div>
            <button id="onboarding-dismiss"
                    style="background:none; border:none; color:#9ca3af; cursor:pointer; font-size:.8rem;">
                Ausblenden
            </button>
        </div>

        <div style="background:#f3f4f6; border-radius:8px; height:6px; margin-bottom:20px; overflow:hidden;">
            <div style="background:#1b3a5c; height:100%; width:${pct}%;
                        border-radius:8px; transition:width .4s;"></div>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px;">
            ${STEPS.map(
                (step) => `
                <div style="display:flex; align-items:center; gap:12px; padding:10px 14px;
                             background:${progress[step.id] ? '#f0fdf4' : '#f9fafb'};
                             border-radius:10px; cursor:${progress[step.id] ? 'default' : 'pointer'};
                             border:1px solid ${progress[step.id] ? '#bbf7d0' : '#e5e7eb'};"
                     ${!progress[step.id] ? `onclick="window.switchTab('${step.view}'${step.tab ? `,'${step.tab}'` : ''})"` : ''}>
                    <div style="width:28px; height:28px; border-radius:50%; flex-shrink:0;
                                background:${progress[step.id] ? '#16a34a' : '#e5e7eb'};
                                display:flex; align-items:center; justify-content:center;
                                color:${progress[step.id] ? '#fff' : '#9ca3af'}; font-size:.75rem;">
                        ${
                            progress[step.id]
                                ? '<i class="fas fa-check"></i>'
                                : `<i class="fas ${step.icon}"></i>`
                        }
                    </div>
                    <span style="font-size:.88rem; font-weight:600;
                                 color:${progress[step.id] ? '#16a34a' : '#374151'};
                                 text-decoration:${progress[step.id] ? 'line-through' : 'none'};">
                        ${step.label}
                    </span>
                    ${!progress[step.id] ? '<i class="fas fa-chevron-right" style="margin-left:auto; color:#9ca3af; font-size:.7rem;"></i>' : ''}
                </div>
            `
            ).join('')}
        </div>
    `;

    container.prepend(widget);

    document.getElementById('onboarding-dismiss')?.addEventListener('click', () => {
        localStorage.setItem('meraki_onboarding_dismissed', '1');
        widget.remove();
    });
}
