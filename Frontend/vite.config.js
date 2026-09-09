import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const baseUrl = (env.VITE_API_BASE_URL || 'https://abreast-curling-tutor.ngrok-free.dev').trim().replace(/\/+$/, '')
  return {
  plugins: [react()],
  server: {
    proxy: {
      '/postal-lookup': {
        target: 'https://api.postalpincode.in',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/postal-lookup/, ''),
      },
      '/api/v1/access-requests': {
        target: baseUrl,
        changeOrigin: true,
        secure: true,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
      '/api/college-settings': {
        target: baseUrl,
        changeOrigin: true,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
      '/api/v1/academic-years': {
        target: baseUrl,
        changeOrigin: true,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
      '/api': {
        target: baseUrl,
        changeOrigin: true,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
      '/uploads': {
        target: baseUrl,
        changeOrigin: true,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
    },
  },
  }
})
