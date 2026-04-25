"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowRight, Play, RotateCcw, CheckCircle, Clock, Zap,
  AlertCircle, ChevronDown, ChevronUp, TrendingDown
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { useNegotiation } from "@/hooks/use-negotiation"
import type { LOIProposal } from "@/lib/agents/types"
import { useState } from "react"
import Link from "next/link"

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`
}

function TermPill({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "buyer" | "seller" }) {
  const bg = accent === "buyer" ? "bg-sky/50 border-sky" : accent === "seller" ? "bg-lime/20 border-lime/50" : "bg-secondary border-border"
  const val = accent === "buyer" ? "text-foreground" : accent === "seller" ? "text-foreground" : "text-foreground"
  return (
    <div className={`px-3 py-2 rounded-xl border ${bg}`}>
      <div className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">{label}</div>
      <div className={`text-sm font-semibold font-mono ${val}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  )
}

function ProposalCard({ proposal, index }: { proposal: LOIProposal; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const isBuyer = proposal.proposingParty === "buyer"
  const round = Math.floor(index / 2) + 1
  const isAccepted = proposal.status === "accepted"
  const isEscalate = proposal.status === "escalate"

  return (
    <div className={`relative flex ${isBuyer ? "justify-start" : "justify-end"}`}>
      <div className="absolute left-[18px] top-8 bottom-0 w-px bg-border -z-0" aria-hidden />

      <div className={`w-[calc(100%-32px)] rounded-2xl border p-4 relative bg-card ${
        isBuyer ? "border-border" : "border-border ml-8"
      } ${isAccepted ? "ring-2 ring-lime shadow-sm" : ""}
        ${isEscalate ? "ring-2 ring-amber-300" : ""}`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-foreground text-xs font-bold flex-shrink-0 ${isBuyer ? "bg-sky" : "bg-lime"}`}>
              {isBuyer ? "B" : "S"}
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground">
                {isBuyer ? "Apex Growth Partners" : "Sarah Chen · CloudTrack Pro"}
                <span className="ml-1.5 text-muted-foreground font-normal">Round {round}</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {isBuyer ? "Buyer Agent" : "Seller Agent"}
                {isAccepted && <span className="ml-1.5 text-foreground font-medium">· Accepted</span>}
                {isEscalate && <span className="ml-1.5 text-amber-600 font-medium">· Needs Review</span>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xl font-bold font-mono text-foreground`}>
              {fmt(proposal.purchasePrice)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <TermPill
            label="Cash at Close"
            value={fmt(proposal.priceStructure.cashAtClose)}
            sub={pct(proposal.priceStructure.cashAtClose / proposal.purchasePrice)}
            accent={isBuyer ? "buyer" : "seller"}
          />
          {proposal.priceStructure.earnout > 0 && (
            <TermPill
              label="Earnout"
              value={fmt(proposal.priceStructure.earnout)}
              sub={pct(proposal.priceStructure.earnout / proposal.purchasePrice)}
            />
          )}
          {proposal.priceStructure.sellerFinancing > 0 && (
            <TermPill
              label="Seller Note"
              value={fmt(proposal.priceStructure.sellerFinancing)}
              sub={pct(proposal.priceStructure.sellerFinancing / proposal.purchasePrice)}
            />
          )}
          <TermPill label="Structure" value={proposal.dealStructure.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())} />
          <TermPill label="DD Period" value={`${proposal.dueDiligencePeriodDays}d`} />
          {proposal.exclusivity.requested && proposal.exclusivity.periodDays && (
            <TermPill label="Exclusivity" value={`${proposal.exclusivity.periodDays}d`} />
          )}
        </div>

        {proposal.notes && (
          <div className="mt-3 border-t border-border pt-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-foreground/70 transition-colors w-full text-left"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5 flex-shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />}
              {expanded ? "Hide" : "Show"} agent reasoning
            </button>
            {expanded && (
              <div
                className="mt-2 text-xs text-muted-foreground leading-relaxed bg-secondary rounded-xl p-3 border border-border"
                style={{ maxHeight: "20rem", overflowY: "scroll" }}
              >
                {proposal.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function NegotiatePage() {
  const router = useRouter()
  const { state, start, reset, approveCheckpoint, rejectCheckpoint } = useNegotiation()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (state.proposals.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [state.proposals.length])

  const isRunning = state.status === "running"
  const isDone = state.status === "agreed" || state.status === "complete"
  const isAgreed = state.status === "agreed"

  const latestBuyer = [...state.proposals].reverse().find(p => p.proposingParty === "buyer")
  const latestSeller = [...state.proposals].reverse().find(p => p.proposingParty === "seller")
  const gap = latestSeller && latestBuyer ? latestSeller.purchasePrice - latestBuyer.purchasePrice : null
  const gapPct = gap !== null && latestSeller ? (gap / latestSeller.purchasePrice) * 100 : null

  const latestScore = state.convergenceHistory[state.convergenceHistory.length - 1]?.score ?? 0

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-lime flex items-center justify-center text-foreground font-bold text-sm">R</div>
              <span className="font-semibold text-foreground">Relay</span>
            </Link>
            <span className="text-border">·</span>
            <span className="text-sm text-muted-foreground">CloudTrack Pro</span>
          </div>
          <div className="flex items-center gap-2.5">
            {isRunning && (
              <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
                Agents active
              </div>
            )}
            {isAgreed && <Badge className="bg-lime/30 text-foreground border-lime/50 rounded-full text-xs">Deal reached</Badge>}
            <Button variant="ghost" size="sm" onClick={() => router.push("/demo")} className="text-xs text-muted-foreground h-8">
              God-mode →
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="grid grid-cols-3 gap-5">

          {/* ── LEFT: Timeline ── */}
          <div className="col-span-2 space-y-3">

            {state.status === "idle" && (
              <div className="bg-card border border-border rounded-2xl p-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-lime flex items-center justify-center mx-auto mb-5">
                  <Zap className="h-7 w-7 text-foreground" />
                </div>
                <h2 className="text-lg font-bold text-foreground mb-2">Ready to negotiate</h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto leading-relaxed">
                  Two AI agents will negotiate the acquisition of CloudTrack Pro. Neither can see the other&apos;s confidential parameters.
                </p>
                <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mb-7 text-xs">
                  <div className="p-3 bg-lime/20 rounded-xl border border-lime/30 text-left">
                    <div className="font-semibold text-foreground mb-1.5">Seller</div>
                    <div className="text-foreground/80">Sarah Chen</div>
                    <div className="text-muted-foreground font-mono mt-0.5">Ask $3.78M</div>
                  </div>
                  <div className="p-3 bg-sky/50 rounded-xl border border-sky text-left">
                    <div className="font-semibold text-foreground mb-1.5">Buyer</div>
                    <div className="text-foreground/80">James Park</div>
                    <div className="text-muted-foreground font-mono mt-0.5">Opens $2.4–2.7M</div>
                  </div>
                </div>
                <Button
                  onClick={() => start(true)}
                  className="bg-foreground hover:bg-foreground/90 text-background gap-2 h-10 px-7 rounded-full"
                >
                  <Play className="h-3.5 w-3.5" /> Start AI Negotiation
                </Button>
              </div>
            )}

            {state.proposals.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold text-foreground">Negotiation Timeline</h2>
                  <span className="text-xs text-muted-foreground">{Math.ceil(state.proposals.length / 2)} rounds · {state.proposals.length} proposals</span>
                </div>

                {state.proposals.map((p, i) => (
                  <ProposalCard key={p.id || i} proposal={p} index={i} />
                ))}

                {isRunning && (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                    <div className="flex gap-0.5">
                      {[0, 150, 300].map(d => (
                        <div key={d} className="w-1.5 h-1.5 rounded-full bg-lime/60 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                    <span className="text-xs">Agent formulating response...</span>
                  </div>
                )}

                {state.status === "checkpoint" && (
                  <div className="bg-card border-2 border-lime/50 rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-sm mb-1">Human Approval Required</h3>
                        <p className="text-sm text-muted-foreground mb-4">{state.checkpointReason ?? "An agent has flagged this for review."}</p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={approveCheckpoint} className="bg-foreground hover:bg-foreground/90 text-background h-8 text-xs rounded-full">Approve &amp; Continue</Button>
                          <Button size="sm" variant="outline" onClick={rejectCheckpoint} className="text-foreground border-border hover:bg-secondary h-8 text-xs rounded-full">Reject</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDone && (
                  <div className={`rounded-2xl p-6 border-2 bg-card ${isAgreed ? "border-lime/50" : "border-border"}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${isAgreed ? "bg-lime" : "bg-secondary"}`}>
                        {isAgreed
                          ? <CheckCircle className="h-6 w-6 text-foreground" />
                          : <Clock className="h-6 w-6 text-muted-foreground" />
                        }
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{isAgreed ? "Deal Reached" : "Negotiation Complete"}</h3>
                        {state.summary && isAgreed && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {fmt(state.proposals[state.proposals.length - 1]?.purchasePrice || 0)} · {state.summary.totalRounds} rounds · {(state.summary.fairnessScore * 100).toFixed(0)}% fairness
                          </p>
                        )}
                        {!isAgreed && (
                          <p className="text-sm text-muted-foreground mt-0.5">{state.round} rounds completed</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => router.push("/deal")}
                          className="bg-foreground hover:bg-foreground/90 text-background gap-1.5 h-9 text-sm rounded-full"
                        >
                          Deal Summary <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" onClick={reset} className="gap-1.5 h-9 text-sm rounded-full border-border">
                          <RotateCcw className="h-3.5 w-3.5" /> Again
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {state.status === "error" && (
                  <div className="bg-card border border-border rounded-2xl p-4">
                    <p className="text-sm font-semibold text-foreground mb-1">Negotiation error</p>
                    <p className="text-xs text-muted-foreground">{state.error ?? "Connection failed. Please retry."}</p>
                    <Button size="sm" variant="outline" onClick={reset} className="mt-3 gap-1.5 h-8 text-xs rounded-full">
                      <RotateCcw className="h-3 w-3" /> Retry
                    </Button>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* ── RIGHT: Stats ── */}
          <div className="space-y-3">

            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Current Positions</div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-foreground">
                    <div className="w-2 h-2 rounded-full bg-lime" />
                    Seller ask
                  </div>
                  <span className="font-mono font-semibold text-sm text-foreground">{latestSeller ? fmt(latestSeller.purchasePrice) : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-foreground">
                    <div className="w-2 h-2 rounded-full bg-sky-400" />
                    Buyer offer
                  </div>
                  <span className="font-mono font-semibold text-sm text-foreground">{latestBuyer ? fmt(latestBuyer.purchasePrice) : "—"}</span>
                </div>
                {gap !== null && gap > 0 && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <TrendingDown className="h-3 w-3" />
                        Gap
                      </div>
                      <span className="font-mono font-medium text-foreground">{fmt(gap)}</span>
                    </div>
                    {gapPct !== null && (
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-foreground/40 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, gapPct)}%` }}
                        />
                      </div>
                    )}
                  </>
                )}
                {gap !== null && gap <= 0 && (
                  <div className="flex items-center gap-1.5 text-foreground text-xs font-medium">
                    <CheckCircle className="h-3.5 w-3.5" /> Prices crossed — deal zone!
                  </div>
                )}
              </div>
            </div>

            {state.convergenceHistory.length >= 2 && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Price Convergence</div>
                <ResponsiveContainer width="100%" height={130}>
                  <LineChart data={state.convergenceHistory} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="round" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1e6).toFixed(1)}M`} width={40} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(v) => [fmt(Number(v ?? 0))]}
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid var(--border)" }}
                    />
                    <Line type="monotone" dataKey="sellerPrice" stroke="oklch(0.91 0.19 115)" strokeWidth={2} dot={{ r: 2.5 }} name="Seller" />
                    <Line type="monotone" dataKey="buyerPrice" stroke="oklch(0.7 0.1 230)" strokeWidth={2} dot={{ r: 2.5 }} name="Buyer" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {state.convergenceHistory.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Convergence</div>
                  <span className="text-sm font-bold text-foreground">{latestScore}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-lime rounded-full transition-all duration-700"
                    style={{ width: `${latestScore}%` }}
                  />
                </div>
                <div className="text-[11px] text-muted-foreground mt-1.5">
                  {latestScore < 40 ? "Far apart — agents conceding" : latestScore < 70 ? "Narrowing gap" : latestScore < 90 ? "Near agreement" : "In deal zone"}
                </div>
              </div>
            )}

            {state.summary && (
              <div className="bg-foreground text-background rounded-2xl p-4">
                <div className="text-[11px] font-semibold text-background/40 uppercase tracking-wide mb-3">Fee Comparison</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-background/60">Rounds</span>
                    <span className="font-semibold">{state.summary.totalRounds}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-background/60">Relay (2.5%)</span>
                    <span className="font-mono font-semibold text-lime">{fmt(state.summary.relayFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-background/60">Traditional (9%)</span>
                    <span className="font-mono text-background/40 line-through">{fmt(state.summary.traditionalFee)}</span>
                  </div>
                  <Separator className="bg-background/10 my-1" />
                  <div className="flex justify-between text-lime">
                    <span className="font-medium">You save</span>
                    <span className="font-bold font-mono">{fmt(state.summary.traditionalFee - state.summary.relayFee)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
