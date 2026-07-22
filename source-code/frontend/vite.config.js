import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import agentPlanHandler from './api/agent/plan.js'

function localAgentApi(env) {
  return {
    name: 'noxswap-local-agent-api',
    configureServer(server) {
      process.env.GROQ_API_KEY ||= env.GROQ_API_KEY
      process.env.GROQ_MODEL ||= env.GROQ_MODEL
      server.middlewares.use('/api/agent/plan', async (req, res, next) => {
        if (req.method !== 'POST') return agentPlanHandler(req, res)
        try {
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          req.body = Buffer.concat(chunks).toString('utf8')
          return await agentPlanHandler(req, res)
        } catch (error) {
          return next(error)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), localAgentApi(env)],
  }
})
