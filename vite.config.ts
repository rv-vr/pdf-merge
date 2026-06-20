import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"
import path from "path"

const base = process.env.GITHUB_ACTIONS === "true" ? "/pdf-merge/" : "/"

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/unpkg\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "unpkg-cache",
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: "PDF Merge",
        short_name: "PDFMerger",
        description:
          "Bulk-fill PDF templates with CSV data. Place fields, style typography, preview rows, and export — all in your browser.",
        theme_color: "#863bff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "any",
        start_url: base,
        scope: base,
        icons: [
          {
            src: `${base}favicon.svg`,
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
