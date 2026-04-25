"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Play, RotateCcw, CheckCircle, AlertCircle,
  ArrowRight, ChevronDown, ChevronUp, Zap
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { useNegotiation } from "@/hooks/use-negotiation"
import type { LOIProposal } from "@/lib/agents/types"
import Link from "next/link"

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

function MiniProposal({ proposal, index }: { proposal: LOIProposal; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const isBuyer = proposal.proposingParty === "buyer"

  return (
    <div className={`rounded-2xl border p-3 text-xs ${isBuyer ? "bg-sky/30 border-sky" : "bg-lime/20 border-lime/50"}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-foreground font-bold ${isBuyer ? "bg-sky" : "bg-lime"}`} style={{ fontSize: 9 }}>
            {isBuyer ? "B" : "S"}
          </div>
          <span className="font-semibold text-foreground">R{Math.ceil((index + 1) / 2)} · {isBuyer ? "Buyer" : "Seller"}</span>
        </div>
        <span className={`font-bold text-foreground`}>{fmt(proposal.purchasePrice)}</span>
      </div>
      <div className="grid grid-cols-2 gap-1 mb-1.5 text-muted-foreground">
        <span>Cash: {fmt(proposal.priceStructure.cashAtClose)}</span>
        {proposal.priceStructure.earnout > 0 && <span>Earnout: {fmt(proposal.priceStructure.earnout)}</span>}
        {proposal.priceStructure.sellerFinancing > 0 && <span>Note: {fmt(proposal.priceStructure.sellerFinancing)}</span>}
        <span>DD: {proposal.dueDiligencePeriodDays}d</span>
      </div>
      {proposal.notes && (
        <>
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
            <span>Reasoning</span>
          </button>
          {expanded && (
            <div className="mt-1.5 text-muted-foreground leading-relaxed bg-card/70 rounded-xl p-2 border border-border">
              {proposal.notes.slice(0, 300)}{proposal.notes.length > 300 ? "..." : ""}
            </div>
          )}
        </>
      )}
      {proposal.status === "accepted" && (
        <Badge className="mt-1.5 bg-lime/30 text-foreground text-xs border-lime/50 rounded-full">✓ Accepted</Badge>
      )}
    </div>
  )
}

export default function DemoPage() {
  const router = useRouter()
  const { state, start, reset } = useNegotiation()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [state.proposals.length])

  const sellerProposals = state.proposals.filter(p => p.proposingParty === "seller")
  const buyerProposals = state.proposals.filter(p => p.proposingParty === "buyer")
  const latestBuyer = buyerProposals[buyerProposals.length - 1]
  const latestSeller = sellerProposals[sellerProposals.length - 1]
  const gap = latestSeller && latestBuyer ? latestSeller.purchasePrice - latestBuyer.purchasePrice : null
  const isDone = state.status === "agreed" || state.status === "complete"
  const isAgreed = state.status === "agreed"

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-lime flex items-center justify-center text-foreground font-bold text-sm">R</div>
              <span className="font-bold text-foreground">Relay</span>
            </Link>
            <span className="text-border mx-1">·</span>
            <span className="text-sm text-muted-foreground">God-Mode Demo View</span>
            <Badge className="bg-lime/30 text-foreground border-lime/50 text-xs ml-2 rounded-full">Judges Only</Badge>
          </div>
          <div className="flex items-center gap-3">
            {state.status === "running" && (
              <Badge className="bg-lime/20 text-foreground border-lime/30 gap-1 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
                Live Negotiation
              </Badge>
            )}
            {isAgreed && <Badge className="bg-lime/30 text-foreground border-lime/50 rounded-full">Deal Reached!</Badge>}
            <Button size="sm" variant="outline" className="border-border text-foreground hover:bg-secondary gap-1.5 rounded-full" onClick={() => router.push("/")}>
              <ArrowRight className="h-3 w-3" /> Main site
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {state.status === "idle" && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-lime flex items-center justify-center mb-6">
              <Zap className="h-10 w-10 text-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-3 text-foreground">God-Mode Demo</h1>
            <p className="text-muted-foreground text-lg mb-2 max-w-xl">
              See <span className="text-foreground font-semibold">both agents simultaneously</span> — seller on the left, buyer on the right, shared timeline in the center.
            </p>
            <p className="text-muted-foreground text-sm mb-8 max-w-lg">
              Neither agent can see the other&apos;s confidential parameters. This view exists for demo purposes only — in a real transaction, each party only sees their own side.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-2xl mb-8 text-sm">
              <div className="bg-lime/20 border border-lime/30 rounded-2xl p-4">
                <div className="text-foreground font-bold mb-1">Sarah Chen</div>
                <div className="text-muted-foreground">CloudTrack Pro</div>
                <div className="text-muted-foreground text-xs mt-2">Ask: $3.78M</div>
                <div className="text-foreground/50 text-xs">Floor: $2.8M 🔒</div>
              </div>
              <div className="bg-secondary rounded-2xl p-4 flex items-center justify-center border border-border">
                <div className="text-center">
                  <div className="text-foreground font-semibold">Relay</div>
                  <div className="text-muted-foreground text-xs mt-1">Information Wall</div>
                  <div className="text-2xl mt-1">🔐</div>
                </div>
              </div>
              <div className="bg-sky/30 border border-sky rounded-2xl p-4">
                <div className="text-foreground font-bold mb-1">James Park</div>
                <div className="text-muted-foreground">Apex Growth Partners</div>
                <div className="text-muted-foreground text-xs mt-2">Opens: $2.4–2.7M</div>
                <div className="text-foreground/50 text-xs">Max: $3.2M 🔒</div>
              </div>
            </div>
            <Button
              onClick={() => start(true)}
              className="bg-foreground hover:bg-foreground/90 text-background gap-2 px-10 h-12 text-base rounded-full"
            >
              <Play className="h-5 w-5" /> Start AI Negotiation
            </Button>
          </div>
        )}

        {state.status !== "idle" && (
          <div className="grid grid-cols-5 gap-4">
            {/* Seller column */}
            <div className="col-span-2">
              <div className="bg-lime/20 border border-lime/30 rounded-2xl p-4 mb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-lime flex items-center justify-center text-foreground font-bold text-xs">S</div>
                    <span className="font-semibold text-foreground">Seller Agent</span>
                  </div>
                  <Badge className="bg-lime/30 text-foreground border-lime/50 text-xs rounded-full">CloudTrack Pro</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Ask: $3.78M · Floor: $2.8M 🔒</div>
                <div className="text-xs text-muted-foreground">Max note: 20% 🔒 · Max transition: 3mo 🔒</div>
              </div>
              <div className="space-y-2">
                {sellerProposals.map((p, i) => (
                  <MiniProposal key={p.id || i} proposal={p} index={i * 2} />
                ))}
              </div>
            </div>

            {/* Center: convergence */}
            <div className="col-span-1">
              <div className="sticky top-24 space-y-4">
                <div className="bg-card border border-border rounded-2xl p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Round</div>
                  <div className="text-3xl font-bold text-foreground">{state.round}</div>
                </div>

                {gap !== null && (
                  <div className="bg-card border border-border rounded-2xl p-4 text-center">
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Gap</div>
                    <div className={`text-xl font-bold ${gap <= 0 ? "text-foreground" : gap < 300_000 ? "text-foreground/70" : "text-foreground"}`}>
                      {gap <= 0 ? "Crossed!" : fmt(gap)}
                    </div>
                  </div>
                )}

                {state.convergenceHistory.length >= 2 && (
                  <div className="bg-card border border-border rounded-2xl p-3">
                    <div className="text-xs text-muted-foreground mb-2 text-center uppercase tracking-wide">Convergence</div>
                    <ResponsiveContainer width="100%" height={100}>
                      <LineChart data={state.convergenceHistory}>
                        <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `$${(v/1e6).toFixed(1)}M`} width={35} />
                        <Tooltip formatter={(v) => [fmt(Number(v ?? 0))]} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 11 }} />
                        <Line type="monotone" dataKey="sellerPrice" stroke="oklch(0.91 0.19 115)" strokeWidth={2} dot={{ r: 2 }} name="Seller" />
                        <Line type="monotone" dataKey="buyerPrice" stroke="oklch(0.7 0.1 230)" strokeWidth={2} dot={{ r: 2 }} name="Buyer" />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-foreground">● Seller</span>
                      <span className="text-foreground/60">● Buyer</span>
                    </div>
                  </div>
                )}

                {state.convergenceHistory.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-3">
                    <div className="text-xs text-muted-foreground mb-2 text-center">Convergence Score</div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-lime rounded-full transition-all duration-700"
                        style={{ width: `${state.convergenceHistory[state.convergenceHistory.length - 1]?.score || 0}%` }}
                      />
                    </div>
                    <div className="text-center text-xs text-muted-foreground mt-1">
                      {state.convergenceHistory[state.convergenceHistory.length - 1]?.score || 0}%
                    </div>
                  </div>
                )}

                {state.status === "running" && (
                  <div className="bg-card border border-border rounded-2xl p-3 text-center">
                    <div className="flex gap-1 justify-center">
                      {[0, 150, 300].map(d => (
                        <div key={d} className="w-2 h-2 rounded-full bg-lime/60 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Thinking...</div>
                  </div>
                )}

                {isAgreed && (
                  <div className="bg-lime/20 border border-lime/50 rounded-2xl p-4 text-center">
                    <CheckCircle className="h-8 w-8 text-foreground mx-auto mb-1" />
                    <div className="font-bold text-foreground text-sm">Deal!</div>
                    {state.summary && (
                      <div className="text-xs text-foreground/60 mt-1">
                        {fmt(state.proposals[state.proposals.length - 1]?.purchasePrice || 0)}
                      </div>
                    )}
                  </div>
                )}

                {isDone && (
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      onClick={() => router.push("/deal")}
                      className="w-full bg-foreground hover:bg-foreground/90 text-background gap-1.5 text-xs rounded-full"
                    >
                      Deal Summary <ArrowRight className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={reset} className="w-full border-border text-foreground hover:bg-secondary gap-1.5 text-xs rounded-full">
                      <RotateCcw className="h-3 w-3" /> Run Again
                    </Button>
                  </div>
                )}

                {state.status === "error" && (
                  <div className="bg-card border border-border rounded-2xl p-3 text-xs text-muted-foreground text-center">
                    <AlertCircle className="h-4 w-4 mx-auto mb-1 text-foreground" />
                    {state.error || "Error occurred"}
                    <Button size="sm" variant="ghost" onClick={reset} className="mt-2 text-xs text-foreground hover:text-foreground/80 w-full">
                      Retry
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Buyer column */}
            <div className="col-span-2">
              <div className="bg-sky/30 border border-sky rounded-2xl p-4 mb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-sky flex items-center justify-center text-foreground font-bold text-xs">B</div>
                    <span className="font-semibold text-foreground">Buyer Agent</span>
                  </div>
                  <Badge className="bg-sky/50 text-foreground border-sky text-xs rounded-full">Apex Growth</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Opens: $2.4–2.7M · Max: $3.2M 🔒</div>
                <div className="text-xs text-muted-foreground">Structure: 70/15/15 split 🔒 · No alternatives 🔒</div>
              </div>
              <div className="space-y-2">
                {buyerProposals.map((p, i) => (
                  <MiniProposal key={p.id || i} proposal={p} index={i * 2 + 1} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
