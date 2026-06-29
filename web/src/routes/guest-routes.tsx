import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GuestAppLayout } from '@/components/layout/GuestAppLayout';
import { HomePage } from '@/modules/guest/HomePage';
import { MenuPage } from '@/modules/guest/MenuPage';
import { CustomPageView } from '@/modules/guest/CustomPageView';

export function GuestRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<GuestAppLayout />}>
                    <Route index element={<HomePage />} />
                    <Route path="speisekarte" element={<MenuPage />} />
                    <Route path="p/:slug" element={<CustomPageView />} />
                    {/* TODO Phase 3: /reservierung, /kontakt … */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
