import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds the full-screen Wrapped story (src-wrapped) into extension/wrapped/.
export default defineConfig({
  root: 'src-wrapped',
  base: './',
  plugins: [react()],
  build: {
    outDir: '../extension/wrapped',
    emptyOutDir: false,
  },
});
