---
name: admin-ui-overhaul-roadmap
description: Status & remaining work of the big Admin-Panel UI/feature overhaul (design system, menu, mobile, dashboard, reservations, modules)
metadata:
  type: project
---

Großes Admin-Panel-Überarbeitungsprojekt, gestartet 2026-06-16 auf Branch `main`.

**Erledigt (Phasen 0–3 + Teil 6):**
- Phase 0 Design-Tokens: Spacing/Z-Index/radius-pill/touch-min/Semantik-Aliase in `cms/assets/css/style.css`; `--bg` war undefiniert (Bug behoben). Dark Mode via `[data-theme="dark"]` + früher Theme-Init in `index.html` + Toggle in `app.js` + `--font-display` (Plus Jakarta Sans).
- Phase 1: Toggle-Switches auf EIN `.switch`-System konsolidiert (`.toggle-switch`/`.switch-small` jetzt Aliase; `.switch-small` war nie definiert!). `.cms-table` war nie definiert → ergänzt. Modals `90dvh`. Status-Dots statt `border-left`. `btn-primary`=blau, neuer `.btn-accent`=gold.
- Phase 2 Speisekarte (`cms/modules/menu-core.js`): klickbare Sortier-Header, Drag&Drop (Manuell-Modus, nutzt vorhandenes `POST /menu/reorder`, sort_order-Bug gefixt), Bulk-Select+Leiste (`POST /menu/bulk`), Preishistorie (`menu_price_history` Tabelle + `GET /menu/:id/price-history` + Popover), Wochentag-Verfügbarkeit (`available_days` Spalte + Chips + Gäste-Filter in `menu-app/app.js`). Migrationen in BEIDEN Adaptern.
- Phase 3 Mobile: neue `cms/assets/css/responsive.css` (Mobile-First, Touch≥44px, Sidebar-Overlay, Tabellen→Cards via data-label, dvh, print styles), Hamburger, `manifest.webmanifest`.
- Phase 6 (teilweise): `audit_log` Tabelle + `DB.addAuditLog/getAuditLog` (beide Adapter) + `GET /api/audit-log`; Druck-CSS.

**Phase 4 Dashboard (FERTIG, `cms/modules/dashboard.js`):** `today_overview`-Widget (heutige Reservierungen + offene Bestellungen, erstes Widget) + `kpi_trends`-Widget (Umsatz/Reservierungen letzte 7 Tage vs. Vorwoche mit Trend-Badge + Inline-SVG-Sparkline). Helper `parseFlexibleDate/sameDay/sparkline/trendBadge`. Neue Default-Widgets werden in bestehende gespeicherte Layouts eingemischt.

**Phase 5 Reservierungen (FERTIG, `cms/modules/reservations.js`):** View-Toggle Liste/Tag/Woche/Monat (`resViewMode`), `buildResCalendar()` mit Belegungs-Heatmap (`dayCapacity()` aus aktiver Tischkapazität), Kapazitätswarnung (ok/warn≥80%/full≥100%), Warteliste-Status (`Waitlist`) + Aktion-Button + Bestätigen aus Tagesansicht. CSS `.rescal-*` in style.css.

**Phase 6 (FERTIG bis auf i18n-Vollausbau):**
- Audit-Log-UI: `cms/modules/audit-log.js` (View `audit-log`), nutzt `GET /api/audit-log`.
- Kassenbuch/Tagesabschluss: `cms/modules/kassenbuch.js` (View `kassenbuch`), Tag/Monat, Z-Bon-Druck, CSV — aus `orders` aggregiert.
- PWA: `cms/sw.js` (Network-First + push/notificationclick-Handler), `cms/modules/pwa.js` (SW-Registrierung + Desktop-Benachrichtigungen via Socket.IO-Events `reservation:new`/`order:new`). Bell-Button `#notify-toggle` im Topbar. **Hintergrund-Push (App zu) braucht noch server-VAPID-Keys.**
- i18n-GRUNDGERÜST: `cms/modules/i18n.js` (`t()`, `applyTranslations()`, `setLang()`, de+en), Sprachumschalter `#lang-switch` im Topbar. Angewendet auf Sidebar-Nav (`data-i18n`) + Topbar. **Modul-interne Strings noch deutsch — schrittweise per `data-i18n`/`t()` migrierbar (gleiches Muster).**

Neue Views in `app.js` switchView (`kassenbuch`, `audit-log`), Sidebar-Einträge in `index.html`, NAV_CONFIG-Einträge für Breadcrumb/Suche.

**Damit Phasen 0–6 abgeschlossen** (i18n nur Grundgerüst). Offene Folgearbeit: i18n-Vollübersetzung aller Module, Web-Push-VAPID-Backend.

Hinweis: In dieser Umgebung kein `node_modules` → kein Runtime-Test möglich, nur `node --check`.
