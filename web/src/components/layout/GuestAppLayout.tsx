import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useGuestBranding } from '@/modules/guest/guest-api';
import { useCart } from '@/modules/guest/cart-store';
import { CartDrawer } from '@/modules/guest/CartDrawer';

/**
 * Layout der öffentlichen Gäste-Website. Navigation, Footer und Cart-Drawer
 * existieren NUR hier (Single Source). Sektionen kommen via <Outlet/>.
 */
export function GuestAppLayout() {
    const { data: branding } = useGuestBranding();
    const count = useCart((s) => s.count());
    const [cartOpen, setCartOpen] = React.useState(false);

    return (
        <div className="flex min-h-svh flex-col font-guest-body">
            <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/90 px-6 backdrop-blur">
                <a href="#top" className="flex items-center gap-2">
                    {branding?.logo ? (
                        <img src={branding.logo} alt={branding.name} className="h-9" />
                    ) : (
                        <span className="font-guest-display text-2xl font-bold text-primary">
                            {branding?.name || 'Meraki'}
                        </span>
                    )}
                </a>
                <nav className="flex items-center gap-6 text-sm font-medium">
                    <a href="#menu" className="hidden hover:text-primary sm:inline">
                        Speisekarte
                    </a>
                    <a href="#location" className="hidden hover:text-primary sm:inline">
                        Standort
                    </a>
                    <button
                        onClick={() => setCartOpen(true)}
                        className="relative rounded-full bg-primary p-2.5 text-primary-foreground"
                        aria-label="Warenkorb"
                    >
                        <ShoppingCart className="size-5" />
                        {count > 0 && (
                            <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                                {count}
                            </span>
                        )}
                    </button>
                </nav>
            </header>

            <main className="flex-1">
                <Outlet />
            </main>

            <footer className="border-t bg-muted/40 py-8 text-center text-sm text-muted-foreground">
                {branding?.phone && (
                    <p className="mb-1">
                        <a href={`tel:${branding.phone}`} className="hover:text-primary">
                            📞 {branding.phone}
                        </a>
                    </p>
                )}
                © {new Date().getFullYear()} {branding?.name || 'Meraki'}
            </footer>

            <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
        </div>
    );
}
