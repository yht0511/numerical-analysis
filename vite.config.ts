import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";

export default defineConfig({
  root: "src/renderer",
  plugins: [
    react(),
    electron({
      main: {
        entry: "src/main/main.ts",
      },
      preload: {
        input: {
          preload: "src/main/preload.ts",
        },
      },
    }),
  ],
  build: {
    outDir: "dist",
  },
  server: {
    port: 5173,
  },
});
