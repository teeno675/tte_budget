import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts") || /[/\\]d3-[^/\\]+[/\\]/.test(id)) return "charts";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("lucide-react")) return "icons";
          if (/[/\\](react|react-dom|scheduler)[/\\]/.test(id)) return "react-vendor";
        },
      },
    },
  },
});
