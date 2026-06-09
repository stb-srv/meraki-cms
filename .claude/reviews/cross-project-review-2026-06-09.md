# Cross-Project Review: meraki-cms ↔ meraki-licens

**Reviewed**: 2026-06-09  
**Scope**: Datenvertrag und Konsistenz zwischen CMS und Lizenzserver  
**Decision**: BLOCK — 3 kritische Bugs, die bezahlte Features für alle Kunden sperren

---

## Zusammenfassung

Die beiden Projekte haben **drei kritische Datenvertrags-Brüche** zwischen `plans.js` (Lizenzserver) und `services/license.js` (CMS). Das Ergebnis: Kunden mit bezahlten Plänen können Reservierungen, Custom Branding und Online-Bestellungen trotz gültiger Lizenz nicht nutzen, weil die Modul-Namen im JWT-Token nicht mit den CMS-Checks übereinstimmen.

---

## Findings

### CRITICAL

#### C-01: Modul-Name-Mismatch `reservations` vs. `reservations_online`/`reservations_phone`
**Datei**: `meraki-licens/server/plans.js` vs. `meraki-cms/server/routes/reservations.js:92`

Der Lizenzserver stellt Tokens mit `allowed_modules: { reservations_online: true, reservations_phone: true }` aus (PRO und höher). Das CMS prüft `requireLicense('reservations')`, d.h. `modules['reservations']` — dieser Key existiert **nie** im Token. Alle Reservierungs-Endpunkte liefern daher 403 für jeden bezahlten Kunden.

```
Lizenzserver-Token:  { reservations_online: true, reservations_phone: true }
CMS-Check:           modules['reservations']  →  undefined  →  403 BLOCK
```

**Fix**: Modul-Namen angleichen. Entweder CMS auf `reservations_online` umstellen oder Lizenzserver auf `reservations`.

---

#### C-02: Modul-Name-Mismatch `custom_design` vs. `custom_branding`
**Datei**: `meraki-licens/server/plans.js` vs. `meraki-cms/server/services/license.js:89`

Lizenzserver sendet `custom_branding: true` (ab PRO). CMS definiert in `PLAN_DEFINITIONS` das Modul als `custom_design` und prüft `modules['custom_design']` — immer `undefined` wenn Token vom Server kommt.

```
Lizenzserver-Token:  { custom_branding: true }
CMS-Plan-Definition: custom_design: true     ← anderer Name
```

**Fix**: Einen einheitlichen Namen wählen und in beiden Projekten synchronisieren.

---

#### C-03: `online_orders` fehlt komplett in Lizenzserver-Plan-Definitionen
**Datei**: `meraki-licens/server/plans.js` (alle Pläne), `meraki-cms/server/routes/cart.js:208`

Das CMS prüft `requireLicense('online_orders')` für Online-Bestellungen. Der Lizenzserver sendet **in keinem Plan** `online_orders` im Token. Das CMS-Fallback (eigene `PLAN_DEFINITIONS`) enthält `online_orders: true` für PRO_PLUS/ENTERPRISE, aber der aktive Code-Pfad mit einem gültigen Token verwendet die Server-Module, nicht die lokalen.

**Fix**: `online_orders` in den Lizenzserver-Plänen (PRO_PLUS, ENTERPRISE) hinzufügen.

---

### HIGH

#### H-01: Token-Gültigkeit (73h) < Refresh-Schwellenwert (78h) — immer sofortiger Refresh beim Start
**Datei**: `meraki-cms/server/services/license-checker.js:13` + `meraki-licens/server/routes/public.js:216`

```js
// CMS:
const TOKEN_REFRESH_THRESHOLD_H = 78;

// Lizenzserver:
createSignedLicenseToken({...}, '73h');
```

Ein frisch ausgestelltes Token hat 73h Restlaufzeit. Da 73 < 78, triggert `_checkIfTokenNeedsRefresh()` bei **jedem CMS-Neustart** sofort einen `_check()`. Bei 3 fehlgeschlagenen Starts in Folge (MAX_FAILURES=3) degradiert das CMS auf FREE — obwohl die Lizenz valid ist.

**Fix**: Token-Gültigkeit auf `'80h'` erhöhen ODER `TOKEN_REFRESH_THRESHOLD_H` auf `60` senken.

---

#### H-02: TRIAL-Plan fehlt in CMS `PLAN_DEFINITIONS`
**Datei**: `meraki-cms/server/services/license.js:66-112` vs. `meraki-licens/server/plans.js:7-26`

Lizenzserver definiert `TRIAL` mit 50 Speisen, 8 Tische, `orders_kitchen: true`, `reservations_phone: true`. Im CMS fehlt der `TRIAL`-Eintrag in `PLAN_DEFINITIONS`. `getPlan('TRIAL')` fällt auf `FREE` zurück (30 Speisen, 5 Tische, keine Premium-Module).

Trial-Kunden des Lizenzservers erhalten auf dem CMS effektiv nur den FREE-Plan.

**Fix**: `TRIAL`-Plan in CMS `PLAN_DEFINITIONS` hinzufügen, identisch zum Lizenzserver.

---

#### H-03: CMS `setup.js` speichert `licenseKey` mit hardcoded `type: 'PRO'` ohne Validierung
**Datei**: `meraki-cms/server/routes/setup.js:52-54`

```js
if (licenseKey) {
    settings.license = { key: licenseKey, status: 'active', type: 'PRO' };
}
```

- Kein Aufruf an den Lizenzserver zur Validierung
- Typ wird immer als `'PRO'` gesetzt, unabhängig vom echten Plan
- Der LicenseChecker überschreibt das beim nächsten Check — bis dahin ist der Plan falsch

**Fix**: Beim Setup `/api/v1/validate` aufrufen und den echten Plan-Typ speichern.

---

#### H-04: CMS `requireAuth` prüft keine Session-Datenbank — Tokens nicht widerrufbar
**Datei**: `meraki-cms/server/core/middleware.js:11-16`

Das CMS prüft nur die JWT-Signatur. Der Lizenzserver prüft zusätzlich `admin_sessions` (revoked-Flag). Ein gestohlenes CMS-Admin-Token ist bis zum Ablauf unwiderruflich gültig.

---

### MEDIUM

#### M-01: `HMAC_SECRET` Default-Wert unsicher im Lizenzserver
**Datei**: `meraki-licens/server/crypto.js:14`

```js
const HMAC_SECRET = process.env.HMAC_SECRET || 'hmac-change-me-in-production';
```

Bei nicht gesetztem Secret können Offline-Tokens gefälscht werden. Sollte beim Start abbrechen wenn nicht gesetzt.

---

#### M-02: `PLAN_DEFINITIONS` ist dupliziert — zwei verschiedene Quellen der Wahrheit
**Datei**: `meraki-licens/server/plans.js` (ESM) + `meraki-cms/server/services/license.js` (CJS)

Zwei unterschiedliche Definitionen mit unterschiedlichen Modul-Namen. Das ist die Wurzel der C-01/C-02/C-03-Bugs.

**Fix**: Gemeinsames npm-Package oder CMS lädt Plan-Definitionen beim Startup vom Lizenzserver via `/api/v1/plans`.

---

#### M-03: `normalizeLicense()` parst `allowed_modules` mit falschem Default-Typ `[]`
**Datei**: `meraki-licens/server/routes/admin-licenses.js:22`

`allowed_modules` ist ein Objekt `{key: bool}`, aber der Default ist ein leeres Array `[]`.

---

#### M-04: Kein strukturiertes Logging im Lizenzserver
Der Lizenzserver nutzt durchgehend `console.log/warn/error`. Das CMS nutzt `pino`. Inkonsistent — erschwert Production-Debugging.

---

### LOW

#### L-01: `toDbDate` in zwei Dateien dupliziert
**Datei**: `meraki-licens/server/routes/public.js:15` + `admin-licenses.js:13`

Identische Funktion — in `helpers.js` auslagern.

---

## Priorisierte Fix-Reihenfolge

1. **C-01 + C-02 + C-03**: Modul-Namen in einem Commit angleichen — blockieren bezahlte Features
2. **H-01**: Token-Gültigkeit auf `'80h'` erhöhen
3. **H-02**: TRIAL in CMS `PLAN_DEFINITIONS` nachtragen
4. **M-02**: Langfristig gemeinsame Plan-Definition einführen
