"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowRight, Play, RotateCcw, CheckCircle, Clock, Zap,
  TrendingDown, TrendingUp, AlertCircle, ChevronDown, ChevronUp
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts"
import { useNegotiation } from "@/hooks/use-negotiation"
import type { LOIProposal } from "@/lib/agents/types"
import { useState } from "react"

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`
}

function ProposalCard({ proposal, index }: { proposal: LOIProposal; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const isBuyer = proposal.proposingParty === "buyer"

  return (
    <div className={`flex ${isBuyer ? "justify-end" : "justify-start"}`}>
      <div
        className={`w-[88%] rounded-xl border p-4 transition-all ${
          isBuyer
            ? "bg-blue-50 border-blue-200"
            : "bg-emerald-50 border-emerald-200"
        } ${
          proposal.status === "accepted" ? "ring-2 ring-emerald-500" :
          proposal.status === "escalate" ? "ring-2 ring-amber-400" : ""
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${isBuyer ? "bg-blue-500" : "bg-emerald-500"}`}>
              {isBuyer ? "B" : "S"}
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-700">
                {isBuyer ? "Apex Growth Partners" : "Sarah Chen"} · Round {Math.ceil((index + 1) / 2)}
              </div>
              <div className="text-xs text-zinc-400">
                {isBuyer ? "Buyer Agent" : "Seller Agent"} · v{proposal.version}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xl font-bold ${isBuyer ? "text-blue-700" : "text-emerald-700"}`}>
              {fmt(proposal.purchasePrice)}
            </div>
            {proposal.status === "accepted" && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-xs">Deal!</Badge>
            )}
            {proposal.status === "escalate" && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">Review Needed</Badge>
            )}
          </div>
        </div>

        {/* Terms grid */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
          <div className={`p-2 rounded-lg ${isBuyer ? "bg-blue-100" : "bg-emerald-100"}`}>
            <div className="text-zinc-500 mb-0.5">Cash at Close</div>
            <div className="font-semibold text-zinc-800">{fmt(proposal.priceStructure.cashAtClose)}</div>
            <div className="text-zinc-400">{pct(proposal.priceStructure.cashAtClose / proposal.purchasePrice)}</div>
          </div>
          {proposal.priceStructure.earnout > 0 && (
            <div className={`p-2 rounded-lg ${isBuyer ? "bg-blue-100" : "bg-emerald-100"}`}>
              <div className="text-zinc-500 mb-0.5">Earnout</div>
              <div className="font-semibold text-zinc-800">{fmt(proposal.priceStructure.earnout)}</div>
              <div className="text-zinc-400">{pct(proposal.priceStructure.earnout / proposal.purchasePrice)}</div>
            </div>
          )}
          {proposal.priceStructure.sellerFinancing > 0 && (
            <div className={`p-2 rounded-lg ${isBuyer ? "bg-blue-100" : "bg-emerald-100"}`}>
              <div className="text-zinc-500 mb-0.5">Seller Note</div>
              <div className="font-semibold text-zinc-800">{fmt(proposal.priceStructure.sellerFinancing)}</div>
              <div className="text-zinc-400">{pct(proposal.priceStructure.sellerFinancing / proposal.purchasePrice)}</div>
            </div>
          )}
          <div className={`p-2 rounded-lg ${isBuyer ? "bg-blue-100" : "bg-emerald-100"}`}>
            <div className="text-zinc-500 mb-0.5">DD Period</div>
            <div className="font-semibold text-zinc-800">{proposal.dueDiligencePeriodDays}d</div>
          </div>
          <div className={`p-2 rounded-lg ${isBuyer ? "bg-blue-100" : "bg-emerald-100"}`}>
            <div className="text-zinc-500 mb-0.5">Structure</div>
            <div className="font-semibold text-zinc-800 capitalize">{proposal.dealStructure.replace("_", " ")}</div>
          </div>
          {proposal.exclusivity.requested && (
            <div className={`p-2 rounded-lg ${isBuyer ? "bg-blue-100" : "bg-emerald-100"}`}>
              <div className="text-zinc-500 mb-0.5">Exclusivity</div>
              <div className="font-semibold text-zinc-800">{proposal.exclusivity.periodDays}d</div>
            </div>
          )}
        </div>

        {/* Notes / reasoning */}
        {proposal.notes && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Reasoning
            </button>
            {expanded && (
              <div className="mt-2 text-xs text-zinc-500 leading-relaxed bg-white/60 rounded-lg p-3 border border-zinc-200">
                {proposal.notes}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function NegotiatePage() {
  const router = useRouter()
  const { state, start, reset } = useNegotiation()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [state.proposals.length])

  const isRunning = state.status === "running"
  const isDone = state.status === "agreed" || state.status === "complete"
  const isAgreed = state.status === "agreed"

  const latestBuyer = [...state.proposals].reverse().find(p => p.proposingParty === "buyer")
  const latestSeller = [...state.proposals].reverse().find(p => p.proposingParty === "seller")
  const gap = latestSeller && latestBuyer
    ? latestSeller.purchasePrice - latestBuyer.purchasePrice
    : null

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">R</div>
            <span className="font-semibold text-zinc-900 text-sm">Relay</span>
            <span className="text-zinc-300 mx-1">·</span>
            <span className="text-sm text-zinc-500">CloudTrack Pro Negotiation</span>
          </div>
          <div className="flex items-center gap-2">
            {isRunning && (
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 gap-1 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Live
              </Badge>
            )}
            {isAgreed && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Deal Reached!</Badge>}
            {isDone && !isAgreed && <Badge variant="secondary">Completed</Badge>}
            <Button variant="ghost" size="sm" onClick={() => router.push("/demo")} className="text-xs text-zinc-500">
              God-mode view →
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-6">
          {/* LEFT: Timeline */}
          <div className="col-span-2">
            {/* Start prompt */}
            {state.status === "idle" && (
              <div className="bg-white border-2 border-dashed border-zinc-200 rounded-xl p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 mb-2">Ready to negotiate</h2>
                <p className="text-zinc-500 text-sm mb-6 max-w-sm mx-auto">
                  Two AI agents — one for each party — will negotiate the acquisition of CloudTrack Pro. Neither agent can see the other&apos;s confidential parameters.
                </p>
                <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mb-6 text-xs text-left">
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="font-bold text-emerald-700 mb-1">Seller</div>
                    <div className="text-zinc-600">Sarah Chen · CloudTrack Pro</div>
                    <div className="text-zinc-400 mt-0.5">Ask: $3.78M</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="font-bold text-blue-700 mb-1">Buyer</div>
                    <div className="text-zinc-600">James Park · Apex Growth</div>
                    <div className="text-zinc-400 mt-0.5">Opens: $2.4–2.7M</div>
                  </div>
                </div>
                <Button
                  onClick={() => start(true)}
                  className="bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 text-white gap-2 px-8 h-11"
                >
                  <Play className="h-4 w-4" /> Start AI Negotiation
                </Button>
              </div>
            )}

            {/* Proposals timeline */}
            {state.proposals.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-zinc-900">Negotiation Timeline</h2>
                  <Badge variant="secondary" className="text-xs">{Math.ceil(state.proposals.length / 2)} rounds</Badge>
                </div>
                {state.proposals.map((p, i) => (
                  <ProposalCard key={p.id || i} proposal={p} index={i} />
                ))}

                {isRunning && (
                  <div className="flex justify-center py-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      Agent thinking...
                    </div>
                  </div>
                )}

                {state.status === "checkpoint" && (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 text-center">
                    <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                    <h3 className="font-semibold text-zinc-900 mb-1">Human Approval Required</h3>
                    <p className="text-sm text-zinc-600 mb-4">{state.checkpointReason || "An agent has flagged this for review."}</p>
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">Approve & Continue</Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">Reject</Button>
                    </div>
                  </div>
                )}

                {isDone && (
                  <div className={`rounded-xl p-6 text-center border-2 ${isAgreed ? "bg-emerald-50 border-emerald-300" : "bg-zinc-50 border-zinc-200"}`}>
                    {isAgreed ? (
                      <>
                        <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                        <h3 className="text-lg font-bold text-zinc-900 mb-1">Deal Reached!</h3>
                        {state.summary && (
                          <p className="text-sm text-zinc-600 mb-4">
                            {fmt(state.proposals[state.proposals.length - 1]?.purchasePrice || 0)} · {state.summary.totalRounds} rounds · Fairness score {(state.summary.fairnessScore * 100).toFixed(0)}%
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <Clock className="h-10 w-10 text-zinc-400 mx-auto mb-2" />
                        <h3 className="text-lg font-bold text-zinc-900 mb-1">Negotiation Complete</h3>
                        <p className="text-sm text-zinc-500 mb-4">{state.round} rounds completed</p>
                      </>
                    )}
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={() => router.push("/deal")}
                        className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2"
                      >
                        View Deal Summary <ArrowRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" onClick={reset} className="gap-2">
                        <RotateCcw className="h-3.5 w-3.5" /> Run Again
                      </Button>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* RIGHT: Live stats */}
          <div className="space-y-4">
            {/* Current positions */}
            <div className="bg-white border border-zinc-200 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Current Positions</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-zinc-600">Seller</span>
                  </div>
                  <span className="font-semibold text-emerald-700">{latestSeller ? fmt(latestSeller.purchasePrice) : "–"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-zinc-600">Buyer</span>
                  </div>
                  <span className="font-semibold text-blue-700">{latestBuyer ? fmt(latestBuyer.purchasePrice) : "–"}</span>
                </div>
                {gap !== null && gap > 0 && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Gap</span>
                      <span className="font-semibold text-amber-600">{fmt(gap)}</span>
                    </div>
                  </>
                )}
                {gap !== null && gap <= 0 && (
                  <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                    <CheckCircle className="h-3.5 w-3.5" /> Prices crossed!
                  </div>
                )}
              </div>
            </div>

            {/* Convergence chart */}
            {state.convergenceHistory.length >= 2 && (
              <div className="bg-white border border-zinc-200 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Price Convergence</h3>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={state.convergenceHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                    <XAxis dataKey="round" tick={{ fontSize: 10 }} label={{ value: "Round", position: "insideBottom", offset: -5, fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1e6).toFixed(1)}M`} width={45} />
                    <Tooltip formatter={(v) => [fmt(Number(v ?? 0))]} />
                    <Line type="monotone" dataKey="sellerPrice" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="Seller" />
                    <Line type="monotone" dataKey="buyerPrice" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="Buyer" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Progress */}
            {state.convergenceHistory.length > 0 && (
              <div className="bg-white border border-zinc-200 rounded-xl p-4">
                <div className="flex justify-between text-xs text-zinc-500 mb-2">
                  <span>Convergence</span>
                  <span className="font-semibold text-zinc-700">
                    {state.convergenceHistory[state.convergenceHistory.length - 1]?.score || 0}%
                  </span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full transition-all duration-700"
                    style={{ width: `${state.convergenceHistory[state.convergenceHistory.length - 1]?.score || 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Summary */}
            {state.summary && (
              <div className="bg-zinc-900 text-white rounded-xl p-4 text-sm space-y-2">
                <h3 className="font-semibold text-white text-xs uppercase tracking-wide mb-3">Deal Summary</h3>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Rounds</span>
                  <span className="font-semibold">{state.summary.totalRounds}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Relay fee (2.5%)</span>
                  <span className="font-semibold text-emerald-400">{fmt(state.summary.relayFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Traditional (9%)</span>
                  <span className="font-semibold text-red-400 line-through">{fmt(state.summary.traditionalFee)}</span>
                </div>
                <Separator className="bg-zinc-700" />
                <div className="flex justify-between text-emerald-400">
                  <span>Savings</span>
                  <span className="font-bold">{fmt(state.summary.traditionalFee - state.summary.relayFee)}</span>
                </div>
              </div>
            )}

            {/* Error */}
            {state.status === "error" && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                <p className="font-semibold mb-1">Error</p>
                <p>{state.error || "Negotiation failed. Please try again."}</p>
                <Button size="sm" variant="outline" onClick={reset} className="mt-3 gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" /> Retry
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
