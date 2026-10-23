import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['icons/*.svg'],
    manifest: {
      name: 'IDReady — ID Photo Maker', short_name: 'IDReady', description: 'Private, offline-capable ID photo maker',
      theme_color: '#ffffff', background_color: '#f6f7f9', display: 'standalone', start_url: '/', orientation: 'any',
      icons: [{ src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }, { src: '/icons/maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,webp}'],
      maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
      cleanupOutdatedCaches: true,
      navigateFallback: '/index.html',
      runtimeCaching: [{
        urlPattern: /\/(?:models|wasm)\/[^/?]+(?:\?.*)?$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'idready-ai-v1',
          cacheableResponse: { statuses: [200] }
        }
      }]
    }
  })],
  worker: { format: 'iife' }
})
