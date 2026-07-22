import { loadEnv } from 'vite'
import { createGroqKeeperObservation } from '../api/_lib/groq-observer.js'
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

const observerResult = await createGroqKeeperObservation(
  {
    event: {
      orderId: '12',
      decision: 'execute',
      reason: 'trigger-ready',
      result: 'confirmed',
      blockTimestamp: Math.floor(Date.now() / 1000),
      expiry: Math.floor(Date.now() / 1000) + 3600,
      canExecute: true,
      transactionHash: '0x1234',
    },
  },
  { apiKey: env.GROQ_API_KEY, model: env.GROQ_MODEL },
)

console.log(JSON.stringify({
  provider: result.meta.provider,
  model: result.meta.model,
  supported: result.plan.supported,
  action: result.plan.action,
  side: result.plan.side,
  amountMode: result.plan.amountMode,
  observerSeverity: observerResult.observation.severity,
  observerAction: observerResult.observation.recommendedAction,
}, null, 2))
