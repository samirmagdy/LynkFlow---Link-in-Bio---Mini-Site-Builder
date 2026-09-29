import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), cloudflare()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('.', import.meta.url)),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // Keep the public/profile shell small while allowing the editor-only
      // analytics, icon, animation, and Supabase dependencies to be cached
      // independently. These are shared vendor boundaries, not feature hacks.
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'react-vendor', test: /node_modules[\\/]react(?:-dom)?[\\/]/, priority: 10, entriesAware: true },
              { name: 'icons-vendor', test: /node_modules[\\/]lucide-react[\\/]/, priority: 9, entriesAware: true },
              { name: 'charts-vendor', test: /node_modules[\\/]recharts[\\/]/, priority: 9, entriesAware: true },
              { name: 'motion-vendor', test: /node_modules[\\/](?:animejs|motion)[\\/]/, priority: 9, entriesAware: true },
              { name: 'supabase-vendor', test: /node_modules[\\/]@supabase[\\/]supabase-js[\\/]/, priority: 9, entriesAware: true },
            ],
          },
        },
      },
    },
  };
});
