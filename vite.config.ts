import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

function pagesIndexPlugin() {
  const sourcePath = path.resolve(__dirname, 'index.source.html');
  const outputPath = path.resolve(__dirname, 'index.html');
  const sourceHtml = fs.readFileSync(sourcePath, 'utf8');

  return {
    name: 'pages-index',
    buildStart() {
      fs.rmSync(path.resolve(__dirname, 'pages-assets'), { recursive: true, force: true });
    },
    closeBundle() {
      const compiledHtml = fs.readFileSync(sourcePath, 'utf8');
      fs.writeFileSync(outputPath, compiledHtml);
      fs.writeFileSync(sourcePath, sourceHtml);
    },
  };
}

export default defineConfig(() => {
  return {
    base: '/nuevo-formu/',
    publicDir: false as const,
    build: {
      outDir: '.',
      emptyOutDir: false,
      assetsDir: 'pages-assets',
      rollupOptions: {
        input: path.resolve(__dirname, 'index.source.html'),
      },
    },
    plugins: [react(), tailwindcss(), pagesIndexPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
