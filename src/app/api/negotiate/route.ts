export const maxDuration = 300 // allow up to 5 minutes for multi-round streaming on Vercel Pro

import type { SellerMandate, BuyerMandate, SellerOnboardingData, BuyerProfile } from "@/lib/agents/types"
import { runNegotiation, type NegotiationEvent, type ResumeState } from "@/lib/negotiation-engine"
import {
  DEMO_SELLER,
  DEMO_BUYER,
  DEMO_SELLER_MANDATE,
  DEMO_BUYER_MANDATE,
  buildDemoNegotiationState,
} from "@/lib/scenarios"
import { getCheckpoint, clearCheckpoint } from "@/lib/checkpoint-store"

interface RequestBody {
  sessionId?: string
  action?: "start" | "approve" | "reject"
  sellerData?: SellerOnboardingData
  buyerProfile?: BuyerProfile
  sellerMandate?: SellerMandate
  buyerMandate?: BuyerMandate
  maxRounds?: number
  demo?: boolean
  // Client sends this back on approve so the engine can resume without relying
  // on a server-side store (which doesn't survive Vercel serverless cold starts)
  resumeState?: ResumeState
}

export async function POST(req: Request): Promise<Response> {
  let body: RequestBody

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Reject action just closes the session — no stream needed
  if (body.action === "reject") {
    return Response.json({ status: "rejected" })
  }

  // Use demo data if requested or if mandates are missing
  const sessionId = body.sessionId || crypto.randomUUID()
  const sellerData = body.demo ? DEMO_SELLER : (body.sellerData || DEMO_SELLER)
  const buyerProfile = body.demo ? DEMO_BUYER : (body.buyerProfile || DEMO_BUYER)
  const sellerMandate = body.demo ? DEMO_SELLER_MANDATE : (body.sellerMandate || DEMO_SELLER_MANDATE)
  const buyerMandate = body.demo ? DEMO_BUYER_MANDATE : (body.buyerMandate || DEMO_BUYER_MANDATE)
  const maxRounds = body.maxRounds || 5

  // On approve: prefer the client-provided resumeState (works on serverless where
  // the in-memory store is wiped between requests), fall back to the store if not provided.
  let resumeState: ResumeState | undefined
  if (body.action === "approve") {
    if (body.resumeState) {
      resumeState = body.resumeState
    } else {
      const checkpoint = getCheckpoint(sessionId)
      if (checkpoint) {
        clearCheckpoint(sessionId)
        resumeState = {
          proposals: checkpoint.proposals,
          round: checkpoint.round,
          nextTurn: checkpoint.nextTurn,
        }
      }
    }
  }

  // SSE streaming response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: NegotiationEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`
        controller.enqueue(encoder.encode(data))
      }

      try {
        await runNegotiation({
          sessionId,
          sellerData,
          buyerProfile,
          sellerMandate,
          buyerMandate,
          maxRounds,
          onEvent: sendEvent,
          resumeState,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : "Negotiation failed"
        sendEvent({ type: "error", round: 0, message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get("sessionId")

  if (!sessionId) {
    return Response.json({ error: "sessionId is required" }, { status: 400 })
  }

  // Return demo state for now
  return Response.json(buildDemoNegotiationState(sessionId))
}
