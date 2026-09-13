import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@feature-os/sdk-js': path.resolve(__dirname, '../../packages/sdk-js/src/index.ts'),
      '@feature-os/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});

