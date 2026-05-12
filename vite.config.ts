import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname)
  const apiHost = env.VITE_API_HOST || 'http://127.0.0.1:8000'
  const wsHost = apiHost.replace('https', 'wss').replace('http', 'ws')

  return {
    root: path.resolve(__dirname, 'client'),
    envDir: __dirname,
    publicDir: 'public',
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
    },
    plugins: [react()],
    server: {
      proxy: {
        '/blotter-stream': {
          target: wsHost,
          changeOrigin: true,
          ws: true,
        },
        '/audit': {
          target: apiHost,
          changeOrigin: true,
        },
        '/orders': {
          target: apiHost,
          changeOrigin: true,
        },
        '/nlp': {
          target: apiHost,
          changeOrigin: true,
        },
      },
    },
  }
})