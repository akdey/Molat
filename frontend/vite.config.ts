import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Ondorpata / Molat Library',
        short_name: 'Molat',
        description: 'Personal physical book library catalog and reading streak tracker',
        theme_color: '#FBF9F5',
        background_color: '#FBF9F5',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            // Instant offline shelf & streak browsing via StaleWhileRevalidate
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/api/v1/books') ||
              url.pathname.startsWith('/api/v1/reading/streak-summary'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache external book covers for 30 days
            urlPattern: ({ url }) =>
              url.hostname.includes('covers.openlibrary.org') ||
              url.hostname.includes('books.google.com') ||
              url.hostname.includes('mzstatic.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'book-jackets',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:7860',
        changeOrigin: true,
      },
    },
  },
})
