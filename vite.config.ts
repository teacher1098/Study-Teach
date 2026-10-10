import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig } from 'vite';

// Automatically duplicate dist/index.html to dist/404.html and sync to docs/ folder for GitHub Pages
function githubPagesSpa() {
  return {
    name: 'github-pages-spa',
    closeBundle() {
      try {
        const distDir = path.resolve(__dirname, 'dist');
        const distIndex = path.resolve(distDir, 'index.html');
        const dist404 = path.resolve(distDir, '404.html');
        if (fs.existsSync(distIndex)) {
          fs.copyFileSync(distIndex, dist404);
        }

        // Also copy dist to docs/ so users can deploy via "Deploy from a branch -> /docs" option
        const docsDir = path.resolve(__dirname, 'docs');
        if (fs.existsSync(distDir)) {
          if (fs.existsSync(docsDir)) {
            fs.rmSync(docsDir, { recursive: true, force: true });
          }
          fs.cpSync(distDir, docsDir, { recursive: true });
        }
      } catch (e) {
        console.warn('Note: Could not copy 404.html or docs folder:', e);
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
