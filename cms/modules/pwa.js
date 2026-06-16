/**
 * PWA-Integration (Phase 6): Service-Worker-Registrierung + Desktop-Benachrichtigungen
 * für neue Reservierungen/Bestellungen (über die bestehenden Socket.IO-Events).
 *
 * Hinweis: Echte Hintergrund-Pushes (App geschlossen) erfordern server-seitige
 * VAPID-Keys + Web-Push. Der Service Worker ist dafür vorbereitet (push-Handler);
 * hier werden Benachrichtigungen ausgelöst, solange das CMS in einem Tab läuft.
 */
import { onRealtime } from './realtime.js';

let swReg = null;

export async function initPWA() {
    if ('serviceWorker' in navigator) {
        try {
            swReg = await navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' });
        } catch (e) {
            console.warn('[PWA] Service-Worker-Registrierung fehlgeschlagen:', e);
        }
    }
    setupNotifyButton();
    wireRealtimeNotifications();
}

function canNotify() {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

function notify(title, body, url) {
    if (!canNotify()) return;
    const opts = { body, icon: '/admin/assets/favicon.svg', tag: title, data: url, renotify: false };
    try {
        if (swReg && swReg.showNotification) swReg.showNotification(title, opts);
        else new Notification(title, opts);
    } catch (e) { /* ignorieren */ }
}

function wireRealtimeNotifications() {
    onRealtime('reservation:new', (d) => {
        notify('Neue Reservierung', `${d?.name || 'Gast'} · ${d?.date || ''} ${d?.start_time || ''} · ${d?.guests || '?'} Gäste`, '/admin/');
    });
    onRealtime('order:new', (d) => {
        const total = (d && d.total != null) ? ` · ${parseFloat(d.total).toFixed(2)} €` : '';
        notify('Neue Bestellung', `${d?.table_name || d?.customerName || 'Bestellung'}${total}`, '/admin/');
    });
}

function setupNotifyButton() {
    const btn = document.getElementById('notify-toggle');
    if (!btn) return;
    const sync = () => {
        const supported = typeof Notification !== 'undefined';
        const perm = supported ? Notification.permission : 'unsupported';
        // Button nur zeigen, wenn Erlaubnis noch aussteht
        btn.style.display = (supported && perm === 'default') ? 'inline-flex' : 'none';
    };
    btn.onclick = async () => {
        if (typeof Notification === 'undefined') return;
        try {
            const res = await Notification.requestPermission();
            if (res === 'granted') notify('Benachrichtigungen aktiv', 'Du wirst über neue Reservierungen & Bestellungen informiert.', '/admin/');
        } catch (e) { /* ignorieren */ }
        sync();
    };
    sync();
}
