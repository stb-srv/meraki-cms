import { useViewTitle } from '@/hooks/useViewTitle';
import { Card } from '@/components/ui/card';
import { useMenuData } from './menu-api';
import { DishesTab } from './DishesTab';
import { CategoriesTab } from './CategoriesTab';
import { KvTab } from './KvTab';

type MenuTab = 'dishes' | 'categories' | 'allergens' | 'additives';

const TITLES: Record<MenuTab, string> = {
    dishes: 'Speisekarte · Gerichte',
    categories: 'Speisekarte · Kategorien',
    allergens: 'Speisekarte · Allergene',
    additives: 'Speisekarte · Zusatzstoffe',
};

function MenuPage({ tab }: { tab: MenuTab }) {
    useViewTitle(TITLES[tab]);
    const { data, isLoading } = useMenuData();

    if (isLoading || !data) {
        return (
            <div className="space-y-4">
                <Card className="h-16 animate-pulse bg-muted/50" />
                <Card className="h-96 animate-pulse bg-muted/50" />
            </div>
        );
    }

    switch (tab) {
        case 'categories':
            return <CategoriesTab data={data} />;
        case 'allergens':
            return <KvTab kind="allergens" data={data.allergens} />;
        case 'additives':
            return <KvTab kind="additives" data={data.additives} />;
        default:
            return <DishesTab data={data} />;
    }
}

export const MenuDishesPage = () => <MenuPage tab="dishes" />;
export const MenuCategoriesPage = () => <MenuPage tab="categories" />;
export const MenuAllergensPage = () => <MenuPage tab="allergens" />;
export const MenuAdditivesPage = () => <MenuPage tab="additives" />;
