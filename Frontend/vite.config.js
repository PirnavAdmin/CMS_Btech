import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const baseUrl = (env.VITE_API_BASE_URL || 'https://clarity-math-delouse.ngrok-free.dev').trim().replace(/\/+$/, '')
  const secureApiProxy = !/^https:\/\/localhost(?::|\/|$)/i.test(baseUrl)
  return {
  plugins: [tailwindcss(), react(), {
    name: 'local-admission-save-diagnostic',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__dev/admission-save-diagnostic', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        let body = ''
        req.on('data', chunk => { if (body.length < 8192) body += chunk })
        req.on('end', () => {
          try {
            const input = JSON.parse(body)
            const diagnostic = { time: new Date().toISOString(), path: /^\/api\/v1\/student-admissions\/\d+(?:\/academic-details)?$/.test(input.path || '') ? input.path : '', status: Number(input.status) || 0 }
            for (const key of ['collegeId','academicYearId','departmentId','courseId','branchId','semesterId','formCourseId','formBranchId','formSemesterId']) diagnostic[key] = Number(input[key]) > 0 ? Number(input[key]) : null
            const folder = resolve(server.config.root, '.cache')
            mkdirSync(folder, { recursive: true })
            writeFileSync(resolve(folder, 'admission-save-diagnostic.json'), JSON.stringify(diagnostic, null, 2))
            res.statusCode = 204
          } catch { res.statusCode = 400 }
          res.end()
        })
      })
    },
  }],
  test: {
    environment: 'jsdom',
    pool: 'threads',
    maxWorkers: 2,
    setupFiles: ['./tests/browser-environment.js'],
    include: [
      'src/pages/examinations/**/*.vitest.test.{js,jsx}',
      'src/pages/settings/**/*.vitest.test.{js,jsx}',
      'src/pages/fees/**/*.vitest.test.{js,jsx}',
      'src/components/**/*.vitest.test.{js,jsx}',
      'src/pages/academic-structure/**/*.vitest.test.{js,jsx}',
      'src/pages/admin-management/**/*.vitest.test.{js,jsx}',
      'src/config/**/*.vitest.test.{js,jsx}',
      'src/features/faculty/**/*.vitest.test.{js,jsx}',
      'src/pages/semester-management/**/*.vitest.test.{js,jsx}',
      'src/pages/section-management/**/*.vitest.test.{js,jsx}',
      'src/auth/**/*.vitest.test.{js,jsx}',
    ],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    // Prepare the React runtime together before serving the first page.
    include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
  server: {
    proxy: {
      '/postal-lookup': {
        target: 'https://www.pincodesinfo.in/api',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/postal-lookup/, ''),
      },
      '/api/v1/access-requests': {
        target: baseUrl,
        changeOrigin: true,
        secure: secureApiProxy,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
      '/api/college-settings': {
        target: baseUrl,
        changeOrigin: true,
        secure: secureApiProxy,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
      '/api/v1/academic-years': {
        target: baseUrl,
        changeOrigin: true,
        secure: secureApiProxy,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
      '/api': {
        target: baseUrl,
        changeOrigin: true,
        secure: secureApiProxy,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
      '/uploads': {
        target: baseUrl,
        changeOrigin: true,
        secure: secureApiProxy,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
      '/images': {
        target: baseUrl,
        changeOrigin: true,
        secure: secureApiProxy,
        headers: { 'ngrok-skip-browser-warning': 'true' },
      },
    },
  },
  }
})
