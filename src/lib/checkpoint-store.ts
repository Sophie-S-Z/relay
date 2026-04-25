// ═══════════════════════════════════════════════════════════════
// Relay — Checkpoint Store
// Persists mid-negotiation state so the engine can resume after
// a human approves a checkpoint (pre-opening, threshold, escalate,
// or pre-acceptance).  In-memory for the hackathon MVP.
// ═══════════════════════════════════════════════════════════════

import type { LOIProposal } from "@/lib/agents/types"

export type CheckpointType = "pre_opening" | "threshold" | "escalate" | "pre_acceptance"

export interface ThresholdTrigger {
  party: "buyer" | "seller"
  condition: string       // Human-readable description of what tripped the alert
  triggeredValue: number  // The value that crossed the threshold
  thresholdValue: number  // The threshold that was configured
}

export interface CheckpointData {
  sessionId: string
  proposals: LOIProposal[]      // All proposals exchanged so far (including the triggering one)
  round: number                 // The round during which the checkpoint fired
  nextTurn: "buyer" | "seller" | "finalize"
  checkpointType: CheckpointType
  thresholdInfo?: ThresholdTrigger
}

const store = new Map<string, CheckpointData>()

export function storeCheckpoint(data: CheckpointData): void {
  store.set(data.sessionId, data)
}

export function getCheckpoint(sessionId: string): CheckpointData | undefined {
  return store.get(sessionId)
}

export function clearCheckpoint(sessionId: string): void {
  store.delete(sessionId)
}
