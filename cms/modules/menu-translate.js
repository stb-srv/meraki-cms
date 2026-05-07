// menu-translate.js
window.MenuTranslate = {
    attachHandlers: function(container) {
        const exportTrBtn = container.querySelector('#btn-export-translations');
        if (exportTrBtn) exportTrBtn.onclick = async () => {
            try {
                const data = await window.MenuCore.api.get('menu/export-translations');
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'translations-export.json';
                a.click();
                URL.revokeObjectURL(url);
                window.MenuCore.utils.showToast('Export bereit! \u2705');
            } catch (err) { window.MenuCore.utils.showToast('Export fehlgeschlagen', 'error'); }
        };

        const importTrBtn = container.querySelector('#btn-import-translations');
        if (importTrBtn) importTrBtn.onclick = () => {
            const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
            inp.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    try {
                        const parsed = JSON.parse(ev.target.result);
                        const { menu, categories } = window.MenuCore.state.cachedMenuData;
                        
                        let dishCount = 0;
                        let catCount  = 0;
                        if (Array.isArray(parsed)) { dishCount = parsed.length; } 
                        else if (parsed && typeof parsed === 'object') {
                            dishCount = (parsed.dishes || []).length;
                            catCount  = (parsed.categories || []).length;
                        }

                        if (await window.MenuCore.utils.showConfirm('Übersetzungen importieren?', `${dishCount} Gerichte in der Datei gefunden. Vorhandene Übersetzungen werden ergänzt.`)) {
                            const res = await window.MenuCore.api.post('menu/import-translations', parsed);
                            if (res?.success) {
                                window.MenuCore.state.cachedMenuData = null;
                                window.MenuCore.renderMenu(container, document.getElementById('view-title'), 'dishes', true);
                                window.MenuCore.utils.showToast('Import erfolgreich! \u2705');
                            }
                        }
                    } catch (err) { window.MenuCore.utils.showToast('Fehler: ' + err.message, 'error'); }
                };
                reader.readAsText(file);
            };
            inp.click();
        };

        const aiBtn = container.querySelector('#btn-ai-image');
        if (aiBtn) aiBtn.onclick = () => this.openAiImageModal();

        // Show AI button if configured
        (async () => {
            const config = await window.MenuCore.api.get('image-ai/config');
            if (config && config.defaultProvider !== 'none') {
                const btnCont = document.getElementById('ai-image-btn-container');
                if (btnCont) btnCont.style.display = 'block';
            }
        })();
    },

    openAiImageModal: async function() {
        let modal = document.getElementById('ai-image-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ai-image-modal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:11000; align-items:center; justify-content:center; backdrop-filter:blur(4px);';
            modal.innerHTML = `
                <div class="glass-panel" style="background:#fff; border-radius:24px; padding:30px; width:min(700px,92vw); max-height:90vh; overflow-y:auto; position:relative; box-shadow: 0 20px 50px rgba(0,0,0,0.3);">
                    <button id="ai-modal-close" style="position:absolute; top:18px; right:18px; background:none; border:none; font-size:1.8rem; cursor:pointer; color:#999; line-height:1;">&times;</button>
                    <h3 style="margin-bottom:20px; display:flex; align-items:center; gap:10px;">✨ KI-Bild / Suche</h3>
                    <div id="ai-img-tabs" style="display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap;"></div>
                    <div style="display:flex; gap:10px; margin-bottom:12px;">
                        <input type="text" id="ai-img-query" class="input-styled" placeholder="Suchbegriff..." style="flex:1;">
                        <button class="btn-primary" id="btn-ai-img-search" style="white-space:nowrap; background:var(--primary);"><i class="fas fa-magic"></i> Suchen</button>
                    </div>
                    <div id="ai-img-results" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:12px; min-height:150px; background:rgba(0,0,0,0.02); border-radius:16px; padding:15px; border:1px dashed rgba(0,0,0,0.05);"></div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.querySelector('#ai-modal-close').onclick = () => modal.style.display = 'none';
        }

        modal.style.display = 'flex';
        const queryInput = modal.querySelector('#ai-img-query');
        const resultsGrid = modal.querySelector('#ai-img-results');
        const searchBtn = modal.querySelector('#btn-ai-img-search');

        const dishName = document.getElementById('df-name')?.value;
        if (!queryInput.value && dishName) queryInput.value = dishName;

        searchBtn.onclick = async () => {
            const query = queryInput.value.trim();
            if (!query) return;
            resultsGrid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:40px;">Bilder werden geladen...</p>';
            try {
                const res = await window.MenuCore.api.post('image-ai/search', { query, provider: 'unsplash' });
                if (res && res.success) {
                    resultsGrid.innerHTML = '';
                    res.results.forEach(img => {
                        const div = document.createElement('div');
                        div.style.cssText = 'cursor:pointer; border-radius:12px; overflow:hidden; aspect-ratio:1/1; border:3px solid transparent;';
                        div.innerHTML = `<img src="${img.thumb}" style="width:100%; height:100%; object-fit:cover;">`;
                        div.onclick = () => {
                            document.getElementById('df-img').value = img.url;
                            document.getElementById('df-img-preview').innerHTML = `<img src="${img.url}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
                            modal.style.display = 'none';
                        };
                        resultsGrid.appendChild(div);
                    });
                }
            } catch(e) { resultsGrid.innerHTML = '<p>Fehler</p>'; }
        };
    }
};
