import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './styles/globals.css';
import { BaseLayout } from '@/components/layout/BaseLayout';
import { GuestRoutes } from '@/routes/guest-routes';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BaseLayout>
            <GuestRoutes />
        </BaseLayout>
    </StrictMode>
);
