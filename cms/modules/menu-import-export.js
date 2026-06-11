// menu-import-export.js
window.MenuImportExport = {
    attachHandlers: function(container) {
        const exportBtn = container.querySelector('#btn-export-menu');
        if (exportBtn) exportBtn.onclick = async () => {
            const data = await window.MenuCore.api.get('menu/export');
            if (!data || !data._meta) {
                window.MenuCore.utils.showToast('Backup fehlgeschlagen.', 'error');
                return;
            }
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `speisekarte-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            window.MenuCore.utils.showToast('Backup bereit! \u2705');
        };

        const importBtn = container.querySelector('#btn-import-menu');
        if (importBtn) importBtn.onclick = () => {
            const inp = document.createElement('input');
            inp.type = 'file';
            inp.accept = '.json';
            inp.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    try {
                        const data = JSON.parse(ev.target.result);
                        if (!await window.MenuCore.utils.showConfirm('Backup wiederherstellen?', 'Dies überschreibt die aktuelle Speisekarte unwiderruflich!')) return;
                        const res = await window.MenuCore.api.post('menu/import', data);
                        if (res?.success) {
                            window.MenuCore.state.cachedMenuData = null;
                            window.MenuCore.renderMenu(container, document.getElementById('view-title'), 'dishes', true);
                            window.MenuCore.utils.showToast('Speisekarte wiederhergestellt! \u2705');
                        }
                    } catch (err) {
                        window.MenuCore.utils.showToast('Ungültiges Format', 'error');
                    }
                };
                reader.readAsText(file);
            };
            inp.click();
        };

        const pdfBtn = container.querySelector('#btn-export-pdf');
        if (pdfBtn) pdfBtn.onclick = async () => {
            window.MenuCore.utils.showToast('PDF wird generiert...');

            try {
                // PDF wird serverseitig via pdfkit erzeugt (GET /api/menu/export-pdf).
                // Auth wie im restlichen CMS: x-admin-token aus sessionStorage.
                const response = await fetch('/api/menu/export-pdf', {
                    headers: { 'x-admin-token': sessionStorage.getItem('meraki_admin_token') }
                });

                if (response.ok) {
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'Speisekarte.pdf';
                    a.click();
                    URL.revokeObjectURL(url);
                    window.MenuCore.utils.showToast('PDF bereit! \u2705');
                } else {
                    throw new Error(`PDF Generation failed (${response.status})`);
                }
            } catch (err) {
                console.error(err);
                window.MenuCore.utils.showToast('PDF Export fehlgeschlagen', 'error');
            }
        };
    }
};
