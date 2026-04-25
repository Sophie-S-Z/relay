import { streamText } from "ai"
import { NEGOTIATION_MODEL, SYSTEM_PROMPT } from "@/lib/ai"
import { getSession, setSession } from "@/lib/session-store"
import type { AgentMessage } from "@/types"

export async function POST(req: Request) {
  const { messages, sessionId } = await req.json()

  const session = sessionId ? getSession(sessionId) : null

  const result = streamText({
    model: NEGOTIATION_MODEL,
    system: SYSTEM_PROMPT,
    messages,
    onFinish: ({ text }) => {
      if (session) {
        const msg: AgentMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: text,
          timestamp: new Date().toISOString(),
        }
        session.messages.push(msg)
        session.updatedAt = new Date().toISOString()
        setSession(session)
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
