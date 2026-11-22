import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Built into app/dist and published to thesyriandev.github.io/LastSoft.
export default defineConfig({
  base: "/LastSoft/",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsInlineLimit: 0,
  },
});
