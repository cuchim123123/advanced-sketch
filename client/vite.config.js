import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', () => {})
        }
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          // Suppress ALL proxy errors silently
          proxy.on('error', () => {})
          proxy.on('proxyReq', (proxyReq, req, res) => {
            req.on('error', () => {})
            res.on('error', () => {})
          })
          proxy.on('proxyReqWs', (proxyReq, req, socket) => {
            socket.on('error', () => {})
          })
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.on('error', () => {})
          })
        }
      }
    }
  }
})
