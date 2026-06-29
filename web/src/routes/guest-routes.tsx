import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GuestAppLayout } from '@/components/layout/GuestAppLayout';
import { HomePage } from '@/modules/guest/HomePage';
import { MenuPage } from '@/modules/guest/MenuPage';

export function GuestRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<GuestAppLayout />}>
                    <Route index element={<HomePage />} />
                    <Route path="speisekarte" element={<MenuPage />} />
                    {/* TODO Phase 3: /reservierung, /kontakt … */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
