import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy /api/* to the Fastify backend during development so the browser
      // never hits CORS issues. Strip the /api prefix before forwarding.
      "/api": {
        target: process.env["VITE_API_URL"] ?? "http://127.0.0.1:4000",
        rewrite: (p) => p.replace(/^\/api/, ""),
        changeOrigin: true,
      },
      "/uploads": {
        target: process.env["VITE_API_URL"] ?? "http://127.0.0.1:4000",
        changeOrigin: true,
      },
    },
  },
});
