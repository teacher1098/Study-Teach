import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig } from 'vite';

// Automatically duplicate dist/index.html to dist/404.html for GitHub Pages single-page-app routing
function githubPagesSpa() {
  return {
    name: 'github-pages-spa',
    closeBundle() {
      try {
        const distIndex = path.resolve(__dirname, 'dist', 'index.html');
        const dist404 = path.resolve(__dirname, 'dist', '404.html');
        if (fs.existsSync(distIndex)) {
          fs.copyFileSync(distIndex, dist404);
        }
      } catch (e) {
        console.warn('Note: Could not copy 404.html:', e);
      }
    },
  };
}

export default defineConfig(({ command }) => {
  // Use '/Study-Teach/' for production build (matching user's GitHub Pages repository),
  // but allow override via VITE_BASE or BASE_URL, and use '/' during development server.
  const base = process.env.VITE_BASE || process.env.BASE_URL || (command === 'build' ? '/Study-Teach/' : '/');

  return {
    base,
    plugins: [react(), tailwindcss(), githubPagesSpa()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
