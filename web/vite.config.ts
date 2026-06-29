import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

// Zwei SPA-Einstiegspunkte aus EINEM Vite-Projekt:
//   index.html  → Gäste-Website  (Prod: /)
//   admin.html  → Admin-Panel     (Prod: /admin)
// Geteilte Design-Tokens & UI-Primitive unter src/.
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    server: {
        port: 5173,
        // API + Socket.IO im Dev an den Express-Backend (:5000) weiterreichen
        proxy: {
            '/api': { target: 'http://localhost:5000', changeOrigin: true },
            '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
            '/socket.io': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                ws: true,
            },
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                guest: resolve(__dirname, 'index.html'),
                admin: resolve(__dirname, 'admin.html'),
            },
        },
    },
});
