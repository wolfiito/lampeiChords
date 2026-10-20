import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

function apiDevPlugin(env: Record<string, string>) {
  return {
    name: 'api-dev-middleware',
    configureServer(server: any) {
      // Ensure DATABASE_URL is in process.env for local serverless handler
      Object.assign(process.env, env)

      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url && req.url.startsWith('/api/songs')) {
          try {
            // @ts-expect-error dynamic import of serverless js handler
            const { default: handler } = (await import('./api/songs.js')) as any
            const url = new URL(req.url, `http://${req.headers.host}`)
            req.query = Object.fromEntries(url.searchParams.entries())

            const enhance = (r: any) => {
              if (!r.status) {
                r.status = function (code: number) {
                  r.statusCode = code
                  return r
                }
              }
              if (!r.json) {
                r.json = function (data: any) {
                  r.setHeader('Content-Type', 'application/json')
                  r.end(JSON.stringify(data))
                  return r
                }
              }
            }
            enhance(res)

            if (['POST', 'PUT', 'DELETE'].includes(req.method || '')) {
              let bodyStr = ''
              req.on('data', (chunk: any) => {
                bodyStr += chunk
              })
              req.on('end', async () => {
                try {
                  req.body = bodyStr ? JSON.parse(bodyStr) : {}
                } catch {
                  req.body = bodyStr
                }
                await handler(req, res)
              })
              return
            }

            await handler(req, res)
            return
          } catch (err: any) {
            console.error('API middleware error:', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message }))
            return
          }
        }
        next()
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      apiDevPlugin(env),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'chordsLampei - Letras y Acordes',
          short_name: 'chordsLampei',
          description: 'Generador, editor y transpositor de letras y acordes para músicos',
          theme_color: '#059669',
          background_color: '#09120e',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: 'favicon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}']
        }
      })
    ]
  }
})

