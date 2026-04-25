import { createOpenAI } from "@ai-sdk/openai"

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// gpt-4o supports structured output (generateObject) and function calling
export const NEGOTIATION_MODEL = openai("gpt-4o")

export const SYSTEM_PROMPT = `You are a neutral M&A negotiation facilitator. Your role is to:
1. Analyze positions from both buyer and seller parties
2. Identify gaps and areas of potential convergence
3. Suggest fair compromise positions grounded in market precedent
4. Generate structured output for term sheets

Always reason step-by-step before proposing any position. Be concise, data-driven, and impartial.`
