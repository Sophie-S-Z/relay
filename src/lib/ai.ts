import { createAnthropic } from "@ai-sdk/anthropic"

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const NEGOTIATION_MODEL = anthropic("claude-sonnet-4-5")

export const SYSTEM_PROMPT = `You are a neutral M&A negotiation facilitator. Your role is to:
1. Analyze positions from both buyer and seller parties
2. Identify gaps and areas of potential convergence
3. Suggest fair compromise positions grounded in market precedent
4. Generate structured output for term sheets

Always reason step-by-step before proposing any position. Be concise, data-driven, and impartial.`
