import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
        // Increase timeout for WebSocket
        timeout: 60000,
        // Handle proxy errors gracefully
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.warn('WebSocket proxy error:', err.message)
          })
        }
      }
    }
  }
})
