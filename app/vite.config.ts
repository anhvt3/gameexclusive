import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { shopValidateRoute, breedValidateRoute } from './src/server/validationRoutes';
import { telemetryRoute } from './src/server/telemetryRoute';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'phase-3-validation-routes',
      configureServer(server) {
        server.middlewares.use(shopValidateRoute());
        server.middlewares.use(breedValidateRoute());
        server.middlewares.use(telemetryRoute());
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@bus': path.resolve(__dirname, 'src/bus'),
      '@game': path.resolve(__dirname, 'src/game'),
      '@react': path.resolve(__dirname, 'src/react'),
      '@domain': path.resolve(__dirname, 'src/domain'),
      '@data': path.resolve(__dirname, 'src/data'),
      '@persistence': path.resolve(__dirname, 'src/persistence'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
