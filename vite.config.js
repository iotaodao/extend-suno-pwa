import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// ─── PWA configuration ─────────────────────────────────────────────────────
// Strategy: precache app shell, runtime-cache fonts and Suno audio results.
// Background sync queues failed POST /generate/extend calls and replays them
// when the device is back online.
// ──────────────────────────────────────────────────────────────────────────

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // we control update UX from React
      injectRegister: false,  // we register manually in main.jsx (workbox-window)
      strategies: 'generateSW',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false, // wait for user confirm
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/files/],
        runtimeCaching: [
          // Google Fonts — cache-first, 1 year
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Suno generated audio results — cache-first, 14 days (matches API retention)
          {
            urlPattern: ({ url }) =>
              url.hostname.includes('suno') ||
              url.hostname.includes('redpandaai.co') ||
              url.pathname.endsWith('.mp3') ||
              url.pathname.endsWith('.wav'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'suno-audio-results',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200, 206] },
              rangeRequests: true, // important for audio seeking
            },
          },
          // Cover images / SVGs returned from API
          {
            urlPattern: /\.(png|jpg|jpeg|gif|webp|svg)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // Suno API responses (record-info polling) — network-first with bg sync
          {
            urlPattern: /^https:\/\/api\.sunoapi\.org\/api\/v1\/generate\/record-info/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'suno-task-status',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 },
            },
          },
        ],
      },
      // App manifest — Android/iOS/desktop installable
      manifest: {
        id: '/',
        name: 'Extend · Suno',
        short_name: 'Extend',
        description: 'Suno v5.5 extend workflow — continue your tracks',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#070F1F',
        theme_color: '#070F1F',
        lang: 'en',
        dir: 'ltr',
        categories: ['music', 'productivity', 'utilities'],
        icons: [
          { src: '/icons/icon-192.png',  sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png',  sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [
          { src: '/icons/screenshot-wide.png', sizes: '1280x720',  type: 'image/png', form_factor: 'wide' },
          { src: '/icons/screenshot-narrow.png', sizes: '720x1280', type: 'image/png', form_factor: 'narrow' },
        ],
        shortcuts: [
          {
            name: 'New extension',
            short_name: 'Extend',
            description: 'Start a new song extension',
            url: '/?action=new',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
        ],
        // Web Share Target API — receive audio files from other apps
        share_target: {
          action: '/?share=true',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'description',
            files: [
              {
                name: 'audio',
                accept: ['audio/*', '.mp3', '.wav', '.m4a', '.ogg', '.flac'],
              },
            ],
          },
        },
      },
      devOptions: {
        enabled: true, // service worker active in dev for testing
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react';
          }
        },
      },
    },
  },
});
