import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
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
        target: 'https://abreast-curling-tutor.ngrok-free.dev',
        changeOrigin: true,
        secure: true,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
      '/api/college-settings': {
        target: 'https://abreast-curling-tutor.ngrok-free.dev',
        changeOrigin: true,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
      '/api/v1/academic-years': {
        target: 'https://abreast-curling-tutor.ngrok-free.dev',
        changeOrigin: true,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
      '/api': {
        target: 'https://abreast-curling-tutor.ngrok-free.dev',
        changeOrigin: true,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
    },
  },
})
