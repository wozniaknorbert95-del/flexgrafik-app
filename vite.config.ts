import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/', // Use root path for Vercel
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    publicDir: 'public', // Ensure public files are copied (sw.js, offline.html, manifest.json)
    build: {
      outDir: 'dist',
      sourcemap: false,
      emptyOutDir: true,
      target: 'es2020', // Modern browsers
      minify: 'esbuild', // Fast, no extra dependencies
      cssMinify: true,
      rollupOptions: {
        output: {
          // Standard Vite hashing - reliable for Vercel
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          // Aggressive code splitting
          manualChunks: (id) => {
            // Vendor chunks
            if (id.includes('node_modules')) {
              // React core
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
                return 'react-core';
              }
              // Framer Motion
              if (id.includes('framer-motion')) {
                return 'framer-motion';
              }
              // Other node_modules
              return 'vendor';
            }

            // Component chunks (lazy loaded)
            if (id.includes('components/')) {
              if (id.includes('Premium')) {
                const match = id.match(/([A-Z][a-z]+Premium)/);
                if (match) return match[1].toLowerCase();
              }
              if (id.includes('Navigation')) return 'navigation';
            }

            // Utility chunks
            if (id.includes('services/')) return 'services';
            if (id.includes('utils/')) return 'utils';
            if (id.includes('prompts/')) return 'prompts';
            if (id.includes('hooks/')) return 'hooks';
          },
        },
      },
    },
    define: {
      // API keys are now managed through user settings, not build config
      // for security - they are stored in app data, not exposed in client bundle
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
