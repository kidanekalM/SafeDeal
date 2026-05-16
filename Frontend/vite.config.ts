import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      protocolImports: true,
    }),
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

  resolve: {
    alias: [
      { find: /.*internals\/define-globalThis-property/, replacement: path.resolve(__dirname, 'src/lib/core-js-shim.js') },
      { find: /.*internals\/globalThis-this/, replacement: path.resolve(__dirname, 'src/lib/global-this.js') },
    ]
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom', 'framer-motion', 'lucide-react'],
        }
      }
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    }
  },

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

  define: {
    'global': 'globalThis',
  }
})
