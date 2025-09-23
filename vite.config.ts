import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 8080,
    strictPort: true,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "framer-motion"
    ],
    exclude: [
      "@react-aria/ssr",
      "@react-stately/utils", 
      "@react-aria/utils",
      "@react-aria/interactions"
    ],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  esbuild: {
    target: 'esnext',
  },
}));
