// menu-core.js
window.MenuCore = {
    state: {
        cachedMenuData: null,
        editingDishIndex: -1,
        cmsSearch: '',
        cmsCatFilter: 'All',
        cmsSort: 'name',
        cmsSortDir: 'asc',
        cmsPage: 1,
        cmsPageSize: 25,
        collapsedCats: new Set(),
        selectedIds: new Set(),
        _renderDebounceTimer: null,
        _dragId: null
    },

    WEEKDAYS: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],  // Index 0=Mo … 6=So
    api: null,
    utils: null,
    isInitialized: false,

    init: function(api, utils) {
        this.api = api;
        this.utils = utils;
    },

    getCatLabel: function(cat) {
        if (!cat) return 'Unsortiert';
        if (typeof cat === 'object') return cat.label || cat.id || 'Unbekannt';
        return cat;
    },

    formatRelativeTime: function(isoString) {
        if (!isoString) return null;
        const diff = Date.now() - new Date(isoString).getTime();
        const min  = Math.floor(diff / 60000);
        const h    = Math.floor(diff / 3600000);
        const d    = Math.floor(diff / 86400000);
        if (min < 1)  return 'Gerade eben';
        if (min < 60) return `Vor ${min} Min.`;
        if (h < 24)   return `Vor ${h} Std.`;
        if (d < 7)    return `Vor ${d} Tag${d > 1 ? 'en' : ''}`;
        return new Date(isoString).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'2-digit' });
    },

    renderMenu: async function(container, titleEl, tab = 'dishes', forceRefresh = false) {
        const currentTab = tab || 'dishes';
        titleEl.innerHTML = `<div style="display:flex;align-items:center;">Speisekarte <i class="fas fa-chevron-right" style="margin:0 10px; font-size:.8rem; opacity:.3;"></i> ${currentTab.charAt(0).toUpperCase() + currentTab.slice(1)} ${this.utils.renderHelpIcon('menu')}</div>`;
        
        if (!this.state.cachedMenuData || forceRefresh) {
            try {
                const [menu, categories, allergens, additives] = await Promise.all([
                    this.api.get('menu'),
                    this.api.get('categories'),
                    this.api.get('allergens'),
                    this.api.get('additives')
                ]);
                this.state.cachedMenuData = {
                    menu:       Array.isArray(menu)       ? menu       : [],
                    categories: Array.isArray(categories) ? categories : [],
                    allergens:  (allergens  && typeof allergens  === 'object' && !Array.isArray(allergens))  ? allergens  : {},
                    additives:  (additives  && typeof additives  === 'object' && !Array.isArray(additives))  ? additives  : {},
                };
            } catch (err) {
                console.error('[Menu Load Error]', err);
                this.utils.showToast('Fehler beim Laden der Speisekarte', 'error');
                return;
            }
        }
        const { menu, categories, allergens, additives } = this.state.cachedMenuData;
        if (Array.isArray(categories)) categories.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        const focusedId = document.activeElement?.id;
        
        container.innerHTML = this.renderCurrentTab(currentTab, menu, categories, allergens, additives);
        this.attachMenuHandlers(container, menu, categories, allergens, additives, currentTab);

        if (focusedId) {
            const el = document.getElementById(focusedId);
            if (el) {
                el.focus();
                if (el.tagName === 'INPUT') {
                    const len = el.value.length;
                    el.setSelectionRange(len, len);
                }
            }
        }
    },

    renderCurrentTab: function(tab, menu, categories, allergens, additives) {
        switch (tab) {
            case 'dishes': return this.renderDishesTab(menu, categories, allergens, additives);
            case 'categories': return window.MenuCategories ? window.MenuCategories.render(categories) : '';
            case 'allergens': return this.renderKVTab('Allergene', allergens, 'allergens', 'Name des Allergens...');
            case 'additives': return this.renderKVTab('Zusatzstoffe', additives, 'additives', 'Name des Zusatzstoffes...');
            default: return this.renderDishesTab(menu, categories, allergens, additives);
        }
    },

    renderPagination: function(totalItems, currentPage, pageSize) {
        if (pageSize === 0) return '';
        const totalPages = Math.ceil(totalItems / pageSize);
        if (totalPages <= 1) return '';

        const start = (currentPage - 1) * pageSize + 1;
        const end   = Math.min(currentPage * pageSize, totalItems);

        let html = `
            <div class="pagination-info" style="font-size:0.8rem; opacity:0.6; margin-top:20px; display:flex; justify-content:space-between; align-items:center;">
                <span>Zeige ${start}-${end} von ${totalItems} Einträgen</span>
                <div class="pagination-buttons" style="display:flex; gap:5px;">
                    <button class="btn-secondary" ${currentPage === 1 ? 'disabled' : ''} onclick="window.MenuCore.goToPage(${currentPage - 1})" style="padding:4px 10px; font-size:0.75rem;"><i class="fas fa-chevron-left"></i></button>
        `;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                html += `<button class="btn-secondary ${i === currentPage ? 'active' : ''}" onclick="window.MenuCore.goToPage(${i})" style="padding:4px 10px; font-size:0.75rem; ${i === currentPage ? 'background:var(--primary); color:white;' : ''}">${i}</button>`;
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                html += `<span style="padding:0 5px; opacity:0.5;">...</span>`;
            }
        }

        html += `
                    <button class="btn-secondary" ${currentPage === totalPages ? 'disabled' : ''} onclick="window.MenuCore.goToPage(${currentPage + 1})" style="padding:4px 10px; font-size:0.75rem;"><i class="fas fa-chevron-right"></i></button>
                </div>
            </div>
        `;
        return html;
    },

    goToPage: function(page) {
        this.state.cmsPage = page;
        this.renderMenu(document.getElementById('content-view'), document.getElementById('view-title'), 'dishes');
    },

    // Sortierbarer Tabellen-Header mit Richtungs-Pfeil
    sortableTh: function(key, label) {
        const active = this.state.cmsSort === key;
        const dirClass = active ? (this.state.cmsSortDir === 'desc' ? 'sort-desc' : 'sort-asc') : '';
        const icon = !active ? 'fa-sort' : (this.state.cmsSortDir === 'desc' ? 'fa-sort-down' : 'fa-sort-up');
        return `<th class="sortable ${dirClass}" data-sort="${key}">${label}<span class="sort-ind"><i class="fas ${icon}"></i></span></th>`;
    },

    renderAvailabilityToggle: function(d) {
        const isAvail = d.available !== false;
        return `
            <div class="avail-toggle-wrap" style="display:flex; align-items:center; gap:8px;">
                <label class="switch switch--sm">
                    <input type="checkbox" ${isAvail ? 'checked' : ''} onchange="window.MenuCore.toggleDishAvailability('${d.id}', this.checked)">
                    <span class="slider"></span>
                </label>
                <span style="font-size:0.7rem; opacity:0.6; font-weight:600; min-width:25px;">${isAvail ? 'AN' : 'AUS'}</span>
            </div>
        `;
    },

    renderWeekdayBadge: function(d) {
        const days = Array.isArray(d.available_days) ? d.available_days : [];
        if (days.length === 0 || days.length === 7) return '';
        const labels = days.slice().sort((a,b)=>a-b).map(i => this.WEEKDAYS[i]).join(' ');
        return `<div style="font-size:0.6rem; opacity:0.6; margin-top:3px;" title="Nur verfügbar: ${labels}"><i class="fas fa-calendar-day"></i> ${labels}</div>`;
    },

    toggleDishAvailability: async function(id, checked) {
        const res = await this.api.put(`menu/${id}`, { available: checked });
        if (res?.success) {
            this.state.cachedMenuData = null;
            this.renderMenu(document.getElementById('content-view'), document.getElementById('view-title'), 'dishes');
        } else {
            this.utils.showToast(res?.reason || 'Fehler', 'error');
        }
    },

    renderDishRow: function(d, useGroupedView) {
        const p = d.price?.toFixed(2) || '0.00';
        const isAvail = d.available !== false;
        const lastUpd = this.formatRelativeTime(d.updated_at);
        const hasImg = d.image && (d.image.startsWith('http') || d.image.startsWith('/'));
        const manualMode = this.state.cmsSort === 'manual';
        const isSelected = this.state.selectedIds.has(String(d.id));

        return `
            <tr class="dish-row ${!isAvail ? 'dish-unavailable' : ''} ${isSelected ? 'dish-selected' : ''}" data-id="${d.id}" ${manualMode ? 'draggable="true"' : ''}>
                ${manualMode ? `<td class="col-drag menu-drag-handle" title="Ziehen zum Sortieren"><i class="fas fa-grip-vertical"></i></td>` : ''}
                <td class="col-select" data-label=""><input type="checkbox" class="row-select" data-id="${d.id}" ${isSelected ? 'checked' : ''}></td>
                <td data-label="Nr." style="font-weight:700; color:var(--text-muted);">${d.number || '-'}</td>
                <td data-label="" style="width:60px;">
                    <div style="width:40px; height:40px; border-radius:8px; overflow:hidden; background:var(--bg-inset); border:1px solid var(--border);">
                        ${hasImg ? `<img src="${d.image}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="fas fa-hamburger" style="display:flex; align-items:center; justify-content:center; height:100%; opacity:0.2;"></i>`}
                    </div>
                </td>
                <td data-label="Name">
                    <div style="font-weight:700; color:var(--primary); font-size:1.05rem;">${d.name}</div>
                    ${d.desc ? `<div style="font-size:0.8rem; opacity:0.6; line-height:1.2; margin-top:2px;">${d.desc}</div>` : ''}
                    ${this.renderWeekdayBadge(d)}
                    <div style="font-size:0.65rem; opacity:0.4; margin-top:4px;"><i class="fas fa-clock"></i> ${lastUpd ? lastUpd : 'Neu'}</div>
                </td>
                <td data-label="Kategorie">
                    <span class="badge" style="background:var(--bg-inset); color:var(--text);">${this.getCatLabel(d.cat)}</span>
                </td>
                <td data-label="Preis" class="price-cell" data-id="${d.id}" style="font-weight:800; font-family:var(--font-mono); color:var(--accent);">${p}€ <i class="fas fa-clock-rotate-left" style="font-size:.6rem; opacity:.35; margin-left:3px;" title="Preisverlauf"></i></td>
                <td data-label="Status">${this.renderAvailabilityToggle(d)}</td>
                <td data-label="" style="text-align:right;">
                    <div style="display:flex; gap:6px; justify-content:flex-end;">
                        <button class="btn-icon" onclick="window.MenuCore.editDish('${d.id}')"><i class="fas fa-pen"></i> Bearbeiten</button>
                        <button class="btn-icon danger" onclick="window.MenuCore.deleteDish('${d.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    },

    normalizeCatId: function(cat) {
        if (!cat) return '';
        return String(cat).toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    },

    catMatchesFilter: function(dishCat, filterCatId, categories) {
        if (!dishCat) return false;
        if (dishCat === filterCatId) return true;
        if (this.normalizeCatId(dishCat) === filterCatId) return true;
        const cat = categories.find(c => c.id === filterCatId);
        if (cat && dishCat.trim().toLowerCase() === (cat.label || '').trim().toLowerCase()) return true;
        return false;
    },

    renderDishesTab: function(menu, categories, allergens, additives) {
        let filtered = menu.filter(d => {
            const matchesSearch = !this.state.cmsSearch || d.name.toLowerCase().includes(this.state.cmsSearch.toLowerCase()) || (d.number && d.number.toString().includes(this.state.cmsSearch));
            const matchesCat    = this.state.cmsCatFilter === 'All' || this.catMatchesFilter(d.cat, this.state.cmsCatFilter, categories);
            return matchesSearch && matchesCat;
        });

        const dir = this.state.cmsSortDir === 'desc' ? -1 : 1;
        if (this.state.cmsSort === 'name')   filtered.sort((a,b) => dir * a.name.localeCompare(b.name));
        if (this.state.cmsSort === 'price')  filtered.sort((a,b) => dir * ((a.price||0) - (b.price||0)));
        if (this.state.cmsSort === 'nr')     filtered.sort((a,b) => dir * ((parseInt(a.number)||0) - (parseInt(b.number)||0)));
        if (this.state.cmsSort === 'cat')    filtered.sort((a,b) => dir * this.getCatLabel(a.cat).localeCompare(this.getCatLabel(b.cat)));
        if (this.state.cmsSort === 'manual') filtered.sort((a,b) => (a.sort_order||0) - (b.sort_order||0));

        const manualMode = this.state.cmsSort === 'manual';
        // In Manuell-Modus immer flache, ziehbare Liste (keine Gruppierung)
        const useGroupedView = !manualMode && this.state.cmsCatFilter === 'All' && !this.state.cmsSearch;
        const totalItems = filtered.length;

        // In grouped view show all dishes; pagination only applies to flat (search/filter) view
        const paged = useGroupedView
            ? filtered
            : filtered.slice((this.state.cmsPage-1)*this.state.cmsPageSize, this.state.cmsPage*this.state.cmsPageSize);

        return `
            <div class="toolbar-glass" style="display:flex; flex-wrap:wrap; gap:12px; margin-bottom:24px; padding:15px; border-radius:16px;">
                <div class="search-input-wrap" style="flex:1; min-width:200px;">
                    <i class="fas fa-search" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); opacity:0.4;"></i>
                    <input type="text" class="input-styled" id="dish-search" placeholder="Gericht suchen..." value="${this.state.cmsSearch}" style="padding-left:35px; width:100%;">
                </div>
                <select class="input-styled" id="dish-cat-filter" style="width:180px;">
                    <option value="All">Alle Kategorien</option>
                    ${categories.map(c => `<option value="${c.id}" ${this.state.cmsCatFilter === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}
                </select>
                <select class="input-styled" id="dish-sort" style="width:170px;">
                    <option value="name" ${this.state.cmsSort === 'name' ? 'selected' : ''}>Name A-Z</option>
                    <option value="nr" ${this.state.cmsSort === 'nr' ? 'selected' : ''}>Nr.</option>
                    <option value="price" ${this.state.cmsSort === 'price' ? 'selected' : ''}>Preis</option>
                    <option value="cat" ${this.state.cmsSort === 'cat' ? 'selected' : ''}>Kategorie</option>
                    <option value="manual" ${this.state.cmsSort === 'manual' ? 'selected' : ''}>Manuelle Reihenfolge</option>
                </select>
                <button class="btn-accent" id="btn-add-dish"><i class="fas fa-plus"></i> Neues Gericht</button>
                <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                    <button class="btn-secondary" id="btn-export-menu" title="Backup als JSON-Datei herunterladen" style="font-size:0.8rem; padding:8px 12px;"><i class="fas fa-download"></i> Backup</button>
                    <button class="btn-secondary" id="btn-import-menu" title="Backup wiederherstellen (JSON)" style="font-size:0.8rem; padding:8px 12px;"><i class="fas fa-upload"></i> Wiederherstellen</button>
                    <button class="btn-secondary" id="btn-export-pdf" style="background:rgba(239,68,68,0.1); color:#dc2626; border-color:rgba(239,68,68,0.2); font-size:0.8rem; padding:8px 12px;" title="PDF Speisekarte generieren"><i class="fas fa-file-pdf"></i> PDF</button>
                    <div style="width:1px; height:20px; background:rgba(0,0,0,0.12); margin:0 2px;"></div>
                    <button class="btn-secondary" id="btn-export-translations" title="Übersetzungen als JSON exportieren" style="font-size:0.8rem; padding:8px 12px;"><i class="fas fa-language"></i> <i class="fas fa-arrow-down" style="font-size:0.65rem;"></i> Übersetzungen</button>
                    <button class="btn-secondary" id="btn-import-translations" title="Übersetzungen aus JSON importieren" style="font-size:0.8rem; padding:8px 12px;"><i class="fas fa-language"></i> <i class="fas fa-arrow-up" style="font-size:0.65rem;"></i> Übersetzungen</button>
                </div>
            </div>

            <div id="dish-form-overlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); backdrop-filter:blur(10px); z-index:10000; align-items:center; justify-content:center;">
                <div class="modal-glass" style="width:92%; max-width:900px; max-height:92vh; overflow-y:auto; padding:36px;">

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:28px;">
                        <h2 id="df-title" style="margin:0;">Gericht bearbeiten</h2>
                        <button class="btn-icon" onclick="window.MenuCore.closeDishForm()" style="padding:7px 10px;" title="Schließen"><i class="fas fa-times"></i></button>
                    </div>

                    <!-- Sektion 1: Grunddaten -->
                    <div style="margin-bottom:20px;">
                        <div style="font-size:0.68rem; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; opacity:0.35; margin-bottom:10px;">Grunddaten</div>
                        <div style="display:grid; grid-template-columns:80px 1fr 130px 1fr; gap:12px;">
                            <div class="form-group"><label>Nr.</label><input class="input-styled" id="df-nr" placeholder="101"></div>
                            <div class="form-group"><label>Name *</label><input class="input-styled" id="df-name" placeholder="z.B. Mousaka"></div>
                            <div class="form-group"><label>Preis (€) *</label><input type="number" step="0.01" class="input-styled" id="df-price" placeholder="12.50"></div>
                            <div class="form-group"><label>Kategorie</label>
                                <select class="input-styled" id="df-cat">
                                    ${categories.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-group" style="margin-top:10px;"><label>Beschreibung</label><textarea class="input-styled" id="df-desc" style="height:80px; resize:vertical;" placeholder="Zutaten, Zubereitung, Besonderheiten..."></textarea></div>
                    </div>

                    <!-- Sektion 2: Bild & Status -->
                    <div style="margin-bottom:20px; padding:18px; background:rgba(0,0,0,0.025); border-radius:14px; border:1px solid rgba(0,0,0,0.05);">
                        <div style="font-size:0.68rem; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; opacity:0.35; margin-bottom:10px;">Bild & Status</div>
                        <div style="display:grid; grid-template-columns:1fr auto; gap:20px; align-items:start;">
                            <div>
                                <label style="font-size:0.8rem; font-weight:600; margin-bottom:6px; display:block;">Bild-URL</label>
                                <div style="display:flex; gap:8px;">
                                    <input class="input-styled" id="df-img" placeholder="https://..." style="flex:1;">
                                    <div id="ai-image-btn-container" style="display:none;">
                                        <button class="btn-primary" id="btn-ai-image" style="padding:0 12px; height:42px; background:linear-gradient(135deg,#6366f1,#8b5cf6); border:none;" title="KI Bildsuche/Generierung">
                                            <i class="fas fa-magic"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div style="padding-top:26px;">
                                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; white-space:nowrap; font-size:0.85rem;">
                                    <input type="checkbox" id="df-special"> ⭐ Tagesempfehlung
                                </label>
                            </div>
                        </div>
                        <div id="df-img-preview" style="margin-top:10px; height:130px; border-radius:12px; background:rgba(0,0,0,0.04); border:1px dashed rgba(0,0,0,0.1); display:flex; align-items:center; justify-content:center; overflow:hidden;">
                            <i class="fas fa-image fa-2x" style="opacity:0.1;"></i>
                        </div>
                        <div style="margin-top:14px;">
                            <label style="font-size:0.8rem; font-weight:600; margin-bottom:6px; display:flex; align-items:center; gap:8px;">
                                Verfügbarkeit nach Wochentag
                                <span style="font-size:0.7rem; opacity:0.5; font-weight:400;">(keine Auswahl = immer verfügbar)</span>
                            </label>
                            <div class="weekday-chips" id="df-weekdays">
                                ${this.WEEKDAYS.map((wd, i) => `<span class="weekday-chip" data-day="${i}">${wd}</span>`).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Sektion 3: Deklaration -->
                    <div style="margin-bottom:20px; padding:18px; background:rgba(0,0,0,0.025); border-radius:14px; border:1px solid rgba(0,0,0,0.05);">
                        <div style="font-size:0.68rem; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; opacity:0.35; margin-bottom:12px;">Deklaration (Allergene & Zusatzstoffe)</div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                            <div>
                                <label style="font-size:0.8rem; font-weight:700; margin-bottom:8px; display:block;">Allergene</label>
                                <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; max-height:160px; overflow-y:auto; padding:10px; background:rgba(0,0,0,0.02); border-radius:10px; border:1px solid rgba(0,0,0,0.06);">
                                    ${Object.entries(allergens).map(([code, name]) => `
                                        <label style="font-size:0.75rem; display:flex; align-items:center; gap:6px; cursor:pointer; padding:2px 0;">
                                            <input type="checkbox" class="dish-allergen-cb" value="${code}"> ${code}: ${name}
                                        </label>
                                    `).join('')}
                                    ${Object.keys(allergens).length === 0 ? '<span style="font-size:0.75rem; opacity:0.4; grid-column:span 2; font-style:italic;">Keine Allergene definiert. Zuerst unter „Allergene" anlegen.</span>' : ''}
                                </div>
                            </div>
                            <div>
                                <label style="font-size:0.8rem; font-weight:700; margin-bottom:8px; display:block;">Zusatzstoffe</label>
                                <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; max-height:160px; overflow-y:auto; padding:10px; background:rgba(0,0,0,0.02); border-radius:10px; border:1px solid rgba(0,0,0,0.06);">
                                    ${Object.entries(additives).map(([code, name]) => `
                                        <label style="font-size:0.75rem; display:flex; align-items:center; gap:6px; cursor:pointer; padding:2px 0;">
                                            <input type="checkbox" class="dish-additive-cb" value="${code}"> ${code}: ${name}
                                        </label>
                                    `).join('')}
                                    ${Object.keys(additives).length === 0 ? '<span style="font-size:0.75rem; opacity:0.4; grid-column:span 2; font-style:italic;">Keine Zusatzstoffe definiert. Zuerst unter „Zusatzstoffe" anlegen.</span>' : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Sektion 4: Mehrsprachigkeit -->
                    <div style="padding:18px; background:rgba(0,0,0,0.025); border-radius:14px; border:1px solid rgba(0,0,0,0.05);">
                        <div style="font-size:0.68rem; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; opacity:0.35; margin-bottom:12px;">Mehrsprachigkeit</div>
                        <div id="df-translations-list" style="display:grid; gap:10px;">
                            ${['en', 'el'].map(lang => `
                                <div style="display:grid; grid-template-columns:36px 1fr 2fr; gap:10px; align-items:start;">
                                    <span style="text-transform:uppercase; font-weight:800; font-size:0.7rem; margin-top:12px; opacity:0.45;">${lang}</span>
                                    <input class="input-styled trans-name" data-lang="${lang}" placeholder="Name (${lang})" style="font-size:0.85rem;">
                                    <textarea class="input-styled trans-desc" data-lang="${lang}" placeholder="Beschreibung (${lang})" style="height:42px; font-size:0.8rem; resize:none;"></textarea>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div style="margin-top:28px; display:flex; gap:12px; justify-content:flex-end; padding-top:22px; border-top:1px solid rgba(0,0,0,0.06);">
                        <button class="btn-secondary" onclick="window.MenuCore.closeDishForm()">Abbrechen</button>
                        <button class="btn-primary" id="df-save" style="min-width:180px; background:var(--primary);"><i class="fas fa-save"></i> Gericht speichern</button>
                    </div>
                </div>
            </div>

            <div class="glass-panel" style="padding:0; overflow:hidden;">
                <table class="cms-table">
                    <thead>
                        <tr>
                            ${manualMode ? '<th class="col-drag"></th>' : ''}
                            <th class="col-select"><input type="checkbox" class="all-select" title="Alle auswählen"></th>
                            ${this.sortableTh('nr', 'Nr.')}
                            <th>Bild</th>
                            ${this.sortableTh('name', 'Name / Beschreibung')}
                            ${this.sortableTh('cat', 'Kategorie')}
                            ${this.sortableTh('price', 'Preis')}
                            <th>Status</th>
                            <th style="text-align:right;">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody id="dishes-table-body">
                        ${useGroupedView
                            ? (() => {
                                const assignedIds = new Set();
                                const catGroups = categories.map(cat => {
                                    const catDishes = paged.filter(d => {
                                        if (!d.cat) return false;
                                        const match = d.cat === cat.id ||
                                            this.normalizeCatId(d.cat) === cat.id ||
                                            d.cat.trim().toLowerCase() === (cat.label || '').trim().toLowerCase();
                                        return match;
                                    });
                                    catDishes.forEach(d => assignedIds.add(d.id));
                                    if (catDishes.length === 0) return '';
                                    const isCollapsed = this.state.collapsedCats.has(cat.id);
                                    return `
                                        <tr class="cat-group-row" onclick="window.MenuCore.toggleCatCollapse('${cat.id}')" style="background:rgba(0,0,0,0.02); cursor:pointer;">
                                            <td colspan="8" style="padding:12px 20px;">
                                                <div style="display:flex; align-items:center; gap:12px;">
                                                    <i class="fas fa-chevron-${isCollapsed ? 'right' : 'down'}" style="opacity:0.3; width:15px;"></i>
                                                    <span style="font-weight:800; color:var(--primary); text-transform:uppercase; letter-spacing:1px; font-size:0.8rem;">${cat.label}</span>
                                                    <span class="badge" style="background:rgba(0,0,0,0.05); color:var(--text); font-size:0.7rem;">${catDishes.length}</span>
                                                </div>
                                            </td>
                                        </tr>
                                        ${!isCollapsed ? catDishes.map(d => this.renderDishRow(d, true)).join('') : ''}
                                    `;
                                });
                                const uncatDishes = paged.filter(d => !assignedIds.has(d.id));
                                if (uncatDishes.length > 0) {
                                    const isCollapsed = this.state.collapsedCats.has('__uncat__');
                                    catGroups.push(`
                                        <tr class="cat-group-row" onclick="window.MenuCore.toggleCatCollapse('__uncat__')" style="background:rgba(0,0,0,0.02); cursor:pointer;">
                                            <td colspan="8" style="padding:12px 20px;">
                                                <div style="display:flex; align-items:center; gap:12px;">
                                                    <i class="fas fa-chevron-${isCollapsed ? 'right' : 'down'}" style="opacity:0.3; width:15px;"></i>
                                                    <span style="font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; font-size:0.8rem;">Unsortiert</span>
                                                    <span class="badge" style="background:rgba(0,0,0,0.05); color:var(--text); font-size:0.7rem;">${uncatDishes.length}</span>
                                                </div>
                                            </td>
                                        </tr>
                                        ${!isCollapsed ? uncatDishes.map(d => this.renderDishRow(d, true)).join('') : ''}
                                    `);
                                }
                                return catGroups.join('');
                            })()
                            : paged.map(d => this.renderDishRow(d, false)).join('')
                        }
                    </tbody>
                </table>
                ${totalItems === 0 ? `<div style="padding:60px; text-align:center; opacity:0.3;"><i class="fas fa-search fa-3x" style="margin-bottom:15px;"></i><br>Keine Gerichte gefunden.</div>` : ''}
            </div>
            ${!useGroupedView ? this.renderPagination(totalItems, this.state.cmsPage, this.state.cmsPageSize) : ''}
            ${manualMode ? `<div style="margin-top:12px; font-size:0.78rem; opacity:0.55; display:flex; align-items:center; gap:8px;"><i class="fas fa-arrows-up-down"></i> Ziehe die Zeilen am Griff, um die Reihenfolge zu ändern – wird automatisch gespeichert.</div>` : ''}

            <div class="bulk-action-bar" id="bulk-action-bar">
                <span class="bulk-count"><span id="bulk-count-n">0</span> ausgewählt</span>
                <span class="bulk-sep"></span>
                <button id="bulk-enable"><i class="fas fa-eye"></i><span>Aktivieren</span></button>
                <button id="bulk-disable"><i class="fas fa-eye-slash"></i><span>Deaktivieren</span></button>
                <button id="bulk-category"><i class="fas fa-tags"></i><span>Kategorie</span></button>
                <button id="bulk-delete" class="danger"><i class="fas fa-trash"></i><span>Löschen</span></button>
                <span class="bulk-sep"></span>
                <button id="bulk-clear"><i class="fas fa-times"></i></button>
            </div>
        `;
    },

    toggleCatCollapse: function(catId) {
        if (this.state.collapsedCats.has(catId)) this.state.collapsedCats.delete(catId);
        else this.state.collapsedCats.add(catId);
        this.renderMenu(document.getElementById('content-view'), document.getElementById('view-title'), 'dishes');
    },

    editDish: function(id) {
        const idx = this.state.cachedMenuData.menu.findIndex(d => d.id === id);
        if (idx === -1) return;
        this.state.editingDishIndex = idx;
        const d = this.state.cachedMenuData.menu[idx];
        
        const overlay = document.getElementById('dish-form-overlay');
        overlay.style.display = 'flex';
        document.getElementById('df-title').textContent = 'Gericht bearbeiten';
        document.getElementById('df-nr').value = d.number || '';
        document.getElementById('df-name').value = d.name || '';
        document.getElementById('df-price').value = d.price || '';
        // Resolve cat label → id for the select (dishes may store label instead of id)
        const categories = this.state.cachedMenuData.categories || [];
        const resolvedCatId = d.cat
            ? (categories.find(c => c.id === d.cat || this.normalizeCatId(d.cat) === c.id || (d.cat || '').trim().toLowerCase() === (c.label || '').trim().toLowerCase())?.id || d.cat)
            : '';
        document.getElementById('df-cat').value = resolvedCatId;
        document.getElementById('df-desc').value = d.desc || '';
        document.getElementById('df-img').value = d.image || '';
        document.getElementById('df-special').checked = !!d.is_daily_special;

        // Wochentag-Verfügbarkeit
        const availDays = Array.isArray(d.available_days) ? d.available_days.map(Number) : [];
        document.querySelectorAll('#df-weekdays .weekday-chip').forEach(chip => {
            chip.classList.toggle('active', availDays.includes(Number(chip.dataset.day)));
        });

        // Preview
        const preview = document.getElementById('df-img-preview');
        if (d.image && (d.image.startsWith('http') || d.image.startsWith('/'))) {
            preview.innerHTML = `<img src="${d.image}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
        } else {
            preview.innerHTML = '<i class="fas fa-image fa-2x" style="opacity:0.1;"></i>';
        }

        // Allergens & Additives
        const dishAllergens = d.allergens || [];
        const dishAdditives = d.additives || [];
        document.querySelectorAll('.dish-allergen-cb').forEach(cb => cb.checked = dishAllergens.includes(cb.value));
        document.querySelectorAll('.dish-additive-cb').forEach(cb => cb.checked = dishAdditives.includes(cb.value));

        // Translations
        let trans = {};
        try { trans = typeof d.translations === 'string' ? JSON.parse(d.translations) : (d.translations || {}); } catch(e) {}
        document.querySelectorAll('.trans-name').forEach(el => el.value = trans[el.dataset.lang]?.name || '');
        document.querySelectorAll('.trans-desc').forEach(el => el.value = trans[el.dataset.lang]?.description || '');
    },

    closeDishForm: function() {
        document.getElementById('dish-form-overlay').style.display = 'none';
        this.state.editingDishIndex = -1;
    },

    deleteDish: async function(id) {
        if (!await this.utils.showConfirm('Gericht löschen?', 'Möchten Sie dieses Gericht wirklich unwiderruflich löschen?')) return;
        const res = await this.api.del(`menu/${id}`);
        if (res?.success) {
            this.state.cachedMenuData = null;
            this.renderMenu(document.getElementById('content-view'), document.getElementById('view-title'), 'dishes');
            this.utils.showToast('Gericht gelöscht.');
        } else {
            this.utils.showToast(res?.reason || 'Fehler', 'error');
        }
    },

    renderKVTab: function(title, data, keyName, placeholder) {
        const safeData = (data && typeof data === 'object') ? data : {};
        const entries = Object.entries(safeData);

        const helpText = keyName === 'allergens'
            ? 'Pflichtangabe gemäß EU-Lebensmittelinformationsverordnung (LMIV). Vergib ein kurzes Kürzel (z.B. <code>gluten</code>) und einen lesbaren Namen (z.B. <em>Gluten</em>). Die gewählten Allergene erscheinen danach in der Gericht-Bearbeitung.'
            : 'Kennzeichnungspflichtige Zusatzstoffe (z.B. E-Nummern). Vergib ein Kürzel (z.B. <code>e120</code>) und die Bezeichnung (z.B. <em>Echtes Karmin (E120)</em>). Die Zusatzstoffe erscheinen danach in der Gericht-Bearbeitung.';

        const emptyMsg = keyName === 'allergens'
            ? 'Noch keine Allergene angelegt. Füge oben die für dein Restaurant relevanten Allergene hinzu.'
            : 'Noch keine Zusatzstoffe angelegt. Füge oben die kennzeichnungspflichtigen Zusatzstoffe hinzu.';

        return `
            <div class="glass-panel" style="padding:30px; max-width:800px;">
                <h3 style="margin-bottom:8px;">${title} verwalten</h3>
                <p style="font-size:0.82rem; opacity:0.55; margin-bottom:24px; line-height:1.6;">${helpText}</p>
                <div style="display:flex; gap:10px; margin-bottom:28px; align-items:center;">
                    <input class="input-styled" id="kv-code" style="width:130px;" placeholder="Kürzel">
                    <input class="input-styled" id="kv-name" style="flex:1;" placeholder="${placeholder}">
                    <button class="btn-primary" id="kv-add-btn"><i class="fas fa-plus"></i> Hinzufügen</button>
                </div>
                ${entries.length === 0
                    ? `<div style="padding:40px; text-align:center; opacity:0.35; font-size:0.88rem; background:rgba(0,0,0,0.02); border-radius:12px;">${emptyMsg}</div>`
                    : `<table class="cms-table">
                        <thead><tr><th style="width:140px;">Kürzel</th><th>Bezeichnung</th><th style="text-align:right; width:80px;">Aktion</th></tr></thead>
                        <tbody>
                            ${entries.map(([code, name]) => `
                                <tr>
                                    <td><code style="background:rgba(0,0,0,0.06); padding:2px 8px; border-radius:6px; font-size:0.8rem;">${code}</code></td>
                                    <td>${name}</td>
                                    <td style="text-align:right;">
                                        <button class="btn-icon danger" onclick="window.MenuCore.deleteKV('${code}')"><i class="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>`
                }
            </div>
        `;
    },

    deleteKV: async function(code) {
        const tab = document.querySelector('.nav-subitem.active')?.dataset.tab;
        if (!tab) return;
        if (!await this.utils.showConfirm('Eintrag löschen?', 'Wirklich löschen?')) return;
        
        const data = { ...this.state.cachedMenuData[tab] };
        delete data[code];
        const res = await this.api.post(tab, data);
        if (res?.success) {
            this.state.cachedMenuData = null;
            this.renderMenu(document.getElementById('content-view'), document.getElementById('view-title'), tab);
        }
    },

    // ─── Auswahl / Bulk ────────────────────────────────────────
    attachSelectionHandlers: function(container) {
        const allCb = container.querySelector('.all-select');
        if (allCb) {
            allCb.onchange = () => {
                container.querySelectorAll('.row-select').forEach(cb => {
                    cb.checked = allCb.checked;
                    const id = String(cb.dataset.id);
                    if (allCb.checked) this.state.selectedIds.add(id);
                    else this.state.selectedIds.delete(id);
                    cb.closest('tr')?.classList.toggle('dish-selected', allCb.checked);
                });
                this.updateBulkBar();
            };
        }
        container.querySelectorAll('.row-select').forEach(cb => {
            cb.onchange = () => {
                const id = String(cb.dataset.id);
                if (cb.checked) this.state.selectedIds.add(id);
                else this.state.selectedIds.delete(id);
                cb.closest('tr')?.classList.toggle('dish-selected', cb.checked);
                this.updateBulkBar();
            };
        });
    },

    updateBulkBar: function() {
        const bar = document.getElementById('bulk-action-bar');
        if (!bar) return;
        const n = this.state.selectedIds.size;
        const cnt = document.getElementById('bulk-count-n');
        if (cnt) cnt.textContent = n;
        bar.classList.toggle('visible', n > 0);
        // Indeterminate-Status der "Alle"-Checkbox
        const allCb = document.querySelector('.all-select');
        const rowCbs = document.querySelectorAll('.row-select');
        if (allCb && rowCbs.length) {
            const checked = [...rowCbs].filter(c => c.checked).length;
            allCb.indeterminate = checked > 0 && checked < rowCbs.length;
            allCb.checked = checked === rowCbs.length;
        }
    },

    clearSelection: function() {
        this.state.selectedIds.clear();
        document.querySelectorAll('.row-select').forEach(cb => { cb.checked = false; cb.closest('tr')?.classList.remove('dish-selected'); });
        this.updateBulkBar();
    },

    attachBulkHandlers: function(container) {
        const ids = () => Array.from(this.state.selectedIds);
        const run = async (action, extra = {}) => {
            const selected = ids();
            if (!selected.length) return;
            const res = await this.api.post('menu/bulk', { ids: selected, action, ...extra });
            if (res?.success) {
                this.state.cachedMenuData = null;
                this.clearSelection();
                this.utils.showToast(`${res.affected ?? selected.length} Gericht(e) aktualisiert.`);
                this.renderMenu(container, document.getElementById('view-title'), 'dishes');
            } else {
                this.utils.showToast(res?.reason || 'Bulk-Aktion fehlgeschlagen', 'error');
            }
        };
        const bind = (id, fn) => { const el = container.querySelector('#' + id); if (el) el.onclick = fn; };
        bind('bulk-enable',  () => run('enable'));
        bind('bulk-disable', () => run('disable'));
        bind('bulk-delete',  async () => {
            if (!await this.utils.showConfirm('Gerichte löschen?', `${this.state.selectedIds.size} Gericht(e) unwiderruflich löschen?`)) return;
            run('delete');
        });
        bind('bulk-clear', () => this.clearSelection());
        bind('bulk-category', async () => {
            const cats = this.state.cachedMenuData?.categories || [];
            const choice = await this.utils.showSelect?.('Kategorie zuweisen', 'Zielkategorie wählen:', cats.map(c => ({ value: c.id, label: c.label })));
            if (choice) run('set_category', { cat: choice });
        });
    },

    // ─── Drag & Drop (nur Manuell-Modus) ───────────────────────
    attachDragHandlers: function(container) {
        if (this.state.cmsSort !== 'manual') return;
        const tbody = container.querySelector('#dishes-table-body');
        if (!tbody) return;
        tbody.querySelectorAll('tr.dish-row[draggable="true"]').forEach(row => {
            row.addEventListener('dragstart', (e) => {
                this.state._dragId = row.dataset.id;
                row.classList.add('row-dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            row.addEventListener('dragend', () => {
                row.classList.remove('row-dragging');
                tbody.querySelectorAll('.row-drop-target').forEach(r => r.classList.remove('row-drop-target'));
            });
            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                const dragging = tbody.querySelector('.row-dragging');
                if (!dragging || dragging === row) return;
                const rect = row.getBoundingClientRect();
                const after = (e.clientY - rect.top) > rect.height / 2;
                tbody.querySelectorAll('.row-drop-target').forEach(r => r.classList.remove('row-drop-target'));
                row.classList.add('row-drop-target');
                tbody.insertBefore(dragging, after ? row.nextSibling : row);
            });
            row.addEventListener('drop', (e) => e.preventDefault());
        });
        tbody.addEventListener('drop', async () => {
            tbody.querySelectorAll('.row-drop-target').forEach(r => r.classList.remove('row-drop-target'));
            const orderedIds = Array.from(tbody.querySelectorAll('tr.dish-row')).map(r => String(r.dataset.id));
            const res = await this.api.post('menu/reorder', { ids: orderedIds });
            if (res?.success) {
                this.state.cachedMenuData = null;
                this.utils.showToast('Reihenfolge gespeichert.');
            } else {
                this.utils.showToast('Reihenfolge konnte nicht gespeichert werden', 'error');
                this.renderMenu(container, document.getElementById('view-title'), 'dishes');
            }
        });
    },

    // ─── Preisverlauf-Popover ──────────────────────────────────
    showPriceHistory: async function(id, anchorEl) {
        document.querySelectorAll('.price-history-pop').forEach(p => p.remove());
        const history = await this.api.get(`menu/${id}/price-history`);
        const pop = document.createElement('div');
        pop.className = 'price-history-pop';
        if (!Array.isArray(history) || history.length === 0) {
            pop.innerHTML = `<div style="font-size:0.78rem; opacity:0.6;">Noch keine Preisänderungen erfasst.</div>`;
        } else {
            pop.innerHTML = `<div style="font-size:0.7rem; font-weight:800; text-transform:uppercase; letter-spacing:.5px; opacity:0.5; margin-bottom:8px;">Preisverlauf</div>` +
                history.map(h => {
                    const up = Number(h.new_price) > Number(h.old_price);
                    const dt = h.changed_at ? new Date(h.changed_at).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '';
                    return `<div class="ph-row"><span style="opacity:.6;">${dt}</span><span class="${up ? 'ph-up' : 'ph-down'}">${Number(h.old_price).toFixed(2)}€ → ${Number(h.new_price).toFixed(2)}€ <i class="fas fa-arrow-${up ? 'up' : 'down'}"></i></span></div>`;
                }).join('');
        }
        anchorEl.appendChild(pop);
        const close = (ev) => { if (!pop.contains(ev.target) && ev.target !== anchorEl) { pop.remove(); document.removeEventListener('click', close); } };
        setTimeout(() => document.addEventListener('click', close), 0);
    },

    attachMenuHandlers: function(container, menu, categories, allergens, additives, currentTab) {
        const searchInp = container.querySelector('#dish-search');
        if (searchInp) {
            searchInp.oninput = (e) => {
                this.state.cmsSearch = e.target.value;
                this.state.cmsPage = 1;
                clearTimeout(this.state._renderDebounceTimer);
                this.state._renderDebounceTimer = setTimeout(() => this.renderMenu(container, document.getElementById('view-title'), 'dishes'), 150);
            };
        }

        const catFilter = container.querySelector('#dish-cat-filter');
        if (catFilter) {
            catFilter.onchange = (e) => {
                this.state.cmsCatFilter = e.target.value;
                this.state.cmsPage = 1;
                this.renderMenu(container, document.getElementById('view-title'), 'dishes');
            };
        }

        const sortSel = container.querySelector('#dish-sort');
        if (sortSel) {
            sortSel.onchange = (e) => {
                this.state.cmsSort = e.target.value;
                this.renderMenu(container, document.getElementById('view-title'), 'dishes');
            };
        }

        // Klickbare Sortier-Header
        container.querySelectorAll('th.sortable').forEach(th => {
            th.onclick = () => {
                const key = th.dataset.sort;
                if (this.state.cmsSort === key) {
                    this.state.cmsSortDir = this.state.cmsSortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    this.state.cmsSort = key;
                    this.state.cmsSortDir = 'asc';
                }
                this.state.cmsPage = 1;
                this.renderMenu(container, document.getElementById('view-title'), 'dishes');
            };
        });

        // Auswahl (Bulk)
        this.attachSelectionHandlers(container);
        this.attachBulkHandlers(container);
        this.attachDragHandlers(container);
        this.updateBulkBar();

        // Preisverlauf-Popover
        container.querySelectorAll('.price-cell').forEach(cell => {
            cell.onclick = (e) => { e.stopPropagation(); this.showPriceHistory(cell.dataset.id, cell); };
        });

        const addBtn = container.querySelector('#btn-add-dish');
        if (addBtn) {
            addBtn.onclick = () => {
                this.state.editingDishIndex = -1;
                document.getElementById('dish-form-overlay').style.display = 'flex';
                document.getElementById('df-title').textContent = 'Neues Gericht';
                document.getElementById('df-nr').value = '';
                document.getElementById('df-name').value = '';
                document.getElementById('df-price').value = '';
                document.getElementById('df-desc').value = '';
                document.getElementById('df-img').value = '';
                document.getElementById('df-special').checked = false;
                document.getElementById('df-img-preview').innerHTML = '<i class="fas fa-image fa-2x" style="opacity:0.1;"></i>';
                document.querySelectorAll('.dish-allergen-cb, .dish-additive-cb').forEach(cb => cb.checked = false);
                document.querySelectorAll('.trans-name, .trans-desc').forEach(el => el.value = '');
                document.querySelectorAll('#df-weekdays .weekday-chip').forEach(chip => chip.classList.remove('active'));
            };
        }

        // Wochentag-Chips umschalten
        container.querySelectorAll('#df-weekdays .weekday-chip').forEach(chip => {
            chip.onclick = () => chip.classList.toggle('active');
        });

        const saveBtn = container.querySelector('#df-save');
        if (saveBtn) {
            saveBtn.onclick = async () => {
                const number = (document.getElementById('df-nr').value || '').trim();
                const name   = (document.getElementById('df-name').value || '').trim();
                const price  = document.getElementById('df-price').value;
                const cat    = document.getElementById('df-cat').value;
                if (!name || !price) return this.utils.showToast('Name und Preis erforderlich', 'error');

                const dish = {
                    id:        this.state.editingDishIndex !== -1 ? this.state.cachedMenuData.menu[this.state.editingDishIndex].id : Date.now().toString(),
                    number,
                    name,
                    price:     parseFloat(price),
                    cat,
                    desc:      (document.getElementById('df-desc').value || '').trim(),
                    image:     document.getElementById('df-img').value || null,
                    is_daily_special: document.getElementById('df-special').checked,
                    allergens: Array.from(document.querySelectorAll('.dish-allergen-cb:checked')).map(cb => cb.value),
                    additives: Array.from(document.querySelectorAll('.dish-additive-cb:checked')).map(cb => cb.value),
                    available: this.state.editingDishIndex !== -1 ? (this.state.cachedMenuData.menu[this.state.editingDishIndex].available !== false) : true,
                    available_days: Array.from(document.querySelectorAll('#df-weekdays .weekday-chip.active')).map(c => Number(c.dataset.day)),
                    updated_at: new Date().toISOString()
                };

                const translations = {};
                document.querySelectorAll('.trans-name').forEach(el => {
                    const lang = el.dataset.lang;
                    const name = el.value.trim();
                    if (name) { if (!translations[lang]) translations[lang] = {}; translations[lang].name = name; }
                });
                document.querySelectorAll('.trans-desc').forEach(el => {
                    const lang = el.dataset.lang;
                    const desc = el.value.trim();
                    if (desc) { if (!translations[lang]) translations[lang] = {}; translations[lang].description = desc; }
                });
                dish.translations = JSON.stringify(translations);

                let res;
                if (this.state.editingDishIndex !== -1) res = await this.api.put(`menu/${dish.id}`, dish);
                else res = await this.api.post('menu', dish);

                if (res?.success) {
                    this.state.cachedMenuData = null;
                    this.utils.showToast('Gericht gespeichert!');
                    this.closeDishForm();
                    this.renderMenu(container, document.getElementById('view-title'), 'dishes');
                } else {
                    this.utils.showToast(res?.reason || 'Fehler', 'error');
                }
            };
        }

        const kvAddBtn = container.querySelector('#kv-add-btn');
        if (kvAddBtn) {
            kvAddBtn.onclick = async () => {
                const code = (document.getElementById('kv-code').value || '').trim();
                const name = (document.getElementById('kv-name').value || '').trim();
                if (!code || !name) return this.utils.showToast('Code und Name nötig', 'error');
                const data = { ...this.state.cachedMenuData[currentTab] };
                data[code] = name;
                const res = await this.api.post(currentTab, data);
                if (res?.success) {
                    this.state.cachedMenuData = null;
                    this.renderMenu(container, document.getElementById('view-title'), currentTab);
                }
            };
        }

        const imgInp = container.querySelector('#df-img');
        if (imgInp) {
            imgInp.onchange = (e) => {
                const preview = document.getElementById('df-img-preview');
                const url = e.target.value;
                if (url && (url.startsWith('http') || url.startsWith('/'))) preview.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;">`;
                else preview.innerHTML = '<i class="fas fa-image fa-2x" style="opacity:0.1;"></i>';
            };
        }

        // Escape-Taste schließt offenes Modal
        if (!this._escapeHandlerAttached) {
            this._escapeHandlerAttached = true;
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const overlay = document.getElementById('dish-form-overlay');
                    if (overlay && overlay.style.display !== 'none') this.closeDishForm();
                }
            });
        }

        // Sub-module handlers
        if (currentTab === 'categories' && window.MenuCategories) window.MenuCategories.attachHandlers(container);
        if (window.MenuImportExport) window.MenuImportExport.attachHandlers(container);
        if (window.MenuTranslate) window.MenuTranslate.attachHandlers(container);
    }
};
