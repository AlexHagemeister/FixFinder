/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // A new build takes over as soon as it is downloaded, and the page reloads into it, so an installed copy shows
      // the new build on the first open after a deploy instead of the one after.
      registerType: "autoUpdate",
      // src/main.tsx registers the service worker itself, so the plugin injects no register script of its own.
      injectRegister: false,
      // The plugin turns these on for autoUpdate only when injectRegister is "auto", so with false they are set here.
      // Without them the new service worker waits for every open copy to close, and the reload never comes.
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // The HEIC decoder (about 3 MB) loads only when a photo needs it, so it is not downloaded ahead of time.
        globIgnores: ["**/heic-to-*.js"],
      },
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "FixFinder",
        short_name: "FixFinder",
        description:
          "Photograph something broken in a public space. FixFinder finds who is responsible for fixing it and helps you report it.",
        display: "standalone",
        start_url: "/",
        scope: "/",
        theme_color: "#F6F5F1",
        background_color: "#F6F5F1",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  server: {
    // Real AI calls run only in the deployed Worker, which holds the OpenRouter key and records every call (issue
    // #12). Locally, /api requests go to the live Worker, so nobody needs a key to run the app. FIXFINDER_API_TARGET
    // points them at a branch preview instead, to try a Worker route that has not merged yet.
    proxy: {
      "/api": {
        target: process.env.FIXFINDER_API_TARGET || "https://fixfinder.alexhagemeister.workers.dev",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
