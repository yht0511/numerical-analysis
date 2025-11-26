import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import path from "node:path";

export default defineConfig({
  root: "src/renderer",
  base: "./",
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
    outDir: path.join(__dirname, "dist"),
  },
  server: {
    port: 5173,
  },
});
