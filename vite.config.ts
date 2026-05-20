import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execFile } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'cpp-scheduler-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/api/schedule')) {
            const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
            const mode = urlObj.searchParams.get('mode') || 'cpu'
            const algo = urlObj.searchParams.get('algo') || 'fcfs'

            let args: string[] = []

            if (mode === 'cpu') {
              const quantum = urlObj.searchParams.get('quantum') || '2'
              const processes = urlObj.searchParams.get('processes') || ''
              args = ['cpu', algo, quantum, processes]
            } else if (mode === 'disk') {
              const head = urlObj.searchParams.get('head') || '50'
              const size = urlObj.searchParams.get('size') || '200'
              const requests = urlObj.searchParams.get('requests') || ''
              args = ['disk', algo, head, size, requests]
            } else {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Invalid mode parameter' }))
              return
            }

            const exePath = path.resolve(__dirname, './engine.exe')

            execFile(exePath, args, (error, stdout, stderr) => {
              if (error) {
                console.error('C++ Execution Error:', error)
                console.error('Stderr:', stderr)
                res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ 
                  error: 'Failed to execute scheduling logic in C++ engine',
                  details: error.message,
                  stderr 
                }))
                return
              }

              res.writeHead(200, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              })
              res.end(stdout)
            })
          } else {
            next()
          }
        })
      }
    }
  ],
})
