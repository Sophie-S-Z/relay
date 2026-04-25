# Relay — AI-Powered M&A Negotiation Platform

**Live demo:** [relay-eight-silk.vercel.app](https://relay-eight-silk.vercel.app)

Relay replaces the traditional M&A broker with a dual-agent AI system. Two isolated AI agents — one representing the seller, one the buyer — negotiate a business acquisition in real time. Neither agent can see the other's confidential mandate. Humans stay in control at every critical moment through mandatory checkpoints and configurable alert thresholds.

Built for the CloudTrack Pro hackathon demo: a $1.2M ARR B2B SaaS company seeking acquisition.

---

## What it does

**For sellers** — onboard your company, get an AI-generated valuation memo, set your mandate (floor price, hard nos, transition limits), and configure threshold alerts so you're notified the moment the buyer crosses a price you care about.

**For buyers** — review the CIM, sign the NDA, qualify your acquisition criteria, and let your AI agent negotiate while you watch the live timeline. You approve the opening offer before the seller ever sees it.

**The negotiation engine** runs up to 5 rounds of structured LOI proposals. Each agent reasons independently using the Vercel AI SDK and Claude, generating structured JSON proposals that cross the isolation boundary. The engine checks for information leakage between agents and retries if any confidential values appear in the wrong context.

**Human checkpoints** (PRD §5.3.3 — non-negotiable):
| Checkpoint | When it fires | Who approves |
|---|---|---|
| `pre_opening` | After buyer agent drafts Round 1 offer | Buyer — before seller sees it |
| `threshold` | A configured alert value is crossed | The party who set the alert |
| `escalate` | Agent detects out-of-mandate terms | The affected party |
| `pre_acceptance` | Both sides converge on a price | Both parties — before LOI is generated |

**Configurable threshold alerts** — each party can set conditions that pause negotiation and surface a human review panel. Demo defaults:
- Seller alerts: buyer reaches $3M · cash-at-close drops below 60% · earnout exceeds 20%
- Buyer alerts: seller drops to $3.1M · seller note exceeds 15% · single-round concession > $200K

**Fee comparison** — Relay charges 2.5% vs. the traditional broker rate of ~9%, shown live at deal close.

---

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16.2.4 (App Router) |
| AI | Vercel AI SDK v6 + Anthropic Claude (`claude-sonnet-4-5`) |
| Streaming | Server-Sent Events (SSE) via `ReadableStream` |
| Styling | Tailwind CSS v4 (`@theme inline` design tokens) |
| UI components | shadcn/ui + Recharts |
| Deployment | Vercel |

---

## Project structure

```
src/
  app/
    /                   Landing page
    /seller             Seller onboarding flow
    /seller/valuation   AI valuation memo
    /buyer/qualify      Buyer qualification
    /buyer/nda          NDA signing
    /buyer/cim          Confidential Information Memorandum
    /negotiate          Live negotiation timeline
    /deal               Deal summary & LOI preview
    /demo               God-mode view (both mandates visible)
    /api/negotiate      SSE streaming negotiation endpoint
  lib/
    agents/
      types.ts          All shared TypeScript interfaces
      seller-agent.ts   Seller-side LLM agent
      buyer-agent.ts    Buyer-side LLM agent
    negotiation-engine.ts   Orchestration loop with checkpoint logic
    checkpoint-store.ts     In-memory checkpoint state (resumable sessions)
    scenarios.ts            Pre-built CloudTrack Pro demo data
    concession.ts           Convergence scoring & gap analysis
    leak-detection.ts       Prevents confidential data crossing agent boundary
  hooks/
    use-negotiation.ts  React hook for SSE stream + UI state
```

---

## Running locally

**Prerequisites:** Node.js 18+, an [Anthropic API key](https://console.anthropic.com/)

```bash
git clone https://github.com/Sophie-S-Z/relay.git
cd relay
npm install
```

Create `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To run the full demo, navigate to `/negotiate` and click **Start AI Negotiation**. The buyer agent drafts a Round 1 offer, which pauses for your approval before it's sent to the seller. From there, approve or reject each checkpoint as the agents negotiate toward a deal.

---

## Deployment

The app is deployed on Vercel. To deploy your own instance:

1. Push this repo to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Add `ANTHROPIC_API_KEY` as an environment variable in the Vercel dashboard
4. Deploy — Vercel auto-detects Next.js and sets the correct build settings

> **Note:** The checkpoint store uses an in-memory Map. On Vercel's serverless runtime, each function invocation may get a fresh instance. For a production deployment, replace `src/lib/checkpoint-store.ts` with a Redis or KV-backed store (e.g. Vercel KV).

---

## Architecture notes

### Dual-agent isolation

Each agent call (`runSellerAgent`, `runBuyerAgent`) receives only the shared proposal history — never the opposing party's mandate. The confidential context (floor prices, walk-away points, risk concerns) is injected exclusively into each agent's system prompt server-side and never sent across the wire to the client.

### Resumable checkpoints

When the engine hits a checkpoint, it serializes `{ proposals, round, nextTurn }` into `checkpoint-store.ts` and returns an SSE `checkpoint` event to the client. On approval, the client POSTs `{ action: "approve", sessionId }` and the API rehydrates `resumeState` from the store, handing it back to `runNegotiation`, which picks up exactly where it left off.

### Convergence scoring

`calculateConvergenceScore` measures how close both sides are as a 0–100 percentage of the original asking price gap. The UI charts this in real time. `detectDeadlock` fires if three consecutive rounds show less than 1% movement.

---

## License

MIT
