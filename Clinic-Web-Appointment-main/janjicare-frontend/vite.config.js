import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@inertiajs/react': path.resolve(__dirname, './src/utils/inertiaBridge.jsx'),
      'ziggy-js': path.resolve(__dirname, './src/utils/route.js'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
