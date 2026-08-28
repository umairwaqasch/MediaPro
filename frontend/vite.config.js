import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/mediapro/',
  server: {
    port: 3000,
    proxy: {
      '/mediapro/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
