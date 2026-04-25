// ═══════════════════════════════════════════════════════════════
// Relay — Negotiation Orchestrator
// Runs the multi-agent negotiation loop with SSE streaming.
//
// Human checkpoints (PRD §5.3.3 — non-negotiable):
//   1. pre_opening   — buyer approves their Round 1 offer before seller sees it
//   2. threshold     — a user-configured price/structure alert fires
//   3. escalate      — an agent flags out-of-mandate for human approval
//   4. pre_acceptance — both humans approve before the LOI is finalized
// ═══════════════════════════════════════════════════════════════

import type {
  LOIProposal,
  NegotiationState,
  SellerMandate,
  BuyerMandate,
} from "@/lib/agents/types"

import { runSellerAgent } from "@/lib/agents/seller-agent"
import { runBuyerAgent } from "@/lib/agents/buyer-agent"
import {
  calculateConvergence,
  calculateConvergenceScore,
  detectDeadlock,
  generateGapAnalysis,
  generateSummary,
  type ConvergenceData,
  type GapAnalysis,
  type NegotiationSummary,
} from "@/lib/concession"
import { detectLeak, sanitizeReasoning } from "@/lib/leak-detection"
import {
  storeCheckpoint,
  type CheckpointType,
  type ThresholdTrigger,
} from "@/lib/checkpoint-store"

// ─── SSE EVENT TYPES ──────────────────────────────────────────

export interface NegotiationEvent {
  type: "proposal" | "checkpoint" | "deadlock" | "agreed" | "complete" | "error"
  round: number
  agent?: "buyer" | "seller"
  proposal?: LOIProposal
  convergenceData?: ConvergenceData
  convergenceScore?: number
  checkpointReason?: string
  checkpointType?: CheckpointType
  checkpointNextTurn?: "buyer" | "seller" | "finalize"
  thresholdInfo?: ThresholdTrigger
  gapAnalysis?: GapAnalysis
  summary?: NegotiationSummary
  message?: string
}

// ─── ORCHESTRATOR CONFIG ──────────────────────────────────────

export interface ResumeState {
  proposals: LOIProposal[]
  round: number
  nextTurn: "buyer" | "seller" | "finalize"
}

export interface OrchestratorConfig {
  sessionId: string
  sellerData: NegotiationState["sellerData"]
  buyerProfile: NegotiationState["buyerProfile"]
  sellerMandate: SellerMandate
  buyerMandate: BuyerMandate
  maxRounds: number
  onEvent: (event: NegotiationEvent) => void
  resumeState?: ResumeState
}

// ─── RUN NEGOTIATION ──────────────────────────────────────────

export async function runNegotiation(config: OrchestratorConfig): Promise<void> {
  const {
    sessionId,
    sellerData,
    buyerProfile,
    sellerMandate,
    buyerMandate,
    maxRounds,
    onEvent,
    resumeState,
  } = config

  // ── Handle finalize resume (pre_acceptance checkpoint approved) ──
  if (resumeState?.nextTurn === "finalize") {
    const startTime = Date.now() - 60_000  // approximate
    emitFinal("agreed", resumeState.proposals, sellerMandate, buyerMandate, startTime, resumeState.round, onEvent)
    return
  }

  const startTime = Date.now()
  const proposals: LOIProposal[] = resumeState?.proposals ? [...resumeState.proposals] : []

  // When resuming:
  //   nextTurn === "seller" → restart same round, skip buyer (buyer already ran)
  //   nextTurn === "buyer"  → advance to next round (seller already ran in stored round)
  const startRound = resumeState
    ? (resumeState.nextTurn === "buyer" ? resumeState.round + 1 : resumeState.round)
    : 1
  const skipBuyerInStartRound = resumeState?.nextTurn === "seller"

  // Confidential values for leak detection
  const sellerConfidentialValues = [sellerMandate.minPrice]
  const buyerConfidentialValues = [buyerMandate.maxPrice]

  for (let round = startRound; round <= maxRounds; round++) {

    // Build shared state (proposals only — NO confidential data from either side)
    const sharedState: NegotiationState = {
      sessionId,
      round,
      status: "active",
      sellerData,
      buyerProfile,
      valuation: null,
      proposals: [...proposals],
      activeProposalId: null,
      agreedTerms: null,
      openIssues: [],
      resolvedIssues: [],
      agentMessages: [],
      convergenceScore: calculateConvergenceScore(proposals, sellerMandate.askingPrice),
      lastActivityAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }

    // ─── BUYER TURN ─────────────────────────────────────
    const shouldSkipBuyer = round === startRound && skipBuyerInStartRound

    if (!shouldSkipBuyer) {
      const lastSellerProposal =
        [...proposals].reverse().find(p => p.proposingParty === "seller") || null

      let buyerResult = await callWithRetry(
        () => runBuyerAgent({
          sessionId,
          negotiationState: sharedState,
          buyerMandate,
          incomingProposal: lastSellerProposal,
        }),
        "buyer",
        buyerConfidentialValues,
      )

      buyerResult.proposal.version = proposals.length + 1
      buyerResult.proposal.proposingParty = "buyer"
      buyerResult.proposal.sessionId = sessionId

      proposals.push(buyerResult.proposal)
      const buyerConv = calculateConvergence(proposals)
      const buyerScore = calculateConvergenceScore(proposals, sellerMandate.askingPrice)

      // Always emit the proposal so it appears in the timeline
      onEvent({
        type: "proposal",
        round,
        agent: "buyer",
        proposal: buyerResult.proposal,
        convergenceData: buyerConv,
        convergenceScore: buyerScore,
      })

      // ── CHECKPOINT 1: Pre-opening (Round 1, fresh start) ──────
      if (round === 1 && !resumeState) {
        storeCheckpoint({
          sessionId,
          proposals: [...proposals],
          round,
          nextTurn: "seller",
          checkpointType: "pre_opening",
        })
        onEvent({
          type: "checkpoint",
          round,
          checkpointNextTurn: "seller",
          agent: "buyer",
          convergenceScore: buyerScore,
          checkpointType: "pre_opening",
          checkpointReason:
            `Your buyer agent has drafted an opening offer at $${buyerResult.proposal.purchasePrice.toLocaleString("en-US")}. Review the terms and approve to send to the seller.`,
        })
        return
      }

      // ── CHECKPOINT 2: User threshold (seller watching buyer) ──
      const prevBuyerProposal =
        proposals.slice(0, -1).reverse().find(p => p.proposingParty === "buyer") || null
      const sellerThreshold = checkSellerThresholds(buyerResult.proposal, sellerMandate, prevBuyerProposal)
      if (sellerThreshold) {
        storeCheckpoint({
          sessionId,
          proposals: [...proposals],
          round,
          nextTurn: "seller",
          checkpointType: "threshold",
          thresholdInfo: sellerThreshold,
        })
        onEvent({
          type: "checkpoint",
          round,
          checkpointNextTurn: "seller",
          agent: "buyer",
          convergenceData: buyerConv,
          convergenceScore: buyerScore,
          checkpointType: "threshold",
          thresholdInfo: sellerThreshold,
          checkpointReason: sellerThreshold.condition,
        })
        return
      }

      // ── CHECKPOINT 3: Pre-acceptance (buyer accepted seller's terms) ──
      if (buyerResult.proposal.status === "accepted") {
        storeCheckpoint({
          sessionId,
          proposals: [...proposals],
          round,
          nextTurn: "finalize",
          checkpointType: "pre_acceptance",
        })
        onEvent({
          type: "checkpoint",
          round,
          checkpointNextTurn: "finalize",
          agent: "buyer",
          convergenceData: buyerConv,
          convergenceScore: buyerScore,
          checkpointType: "pre_acceptance",
          checkpointReason:
            `Both sides have converged. Buyer's agent is ready to accept the deal at $${buyerResult.proposal.purchasePrice.toLocaleString("en-US")}. Both parties must approve before the LOI is generated.`,
        })
        return
      }

      // ── CHECKPOINT 4: Escalate (buyer exceeded mandate) ───────
      if (buyerResult.requiresHumanReview) {
        storeCheckpoint({
          sessionId,
          proposals: [...proposals],
          round,
          nextTurn: "seller",
          checkpointType: "escalate",
        })
        onEvent({
          type: "checkpoint",
          round,
          checkpointNextTurn: "seller",
          agent: "buyer",
          convergenceData: buyerConv,
          convergenceScore: buyerScore,
          checkpointType: "escalate",
          checkpointReason: buyerResult.escalationReason ||
            "Buyer agent flagged this for human review — the proposed terms are outside pre-authorized range.",
        })
        return
      }
    }

    // ─── Update shared state with buyer's proposal ──────────────
    const lastBuyerProposal =
      [...proposals].reverse().find(p => p.proposingParty === "buyer") || null
    sharedState.proposals = [...proposals]
    sharedState.convergenceScore = calculateConvergenceScore(proposals, sellerMandate.askingPrice)

    // ─── SELLER TURN ────────────────────────────────────
    let sellerResult = await callWithRetry(
      () => runSellerAgent({
        sessionId,
        negotiationState: sharedState,
        sellerMandate,
        incomingProposal: lastBuyerProposal,
      }),
      "seller",
      sellerConfidentialValues,
    )

    sellerResult.proposal.version = proposals.length + 1
    sellerResult.proposal.proposingParty = "seller"
    sellerResult.proposal.sessionId = sessionId

    proposals.push(sellerResult.proposal)
    const sellerConv = calculateConvergence(proposals)
    const sellerScore = calculateConvergenceScore(proposals, sellerMandate.askingPrice)

    // Always emit the proposal
    onEvent({
      type: "proposal",
      round,
      agent: "seller",
      proposal: sellerResult.proposal,
      convergenceData: sellerConv,
      convergenceScore: sellerScore,
    })

    // ── CHECKPOINT: User threshold (buyer watching seller) ──────
    const prevSellerProposal =
      proposals.slice(0, -1).reverse().find(p => p.proposingParty === "seller") || null
    const buyerThreshold = checkBuyerThresholds(sellerResult.proposal, buyerMandate, prevSellerProposal)
    if (buyerThreshold) {
      storeCheckpoint({
        sessionId,
        proposals: [...proposals],
        round,
        nextTurn: "buyer",
        checkpointType: "threshold",
        thresholdInfo: buyerThreshold,
      })
      onEvent({
        type: "checkpoint",
        round,
        checkpointNextTurn: "buyer",
        agent: "seller",
        convergenceData: sellerConv,
        convergenceScore: sellerScore,
        checkpointType: "threshold",
        thresholdInfo: buyerThreshold,
        checkpointReason: buyerThreshold.condition,
      })
      return
    }

    // ── CHECKPOINT: Pre-acceptance (seller accepted buyer's terms) ──
    if (sellerResult.proposal.status === "accepted") {
      storeCheckpoint({
        sessionId,
        proposals: [...proposals],
        round,
        nextTurn: "finalize",
        checkpointType: "pre_acceptance",
      })
      onEvent({
        type: "checkpoint",
        round,
        checkpointNextTurn: "finalize",
        agent: "seller",
        convergenceData: sellerConv,
        convergenceScore: sellerScore,
        checkpointType: "pre_acceptance",
        checkpointReason:
          `Seller's agent is ready to accept the deal at $${sellerResult.proposal.purchasePrice.toLocaleString("en-US")}. Both parties must approve before the LOI is generated.`,
      })
      return
    }

    // ── CHECKPOINT: Escalate (seller exceeded mandate) ───────────
    if (sellerResult.requiresHumanReview) {
      storeCheckpoint({
        sessionId,
        proposals: [...proposals],
        round,
        nextTurn: "buyer",
        checkpointType: "escalate",
      })
      onEvent({
        type: "checkpoint",
        round,
        checkpointNextTurn: "buyer",
        agent: "seller",
        convergenceData: sellerConv,
        convergenceScore: sellerScore,
        checkpointType: "escalate",
        checkpointReason: sellerResult.escalationReason ||
          "Seller agent flagged this for human review — the proposed terms are outside pre-authorized range.",
      })
      return
    }

    // ─── DEADLOCK CHECK ─────────────────────────────────
    if (detectDeadlock(proposals)) {
      const gapAnalysis = generateGapAnalysis(proposals, sellerMandate, buyerMandate)
      onEvent({
        type: "deadlock",
        round,
        gapAnalysis,
        convergenceData: sellerConv,
        message: `Negotiation stalled. Parties are $${gapAnalysis.priceGap.toLocaleString()} apart.`,
      })
      emitFinal("complete", proposals, sellerMandate, buyerMandate, startTime, round, onEvent)
      return
    }
  }

  // Max rounds reached
  emitFinal("complete", proposals, sellerMandate, buyerMandate, startTime, maxRounds, onEvent)
}

// ─── EMIT FINAL SUMMARY ──────────────────────────────────────

function emitFinal(
  type: "agreed" | "complete",
  proposals: LOIProposal[],
  sellerMandate: SellerMandate,
  buyerMandate: BuyerMandate,
  startTime: number,
  round: number,
  onEvent: (event: NegotiationEvent) => void,
) {
  const summary = generateSummary(proposals, sellerMandate, buyerMandate, startTime)
  const lastProposal = proposals[proposals.length - 1]

  onEvent({
    type,
    round,
    proposal: lastProposal,
    convergenceData: calculateConvergence(proposals),
    convergenceScore: summary.convergenceScore,
    summary,
    message: type === "agreed"
      ? "Deal reached!"
      : `Negotiation completed after ${round} rounds`,
  })
}

// ─── THRESHOLD CHECKS ─────────────────────────────────────────

function checkSellerThresholds(
  buyerProposal: LOIProposal,
  sellerMandate: SellerMandate,
  prevBuyerProposal: LOIProposal | null,
): ThresholdTrigger | null {
  const t = sellerMandate.thresholds
  if (!t) return null

  // Alert when buyer's price climbs to the seller's watch value
  if (
    t.alertWhenBuyerReaches !== undefined &&
    buyerProposal.purchasePrice >= t.alertWhenBuyerReaches &&
    (prevBuyerProposal === null || prevBuyerProposal.purchasePrice < t.alertWhenBuyerReaches)
  ) {
    return {
      party: "seller",
      condition: `The buyer's offer reached $${buyerProposal.purchasePrice.toLocaleString("en-US")} — you set a review alert at $${t.alertWhenBuyerReaches.toLocaleString("en-US")}. Do you want to accept, counter, or let your agent continue?`,
      triggeredValue: buyerProposal.purchasePrice,
      thresholdValue: t.alertWhenBuyerReaches,
    }
  }

  // Alert if cash-at-close % drops below threshold
  if (t.alertIfCashBelowPct !== undefined && buyerProposal.purchasePrice > 0) {
    const cashPct = (buyerProposal.priceStructure.cashAtClose / buyerProposal.purchasePrice) * 100
    if (cashPct < t.alertIfCashBelowPct) {
      return {
        party: "seller",
        condition: `Buyer's proposed cash at close is ${cashPct.toFixed(0)}%, below your minimum of ${t.alertIfCashBelowPct}%. Review before your agent responds.`,
        triggeredValue: cashPct,
        thresholdValue: t.alertIfCashBelowPct,
      }
    }
  }

  // Alert if earnout % exceeds threshold
  if (t.alertIfEarnoutAbovePct !== undefined && buyerProposal.purchasePrice > 0) {
    const earnoutPct = (buyerProposal.priceStructure.earnout / buyerProposal.purchasePrice) * 100
    if (earnoutPct > t.alertIfEarnoutAbovePct) {
      return {
        party: "seller",
        condition: `Earnout component is ${earnoutPct.toFixed(0)}% of the deal, exceeding your alert threshold of ${t.alertIfEarnoutAbovePct}%. This is more performance-contingent than you preferred.`,
        triggeredValue: earnoutPct,
        thresholdValue: t.alertIfEarnoutAbovePct,
      }
    }
  }

  return null
}

function checkBuyerThresholds(
  sellerProposal: LOIProposal,
  buyerMandate: BuyerMandate,
  prevSellerProposal: LOIProposal | null,
): ThresholdTrigger | null {
  const t = buyerMandate.thresholds
  if (!t) return null

  // Alert when seller's ask falls to the buyer's watch value
  if (
    t.alertWhenSellerReaches !== undefined &&
    sellerProposal.purchasePrice <= t.alertWhenSellerReaches &&
    (prevSellerProposal === null || prevSellerProposal.purchasePrice > t.alertWhenSellerReaches)
  ) {
    return {
      party: "buyer",
      condition: `The seller's ask has dropped to $${sellerProposal.purchasePrice.toLocaleString("en-US")} — you set a review alert at $${t.alertWhenSellerReaches.toLocaleString("en-US")}. Do you want to accept, counter directly, or let your agent continue?`,
      triggeredValue: sellerProposal.purchasePrice,
      thresholdValue: t.alertWhenSellerReaches,
    }
  }

  // Alert if seller note % exceeds threshold
  if (t.alertIfSellerNoteAbovePct !== undefined && sellerProposal.purchasePrice > 0) {
    const sellerNotePct = (sellerProposal.priceStructure.sellerFinancing / sellerProposal.purchasePrice) * 100
    if (sellerNotePct > t.alertIfSellerNoteAbovePct) {
      return {
        party: "buyer",
        condition: `Seller is proposing ${sellerNotePct.toFixed(0)}% seller financing, above your comfort threshold of ${t.alertIfSellerNoteAbovePct}%. This increases your leverage risk.`,
        triggeredValue: sellerNotePct,
        thresholdValue: t.alertIfSellerNoteAbovePct,
      }
    }
  }

  // Alert if a single concession exceeds the threshold
  if (t.alertIfConcessionAbove !== undefined && prevSellerProposal !== null) {
    const concession = prevSellerProposal.purchasePrice - sellerProposal.purchasePrice
    if (concession > t.alertIfConcessionAbove) {
      return {
        party: "buyer",
        condition: `Seller just dropped $${concession.toLocaleString("en-US")} in a single round (above your $${t.alertIfConcessionAbove.toLocaleString("en-US")} concession alert). This may signal flexibility — consider whether to push further or close.`,
        triggeredValue: concession,
        thresholdValue: t.alertIfConcessionAbove,
      }
    }
  }

  return null
}

// ─── RETRY WITH LEAK DETECTION ────────────────────────────────

async function callWithRetry<T extends { proposal: LOIProposal; requiresHumanReview: boolean; escalationReason: string | null }>(
  fn: () => Promise<T>,
  role: "buyer" | "seller",
  confidentialValues: number[],
  maxRetries: number = 3,
): Promise<T> {
  let attempts = 0

  while (attempts < maxRetries) {
    try {
      const result = await fn()

      const reasoning = result.proposal.notes || ""
      const leakCheck = detectLeak(reasoning, role, confidentialValues)

      if (leakCheck.leaked) {
        console.warn(`[LEAK DETECTED] ${role} agent: ${leakCheck.matches.join(", ")}`)
        result.proposal.notes = sanitizeReasoning(reasoning, role)
        return result
      }

      return result
    } catch (error) {
      attempts++
      if (attempts >= maxRetries) throw error
      await new Promise(r => setTimeout(r, 1000 * attempts))
    }
  }

  throw new Error(`Agent call failed after ${maxRetries} attempts`)
}
