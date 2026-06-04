// QR-Code Modul für Meraki Admin
(function() {
    window.AdminQR = {
        render(container, titleEl) {
            titleEl.innerHTML = '<i class="fas fa-qrcode"></i> QR-Code Generator';
            container.innerHTML = `
                <div style="padding: 30px;">
                    <div class="glass-panel" style="padding:40px;">
                        <h2>QR-Code Generator</h2>
                        <p style="opacity:.6; margin-bottom:30px;">
                            Generiere QR-Codes für jeden Tisch. 
                            Gäste scannen den Code und landen direkt auf der Speisekarte.
                        </p>
                        <div style="display:flex; gap:15px; align-items:center; margin-bottom:30px; flex-wrap:wrap;">
                            <div class="form-group" style="margin-bottom:0;">
                                <label>Anzahl Tische:</label>
                                <input type="number" id="qr-table-count" value="10" min="1" max="100" class="input-styled" style="width:80px;">
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label>Basis-URL:</label>
                                <input type="text" id="qr-base-url" 
                                       value="${window.location.origin}/menu-app/#menu"
                                       class="input-styled" style="width:280px;">
                            </div>
                            <button onclick="window.AdminQR.generate()" class="btn-primary" style="background:var(--accent); margin-top:20px;">
                                QR-Codes generieren
                            </button>
                            <button onclick="window.AdminQR.downloadAll()" class="btn-primary" style="background:#4b5563; margin-top:20px;">
                                <i class="fas fa-file-download"></i> Alle als PNG laden
                            </button>
                        </div>
                        <div id="qr-grid" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:20px;"></div>
                    </div>
                </div>`;
        },
        generate() {
            const count   = parseInt(document.getElementById('qr-table-count').value) || 10;
            const baseUrl = document.getElementById('qr-base-url').value.trim();
            const grid    = document.getElementById('qr-grid');
            grid.innerHTML = '';
            
            if (typeof QRCode === 'undefined') {
                alert('QRCode-Bibliothek wird noch geladen...');
                return;
            }

            for (let t = 1; t <= count; t++) {
                const url  = `${baseUrl}?table=${t}`;
                const wrap = document.createElement('div');
                wrap.style.cssText = 'background:#fff; border-radius:12px; padding:16px; text-align:center; border:1px solid rgba(0,0,0,.06); box-shadow:0 2px 10px rgba(0,0,0,.04);';
                wrap.innerHTML = `<div id="qr-${t}" style="margin-bottom:10px; display:flex; justify-content:center;"></div>
                    <div style="font-weight:700; margin-bottom:8px; color:#333;">Tisch ${t}</div>
                    <button onclick="window.AdminQR.download(${t},'Tisch_${t}')"
                            class="btn-primary" style="font-size:.70rem; padding:6px 14px; background:rgba(0,0,0,0.05); color:#333; border:1px solid rgba(0,0,0,.1); box-shadow:none;">
                        ⬇ PNG Download
                    </button>`;
                grid.appendChild(wrap);
                new QRCode(document.getElementById('qr-' + t), {
                    text: url, width: 140, height: 140,
                    colorDark: '#1B3A5C', colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
            }
        },
        download(tableNum, filename) {
            const canvas = document.querySelector(`#qr-${tableNum} canvas`);
            if (!canvas) return;
            const a = document.createElement('a');
            a.download = filename + '.png';
            a.href = canvas.toDataURL('image/png');
            a.click();
        },
        downloadAll() {
            const count = parseInt(document.getElementById('qr-table-count').value) || 10;
            for (let t = 1; t <= count; t++) {
                setTimeout(() => this.download(t, 'Tisch_' + t), t * 150);
            }
        }
    };
})();
