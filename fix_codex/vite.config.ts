import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: "index.html",
        background: "src/background/serviceWorker.ts",
        contentScript: "src/content/contentScript.ts",
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "background") return "background.js";
          if (chunk.name === "contentScript") return "contentScript.js";
          return "assets/[name]-[hash].js";
        },
      },
    },
  },
});
