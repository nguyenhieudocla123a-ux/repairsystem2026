/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

const apiTarget = process.env.VITE_DEV_API_TARGET ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Proxy để trình duyệt thấy FE và API cùng origin → cookie refresh token (SameSite=Strict) hoạt động (TD-05)
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/ws': { target: apiTarget, ws: true, changeOrigin: true },
    },
  },
  build: {
    // AntD là thư viện lớn (~265 kB gzip) nằm trong chunk riêng được cache lâu dài; ngưỡng mặc định 500 kB quá chặt
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Tách thư viện ít thay đổi ra chunk riêng → trình duyệt cache lâu dài, deploy mới chỉ tải lại code app
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom', 'react-redux', '@reduxjs/toolkit'],
          antd: ['antd', '@ant-design/icons'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
