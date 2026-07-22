import { loadEnv } from 'vite'
import { createGroqStrategyPlan } from '../api/_lib/groq-planner.js'

const env = loadEnv('development', process.cwd(), '')
const result = await createGroqStrategyPlan(
  {
    intent: 'Use 10 percent of my private cUSDC to buy cETH if ETH falls 3 percent. Expire after one day.',
    market: {
      ethPriceUsd: 2_000,
      oracleUpdatedAt: Math.floor(Date.now() / 1000) - 15,
      blockTimestamp: Math.floor(Date.now() / 1000),
    },
  },
  {
    apiKey: env.GROQ_API_KEY,
    model: env.GROQ_MODEL,
  },
)

console.log(JSON.stringify({
  provider: result.meta.provider,
  model: result.meta.model,
  supported: result.plan.supported,
  action: result.plan.action,
  side: result.plan.side,
  amountMode: result.plan.amountMode,
}, null, 2))
