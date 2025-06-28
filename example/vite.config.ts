import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 允许导入父目录的源文件
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
  envPrefix: ['VITE_', 'REACT_APP_'], // 支持 REACT_APP 环境变量
}) 