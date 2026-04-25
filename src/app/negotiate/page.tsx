"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowRight, Play, RotateCcw, CheckCircle, Clock, Zap,
  ChevronDown, ChevronUp, TrendingDown, Eye, Bell, ShieldAlert, Handshake, Loader2
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { useNegotiation } from "@/hooks/use-negotiation"
import type { LOIProposal } from "@/lib/agents/types"
import type { CheckpointType, ThresholdTrigger } from "@/lib/checkpoint-store"
import { useState } from "react"
import Link from "next/link"

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`
}

function TermPill({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: "buyer" | "seller"
}) {
  const bg = accent === "buyer"
    ? "bg-sky/50 border-sky"
    : accent === "seller"
    ? "bg-lime/20 border-lime/50"
    : "bg-secondary border-border"
  return (
    <div className={`px-3 py-2 rounded-xl border ${bg}`}>
      <div className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">{label}</div>
      <div className="text-sm font-semibold font-mono text-foreground">{value}</div>
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
      <div className={[
        "w-[calc(100%-32px)] rounded-2xl border p-4 relative bg-card",
        isBuyer ? "border-border" : "border-border ml-8",
        isAccepted ? "ring-2 ring-lime shadow-sm" : "",
        isEscalate ? "ring-2 ring-amber-300" : "",
      ].filter(Boolean).join(" ")}>
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
          <div className="text-xl font-bold font-mono text-foreground">{fmt(proposal.purchasePrice)}</div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
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
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full text-left"
            >
              {expanded ? <ChevronUp className="h-3 w-3 flex-shrink-0" /> : <ChevronDown className="h-3 w-3 flex-shrink-0" />}
              <span>Agent reasoning {expanded ? "" : "— click to expand"}</span>
            </button>
            {expanded && (
              <div className="mt-2 text-xs text-muted-foreground leading-relaxed bg-secondary rounded-xl p-3 border border-border max-h-64 overflow-y-auto whitespace-pre-wrap">
                {proposal.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CheckpointPanel({
  checkpointType,
  checkpointReason,
  thresholdInfo,
  onApprove,
  onReject,
}: {
  checkpointType?: CheckpointType
  checkpointReason?: string
  thresholdInfo?: ThresholdTrigger
  onApprove: () => void
  onReject: () => void
}) {
  type CfgEntry = { icon: React.ReactNode; title: string; borderColor: string; bg: string; approveLabel: string }
  const config: Record<CheckpointType, CfgEntry> = {
    pre_opening: {
      icon: <Eye className="h-5 w-5 text-sky-600" />,
      title: "Review Opening Offer",
      borderColor: "border-sky",
      bg: "bg-sky/10",
      approveLabel: "Send to Seller →",
    },
    threshold: {
      icon: <Bell className="h-5 w-5 text-amber-600" />,
      title: "Alert Threshold Reached",
      borderColor: "border-amber-400",
      bg: "bg-amber-50",
      approveLabel: "Acknowledge & Continue →",
    },
    escalate: {
      icon: <ShieldAlert className="h-5 w-5 text-red-600" />,
      title: "Agent Escalation — Your Decision Needed",
      borderColor: "border-red-400",
      bg: "bg-red-50",
      approveLabel: "Approve & Continue →",
    },
    pre_acceptance: {
      icon: <Handshake className="h-5 w-5 text-lime-700" />,
      title: "Both Sides Ready to Close — Final Approval",
      borderColor: "border-lime",
      bg: "bg-lime/10",
      approveLabel: "Accept & Generate LOI →",
    },
  }

  const type = checkpointType ?? "escalate"
  const { icon, title, borderColor, bg, approveLabel } = config[type]

  return (
    <div className={`rounded-2xl border-2 ${borderColor} ${bg} p-5`}>
      {/* header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="flex-shrink-0">{icon}</div>
        <h3 className="font-bold text-foreground text-sm">{title}</h3>
        <Badge className="ml-auto text-[10px] rounded-full px-2 py-0.5 bg-background/60 text-muted-foreground border border-border capitalize">
          {type.replace("_", " ")}
        </Badge>
      </div>

      {/* reason */}
      <p className="text-sm text-foreground/80 leading-relaxed mb-4">
        {checkpointReason ?? "An agent has flagged this moment for your review."}
      </p>

      {/* threshold detail table */}
      {thresholdInfo && (
        <div className="bg-background/70 rounded-xl border border-border p-3 mb-4 text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Value that triggered alert</span>
            <span className="font-mono font-bold text-foreground">
              {thresholdInfo.triggeredValue > 1000 && Number.isInteger(thresholdInfo.triggeredValue)
                ? `$${thresholdInfo.triggeredValue.toLocaleString()}`
                : `${thresholdInfo.triggeredValue.toFixed(1)}%`}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Alert was configured at</span>
            <span className="font-mono text-foreground">
              {thresholdInfo.thresholdValue > 1000 && Number.isInteger(thresholdInfo.thresholdValue)
                ? `$${thresholdInfo.thresholdValue.toLocaleString()}`
                : `${thresholdInfo.thresholdValue}%`}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Notified party</span>
            <span className="font-medium text-foreground capitalize">{thresholdInfo.party}</span>
          </div>
        </div>
      )}

      {/* action buttons */}
      <div className="flex gap-2.5">
        <Button
          onClick={onApprove}
          className="bg-foreground hover:bg-foreground/90 text-background h-9 px-5 text-xs font-semibold rounded-full"
        >
          {approveLabel}
        </Button>
        <Button
          variant="outline"
          onClick={onReject}
          className="border-border text-foreground hover:bg-background/80 h-9 px-4 text-xs rounded-full"
        >
          Reject &amp; End
        </Button>
      </div>
    </div>
  )
}

export default function NegotiatePage() {
  const router = useRouter()
  const { state, start, reset, approveCheckpoint, rejectCheckpoint } = useNegotiation()
  const checkpointRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new proposals arrive
  useEffect(() => {
    if (state.proposals.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [state.proposals.length])

  // Scroll to checkpoint panel whenever it fires so the user never misses it
  useEffect(() => {
    if (state.status === "checkpoint") {
      setTimeout(() => checkpointRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80)
    }
  }, [state.status])

  const isRunning = state.status === "running"
  const isCheckpoint = state.status === "checkpoint"
  const isDone = state.status === "agreed" || state.status === "complete"
  const isAgreed = state.status === "agreed"

  const latestBuyer = [...state.proposals].reverse().find(p => p.proposingParty === "buyer")
  const latestSeller = [...state.proposals].reverse().find(p => p.proposingParty === "seller")
  const gap = latestSeller && latestBuyer ? latestSeller.purchasePrice - latestBuyer.purchasePrice : null
  const gapPct = gap !== null && latestSeller ? (gap / latestSeller.purchasePrice) * 100 : null
  const latestScore = state.convergenceHistory[state.convergenceHistory.length - 1]?.score ?? 0

  return (
    <div className="min-h-screen bg-background">
      {/* ── Nav ── */}
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
                <Loader2 className="h-3 w-3 animate-spin text-lime" />
                Agent working…
              </div>
            )}
            {isCheckpoint && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground bg-amber-100 border border-amber-300 rounded-full px-3 py-1">
                ⚠ Your approval needed
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

            {/* IDLE: start card */}
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

            {/* LOADING: buyer is working before first proposal arrives */}
            {(isRunning || isCheckpoint) && state.proposals.length === 0 && (
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-lime mx-auto mb-4" />
                <p className="text-sm font-medium text-foreground">Buyer agent is analyzing the deal…</p>
                <p className="text-xs text-muted-foreground mt-1">Reviewing financials, comps, and risk factors</p>
              </div>
            )}

            {/* TIMELINE: proposals */}
            {state.proposals.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold text-foreground">Negotiation Timeline</h2>
                  <span className="text-xs text-muted-foreground">
                    {Math.ceil(state.proposals.length / 2)} round{Math.ceil(state.proposals.length / 2) !== 1 ? "s" : ""} · {state.proposals.length} proposal{state.proposals.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {state.proposals.map((p, i) => (
                  <ProposalCard key={p.id || i} proposal={p} index={i} />
                ))}

                {/* Running spinner between proposals */}
                {isRunning && (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-lime flex-shrink-0" />
                    <span className="text-xs">
                      {state.proposals[state.proposals.length - 1]?.proposingParty === "buyer"
                        ? "Seller agent reviewing and preparing counter-offer…"
                        : "Buyer agent reviewing and preparing counter-offer…"}
                    </span>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            )}

            {/* ── CHECKPOINT PANEL ── shown at column level, always visible */}
            {isCheckpoint && (
              <div ref={checkpointRef}>
                <CheckpointPanel
                  checkpointType={state.checkpointType}
                  checkpointReason={state.checkpointReason}
                  thresholdInfo={state.thresholdInfo}
                  onApprove={approveCheckpoint}
                  onReject={rejectCheckpoint}
                />
              </div>
            )}

            {/* DONE */}
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
                        {fmt(state.proposals[state.proposals.length - 1]?.purchasePrice || 0)} · {state.summary.totalRounds} rounds · {(state.summary.fairnessScore * 100).toFixed(0)}% fairness score
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

            {/* ERROR */}
            {state.status === "error" && (
              <div className="bg-card border border-red-200 rounded-2xl p-5">
                <p className="text-sm font-semibold text-foreground mb-1">Negotiation error</p>
                <p className="text-xs text-muted-foreground mb-3">{state.error ?? "Connection failed. Please retry."}</p>
                <Button size="sm" variant="outline" onClick={reset} className="gap-1.5 h-8 text-xs rounded-full">
                  <RotateCcw className="h-3 w-3" /> Start Over
                </Button>
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
                    <div className="w-2 h-2 rounded-full bg-lime" />Seller ask
                  </div>
                  <span className="font-mono font-semibold text-sm text-foreground">{latestSeller ? fmt(latestSeller.purchasePrice) : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-foreground">
                    <div className="w-2 h-2 rounded-full bg-sky-400" />Buyer offer
                  </div>
                  <span className="font-mono font-semibold text-sm text-foreground">{latestBuyer ? fmt(latestBuyer.purchasePrice) : "—"}</span>
                </div>
                {gap !== null && gap > 0 && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <TrendingDown className="h-3 w-3" />Gap
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

            {/* How many approvals remain */}
            {(isRunning || isCheckpoint) && !isDone && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Human Checkpoints</div>
                <div className="space-y-1.5 text-xs">
                  <div className={`flex items-center gap-2 ${state.round >= 1 ? "text-foreground" : "text-muted-foreground"}`}>
                    <CheckCircle className="h-3 w-3 text-lime flex-shrink-0" />
                    Pre-opening review
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-3 h-3 rounded-full border border-border flex-shrink-0" />
                    Threshold alerts (if any)
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-3 h-3 rounded-full border border-border flex-shrink-0" />
                    Final terms approval
                  </div>
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
