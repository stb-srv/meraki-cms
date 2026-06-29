# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projektübersicht

Meraki CMS ist ein modulares Restaurant-CMS. Backend: Node.js/Express (CommonJS), dient als **reine JSON-API**. Frontend: **React + Vite + TypeScript** mit **Tailwind CSS v4** und **shadcn/ui** (im Ordner `web/`). Datenbank: SQLite (Standard) oder MySQL/MariaDB (via `DB_TYPE=mysql`).

> **Migration abgeschlossen** (siehe `.claude/plans/`): Das alte Vanilla-JS-Frontend (`cms/`, `menu-app/`) wurde durch die React-SPA in `web/` ersetzt (Big-Bang-Rewrite) und gelöscht. Sämtliche Frontend-Arbeit findet ausschließlich in `web/` statt.

## Befehle

```bash
# Backend (Express-API)
npm start            # Produktions-Start (node server.js)
npm run dev          # Backend mit pino-pretty Log-Formatierung

# Frontend (React/Vite in web/)
npm run install:web  # Frontend-Dependencies installieren
npm run dev:web      # Vite-Dev-Server (Port 5173, proxyt /api & /socket.io → :5000)
npm run dev:all      # Backend + Frontend parallel (concurrently)
npm run build:web    # Produktions-Build → web/dist/

# Sonstiges
npm run reset-admin  # Admin-Passwort zurücksetzen (reset-admin.js)
npm run update       # git pull + npm install (root + web)
node test-integration.js  # Datenvertrag-Test CMS↔Lizenzserver
```

Das Frontend nutzt Vite als Build-System. Es gibt weiterhin keine automatisierten Unit-Tests.

## Setup-Flow (Erstkonfiguration)

Beim ersten Start ohne `server/config.json` wird jeder Nicht-API-Aufruf auf `/setup` umgeleitet.

`server.js` generiert beim Start automatisch einen einmaligen **Setup-Token** (`global._setupToken`) und gibt ihn in der Konsole aus:

```
  Öffne:  http://localhost:5000/setup
  Token:  <32-Zeichen-Hex-Token>
```

Der Setup-Wizard (`POST /api/setup`) validiert den Token (statt IP-Check) und erstellt:

1. Den ersten Admin-User in der DB (Recovery-Codes werden generiert, nur einmalig im Browser angezeigt)
2. `server/config.json` mit `ADMIN_SECRET` (auto-generiert), `DB_TYPE`, `SMTP`, `LICENSE_SERVER_URL`, `SETUP_COMPLETE: true`
3. Branding-KV mit Restaurantname, Telefon, Adresse, Sprache, Zeitzone
4. Trial-Lizenz oder validierter Lizenz-Key in `settings.license`

Der ADMIN_SECRET wird **ausschließlich server-seitig** generiert – kein Benutzer-Input nötig.

Der LicenseChecker ermittelt den echten Plan-Typ beim ersten Start automatisch vom Lizenzserver.

Nach dem Setup wird `server/config.json` beim Serverstart geladen und `CONFIG.SETUP_COMPLETE = true`.

## Architektur

### Server-Bootstrapping

`server.js` → `server/app.js` (Express-App + alle Routen) + `server/socket.js` (Socket.IO) + `server/cron.js` (Background-Jobs) + `server/services/license-checker.js` (periodischer Token-Refresh)

### Konfiguration (`config.js`)

Priorität: `.env/PORT` & `.env/ADMIN_SECRET` > `server/config.json` (Setup-Wizard) > `.env` > Defaults.
**Nie `server/config.json` committen** – enthält den ADMIN_SECRET. Config-Pfad kann auch `config.json` im Root sein (Legacy-Fallback).

### Datenbank-Adapter

`server/db/index.js` wählt automatisch: `DB_TYPE=mysql` → `server/db/mysql.js`, sonst `server/db/sqlite.js` (via `better-sqlite3`). Beide Adapter exportieren **exakt dasselbe Interface**, alle Methoden sind async-kompatibel (SQLite sync, MySQL async – `await` funktioniert mit beiden).

**Neue DB-Funktionen immer in BEIDEN Adaptern implementieren.**

**Neue Spalten** als Migration eintragen:

- SQLite: `migrations`-Array in `server/db/sqlite.js`
- MySQL: `initSchema()`-try-Block mit `SHOW COLUMNS`-Check in `server/db/mysql.js`

### KV-Store

Allgemeine Einstellungen (Settings, License, SMTP, Branding, Homepage, Plugins) werden als JSON in der `kv_store`-Tabelle gespeichert:

```js
await DB.getKV('settings', {}); // zweites Argument: Default-Wert
await DB.setKV('settings', obj);
```

Wichtige KV-Keys: `settings`, `branding`, `homepage`, `plugins`

### Auth & Rollen

- JWT via `x-admin-token` Header oder `?token` Query-Param
- Token wird clientseitig in `sessionStorage` als `meraki_admin_token` gespeichert
- Auto-Refresh wenn Token < 30 Minuten bis Ablauf (`/api/admin/refresh`)
- Rollen: `admin`, `waiter`, `kitchen`
- `requireAuth` prüft Token-Gültigkeit, `requireRole('admin')` / `requireRole('admin', 'waiter')` prüft zusätzlich die Rolle

### Lizenz-System

Pläne: `TRIAL` → `FREE` → `STARTER` → `PRO` → `PRO_PLUS` → `ENTERPRISE`

**Einzige Quelle der Wahrheit**: `@meraki/plans` — zentrales Repository `github:stb-srv/meraki-plans` (in `package.json` als Dependency referenziert, installiert nach `node_modules/@meraki/plans`). CMS und Lizenzserver nutzen dieselbe Quelle.
**Nie** PLAN_DEFINITIONS direkt im CMS oder Lizenzserver definieren — immer im Upstream-Repo `stb-srv/meraki-plans` (`index.js`) bearbeiten, dann hier per `npm install` aktualisieren.

- Trial: In KV `settings.license.isTrial = true`, Ablauf via Cron geprüft
- Vollizenz: RSA-signiertes JWT (`licenseToken`), Public Key beim Start vom Lizenzserver geladen
- Offline-Fallback: letzter bekannter Plan aus `settings.license.lastKnownType`
- `requireLicense(moduleName)` prüft `modules[moduleName]` im aktuellen Plan

**Modul-Namen** — immer als `PLAN_MODULES`-Konstante verwenden, nie als String-Literal:
```js
const { PLAN_MODULES } = require('@meraki/plans');
// z.B.: requireLicense(PLAN_MODULES.MENU_EDIT)
```
Verfügbare Konstanten: `MENU_EDIT`, `ORDERS_KITCHEN`, `RESERVATIONS`, `CUSTOM_DESIGN`, `ANALYTICS`, `QR_PAY`, `ONLINE_ORDERS`, `MULTILANGUAGE`, `SEASONAL_MENU`, `BACKUP`, `IMAGE_AI`

### LicenseChecker (`server/services/license-checker.js`)

- Startet 5s nach Boot, dann alle 72h
- Lädt RSA Public Key vom Lizenzserver (`/api/v1/public-key`)
- Refresht Token wenn < 60h Restlaufzeit (Token-Gültigkeit: 80h)
- Bei 3 aufeinanderfolgenden Fehlern: Offline-Fallback aktiv
- Wird in `server.js` instanziiert; SIGTERM/SIGINT stoppen ihn sauber

### Validierung

Alle Route-Handler nutzen `validate(schema)` Middleware aus `server/validation/validate.js` mit Zod-Schemas aus `server/validation/schemas.js`. `.passthrough()` erlaubt Extra-Felder.

### Real-time (Socket.IO)

`server/socket.js` – Socket-Verbindungen ohne Token werden als Gast zugelassen (`socket.admin = null`). Das `io`-Objekt wird an Orders- und Cart-Routes übergeben für Push-Updates an Kitchen-Display.

### Background-Jobs (`server/cron.js`)

Stündlich (mit internem Stunden-Filter):

- **Trial-Expiry**: Prüft ob Trial-Lizenz abgelaufen ist
- **Reservation-Reminders**: Täglich um **10:00 Uhr Berlin** – E-Mail-Erinnerungen 24h vor Reservierung (nur wenn `status=Confirmed`, `email` vorhanden, `reminderSent=false`)
- **Backup-Cleanup**: Täglich um **03:00 Uhr Berlin** – löscht alte Backups, behält mindestens `BACKUP_MIN_COUNT` (default: 7)

### Plugin-System

Plugins liegen in `plugins/<id>/` mit:

- `plugin.json` – Metadaten (id, name, version, entry-Points)
- `server.js` (optional) – `module.exports = (app, { DB, requireAuth, requireLicense }) => {...}`
- `cms.js` (optional) – CMS-Frontend-Erweiterung
- `website.js` (optional) – Gäste-Frontend-Erweiterung

## Wichtigste Dateien

| Datei                                         | Zweck                                                                               |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `server.js`                                   | Entry Point, Plugin-Loader, HTTP-Server, Graceful Shutdown                          |
| `config.js`                                   | Konfiguration (Prio: config.json > .env)                                            |
| `server/app.js`                               | Express-App-Factory, alle Route-Mounts, Helmet/CORS                                 |
| `server/db/index.js`                          | DB-Adapter-Selector                                                                 |
| `server/db/sqlite.js`                         | SQLite-Adapter                                                                      |
| `server/db/mysql.js`                          | MySQL/MariaDB-Adapter                                                               |
| `server/core/middleware.js`                   | `requireAuth`, `requireRole`, `requireLicense`, `requireMenuLimit`, Rate-Limiter    |
| `server/core/logger.js`                       | Pino-Logger (strukturiertes JSON-Logging)                                           |
| `server/services/license.js`                  | `getCurrentLicense`, `verifyLicenseToken`, `getPlan`                                |
| `server/services/license-checker.js`          | Periodischer Token-Refresh vom Lizenzserver                                         |
| `server/services/mailer.js`                   | E-Mail via Nodemailer                                                               |
| `server/cron.js`                              | Background-Jobs (Trial, Reminders, Backup-Cleanup)                                  |
| `server/socket.js`                            | Socket.IO-Setup                                                                     |
| `server/validation/schemas.js`                | Zod-Schemas für alle Routen                                                         |
| `@meraki/plans` (github:stb-srv/meraki-plans) | **Shared** PLAN_DEFINITIONS (CMS + Lizenzserver) – Upstream-Repo, nicht im CMS-Repo |
| `test-integration.js`                         | Datenvertrag-Test CMS↔Lizenzserver                                                  |
| `web/src/lib/api.ts`                          | Admin-Frontend API-Client (`apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiUpload`) |
| `web/src/routes/admin-routes.tsx`             | Admin-SPA Routing (HashRouter, PAGES-Registry aus NAV_CONFIG)                        |
| `web/src/modules/guest/`                      | Gäste-Frontend (HomePage, CartDrawer, CookieBanner, cart-store)                      |
| `web/src/config/navigation.ts`               | Single-Source Navigation (NAV_CONFIG)                                               |
| `web/public/setup.html`                       | Setup-Wizard (statisch, noch nicht nach React portiert)                              |

## Routen-Übersicht

| Prefix                               | Datei                    | Auth                                                 |
| ------------------------------------ | ------------------------ | ---------------------------------------------------- |
| `/api/admin`                         | `routes/auth.js`         | Nein (Login-Endpunkt)                                |
| `/api/v1/setup`                      | `routes/setup.js`        | Nein (nur localhost)                                 |
| `/api/users`                         | `routes/users.js`        | `requireAuth`                                        |
| `/api/menu`, `/api/categories`       | `routes/menu.js`         | `requireAuth` (schreiben), öffentlich (lesen)        |
| `/api/orders`                        | `routes/orders.js`       | `requireAuth` + Socket.IO                            |
| `/api/reservations`                  | `routes/reservations.js` | `requireAuth` + `requireLicense('reservations')`     |
| `/api` (tables)                      | `routes/tables.js`       | `requireAuth`                                        |
| `/api` (settings, branding, license) | `routes/settings.js`     | `requireAuth` + `requireRole('admin')` für Schreiben |
| `/api/upload`                        | `routes/upload.js`       | `requireAuth`                                        |
| `/api` (cookie)                      | `routes/cookie.js`       | `requireAuth`                                        |
| `/api/cart`                          | `routes/cart.js`         | Öffentlich (Gäste) + `requireLicense`                |
| `/api/image-ai`                      | `routes/image-ai.js`     | `requireAuth`                                        |
| `/api/backup`                        | `routes/backup.js`       | `requireAuth`                                        |
| `/api/plugins`                       | `app.js` inline          | `requireAuth`                                        |

## Static Serving

`server/app.js` liefert das gebaute React-Frontend aus `web/dist/` aus (Voraussetzung: `npm run build:web`). Fehlt `web/dist`, antwortet der Server mit HTTP 503 + Hinweis auf `npm run build:web` (es gibt **kein** Alt-Frontend mehr als Fallback – der Cutover ist abgeschlossen).

- `web/dist` → statische Assets (gehashte JS/CSS/Fonts, `logo.svg`, `favicon.svg`, Brand-Bilder aus `web/public/assets/`)
- `/admin` und `/admin/*` → `web/dist/admin.html` (Admin-SPA, HashRouting)
- `/` + SPA-Fallback (alle Nicht-API-Routen) → `web/dist/index.html` (Gäste-SPA)
- `/uploads` → `uploads/` (mit strikten Security-Headern, kein inline CSP)
- `/plugins` → `plugins/`
- `/setup` → `web/public/setup.html` (Setup-Wizard noch nicht nach React portiert, aber als statische Seite erhalten)
- `/status` → `public/status.html` (noch nicht portiert)

**Migrationsstand:** Cutover abgeschlossen – das alte Vanilla-JS-Frontend (`cms/`, `menu-app/`) wurde **gelöscht**. Alle Admin-Module, das Gäste-Frontend und der DSGVO-Cookie-Banner/Consent-Log laufen in `web/` (React). Brand-Assets (`santorini_bg.png` u.a.), Favicons und `setup.html` liegen jetzt unter `web/public/`. Offene Folge-TODOs: Setup-Wizard nach React portieren, Plugins-Manager-UI, Passwort-Wechsel-Seite, 14-Sprachen-i18n (nur DE aktiv), Menü-Drag&Drop/Bulk/Preisverlauf/Import-Export, KI-Bild-Stapelgenerator, Tischplaner-Deko/Kombinieren, erweiterter Seiten-Block-Builder, `window.confirm`→AlertDialog.

## Architektur-Regeln (WICHTIG)

- **Frontend = React + Vite + TypeScript** (in `web/`). Tailwind v4 (CSS-first via `web/src/styles/globals.css`) + shadcn/ui (`web/src/components/ui/`). **Keine Inline-Styles** – nur Tailwind-Utility-Klassen / shadcn-Komponenten. (Die alte Regel „Vanilla JS only" ist mit dem Redesign aufgehoben.)
- **Zentralisierte Layouts**: Header/Sidebar/Footer/Nav existieren genau einmal unter `web/src/components/layout/` + `components/shared/`. Feature-Seiten werden via react-router `<Outlet/>` injiziert. Navigation ausschließlich aus `web/src/config/navigation.ts` (Single Source).
- **Design-Tokens & White-Labeling**: EINE Token-Quelle in `globals.css` (`:root`/`.dark`, HSL-Tripel). Marken-Farben zur Laufzeit über `web/src/lib/branding.ts` (`applyBranding`) per CSS-Variable steuerbar – ohne Tailwind-Rebuild. Dark-Mode via Tailwind `class`-Strategie (`ThemeProvider`), nie über Attribut-Selektoren auf Inline-Styles.
- **Shared Plans**: Plan-Definitionen IMMER im Upstream-Repo `github:stb-srv/meraki-plans` bearbeiten, dann per `npm install` ziehen. Nie in CMS oder Lizenzserver duplizieren.
- **Datenbank-Adapter-Interface**: Neue DB-Funktionen immer in BEIDEN Adaptern implementieren.
- **Migrationen**: Neue Spalten in beiden Adaptern als Migration eintragen (siehe oben).
- **Auth**: Alle Admin-API-Routen brauchen `requireAuth`. Gäste-Routen (Gäste-Website, cart, cookie-consent) sind öffentlich.
- **Lizenz-Check**: Feature-Routen nutzen `requireLicense(moduleName)`.
- **`requireRole`**: Für admin-only Aktionen (Einstellungen schreiben, User verwalten) zusätzlich zu `requireAuth`.
- **Settings deepMerge**: `/api/settings` und `/api/branding` nutzen `deepMerge` – Arrays werden **ersetzt**, nicht konkateniert.

## .env Variablen-Referenz

```env
PORT=5000
HOST=meinrestaurant.de          # Hostname für License domain check (optional)
ADMIN_SECRET=langer-zufälliger-string
CORS_ORIGINS=https://meinrestaurant.de  # Komma-getrennt; Default: localhost
LICENSE_SERVER_URL=https://licens-prod.stb-srv.de
LICENSE_PUBLIC_KEY=             # RSA Public Key Override (optional)

# Datenbank (Standard: SQLite)
DB_TYPE=sqlite
DB_HOST=localhost
DB_PORT=3306
DB_USER=meraki_user
DB_PASS=passwort
DB_NAME=meraki_cms
DB_SSL=false

# Backup
BACKUP_DIR=./backups
BACKUP_MAX_AGE_DAYS=30
BACKUP_MIN_COUNT=7

# Automatische Speisefotos (optional)
PEXELS_API_KEY=
UNSPLASH_ACCESS_KEY=
```

## Häufige Fehlerquellen

- **`DB_TYPE` nicht gesetzt** → App startet mit SQLite statt MySQL, alle MySQL-Daten unsichtbar
- **Neue Spalte nur in einem Adapter** → Funktioniert lokal (SQLite) aber nicht auf Prod (MySQL) oder umgekehrt
- **`server/config.json` fehlt** → Setup-Wizard startet neu, alle Einstellungen weg
- **`CORS_ORIGINS` nicht gesetzt** → API-Calls vom Frontend werden in Produktion blockiert
- **`ADMIN_SECRET` = Default-Wert** → Server verweigert Start nach abgeschlossenem Setup
- **Modul-Name falsch in `requireLicense()`** → Feature immer gesperrt; gültige Namen oben nachschlagen
- **PLAN_DEFINITIONS direkt im CMS/Lizenzserver geändert** → Änderung wirkt nicht, da `@meraki/plans` die Quelle ist
- **`JSON_VALID()` in MySQL** → Zum Prüfen invalider JSON-Felder: `SELECT id FROM menu WHERE JSON_VALID(translations) = 0`
- **License domain mismatch** → `HOST` env var setzen; auf localhost wird der Check übersprungen
