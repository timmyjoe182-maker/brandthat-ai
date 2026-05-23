import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        logo: "ai-logo-generator/index.html",
        instagram: "instagram-caption-generator/index.html",
        tiktok: "tiktok-hook-generator/index.html",
        bio: "brand-bio-generator/index.html",
        hashtag: "free-hashtag-generator/index.html",
        growth: "growth-roadmap-generator/index.html",
        strategy: "social-strategy-generator/index.html",
        email: "email-copy-generator/index.html",
        brand: "brand-creation-generator/index.html",
      },
    },
  },
});
