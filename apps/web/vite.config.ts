import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = process.env.VITE_DEV_API_TARGET ?? "http://127.0.0.1:3001";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
      "/socket.io": { target: apiTarget, changeOrigin: true, ws: true },
    },
  },
});
