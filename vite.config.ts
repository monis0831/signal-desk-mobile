import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from a real origin (dev server or static host) rather than file://,
// so absolute asset paths are fine — unlike the Electron desktop build.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 5174,
    strictPort: true,
    // Reachable from a phone on the same LAN during development.
    host: true,
  },
});
