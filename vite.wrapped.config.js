import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Baut die Vollbild-Wrapped-Story (src-wrapped) nach extension/wrapped/.
export default defineConfig({
  root: 'src-wrapped',
  base: './',
  plugins: [react()],
  build: {
    outDir: '../extension/wrapped',
    emptyOutDir: false,
  },
});
