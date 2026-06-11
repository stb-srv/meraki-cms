// image-batch.js
// Manuell gestarteter Stapel-Generator für Gerichtsbilder.
// Erzeugt Bilder für alle Gerichte OHNE Bild – mit wählbarer Anzahl,
// Wartezeit pro Bild (Rate-Limit) und manuellem Start/Stop.
//
// Provider:
//   - puter:  clientseitig via puter.js (puter.ai.txt2img), keyless / Browser-Login
//   - gemini: serverseitig via POST /api/image-ai/generate
//
// Globales Objekt: window.ImageBatch
window.ImageBatch = {
    running: false,
    stopRequested: false,

    token() { return sessionStorage.getItem('meraki_admin_token'); },

    log(logEl, msg, color = 'inherit') {
        if (!logEl) return;
        logEl.style.display = 'block';
        const line = document.createElement('div');
        line.style.color = color;
        line.textContent = msg;
        logEl.appendChild(line);
        logEl.scrollTop = logEl.scrollHeight;
    },

    sleep(ms) { return new Promise(r => setTimeout(r, ms)); },

    buildPrompt(dish) {
        const parts = [dish.name, dish.desc].filter(Boolean).join(', ');
        return `${parts}, professional food photography, appetizing, served on a plate, natural lighting, high detail, no text, no watermark`;
    },

    async fetchMenu() {
        const r = await fetch('/api/menu', { headers: { 'x-admin-token': this.token() } });
        if (!r.ok) throw new Error(`Menü konnte nicht geladen werden (${r.status})`);
        const data = await r.json();
        return Array.isArray(data) ? data : [];
    },

    // Lädt eine Data-URL (vom Browser erzeugt) als Datei zum Server hoch -> gibt /uploads/... zurück
    async uploadDataUrl(dataUrl) {
        const blob = await (await fetch(dataUrl)).blob();
        const ext = (blob.type && blob.type.includes('jpeg')) ? 'jpg'
                  : (blob.type && blob.type.includes('webp')) ? 'webp' : 'png';
        const fd = new FormData();
        fd.append('image', blob, `puter-${Date.now()}.${ext}`);
        const r = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'x-admin-token': this.token() },
            body: fd
        });
        const res = await r.json().catch(() => ({}));
        if (!res.success || !res.url) throw new Error(res.reason || 'Upload fehlgeschlagen');
        return res.url;
    },

    // Erzeugt EIN Bild für ein Gericht und gibt die Bild-URL zurück
    async generateForDish(dish, provider) {
        const prompt = this.buildPrompt(dish);

        if (provider === 'puter') {
            if (typeof puter === 'undefined' || !puter.ai || !puter.ai.txt2img) {
                throw new Error('puter.js nicht geladen – Seite neu laden.');
            }
            // Gibt i.d.R. ein HTMLImageElement mit Data-URL als src zurück
            // (je nach Version auch blob:- oder https-URL).
            const imgEl = await puter.ai.txt2img(prompt);
            const src = imgEl && (imgEl.src || (typeof imgEl === 'string' ? imgEl : ''));
            if (!src) {
                throw new Error('Puter lieferte kein gültiges Bild.');
            }
            return await this.uploadDataUrl(src);
        }

        if (provider === 'gemini') {
            const r = await fetch('/api/image-ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-token': this.token() },
                body: JSON.stringify({ prompt })
            });
            const res = await r.json().catch(() => ({}));
            if (!res.success || !res.results || !res.results[0]) {
                throw new Error(res.reason || 'Keine Bilder generiert');
            }
            return res.results[0].url;
        }

        throw new Error(`Unbekannter Provider: ${provider}`);
    },

    async updateDishImage(dish, url) {
        const r = await fetch(`/api/menu/${dish.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': this.token() },
            body: JSON.stringify({ image: url })
        });
        const res = await r.json().catch(() => ({}));
        if (!res.success) throw new Error(res.reason || `Gericht-Update fehlgeschlagen (${r.status})`);
    },

    // Verdrahtet die Buttons im Image-AI-Settings-Tab
    attach(container) {
        const startBtn = container.querySelector('#batch-start');
        const stopBtn  = container.querySelector('#batch-stop');
        if (!startBtn) return;

        startBtn.onclick = () => this.run(container);
        if (stopBtn) stopBtn.onclick = () => {
            this.stopRequested = true;
            this.log(container.querySelector('#batch-log'), '⏹️  Stop angefordert – nach aktuellem Bild...', '#f59e0b');
        };

        this.refreshCount(container);
    },

    async refreshCount(container) {
        const countEl = container.querySelector('#batch-without-count');
        const maxInput = container.querySelector('#batch-count');
        try {
            const menu = await this.fetchMenu();
            const without = menu.filter(d => !d.image || !String(d.image).trim());
            if (countEl) countEl.textContent = without.length;
            if (maxInput && (!maxInput.value || maxInput.value === '0')) maxInput.value = without.length;
        } catch (_) {
            if (countEl) countEl.textContent = '?';
        }
    },

    async run(container) {
        if (this.running) return;

        const logEl    = container.querySelector('#batch-log');
        const provider = container.querySelector('#batch-provider').value;
        const max      = parseInt(container.querySelector('#batch-count').value, 10) || 0;
        const delaySec = parseFloat(container.querySelector('#batch-delay').value) || 0;
        const delayMs  = Math.max(0, delaySec * 1000);
        const startBtn = container.querySelector('#batch-start');
        const stopBtn  = container.querySelector('#batch-stop');

        if (max <= 0) {
            this.log(logEl, '⚠️  Bitte eine Anzahl > 0 wählen.', '#f59e0b');
            return;
        }

        this.running = true;
        this.stopRequested = false;
        if (logEl) logEl.innerHTML = '';
        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
        if (stopBtn) stopBtn.style.display = 'inline-flex';

        const providerLabel = provider === 'puter' ? 'Puter (Browser)' : 'Google Gemini (Server)';
        this.log(logEl, `🚀 Start – Provider: ${providerLabel}, max. ${max} Bild(er), ${delaySec}s Pause/Bild`, '#818cf8');

        let ok = 0, fail = 0;
        try {
            const menu = await this.fetchMenu();
            const todo = menu.filter(d => !d.image || !String(d.image).trim()).slice(0, max);

            if (todo.length === 0) {
                this.log(logEl, '✅ Alle Gerichte haben bereits ein Bild.', '#10b981');
            }

            if (provider === 'puter' && typeof puter === 'undefined') {
                this.log(logEl, '❌ puter.js nicht geladen. Bitte Seite neu laden.', '#ef4444');
            }

            for (let i = 0; i < todo.length; i++) {
                if (this.stopRequested) {
                    this.log(logEl, '⏹️  Abgebrochen.', '#f59e0b');
                    break;
                }
                const dish = todo[i];
                this.log(logEl, `[${i + 1}/${todo.length}] „${dish.name}" – generiere...`);

                try {
                    const url = await this.generateForDish(dish, provider);
                    await this.updateDishImage(dish, url);
                    this.log(logEl, `    ✅ ${url}`, '#10b981');
                    ok++;
                } catch (e) {
                    this.log(logEl, `    ❌ ${e.message}`, '#ef4444');
                    fail++;
                }

                if (delayMs > 0 && i < todo.length - 1 && !this.stopRequested) {
                    await this.sleep(delayMs);
                }
            }

            this.log(logEl, `\n🏁 Fertig: ${ok} erstellt, ${fail} Fehler.`, ok > 0 ? '#10b981' : '#f59e0b');
            if (ok > 0 && window.MenuCore) window.MenuCore.state.cachedMenuData = null;
        } catch (e) {
            this.log(logEl, `❌ ${e.message}`, '#ef4444');
        } finally {
            this.running = false;
            startBtn.disabled = false;
            startBtn.style.opacity = '1';
            if (stopBtn) stopBtn.style.display = 'none';
            this.refreshCount(container);
        }
    }
};
