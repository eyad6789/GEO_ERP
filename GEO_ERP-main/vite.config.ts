import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Use 127.0.0.1 (not "localhost"): on macOS "localhost" resolves to IPv6
        // (::1) first, so if another app holds port 4000 on IPv6 the proxy would
        // hit it instead of our IPv4 API. Pinning to IPv4 always reaches our server.
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
})
