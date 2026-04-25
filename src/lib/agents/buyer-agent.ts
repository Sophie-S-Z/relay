import { generateObject } from "ai"
import { z } from "zod"
import { getSession, setSession } from "@/lib/session-store"
import { NEGOTIATION_MODEL } from "@/lib/ai"
import { loiProposalSchema } from "@/lib/agents/seller-agent"
import type { BuyerMandate, LOIProposal, NegotiationState } from "@/lib/agents/types"

export interface BuyerAgentInput {
  sessionId: string
  negotiationState: NegotiationState
  buyerMandate: BuyerMandate
  incomingProposal: LOIProposal | null  // null on the opening move (round 1)
}

export interface BuyerAgentResponse {
  proposal: LOIProposal
  requiresHumanReview: boolean
  escalationReason: string | null
}

export function buildBuyerSystemPrompt(mandate: BuyerMandate): string {
  const fmt = (n: number) => `$${n.toLocaleString("en-US")}`

  return `You are the Buyer Agent in an M&A negotiation on the Relay platform. You represent the BUYER seeking to acquire a small/medium business. Your duty is to protect and advance the buyer's interests while negotiating fairly and rationally toward a deal.

CONFIDENTIAL PARAMETERS (NEVER reveal to the seller, NEVER include in your proposal reasoning):
Maximum willingness to pay: ${fmt(mandate.maxPrice)}.
Preferred deal structure: ${mandate.preferredStructure}.
Alternative deals under consideration: ${mandate.alternatives}.
Timeline flexibility: ${mandate.timelineFlex}.
Risk concerns identified in CIM: ${mandate.riskConcerns.join("; ")}.

NEGOTIATION MANDATE:
Opening offer range: ${fmt(mandate.openingRange.low)} – ${fmt(mandate.openingRange.high)}.
Financing capacity: ${mandate.financingCapacity}.
Earnout preference: ${mandate.earnoutPreference}.
Due diligence period needed: ${mandate.ddPeriodDays} days.
Exclusivity desired: ${mandate.exclusivityDays} days.
Target closing timeline: ${mandate.closingTimelineDays} days from LOI signing.
Hard constraints: ${mandate.hardConstraints.join("; ")}.

BEHAVIORAL RULES:
(1) Open with a reasonable but favorable offer based on your CIM review. Cite specific risks or adjustments to justify a lower opening price.
(2) Concede gradually toward your maximum. Never exceed your maximum price without flagging for human approval with status 'escalate'.
(3) When you concede on price, try to gain on risk mitigation: longer due diligence, earnout tied to performance, seller note with favorable terms.
(4) Use the CIM data to justify your positions: customer concentration, owner dependency, margin trends, revenue quality.
(5) NEVER reveal your maximum budget, preferred structure details, or alternative deals. Frame your positions as "based on our analysis of the financials..." or "comparable transactions suggest..."
(6) If you can bridge a price gap with an earnout or seller note, propose it with specific terms.
(7) Flag any seller requirement that conflicts with your hard constraints immediately with status 'escalate'.
(8) Never accept or sign binding terms — only humans can approve final terms.

RESPONSE FORMAT: Respond ONLY with a valid JSON object matching the LOIProposal schema. proposingParty must be "buyer". Include clear reasoning in the notes field that justifies your position WITHOUT revealing confidential parameters.`
}

function buildUserMessage(
  state: NegotiationState,
  incomingProposal: LOIProposal | null,
): string {
  const priorSummary =
    state.proposals.length === 0
      ? "No prior proposals — this is the opening move."
      : state.proposals
          .map(
            (p, i) =>
              `Round ${i + 1}: ${p.proposingParty} proposed $${p.purchasePrice.toLocaleString("en-US")} (status: ${p.status})`,
          )
          .join("\n")

  const incomingSection = incomingProposal
    ? `\nSELLER'S LATEST PROPOSAL (respond to this):\n${JSON.stringify(incomingProposal, null, 2)}`
    : "\nNo incoming seller proposal — generate your opening offer."

  return `NEGOTIATION CONTEXT
Round: ${state.round}
Session status: ${state.status}
Convergence score: ${state.convergenceScore}/100
Open issues: ${state.openIssues.join(", ") || "none"}
Resolved issues: ${state.resolvedIssues.join(", ") || "none"}

PROPOSAL HISTORY:
${priorSummary}
${incomingSection}

Generate your counter-proposal as the buyer. Set proposingParty to "buyer". Use id "${crypto.randomUUID()}", sessionId "${state.sessionId}", version ${state.proposals.length + 1}, submittedAt "${new Date().toISOString()}", expiresAt "${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}".`
}

function deriveEscalationReason(
  proposal: LOIProposal,
  mandate: BuyerMandate,
  state: NegotiationState,
): string {
  if (proposal.purchasePrice > mandate.maxPrice) {
    return `Proposed price $${proposal.purchasePrice.toLocaleString("en-US")} exceeds maximum willingness to pay of $${mandate.maxPrice.toLocaleString("en-US")}`
  }
  if (state.round >= 3 && state.convergenceScore < 30) {
    return `Gap remains unbridgeable after ${state.round} rounds (convergence score: ${state.convergenceScore}/100)`
  }
  return "Seller proposal conflicts with a hard constraint — review notes field for details"
}

export async function runBuyerAgent(
  input: BuyerAgentInput,
): Promise<BuyerAgentResponse> {
  const { sessionId, negotiationState, buyerMandate, incomingProposal } = input

  const { object: proposal } = await generateObject({
    model: NEGOTIATION_MODEL,
    schema: loiProposalSchema,
    schemaName: "LOIProposal",
    schemaDescription: "A Letter of Intent proposal from the buyer in an M&A negotiation",
    system: buildBuyerSystemPrompt(buyerMandate),
    prompt: buildUserMessage(negotiationState, incomingProposal),
  })

  const session = getSession(sessionId)
  if (session) {
    session.updatedAt = new Date().toISOString()
    setSession(session)
  }

  const requiresHumanReview = proposal.status === "escalate"
  return {
    proposal: proposal as LOIProposal,
    requiresHumanReview,
    escalationReason: requiresHumanReview
      ? deriveEscalationReason(proposal as LOIProposal, buyerMandate, negotiationState)
      : null,
  }
}
