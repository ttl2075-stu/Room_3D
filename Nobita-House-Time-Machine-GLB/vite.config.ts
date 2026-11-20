import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 5101,
    strictPort: true,
    allowedHosts: ['memory-monlabs.hnue.online'],
  },
  build: { target: 'es2022' },
});
