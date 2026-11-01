import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const mockEnabled = (process.env.VITE_USE_MOCK ?? env.VITE_USE_MOCK) === 'true';

  return {
    plugins: [react()],
    resolve: {
      alias: [
        { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
        ...(!mockEnabled
          ? [{ find: './mock', replacement: fileURLToPath(new URL('./src/api/mock.disabled.ts', import.meta.url)) }]
          : []),
      ],
    },
    server: {
      proxy: {
        '/api': 'http://127.0.0.1:3000',
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
