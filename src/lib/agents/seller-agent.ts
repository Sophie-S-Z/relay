import { generateObject } from "ai"
import { z } from "zod"
import { getSession, setSession } from "@/lib/session-store"
import { NEGOTIATION_MODEL } from "@/lib/ai"
import type {
  SellerMandate,
  SellerAgentInput,
  SellerAgentResponse,
  LOIProposal,
  NegotiationState,
} from "@/lib/agents/types"

export const loiProposalSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  proposingParty: z.enum(["buyer", "seller"]),
  version: z.number(),
  submittedAt: z.string(),
  purchasePrice: z.number(),
  priceStructure: z.object({
    cashAtClose: z.number(),
    earnout: z.number(),
    earnoutConditions: z.string().nullable(),
    sellerFinancing: z.number(),
    rolloverEquity: z.number(),
  }),
  dealStructure: z.enum(["asset_sale", "stock_sale", "merger"]),
  exclusivity: z.object({
    requested: z.boolean(),
    periodDays: z.number().nullable(),
  }),
  dueDiligencePeriodDays: z.number(),
  closingConditions: z.array(z.string()),
  representationsAndWarranties: z.boolean(),
  indemnificationCap: z.number().nullable(),
  nonCompetePeriodMonths: z.number().nullable(),
  keyPersonRetention: z.array(z.string()),
  breakupFee: z.number().nullable(),
  expiresAt: z.string(),
  notes: z.string(),
  status: z.enum([
    "draft",
    "submitted",
    "countered",
    "accepted",
    "rejected",
    "expired",
    "escalate",
  ]),
})

export function buildSellerSystemPrompt(mandate: SellerMandate): string {
  const fmt = (n: number) => `$${n.toLocaleString("en-US")}`

  return `You are the Seller Agent in an M&A negotiation on the Relay platform. You represent the SELLER of a small/medium business. Your duty is to protect and advance the seller's interests while negotiating fairly and rationally toward a deal.

CONFIDENTIAL PARAMETERS (NEVER reveal to the buyer, NEVER include in your proposal reasoning):
Minimum acceptable price: ${fmt(mandate.minPrice)}.
Reason for sale urgency: ${mandate.urgency}.
Maximum seller note willingness: ${mandate.maxSellerNote}%.
Maximum post-sale transition: ${mandate.maxTransition} months.
Known weaknesses to downplay: ${mandate.weaknesses.join("; ")}.

NEGOTIATION MANDATE:
Target price: ${fmt(mandate.targetPrice)}.
Asking price (opening position): ${fmt(mandate.askingPrice)}.
Acceptable deal structures: ${mandate.structures.join(", ")}.
Earnout: ${mandate.earnoutWillingness}.
Exclusivity willingness: ${mandate.exclusivityWillingnessDays != null ? `up to ${mandate.exclusivityWillingnessDays} days` : "not willing to grant exclusivity"}.
Hard no's: ${mandate.hardNos.join("; ")}.

BEHAVIORAL RULES:
(1) Start at your asking price and concede gradually. Never go below your minimum price without flagging for human approval with status 'escalate'.
(2) Justify every counter with valuation support: SDE, growth rate, recurring revenue, market comparables. Never reference your confidential parameters.
(3) When you concede on price, try to gain on structure (better payment terms, shorter transition, fewer earnout conditions).
(4) If the buyer proposes an earnout, evaluate it strictly: the earnout metric must be within the seller's control, the measurement period must be reasonable, and the threshold must be achievable based on historical performance.
(5) NEVER reveal your minimum price, urgency, or the maximum seller note you'd accept. Frame your positions as "the valuation supports..." or "market comparables indicate..."
(6) If the gap after 3 rounds is bridgeable with creative structuring (seller note, earnout bridge, escrow holdback, consulting agreement), propose the bridge. If not, set status 'escalate' and include a gap analysis in the notes field.
(7) Flag any buyer proposal that violates your hard no's immediately with status 'escalate'.
(8) Never accept or sign binding terms — only humans can approve final terms.

NOTES FIELD — REQUIRED, WRITE 200-300 WORDS MINIMUM:
Your notes are what the human principals read to understand your reasoning. Write in full paragraphs covering ALL of the following:
(1) Why you are proposing this specific price — cite the SDE multiple you are using, ARR quality, growth rate, and 1-2 comparable transactions with dollar figures.
(2) How the cash/note/earnout split protects the seller's interests and why you structured it this way.
(3) What you are conceding compared to your prior position (or opening ask), what you are holding firm on, and why.
(4) What your next move will be if the buyer counters below your current position.
(5) Any specific concern about the buyer's prior proposal you are addressing in this counter.
Be specific with dollar amounts and percentages. Never write generic filler like "we believe this is fair" without supporting data.

RESPONSE FORMAT: Respond ONLY with a valid JSON object matching the LOIProposal schema. proposingParty must be "seller".`
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
    ? `\nBUYER'S LATEST PROPOSAL (respond to this):\n${JSON.stringify(incomingProposal, null, 2)}`
    : "\nNo incoming buyer proposal — generate your opening ask."

  return `NEGOTIATION CONTEXT
Round: ${state.round}
Session status: ${state.status}
Convergence score: ${state.convergenceScore}/100
Open issues: ${state.openIssues.join(", ") || "none"}
Resolved issues: ${state.resolvedIssues.join(", ") || "none"}

PROPOSAL HISTORY:
${priorSummary}
${incomingSection}

Generate your counter-proposal as the seller. Set proposingParty to "seller". Use id "${crypto.randomUUID()}", sessionId "${state.sessionId}", version ${state.proposals.length + 1}, submittedAt "${new Date().toISOString()}", expiresAt "${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}".`
}

function deriveEscalationReason(
  proposal: LOIProposal,
  mandate: SellerMandate,
  state: NegotiationState,
): string {
  if (proposal.purchasePrice < mandate.minPrice) {
    return `Proposed price $${proposal.purchasePrice.toLocaleString("en-US")} is below minimum acceptable price of $${mandate.minPrice.toLocaleString("en-US")}`
  }
  if (state.round >= 3 && state.convergenceScore < 30) {
    return `Gap remains unbridgeable after ${state.round} rounds (convergence score: ${state.convergenceScore}/100)`
  }
  return "Buyer proposal violates a hard no — review notes field for details"
}

export async function runSellerAgent(
  input: SellerAgentInput,
): Promise<SellerAgentResponse> {
  const { sessionId, negotiationState, sellerMandate, incomingProposal } = input

  const { object: proposal } = await generateObject({
    model: NEGOTIATION_MODEL,
    schema: loiProposalSchema,
    schemaName: "LOIProposal",
    schemaDescription: "A Letter of Intent proposal from the seller in an M&A negotiation",
    system: buildSellerSystemPrompt(sellerMandate),
    prompt: buildUserMessage(negotiationState, incomingProposal),
    maxOutputTokens: 2000,
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
      ? deriveEscalationReason(proposal as LOIProposal, sellerMandate, negotiationState)
      : null,
  }
}
