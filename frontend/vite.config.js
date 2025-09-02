import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    
    // PWA Plugin für Service Worker und Offline-Funktionalität
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      manifest: {
        name: 'DIY Humanoid Configurator',
        short_name: 'DIY Configurator',
        description: 'Configure your DIY humanoid robot',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    }),
    
    // Bundle Visualizer für Analyse
    ...(process.env.ANALYZE === 'true' ? [
      visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true
      })
    ] : [])
  ],
  
  // Build Optimierung
  build: {
    // Chunk-Splitting für besseres Caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor Chunks für besseres Caching
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          payment: ['@stripe/stripe-js', '@stripe/react-stripe-js', '@paypal/react-paypal-js'],
          ui: [] // Für UI-spezifische Libraries
        },
        // Chunk-Dateinamen für optimales Caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // Minimale Chunk-Größe für bessere Performance
    chunkSizeWarningLimit: 1000,
    // Source Maps nur für Development
    sourcemap: process.env.NODE_ENV === 'development',
    // Tree-shaking und Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production'
      }
    },
    // Target moderne Browser für kleinere Bundle
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari12'],
    
    // CSS Code Splitting
    cssCodeSplit: true,
    
    // Experimentelle Features für Performance
    experimentalRenderBuiltUrl: (filename, { hostType }) => {
      // CDN URL für Production Assets
      if (process.env.NODE_ENV === 'production' && process.env.VITE_CDN_URL) {
        return `${process.env.VITE_CDN_URL}/${filename}`;
      }
      return filename;
    }
  },
  
  // Performance Optimierung
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@stripe/stripe-js',
      '@stripe/react-stripe-js',
      '@paypal/react-paypal-js'
    ]
  },
  
  // Server Konfiguration
  server: {
    // Preload wichtige Module
    warmup: {
      clientFiles: ['./src/main.jsx', './src/App.jsx', './src/index.css']
    }
  },
  
  // Preview für Production Testing
  preview: {
    port: 4173,
    strictPort: true,
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  }
})

