"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Play, RotateCcw, CheckCircle, Clock, AlertCircle,
  ArrowRight, ChevronDown, ChevronUp, Zap
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { useNegotiation } from "@/hooks/use-negotiation"
import type { LOIProposal } from "@/lib/agents/types"

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

function MiniProposal({ proposal, index }: { proposal: LOIProposal; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const isBuyer = proposal.proposingParty === "buyer"

  return (
    <div className={`rounded-lg border p-3 text-xs ${isBuyer ? "bg-blue-50 border-blue-200" : "bg-emerald-50 border-emerald-200"}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white font-bold ${isBuyer ? "bg-blue-500" : "bg-emerald-500"}`} style={{ fontSize: 9 }}>
            {isBuyer ? "B" : "S"}
          </div>
          <span className="font-semibold text-zinc-700">R{Math.ceil((index + 1) / 2)} · {isBuyer ? "Buyer" : "Seller"}</span>
        </div>
        <span className={`font-bold ${isBuyer ? "text-blue-700" : "text-emerald-700"}`}>{fmt(proposal.purchasePrice)}</span>
      </div>
      <div className="grid grid-cols-2 gap-1 mb-1.5 text-zinc-500">
        <span>Cash: {fmt(proposal.priceStructure.cashAtClose)}</span>
        {proposal.priceStructure.earnout > 0 && <span>Earnout: {fmt(proposal.priceStructure.earnout)}</span>}
        {proposal.priceStructure.sellerFinancing > 0 && <span>Note: {fmt(proposal.priceStructure.sellerFinancing)}</span>}
        <span>DD: {proposal.dueDiligencePeriodDays}d</span>
      </div>
      {proposal.notes && (
        <>
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-0.5 text-zinc-400 hover:text-zinc-600">
            {expanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
            <span>Reasoning</span>
          </button>
          {expanded && (
            <div className="mt-1.5 text-zinc-500 leading-relaxed bg-white/70 rounded p-2 border border-zinc-200">
              {proposal.notes.slice(0, 300)}{proposal.notes.length > 300 ? "..." : ""}
            </div>
          )}
        </>
      )}
      {proposal.status === "accepted" && (
        <Badge className="mt-1.5 bg-emerald-100 text-emerald-700 text-xs border-emerald-300">✓ Accepted</Badge>
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
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <div className="border-b border-zinc-700 sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">R</div>
            <span className="font-bold text-white">Relay</span>
            <span className="text-zinc-500 mx-1">·</span>
            <span className="text-sm text-zinc-400">God-Mode Demo View</span>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs ml-2">Judges Only</Badge>
          </div>
          <div className="flex items-center gap-3">
            {state.status === "running" && (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Live Negotiation
              </Badge>
            )}
            {isAgreed && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Deal Reached!</Badge>}
            <Button size="sm" variant="outline" className="border-zinc-600 text-zinc-300 hover:bg-zinc-800 gap-1.5" onClick={() => router.push("/")}>
              <ArrowRight className="h-3 w-3" /> Main site
            </Button>
          </div>
        </div>
      </div>

      {/* Main 3-column layout */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {state.status === "idle" && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/20">
              <Zap className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-3">God-Mode Demo</h1>
            <p className="text-zinc-400 text-lg mb-2 max-w-xl">
              See <span className="text-emerald-400">both agents simultaneously</span> — seller on the left, buyer on the right, shared timeline in the center.
            </p>
            <p className="text-zinc-500 text-sm mb-8 max-w-lg">
              Neither agent can see the other&apos;s confidential parameters. This view exists for demo purposes only — in a real transaction, each party only sees their own side.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-2xl mb-8 text-sm">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <div className="text-emerald-400 font-bold mb-1">Sarah Chen</div>
                <div className="text-zinc-400">CloudTrack Pro</div>
                <div className="text-zinc-500 text-xs mt-2">Ask: $3.78M</div>
                <div className="text-emerald-500/70 text-xs">Floor: $2.8M 🔒</div>
              </div>
              <div className="bg-zinc-700/50 rounded-xl p-4 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-zinc-300 font-semibold">Relay</div>
                  <div className="text-zinc-500 text-xs mt-1">Information Wall</div>
                  <div className="text-2xl mt-1">🔐</div>
                </div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="text-blue-400 font-bold mb-1">James Park</div>
                <div className="text-zinc-400">Apex Growth Partners</div>
                <div className="text-zinc-500 text-xs mt-2">Opens: $2.4–2.7M</div>
                <div className="text-blue-500/70 text-xs">Max: $3.2M 🔒</div>
              </div>
            </div>
            <Button
              onClick={() => start(true)}
              className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white gap-2 px-10 h-12 text-base"
            >
              <Play className="h-5 w-5" /> Start AI Negotiation
            </Button>
          </div>
        )}

        {state.status !== "idle" && (
          <div className="grid grid-cols-5 gap-4">
            {/* Seller column */}
            <div className="col-span-2">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">S</div>
                    <span className="font-semibold text-emerald-300">Seller Agent</span>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">CloudTrack Pro</Badge>
                </div>
                <div className="text-xs text-zinc-500 mt-1">Ask: $3.78M · Floor: $2.8M 🔒</div>
                <div className="text-xs text-zinc-500">Max note: 20% 🔒 · Max transition: 3mo 🔒</div>
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
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-center">
                  <div className="text-xs text-zinc-500 mb-1 uppercase tracking-wide">Round</div>
                  <div className="text-3xl font-bold">{state.round}</div>
                </div>

                {gap !== null && (
                  <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-center">
                    <div className="text-xs text-zinc-500 mb-1 uppercase tracking-wide">Gap</div>
                    <div className={`text-xl font-bold ${gap <= 0 ? "text-emerald-400" : gap < 300_000 ? "text-yellow-400" : "text-zinc-200"}`}>
                      {gap <= 0 ? "Crossed!" : fmt(gap)}
                    </div>
                  </div>
                )}

                {state.convergenceHistory.length >= 2 && (
                  <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3">
                    <div className="text-xs text-zinc-500 mb-2 text-center uppercase tracking-wide">Convergence</div>
                    <ResponsiveContainer width="100%" height={100}>
                      <LineChart data={state.convergenceHistory}>
                        <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `$${(v/1e6).toFixed(1)}M`} width={35} />
                        <Tooltip formatter={(v) => [fmt(Number(v ?? 0))]} contentStyle={{ background: "#27272a", border: "none", fontSize: 11 }} />
                        <Line type="monotone" dataKey="sellerPrice" stroke="#10B981" strokeWidth={2} dot={{ r: 2 }} name="Seller" />
                        <Line type="monotone" dataKey="buyerPrice" stroke="#3B82F6" strokeWidth={2} dot={{ r: 2 }} name="Buyer" />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-emerald-400">● Seller</span>
                      <span className="text-blue-400">● Buyer</span>
                    </div>
                  </div>
                )}

                {state.convergenceHistory.length > 0 && (
                  <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3">
                    <div className="text-xs text-zinc-500 mb-2 text-center">Convergence Score</div>
                    <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full transition-all duration-700"
                        style={{ width: `${state.convergenceHistory[state.convergenceHistory.length - 1]?.score || 0}%` }}
                      />
                    </div>
                    <div className="text-center text-xs text-zinc-400 mt-1">
                      {state.convergenceHistory[state.convergenceHistory.length - 1]?.score || 0}%
                    </div>
                  </div>
                )}

                {state.status === "running" && (
                  <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-center">
                    <div className="flex gap-1 justify-center">
                      {[0, 150, 300].map(d => (
                        <div key={d} className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">Thinking...</div>
                  </div>
                )}

                {isAgreed && (
                  <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-xl p-4 text-center">
                    <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-1" />
                    <div className="font-bold text-emerald-300 text-sm">Deal!</div>
                    {state.summary && (
                      <div className="text-xs text-emerald-400/80 mt-1">
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
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 text-xs"
                    >
                      Deal Summary <ArrowRight className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={reset} className="w-full border-zinc-600 text-zinc-300 hover:bg-zinc-800 gap-1.5 text-xs">
                      <RotateCcw className="h-3 w-3" /> Run Again
                    </Button>
                  </div>
                )}

                {state.status === "error" && (
                  <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-3 text-xs text-red-400 text-center">
                    <AlertCircle className="h-4 w-4 mx-auto mb-1" />
                    {state.error || "Error occurred"}
                    <Button size="sm" variant="ghost" onClick={reset} className="mt-2 text-xs text-red-400 hover:text-red-300 w-full">
                      Retry
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Buyer column */}
            <div className="col-span-2">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">B</div>
                    <span className="font-semibold text-blue-300">Buyer Agent</span>
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Apex Growth</Badge>
                </div>
                <div className="text-xs text-zinc-500 mt-1">Opens: $2.4–2.7M · Max: $3.2M 🔒</div>
                <div className="text-xs text-zinc-500">Structure: 70/15/15 split 🔒 · No alternatives 🔒</div>
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
