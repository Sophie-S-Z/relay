"use client"

import { useCallback, useRef, useState } from "react"
import type { NegotiationEvent } from "@/lib/negotiation-engine"
import type { LOIProposal } from "@/lib/agents/types"
import type { NegotiationSummary } from "@/lib/concession"

export type NegotiationStatus = "idle" | "running" | "checkpoint" | "agreed" | "complete" | "error"

export interface NegotiationUIState {
  sessionId?: string
  status: NegotiationStatus
  round: number
  proposals: LOIProposal[]
  convergenceHistory: { round: number; buyerPrice: number; sellerPrice: number; score: number }[]
  checkpointReason?: string
  summary?: NegotiationSummary
  error?: string
}

const INITIAL: NegotiationUIState = {
  status: "idle",
  round: 0,
  proposals: [],
  convergenceHistory: [],
}

export function useNegotiation() {
  const [state, setState] = useState<NegotiationUIState>(INITIAL)
  const streamAbortRef = useRef<AbortController | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  const start = useCallback((demo = true) => {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort()
    }

    const sessionId = crypto.randomUUID()
    sessionIdRef.current = sessionId
    setState({ ...INITIAL, sessionId, status: "running" })
    startStream({ demo, sessionId }, setState, streamAbortRef)
  }, [])

  const approveCheckpoint = useCallback(() => {
    const sessionId = sessionIdRef.current
    if (!sessionId) return

    setState(s => ({ ...s, status: "running", checkpointReason: undefined }))
    startStream({ demo: true, sessionId, action: "approve" }, setState, streamAbortRef)
  }, [])

  const rejectCheckpoint = useCallback(async () => {
    const sessionId = sessionIdRef.current
    if (sessionId) {
      await fetch("/api/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", sessionId }),
      }).catch(() => {})
    }

    setState(s => ({ ...s, status: "complete", checkpointReason: undefined }))
  }, [])

  const reset = useCallback(() => {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort()
      streamAbortRef.current = null
    }
    sessionIdRef.current = null
    setState(INITIAL)
  }, [])

  return { state, start, reset, approveCheckpoint, rejectCheckpoint }
}

function startStream(
  input: { demo: boolean; sessionId: string; action?: "start" | "approve" },
  setState: React.Dispatch<React.SetStateAction<NegotiationUIState>>,
  streamAbortRef: React.MutableRefObject<AbortController | null>,
) {
  const controller = new AbortController()
  streamAbortRef.current = controller

  fetch("/api/negotiate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: input.action || "start",
      demo: input.demo,
      maxRounds: 5,
      sessionId: input.sessionId,
    }),
    signal: controller.signal,
  }).then(async res => {
    if (!res.ok || !res.body) {
      setState(s => ({ ...s, status: "error", error: "Negotiation API failed" }))
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue
        try {
          const event: NegotiationEvent = JSON.parse(line.slice(6))
          handleEvent(event, setState)
        } catch {
          // skip malformed
        }
      }
    }
  }).catch(() => {
    if (!controller.signal.aborted) {
      setState(s => ({ ...s, status: "error", error: "Connection lost" }))
    }
  })
}

function handleEvent(
  event: NegotiationEvent,
  setState: React.Dispatch<React.SetStateAction<NegotiationUIState>>,
) {
  setState(prev => {
    const next = { ...prev, round: event.round }

    if (event.proposal) {
      next.proposals = [...prev.proposals, event.proposal]
    }

    if (event.convergenceData && event.proposal) {
      const existing = prev.convergenceHistory.find(h => h.round === event.round)
      if (!existing) {
        next.convergenceHistory = [
          ...prev.convergenceHistory,
          {
            round: event.round,
            buyerPrice: event.convergenceData.buyerPrice,
            sellerPrice: event.convergenceData.sellerPrice,
            score: event.convergenceScore ?? 0,
          },
        ]
      } else {
        next.convergenceHistory = prev.convergenceHistory.map(h =>
          h.round === event.round
            ? {
                round: event.round,
                buyerPrice: event.convergenceData!.buyerPrice,
                sellerPrice: event.convergenceData!.sellerPrice,
                score: event.convergenceScore ?? h.score,
              }
            : h,
        )
      }
    }

    switch (event.type) {
      case "proposal":
        next.status = "running"
        break
      case "checkpoint":
        next.status = "checkpoint"
        next.checkpointReason = event.checkpointReason
        break
      case "agreed":
        next.status = "agreed"
        next.summary = event.summary
        break
      case "complete":
        next.status = "complete"
        next.summary = event.summary
        break
      case "error":
        next.status = "error"
        next.error = event.message
        break
    }

    return next
  })
}
