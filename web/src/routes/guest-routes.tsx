import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GuestAppLayout } from '@/components/layout/GuestAppLayout';
import { HomePage } from '@/modules/guest/HomePage';

export function GuestRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<GuestAppLayout />}>
                    <Route index element={<HomePage />} />
                    {/* TODO Phase 3: /menu, /cart, /reservierung, /kontakt … */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
