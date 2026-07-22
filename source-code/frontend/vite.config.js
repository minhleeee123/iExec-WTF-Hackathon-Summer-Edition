import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import agentObserveHandler from './api/agent/observe.js'
import agentPlanHandler from './api/agent/plan.js'

function localAgentApi(env) {
  return {
    name: 'noxswap-local-agent-api',
    configureServer(server) {
      process.env.GROQ_API_KEY ||= env.GROQ_API_KEY
      process.env.GROQ_MODEL ||= env.GROQ_MODEL
      const route = (path, handler) => server.middlewares.use(path, async (req, res, next) => {
        if (req.method !== 'POST') return handler(req, res)
        try {
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          req.body = Buffer.concat(chunks).toString('utf8')
          return await handler(req, res)
        } catch (error) {
          return next(error)
        }
      })
      route('/api/agent/plan', agentPlanHandler)
      route('/api/agent/observe', agentObserveHandler)
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
