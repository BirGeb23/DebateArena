import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

import {
  handleDebateRequest,
  handleScoreRequest,
  handleSummaryRequest,
} from './server/handlers'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  if (env.GROQ_API_KEY) {
    process.env.GROQ_API_KEY = env.GROQ_API_KEY
  }

  return {
    plugins: [
      react(),
      {
        name: 'debatearena-api',
        configureServer(server) {
          server.middlewares.use('/api/debate', (req, res) => {
            void handleDebateRequest(req, res)
          })
          server.middlewares.use('/api/score', (req, res) => {
            void handleScoreRequest(req, res)
          })
          server.middlewares.use('/api/summary', (req, res) => {
            void handleSummaryRequest(req, res)
          })
        },
      },
    ],
  }
})
