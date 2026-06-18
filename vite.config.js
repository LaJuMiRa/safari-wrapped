import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Baut das Popup (src-popup) zu statischen Dateien und legt sie unter
// extension/popup/ ab. base: './' sorgt für relative Asset-Pfade, damit
// es unter dem safari-web-extension:// Schema lädt.
export default defineConfig({
  root: 'src-popup',
  base: './',
  plugins: [react()],
  build: {
    outDir: '../extension/popup',
    // Nicht leeren: gehashte Asset-Namen vermeiden Kollisionen, und das
    // Leeren scheitert teils an Datei-Locks. Alte Assets stören nicht.
    emptyOutDir: false,
  },
});
