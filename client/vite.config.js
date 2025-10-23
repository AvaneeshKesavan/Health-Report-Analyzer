import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Automatically updates the service worker
      
      // Add the manifest configuration
      manifest: {
        name: 'Health Report Analyzer',
        short_name: 'HealthAnalyzer',
        description: 'Upload and analyze your health reports.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        icons: [
          {
            src: 'hra-192x192.png', // Path relative to 'public' folder
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'hra-512x512.png', // Path relative to 'public' folder
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'hra-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // For adaptive icons on Android
          }
        ]
      }
    }),
    visualizer({ filename: 'dist/stats.html', open: false })
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
