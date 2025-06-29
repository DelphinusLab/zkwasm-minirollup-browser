import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Allow importing source files from parent directory
      '@': path.resolve(__dirname, '../src'),
    },
  },
  server: {
    watch: {
      usePolling: true
    }
  },
  define: {
    global: 'globalThis',
  },
      envPrefix: ['VITE_', 'REACT_APP_'], // Support REACT_APP environment variables
}) 