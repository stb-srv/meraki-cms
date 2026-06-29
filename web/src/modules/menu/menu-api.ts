import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

export interface Dish {
    id: string;
    number?: string;
    name: string;
    price?: number;
    cat?: string;
    desc?: string;
    image?: string | null;
    is_daily_special?: boolean;
    allergens?: string[];
    additives?: string[];
    available?: boolean;
    available_days?: number[];
    updated_at?: string;
    sort_order?: number;
    translations?: string | Record<string, { name?: string; description?: string }>;
}

export interface Category {
    id: string;
    label: string;
    sort_order?: number;
    icon?: string;
    active?: boolean;
}

/** allergens / additives: Code → Bezeichnung */
export type KvMap = Record<string, string>;

export interface MenuData {
    menu: Dish[];
    categories: Category[];
    allergens: KvMap;
    additives: KvMap;
}

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export const MENU_QUERY_KEY = ['menu-data'] as const;

export function useMenuData() {
    return useQuery({
        queryKey: MENU_QUERY_KEY,
        queryFn: async (): Promise<MenuData> => {
            const [menu, categories, allergens, additives] = await Promise.all([
                apiGet<Dish[]>('menu'),
                apiGet<Category[]>('categories'),
                apiGet<KvMap>('allergens'),
                apiGet<KvMap>('additives'),
            ]);
            return {
                menu: Array.isArray(menu) ? menu : [],
                categories: Array.isArray(categories)
                    ? [...categories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                    : [],
                allergens: allergens && !Array.isArray(allergens) ? allergens : {},
                additives: additives && !Array.isArray(additives) ? additives : {},
            };
        },
    });
}

export function getCatLabel(cat?: string | { label?: string; id?: string }): string {
    if (!cat) return 'Unsortiert';
    if (typeof cat === 'object') return cat.label || cat.id || 'Unbekannt';
    return cat;
}

export function normalizeCatId(cat?: string): string {
    if (!cat) return '';
    return String(cat)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_');
}

export function catMatchesFilter(
    dishCat: string | undefined,
    filterCatId: string,
    categories: Category[]
): boolean {
    if (!dishCat) return false;
    if (dishCat === filterCatId) return true;
    if (normalizeCatId(dishCat) === filterCatId) return true;
    const cat = categories.find((c) => c.id === filterCatId);
    return !!cat && dishCat.trim().toLowerCase() === (cat.label || '').trim().toLowerCase();
}

export function formatRelativeTime(isoString?: string): string | null {
    if (!isoString) return null;
    const diff = Date.now() - new Date(isoString).getTime();
    const min = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (min < 1) return 'Gerade eben';
    if (min < 60) return `Vor ${min} Min.`;
    if (h < 24) return `Vor ${h} Std.`;
    if (d < 7) return `Vor ${d} Tag${d > 1 ? 'en' : ''}`;
    return new Date(isoString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
    });
}

export function parseTranslations(
    t?: Dish['translations']
): Record<string, { name?: string; description?: string }> {
    if (!t) return {};
    if (typeof t === 'string') {
        try {
            return JSON.parse(t);
        } catch {
            return {};
        }
    }
    return t;
}
