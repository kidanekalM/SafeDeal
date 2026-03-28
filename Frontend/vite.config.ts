import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: "SafeDeal - Secure Escrow Made Simple",
        short_name: "SafeDeal",
        description: "The world's most trusted escrow platform. Secure your deals, and trade with confidence.",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#3b82f6",
        orientation: "portrait-primary",
        scope: "/",
        icons: [
          {
            src: "/logoonlylock.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ],
        categories: ["finance", "business", "productivity"],
        lang: "en",
        dir: "ltr"
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      }
    })
  ],

  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // ✅ Add this block for ngrok
  preview: {
    allowedHosts: [
      "elida-necktieless-unaspiringly.ngrok-free.dev"
    ]
  },
  
  define: {
    global: 'globalThis',
  },
  
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
    },
  },
})