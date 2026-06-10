# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projektübersicht
Meraki CMS ist ein modulares Restaurant-CMS. Backend: Node.js/Express (CommonJS). Frontend: Vanilla JS (ES Modules, kein Framework). Datenbank: SQLite (Standard) oder MySQL/MariaDB (via `DB_TYPE=mysql`).

## Befehle

```bash
npm start            # Produktions-Start (node server.js)
npm run dev          # Entwicklung mit pino-pretty Log-Formatierung
npm run reset-admin  # Admin-Passwort zurücksetzen (reset-admin.js)
npm run update       # git pull + npm install
node test-integration.js  # Datenvertrag-Test CMS↔Lizenzserver
```

Es gibt keine automatisierten Unit-Tests und kein Build-System.

## Setup-Flow (Erstkonfiguration)

Beim ersten Start ohne `server/config.json` wird jeder Nicht-API-Aufruf auf `/setup` umgeleitet. Der Setup-Wizard (`POST /api/v1/setup`, nur von `localhost` erlaubt) erstellt:
1. Den ersten Admin-User in der DB
2. Optional: License-Key im KV-Store (`settings.license`) mit `status: 'pending_validation'`

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
await DB.getKV('settings', {})   // zweites Argument: Default-Wert
await DB.setKV('settings', obj)
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

**Einzige Quelle der Wahrheit**: `@meraki/plans` (lokales Package `../meraki-plans/`).
**Nie** PLAN_DEFINITIONS direkt im CMS oder Lizenzserver definieren — immer im shared Package bearbeiten.

- Trial: In KV `settings.license.isTrial = true`, Ablauf via Cron geprüft
- Vollizenz: RSA-signiertes JWT (`licenseToken`), Public Key beim Start vom Lizenzserver geladen
- Offline-Fallback: letzter bekannter Plan aus `settings.license.lastKnownType`
- `requireLicense(moduleName)` prüft `modules[moduleName]` im aktuellen Plan

**Modul-Namen** (exakte Strings für `requireLicense()`):
`menu_edit`, `orders_kitchen`, `reservations`, `custom_design`, `analytics`, `qr_pay`, `online_orders`, `multilanguage`, `seasonal_menu`, `backup`, `image_ai`

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

| Datei | Zweck |
|---|---|
| `server.js` | Entry Point, Plugin-Loader, HTTP-Server, Graceful Shutdown |
| `config.js` | Konfiguration (Prio: config.json > .env) |
| `server/app.js` | Express-App-Factory, alle Route-Mounts, Helmet/CORS |
| `server/db/index.js` | DB-Adapter-Selector |
| `server/db/sqlite.js` | SQLite-Adapter |
| `server/db/mysql.js` | MySQL/MariaDB-Adapter |
| `server/core/middleware.js` | `requireAuth`, `requireRole`, `requireLicense`, `requireMenuLimit`, Rate-Limiter |
| `server/core/logger.js` | Pino-Logger (strukturiertes JSON-Logging) |
| `server/services/license.js` | `getCurrentLicense`, `verifyLicenseToken`, `getPlan` |
| `server/services/license-checker.js` | Periodischer Token-Refresh vom Lizenzserver |
| `server/services/mailer.js` | E-Mail via Nodemailer |
| `server/cron.js` | Background-Jobs (Trial, Reminders, Backup-Cleanup) |
| `server/socket.js` | Socket.IO-Setup |
| `server/validation/schemas.js` | Zod-Schemas für alle Routen |
| `../meraki-plans/index.js` | **Shared** PLAN_DEFINITIONS (CMS + Lizenzserver) |
| `test-integration.js` | Datenvertrag-Test CMS↔Lizenzserver |
| `cms/app.js` | Admin-Panel Haupt-JS (ES Modules) |
| `cms/modules/api.js` | Admin-Frontend API-Client (`apiGet`, `apiPost`, `apiPut`, `apiDelete`) |
| `menu-app/app.js` | Gäste-Frontend Haupt-JS |
| `menu-app/cart.js` | Warenkorb-Logik (komplett clientseitig) |
| `menu-app/i18n/` | Übersetzungsdateien (14 Sprachen) |

## Routen-Übersicht

| Prefix | Datei | Auth |
|---|---|---|
| `/api/admin` | `routes/auth.js` | Nein (Login-Endpunkt) |
| `/api/v1/setup` | `routes/setup.js` | Nein (nur localhost) |
| `/api/users` | `routes/users.js` | `requireAuth` |
| `/api/menu`, `/api/categories` | `routes/menu.js` | `requireAuth` (schreiben), öffentlich (lesen) |
| `/api/orders` | `routes/orders.js` | `requireAuth` + Socket.IO |
| `/api/reservations` | `routes/reservations.js` | `requireAuth` + `requireLicense('reservations')` |
| `/api` (tables) | `routes/tables.js` | `requireAuth` |
| `/api` (settings, branding, license) | `routes/settings.js` | `requireAuth` + `requireRole('admin')` für Schreiben |
| `/api/upload` | `routes/upload.js` | `requireAuth` |
| `/api` (cookie) | `routes/cookie.js` | `requireAuth` |
| `/api/cart` | `routes/cart.js` | Öffentlich (Gäste) + `requireLicense` |
| `/api/image-ai` | `routes/image-ai.js` | `requireAuth` |
| `/api/backup` | `routes/backup.js` | `requireAuth` |
| `/api/plugins` | `app.js` inline | `requireAuth` |

## Static Serving
- `/admin` → `cms/` (Admin-Panel)
- `/` → `menu-app/` dann `public/`
- `/uploads` → `uploads/` (mit strikten Security-Headern, kein inline CSP)
- `/plugins` → `plugins/`
- `/setup` → `cms/setup.html`

## Architektur-Regeln (WICHTIG)

- **Kein Framework im Frontend** – nur Vanilla JS mit ES Modules (`import/export`). Kein React, Vue, Angular.
- **Shared Plans**: Plan-Definitionen IMMER in `../meraki-plans/index.js` bearbeiten. Nie in CMS oder Lizenzserver duplizieren.
- **Datenbank-Adapter-Interface**: Neue DB-Funktionen immer in BEIDEN Adaptern implementieren.
- **Migrationen**: Neue Spalten in beiden Adaptern als Migration eintragen (siehe oben).
- **Auth**: Alle Admin-API-Routen brauchen `requireAuth`. Gäste-Routen (menu-app, cart) sind öffentlich.
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
