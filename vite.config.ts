import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080'

export default defineConfig(({ mode }) => {
  const isAdminDev = mode === 'admin'

  return {
    plugins: [react()],
    server: {
      port: isAdminDev ? 5174 : 5173,
      strictPort: true,
      open: isAdminDev ? '/admin.html' : '/',
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: isAdminDev ? 4174 : 4173,
      open: isAdminDev ? '/admin.html' : '/',
    },
    build: {
      rollupOptions: {
        input: {
          main: './index.html',
          admin: './admin.html',
        },
      },
    },
  }
})
