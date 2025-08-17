import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
      include: ['crypto', 'stream', 'buffer', 'process', 'util']
    })
  ],
  resolve: {
    alias: {
      // Allow importing source files from parent directory
      '@': path.resolve(__dirname, './src'),
      'zkwasm-minirollup-browser': path.resolve(__dirname, '../src/index.ts'),
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