// cms/modules/menu.js
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from './api.js';
import { showToast, showConfirm, showPrompt, showSelect, renderHelpIcon } from './utils.js';

/**
 * Orchestrator for the Menu module.
 * Delegates work to specialized sub-modules:
 * - MenuCore (State & Core Rendering)
 * - MenuCategories (Category Management)
 * - MenuImportExport (Backup & PDF)
 * - MenuTranslate (Translations & AI)
 */
export async function renderMenu(container, titleEl, tab = 'dishes', forceRefresh = false) {
    if (!window.MenuCore) {
        console.error("MenuCore not loaded! Check index.html script tags.");
        return;
    }
    
    // Initialize if not done yet
    if (!window.MenuCore.isInitialized) {
        const api = { 
            get: apiGet, 
            post: apiPost, 
            put: apiPut, 
            del: apiDelete, 
            upload: apiUpload 
        };
        const utils = {
            showToast,
            showConfirm,
            showPrompt,
            showSelect,
            renderHelpIcon
        };
        
        window.MenuCore.init(api, utils);
        window.MenuCore.isInitialized = true;
    }
    
    // Delegate to core
    return window.MenuCore.renderMenu(container, titleEl, tab, forceRefresh);
}
