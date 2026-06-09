# Backend Security & Architecture Review
**Reviewed**: 2026-06-09  
**Scope**: Full backend (server/**/*.js, config, middleware)  
**Decision**: REQUEST CHANGES — 3 CRITICAL, 5 HIGH, 8 MEDIUM, 5 LOW issues found

---

## Summary

The codebase shows solid security awareness in many places (bcrypt, JWT, magic-byte upload checks, timing-safe token comparisons, Zod validation). However, several high-severity gaps must be closed before a production deployment — most critically: two setup endpoints are reachable from the public internet, an unverified `jwt.decode` is used as a license fallback, and two admin routes are missing role checks.

---

## Findings

### CRITICAL

---

#### CRIT-1: Setup Endpoints Have No Localhost Restriction
**Files**: `server/routes/setup.js:12`, `server/app.js:132`

Any remote attacker who reaches the server before setup completes can create their own admin account. `POST /api/v1/setup` has zero IP restriction. `POST /api/setup` only guards with `CONFIG.SETUP_COMPLETE`, no IP check. CLAUDE.md states setup is "nur von `localhost` erlaubt" but neither endpoint enforces it.

```js
// server/routes/setup.js — no IP guard
router.post('/', async (req, res) => {
    const settings = await DB.getKV('settings', {});
    if (settings.isSetupDone === true) { ... }
    // Any internet client reaches this
```

**Fix**:
```js
router.post('/', async (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress;
    const isLocal = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(clientIp);
    if (!isLocal) return res.status(403).json({ success: false, message: 'Setup nur von localhost erlaubt.' });
```
Apply the same guard in `app.js` at the `POST /api/setup` handler.

---

#### CRIT-2: `jwt.decode()` Used Without Signature Verification for License Limit
**File**: `server/routes/menu.js:43-49`

```js
const payload = jwt.decode(lic.licenseToken);  // NO signature check
if (payload?.limits?.max_dishes) {
    console.warn('⚠️  [menu/import] Token nicht verifizierbar – nutze dekodiertes Limit:', payload.limits.max_dishes);
    return payload.limits.max_dishes;  // attacker-supplied value accepted
}
```

If `licenseToken` in the KV store is replaced with a hand-crafted (unsigned) JWT containing `limits.max_dishes: 99999`, this fallback returns the attacker-controlled value, bypassing the menu item limit.

**Fix**: Use `verifyLicenseToken()` from `license.js`, or fall through to the FREE default — never use decoded-but-unverified data:
```js
const payload = verifyLicenseToken(lic.licenseToken, domain);
if (payload?.limits?.max_dishes) return payload.limits.max_dishes;
// Verification failed — fall through to safe default
```

---

#### CRIT-3: `X-Forwarded-Host` Spoofing Bypasses License Domain Check
**Files**: `server/helpers.js:111-113`, `server/routes/menu.js:12-14`, `server/license.js:139`

```js
// helpers.js — attacker-controlled header read raw
const forwarded = req.headers['x-forwarded-host'];
if (forwarded) return forwarded.split(',')[0].trim().split(':')[0];

// license.js:139 — localhost skips domain validation entirely
const isLocal = ['localhost', '127.0.0.1', '::1'].includes(currentHost);
if (!isLocal && tokenDomain !== currentHost) return null; // bypassed when isLocal=true
```

An attacker sends `X-Forwarded-Host: localhost` → `extractDomain` returns `'localhost'` → `isLocal = true` → domain check skipped → any license token accepted on any domain.

**Fix**: Use `req.hostname` (set safely by Express `trust proxy`) instead of reading the raw header:
```js
function extractDomain(req) {
    return (req.hostname || 'localhost').split(':')[0].toLowerCase();
}
```
Also remove the duplicate copy in `menu.js` (see LOW-1).

---

### HIGH

---

#### HIGH-1: `/api/license/validate` Requires No Authentication
**File**: `server/routes/settings.js:116`

```js
router.post('/license/validate', validate(anyObjectSchema), async (req, res) => {
    // No requireAuth, no requireRole
```

Any unauthenticated user can activate a license key. Also creates an enumeration oracle: submit arbitrary keys and observe license server responses.

**Fix**: Add `requireAuth, requireRole('admin')` unless unauthenticated activation is explicitly required by the setup flow (in which case, at least apply the localhost restriction from CRIT-1).

---

#### HIGH-2: `/api/plugins/toggle` Missing `requireRole('admin')`
**File**: `server/app.js:121`

```js
app.post('/api/plugins/toggle', requireAuth, async (req, res) => {
// Only requireAuth — waiter and kitchen users can toggle plugins
```

**Fix**:
```js
app.post('/api/plugins/toggle', requireAuth, requireRole('admin'), async (req, res) => {
```

---

#### HIGH-3: Admin Can Self-Grant License Modules Without Verification
**File**: `server/routes/settings.js:218-228`

```js
router.post('/license/modules', requireAuth, requireRole('admin'), ...
    settings.license.modules = { ...(settings.license.modules || {}), ...modules };
    await DB.setKV('settings', settings);
```

Any admin can POST `{ modules: { analytics: true, qr_pay: true } }` to grant themselves paid modules without a valid license, silently bypassing license tier enforcement.

**Fix**: Remove the endpoint or validate that requested modules fall within the currently active verified license's scope.

---

#### HIGH-4: Race Condition in Reservation Booking Under MySQL
**File**: `server/routes/reservations.js:125-130`

```js
const doubleCheckResult = await findAvailableTables(...);
if (!doubleCheckResult.success && !rc.allowInquiry) { return 409; }
await DB.addReservation(newRes);  // TOCTOU gap — no transaction
```

Two simultaneous requests can both pass the double-check and both be inserted. SQLite serializes writes incidentally; MySQL does not. Without a transaction or advisory lock, double-bookings are possible under load.

**Fix**: Wrap the final check + insert in a DB transaction, or use a mutex on `(date, time)`.

---

#### HIGH-5: No Global Rate Limiter on Public API Endpoints
**File**: `server/app.js`

`GET /api/menu`, `GET /api/categories`, `GET /api/cart/config`, `GET /api/health` and others are unrated. Enumeration and resource exhaustion attacks are possible.

**Fix**: Add a general limiter before route mounts:
```js
const generalLimiter = rateLimit({ windowMs: 60000, max: 200 });
app.use('/api/', generalLimiter);
```

---

### MEDIUM

---

#### MED-1: Raw `e.message` Returned to Clients in 500 Responses
**Files**: Nearly every route handler

```js
catch(e) { res.status(500).json({ success: false, reason: e.message }); }
```

Leaks file paths, SQL column names, module paths. Replace with a generic message and structured server-side log:
```js
catch(e) {
    logger.error({ err: e, url: req.originalUrl }, 'Handler error');
    res.status(500).json({ success: false, reason: 'Interner Serverfehler.' });
}
```

---

#### MED-2: XSS in `tokenResponsePage` via Restaurant Name
**File**: `server/helpers.js:139,148`

```js
<div class="restaurant">${restaurantName}</div>  // not HTML-escaped
```

`restaurantName` from `branding.name`. An admin who sets it to `<script>alert(1)</script>` causes XSS on the public cancel/confirm reservation pages.

**Fix**: HTML-escape all interpolated values with a small helper:
```js
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
```

---

#### MED-3: `availabilityGrid` Accepts Unbounded `times` Array — DoS
**File**: `server/routes/reservations.js:73-77`

`times: z.array(z.string())` has no `max()`. Each slot triggers ~3 DB queries. With `reservationLimiter` (20 req/15 min), an attacker gets 60 calls × N slots worth of DB load per IP per 15 min.

**Fix**: `times: z.array(z.string()).max(96)` (covers every 15-min slot in 24 hours).

---

#### MED-4: General JSON Body Limit Set to 20 MB
**File**: `server/app.js:62`

```js
app.use(express.json({ limit: '20mb' }));
```

Only the backup import needs large payloads (multer handles that separately). This exposes every other endpoint to memory-exhaustion via oversized JSON bodies.

**Fix**: Reduce to `'1mb'`. The backup import route uses `multer.memoryStorage()` independently.

---

#### MED-5: Backup Import Restores `settings.license` Without RSA Verification
**File**: `server/routes/backup.js:150-163`

`settings` is in ALLOWED_KV_KEYS. A crafted backup can set `settings.license = { isTrial: true, type: 'ENTERPRISE', expiresAt: '2099-01-01' }`. The `isTrial` code path in `getCurrentLicense` trusts this without RSA token verification, granting ENTERPRISE plan.

**Fix**: Strip `license` from settings on import:
```js
if (key === 'settings' && value && typeof value === 'object') {
    const { license: _stripped, ...safeSettings } = value;
    await DB.setKV(key, safeSettings);
}
```

---

#### MED-6: `deliveryAddress` Not Sanitized or Length-Limited
**File**: `server/routes/cart.js:283`

```js
deliveryAddress: type === 'delivery' ? (deliveryAddress || delivery?.address || null) : null,
```

Contrast: `customerName` is `sanitizeText(...).slice(0, 80)`. `deliveryAddress` gets no treatment.

**Fix**:
```js
deliveryAddress: type === 'delivery'
    ? sanitizeText(deliveryAddress || delivery?.address || '').slice(0, 300) || null
    : null,
```

---

#### MED-7: JWT Token Exposed in Query String and Server Logs
**File**: `server/middleware.js:12`, `server/app.js:68`

`req.query.token` support causes JWTs to appear in access logs, browser history, and proxy logs.

**Fix**: Strip from logged URL:
```js
const safeUrl = req.originalUrl.replace(/([?&])token=[^&]*/g, '$1token=REDACTED');
logger.info({ url: safeUrl, ... });
```
Long-term: deprecate `?token` in favor of header-only auth.

---

#### MED-8: Inconsistent Temporary Password Entropy
**File**: `server/routes/users.js:28,61` vs `server/routes/auth.js:68`

`users.js` uses `crypto.randomBytes(6)` (48 bits). `auth.js` uses `crypto.randomBytes(12)` (96 bits). Temp passwords for staff should have the same entropy as the forgot-password flow.

**Fix**: Use `crypto.randomBytes(12).toString('hex')` in `users.js`.

---

### LOW

---

#### LOW-1: Duplicate `extractDomain()` Implementation
`server/helpers.js:110` and `server/routes/menu.js:11` are identical. After CRIT-3 fix both copies need to change; one will likely be forgotten.

**Fix**: Remove the copy in `menu.js`, import from `helpers.js`.

---

#### LOW-2: `console.*` Calls Bypass Structured Logger
~10+ locations in route/server files use `console.log/warn/error` instead of `logger`.

**Files**: `server/routes/menu.js:46,53,79`, `server/routes/cart.js:199,291,302`, `server/routes/setup.js:57`, `server/routes/users.js:32,63`, `server/license.js:25-28`

**Fix**: Replace all with `logger.info/warn/error`.

---

#### LOW-3: Backup Restore Creates Duplicate Orders
**File**: `server/routes/backup.js:193-197`

```js
for (const order of data.orders) { await DB.addOrder(order); }
```

No duplicate-ID check. Restoring a backup on a populated DB creates duplicate orders.

**Fix**: Skip existing order IDs, similar to the users restore logic at line 207.

---

#### LOW-4: `setInterval` Cron Can Drift Past Target Hour
**File**: `server/cron.js:123-131`

`setInterval` can drift; if the hourly tick slips past midnight, the `nowHour === 10` check is missed entirely for that day.

**Fix**: Use `node-cron` or compute delay to the next exact target hour.

---

#### LOW-5: `require('crypto')` Inside Hot Route Handlers
**Files**: `server/routes/orders.js:145`, `server/routes/cart.js:270`

`const crypto = require('crypto')` inside `POST /orders` and `POST /cart/order` bodies. Node caches `require`, but it's an oversight that looks like a missing top-level import.

**Fix**: Move to file-level imports.

---

## Architecture Weaknesses

| # | Issue | Location |
|---|---|---|
| ARCH-1 | Duplicate `extractDomain` — divergence risk | `helpers.js:110`, `menu.js:11` |
| ARCH-2 | License enforcement done 3 different ways (middleware / inline checks / `getMaxDishes`) — inconsistent fallbacks | `middleware.js`, `orders.js`, `cart.js`, `menu.js` |
| ARCH-3 | Two parallel setup routes (`POST /api/setup` + `POST /api/v1/setup`) with different logic | `app.js:132`, `routes/setup.js` |
| ARCH-4 | Plugin system has no sandboxing — plugins run in main process with full DB + app access | `server.js` plugin loader |
| ARCH-5 | No request correlation ID — cross-log tracing impossible | `app.js` logger middleware |

---

## Priority Fix Order

1. **CRIT-1** — Localhost guard on both setup endpoints (5 min)
2. **CRIT-3** — Replace `req.headers['x-forwarded-host']` with `req.hostname` in `extractDomain` (10 min)
3. **HIGH-2** — Add `requireRole('admin')` to `/api/plugins/toggle` (2 min)
4. **HIGH-1** — Add auth to `/api/license/validate` (2 min)
5. **CRIT-2** — Replace `jwt.decode` fallback with `verifyLicenseToken` or safe default (15 min)
6. **MED-2** — HTML-escape `tokenResponsePage` interpolations (10 min)
7. **MED-5** — Strip `license` from backup restore (5 min)
8. **MED-1** — Generic 500 messages + structured logging sweep (30 min)
