import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import {
    useGuestBranding,
    useGuestCategories,
    useGuestHome,
    useGuestMenu,
} from './guest-api';
import { useCart } from './cart-store';
import { getCatLabel, normalizeCatId, type Dish } from '@/modules/menu/menu-api';

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const DAY_LABELS: Record<string, string> = {
    Mo: 'Montag', Di: 'Dienstag', Mi: 'Mittwoch', Do: 'Donnerstag',
    Fr: 'Freitag', Sa: 'Samstag', So: 'Sonntag',
};

export function HomePage() {
    const { data: home } = useGuestHome();
    const { data: branding } = useGuestBranding();
    const { data: menu = [] } = useGuestMenu();
    const { data: categories = [] } = useGuestCategories();
    const add = useCart((s) => s.add);

    function addToCart(d: Dish) {
        add({ id: d.id, name: d.name, price: Number(d.price) || 0, number: d.number });
        toast.success(`„${d.name}" hinzugefügt`);
    }

    const grouped = categories
        .map((c) => ({
            cat: c,
            dishes: menu.filter(
                (d) =>
                    d.available !== false &&
                    d.cat &&
                    (d.cat === c.id ||
                        normalizeCatId(d.cat) === c.id ||
                        d.cat.trim().toLowerCase() === (c.label || '').trim().toLowerCase())
            ),
        }))
        .filter((g) => g.dishes.length > 0);

    return (
        <div id="top">
            {/* Hero */}
            <section
                className="relative flex h-[70vh] items-center justify-center bg-cover bg-center text-center text-white"
                style={{
                    backgroundImage: `linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.45)), url('${home?.bgImage || '/admin/assets/santorini_bg.png'}')`,
                }}
            >
                <div className="px-6">
                    <h1 className="font-guest-display text-5xl font-bold md:text-7xl">
                        {home?.heroTitle || branding?.name || 'Willkommen'}
                    </h1>
                    <p className="mt-4 text-lg opacity-90 md:text-2xl">
                        {home?.heroSlogan || branding?.slogan || ''}
                    </p>
                    <a
                        href="#menu"
                        className="mt-8 inline-block rounded-full bg-secondary px-8 py-3 font-bold text-secondary-foreground"
                    >
                        Zur Speisekarte
                    </a>
                </div>
            </section>

            {/* Promo */}
            {home?.promotionEnabled !== false && home?.promotionText && (
                <div className="bg-secondary py-3 text-center font-medium text-secondary-foreground">
                    {home.promotionText}
                </div>
            )}

            {/* Welcome */}
            {(home?.welcomeText || home?.welcomeImage) && (
                <section className="mx-auto grid max-w-5xl items-center gap-8 px-6 py-16 md:grid-cols-2">
                    <div>
                        <h2 className="font-guest-display text-4xl font-bold text-primary">
                            {home?.welcomeTitle || 'Willkommen'}
                        </h2>
                        <p className="mt-4 leading-relaxed text-muted-foreground">
                            {home?.welcomeText}
                        </p>
                    </div>
                    {home?.welcomeImage && (
                        <img src={home.welcomeImage} alt="" className="rounded-2xl object-cover shadow-lg" />
                    )}
                </section>
            )}

            {/* Menu */}
            <section id="menu" className="mx-auto max-w-5xl px-6 py-16">
                <h2 className="mb-10 text-center font-guest-display text-4xl font-bold text-primary">
                    Unsere Speisekarte
                </h2>
                {grouped.length === 0 ? (
                    <p className="text-center text-muted-foreground">Speisekarte folgt in Kürze.</p>
                ) : (
                    <div className="space-y-12">
                        {grouped.map(({ cat, dishes }) => (
                            <div key={cat.id}>
                                <h3 className="mb-5 border-b pb-2 font-guest-display text-2xl font-bold text-secondary">
                                    {getCatLabel(cat)}
                                </h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {dishes.map((d) => (
                                        <div key={d.id} className="flex gap-4 rounded-xl border bg-card p-4">
                                            {d.image && (
                                                <img
                                                    src={d.image}
                                                    alt={d.name}
                                                    className="size-20 shrink-0 rounded-lg object-cover"
                                                />
                                            )}
                                            <div className="flex-1">
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <h4 className="font-bold">
                                                        {d.is_daily_special && '⭐ '}
                                                        {d.name}
                                                    </h4>
                                                    <span className="font-mono font-bold text-secondary">
                                                        {(Number(d.price) || 0).toFixed(2)} €
                                                    </span>
                                                </div>
                                                {d.desc && (
                                                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                                        {d.desc}
                                                    </p>
                                                )}
                                                <button
                                                    onClick={() => addToCart(d)}
                                                    className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
                                                >
                                                    <Plus className="size-3.5" /> Hinzufügen
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Öffnungszeiten + Standort */}
            <section id="location" className="bg-muted/40 py-16">
                <div className="mx-auto grid max-w-5xl gap-8 px-6 md:grid-cols-2">
                    {home?.openingHours && (
                        <div>
                            <h2 className="mb-5 font-guest-display text-3xl font-bold text-primary">
                                Öffnungszeiten
                            </h2>
                            <div className="space-y-1.5">
                                {DAYS.map((d) => {
                                    const e = home.openingHours?.[d] || { closed: true };
                                    return (
                                        <div key={d} className="flex justify-between border-b py-1.5 text-sm">
                                            <span>{DAY_LABELS[d]}</span>
                                            <span className="text-muted-foreground">
                                                {e.closed ? 'Geschlossen' : `${e.open} – ${e.close}`}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {home?.location?.address && (
                        <div>
                            <h2 className="mb-5 font-guest-display text-3xl font-bold text-primary">
                                Standort
                            </h2>
                            <p className="whitespace-pre-line text-muted-foreground">
                                {home.location.address}
                            </p>
                            {home.location.embedUrl && (
                                <iframe
                                    src={home.location.embedUrl}
                                    title="Karte"
                                    className="mt-4 h-64 w-full rounded-xl border"
                                    loading="lazy"
                                />
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
