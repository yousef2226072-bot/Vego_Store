import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// In dev, /api calls are proxied to the Node backend (default http://localhost:3000),
// so cookies work without CORS. In production, serve `dist/` from the backend's /public folder.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173, proxy: { '/api': { target: process.env.VITE_DEV_API ?? 'http://localhost:3000', changeOrigin: true } } },
});
