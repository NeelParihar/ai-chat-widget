import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Ensure Node-specific env checks are inlined for browser IIFE bundle
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": "{}",
  },
  build: {
    // Build a single-file IIFE bundle for easy <script> embedding
    lib: {
      entry: "src/widget.tsx",
      name: "AgentWidgetBundle",
      formats: ["iife"] as const,
      fileName: () => "agent-widget.js",
    },
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // Ensure global name isn't overwritten and can live alongside others
        extend: true,
      },
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:8788",
    },
  },
  preview: {
    proxy: {
      "/api": "http://localhost:8788",
    },
  },
});
