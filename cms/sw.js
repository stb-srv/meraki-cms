/* Meraki CMS Service Worker (Phase 6 PWA)
   Strategie: Network-First mit Cache-Fallback (kein Ausliefern veralteter Assets
   im Normalbetrieb – Cache greift nur offline). Plus Push/Notification-Handling. */
const CACHE = 'meraki-admin-v1';
const SHELL = [
    '/admin/',
    '/admin/index.html',
    '/admin/assets/css/style.css',
    '/admin/assets/css/responsive.css',
    '/admin/nav.css',
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches
            .open(CACHE)
            .then((c) => c.addAll(SHELL))
            .catch(() => {})
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
            )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    // API-Aufrufe niemals cachen
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) return;
    e.respondWith(
        fetch(req)
            .then((res) => {
                if (res && res.ok && url.origin === self.location.origin) {
                    const copy = res.clone();
                    caches
                        .open(CACHE)
                        .then((c) => c.put(req, copy))
                        .catch(() => {});
                }
                return res;
            })
            .catch(() => caches.match(req).then((c) => c || caches.match('/admin/')))
    );
});

// Web-Push (benötigt server-seitige VAPID-Keys – hier vorbereitet)
self.addEventListener('push', (e) => {
    let data = {};
    try {
        data = e.data ? e.data.json() : {};
    } catch (_) {}
    e.waitUntil(
        self.registration.showNotification(data.title || 'Meraki CMS', {
            body: data.body || '',
            icon: '/admin/assets/favicon.svg',
            badge: '/admin/assets/favicon.svg',
            tag: data.tag || 'meraki',
            data: data.url || '/admin/',
        })
    );
});

self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    const target = e.notification.data || '/admin/';
    e.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((list) => {
            for (const c of list) {
                if (c.url.includes('/admin') && 'focus' in c) return c.focus();
            }
            if (self.clients.openWindow) return self.clients.openWindow(target);
        })
    );
});
