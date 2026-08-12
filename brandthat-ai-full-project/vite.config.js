import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react") || id.includes("react-dom")) return "react-vendor";
          if (id.includes("@supabase")) return "supabase-vendor";
          if (id.includes("stripe") || id.includes("openai")) return "service-vendor";
          return "vendor";
        },
      },
    },
  },
});
