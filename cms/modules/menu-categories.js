// menu-categories.js
window.MenuCategories = {
    state: {
        editingCategoryIndex: -1
    },

    render: function(categories) {
        const safeCats = Array.isArray(categories) ? categories : [];
        safeCats.sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));

        return `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
                <h3>Kategorien verwalten</h3>
                <button class="btn-primary" id="toggle-cat-form" style="background:var(--accent);"><i class="fas fa-plus"></i> Neue Kategorie</button>
            </div>

            <div id="cat-form" style="display:none; margin-bottom:40px; padding:30px; background:rgba(255,255,255,0.4); backdrop-filter:blur(20px); border-radius:24px; border:1px solid rgba(255,255,255,0.3); box-shadow: 0 8px 32px rgba(0,0,0,0.05);">
                <h3 id="cat-form-title" style="margin-bottom:20px;">Neue Kategorie</h3>
                <div class="form-grid">
                    <div class="form-group"><label>Name</label><input class="input-styled" id="cf-label" placeholder="z.B. Desserts"></div>
                    <div class="form-group">
                        <label>Reihenfolge (Zahl, kleinere Zahl = weiter vorne)</label>
                        <input type="number" class="input-styled" id="cf-sort" value="0" min="0" max="999" step="1" placeholder="z.B. 1, 2, 3 …">
                    </div>
                </div>
                <div style="display:flex;gap:10px;margin-top:24px;">
                    <button class="btn-primary" id="cf-save">Speichern</button>
                    <button class="btn-primary" style="background:transparent;color:var(--text);border:1px solid rgba(0,0,0,.1);" onclick="window.MenuCategories.closeCatForm()">Abbrechen</button>
                </div>
            </div>

            <div class="glass-panel" style="padding:30px;">
                <div style="display:flex;flex-wrap:wrap;gap:12px;">
                    ${safeCats.length === 0
                        ? '<p style="opacity:.5;">Noch keine Kategorien vorhanden. Oben eine neue hinzuf&uuml;gen.</p>'
                        : safeCats.map((c, i) => {
                            const label = window.MenuCore.getCatLabel(c);
                            const sort = c.sort_order || 0;
                            return `
                                <div class="glass-pill" style="padding:10px 20px; display:flex; align-items:center; gap:12px; background:rgba(255,255,255,0.8); border:1px solid rgba(0,0,0,0.05); border-radius:100px;">
                                    <span style="font-size:.7rem; opacity:.4; font-weight:700;" title="Sortier-Reihenfolge">${sort}</span>
                                    <span style="font-weight:700; color:var(--primary);">${label}</span>
                                    <div style="display:flex; gap:6px;">
                                        <button onclick="window.MenuCategories.editCategory(${i})" style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;border:none;cursor:pointer;background:rgba(59,130,246,0.12);color:#2563eb;" title="Bearbeiten"><i class="fas fa-pen" style="font-size:.65rem;"></i></button>
                                        <button onclick="window.MenuCategories.deleteCategory(${i})" style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;border:none;cursor:pointer;background:rgba(239,68,68,0.12);color:#dc2626;" title="L&ouml;schen"><i class="fas fa-times" style="font-size:.65rem;"></i></button>
                                    </div>
                                </div>
                            `;
                        }).join('')
                    }
                </div>
            </div>
        `;
    },

    closeCatForm: function() {
        const form = document.getElementById('cat-form');
        const toggleBtn = document.getElementById('toggle-cat-form');
        if (form) form.style.display = 'none';
        if (toggleBtn) toggleBtn.style.display = 'inline-flex';
    },

    editCategory: function(idx) {
        const categories = window.MenuCore.state.cachedMenuData?.categories || [];
        const c = categories[idx];
        if (!c) return;
        
        this.state.editingCategoryIndex = idx;
        const form = document.getElementById('cat-form');
        const toggleBtn = document.getElementById('toggle-cat-form');
        
        form.style.display = 'block';
        if (toggleBtn) toggleBtn.style.display = 'none';
        document.getElementById('cat-form-title').textContent = 'Kategorie bearbeiten';
        document.getElementById('cf-label').value = c.label || '';
        document.getElementById('cf-sort').value  = c.sort_order || 0;
        form.scrollIntoView({ behavior: 'smooth' });
    },

    deleteCategory: async function(idx) {
        const categories = window.MenuCore.state.cachedMenuData?.categories || [];
        const c = categories[idx];
        if (!c) return;

        if (!await window.MenuCore.utils.showConfirm('Kategorie löschen?', `Möchten Sie "${c.label}" wirklich löschen? Alle Gerichte in dieser Kategorie bleiben erhalten, aber die Kategorie-Zuordnung geht verloren.`)) return;
        
        const res = await window.MenuCore.api.del(`categories/${c.id}`);
        if (res?.success) {
            window.MenuCore.state.cachedMenuData = null;
            window.MenuCore.renderMenu(document.getElementById('content-view'), document.getElementById('view-title'), 'categories', true);
            window.MenuCore.utils.showToast('Kategorie gelöscht.');
        }
    },

    attachHandlers: function(container) {
        const categories = window.MenuCore.state.cachedMenuData?.categories || [];
        const toggleBtn = container.querySelector('#toggle-cat-form');
        const form      = container.querySelector('#cat-form');
        const labelInp  = container.querySelector('#cf-label');
        const sortInp   = container.querySelector('#cf-sort');
        const saveBtn   = container.querySelector('#cf-save');

        if (toggleBtn) toggleBtn.onclick = () => {
            this.state.editingCategoryIndex = -1;
            form.style.display   = 'block';
            toggleBtn.style.display = 'none';
            container.querySelector('#cat-form-title').textContent = 'Neue Kategorie';
            labelInp.value = '';
            sortInp.value  = categories.length;
        };

        if (saveBtn) saveBtn.onclick = async () => {
            const label = labelInp.value.trim();
            const sort  = parseInt(sortInp.value) || 0;
            if (!label) return window.MenuCore.utils.showToast('Bitte einen Namen eingeben', 'error');

            const cat = {
                id:         this.state.editingCategoryIndex !== -1 ? categories[this.state.editingCategoryIndex].id : label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_'),
                label,
                sort_order: sort,
                icon:       this.state.editingCategoryIndex !== -1 ? (categories[this.state.editingCategoryIndex].icon || 'utensils') : 'utensils',
                active:     this.state.editingCategoryIndex !== -1 ? (categories[this.state.editingCategoryIndex].active !== false) : true
            };

            let res;
            if (this.state.editingCategoryIndex !== -1) {
                res = await window.MenuCore.api.put(`categories/${cat.id}`, cat);
            } else {
                res = await window.MenuCore.api.post('categories', cat);
            }

            if (res?.success) {
                window.MenuCore.state.cachedMenuData = null;
                window.MenuCore.utils.showToast('Kategorie gespeichert! \u2705');
                window.MenuCore.renderMenu(container, document.getElementById('view-title'), 'categories', true);
            } else {
                window.MenuCore.utils.showToast(res?.reason || 'Fehler beim Speichern', 'error');
            }
        };
    }
};
