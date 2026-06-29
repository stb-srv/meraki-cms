import { useEffect } from 'react';

/** Setzt den Titel im Header (#view-title) des DashboardLayout. */
export function useViewTitle(title: string) {
    useEffect(() => {
        const el = document.getElementById('view-title');
        if (el) el.textContent = title;
        return () => {
            if (el) el.textContent = '';
        };
    }, [title]);
}
