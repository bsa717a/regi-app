import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: dir,
  publicDir: path.resolve(dir, "../../public"),
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(dir, "../../src"),
      "next/link": path.resolve(dir, "next-link-stub.tsx"),
    },
  },
  css: {
    postcss: path.resolve(dir, "../../postcss.config.mjs"),
  },
  server: {
    host: "127.0.0.1",
    port: 4179,
    strictPort: true,
  },
});
