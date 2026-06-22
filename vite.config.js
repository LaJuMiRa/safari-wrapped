import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds the popup (src-popup) into static files under extension/popup/.
// base: './' produces relative asset paths so it loads under the
// safari-web-extension:// scheme.
export default defineConfig({
  root: 'src-popup',
  base: './',
  plugins: [react()],
  build: {
    outDir: '../extension/popup',
    // Don't empty: hashed asset names avoid collisions, and emptying sometimes
    // fails due to file locks. Old assets are harmless.
    emptyOutDir: false,
  },
});
