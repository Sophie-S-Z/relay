"use client"

import { useEffect, useRef, useState } from "react"
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

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`
}

function TermPill({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "buyer" | "seller" }) {
  const bg = accent === "buyer" ? "bg-blue-50 border-blue-100" : accent === "seller" ? "bg-emerald-50 border-emerald-100" : "bg-zinc-50 border-zinc-200"
  const val = accent === "buyer" ? "text-blue-800" : accent === "seller" ? "text-emerald-800" : "text-zinc-800"
  return (
    <div className={`px-3 py-2 rounded-lg border ${bg}`}>
      <div className="text-[10px] text-zinc-400 mb-0.5 uppercase tracking-wide">{label}</div>
      <div className={`text-sm font-semibold font-mono ${val}`}>{value}</div>
      {sub && <div className="text-[10px] text-zinc-400">{sub}</div>}
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
      {/* Thread line */}
      <div className="absolute left-[18px] top-8 bottom-0 w-px bg-zinc-100 -z-0" aria-hidden />

      <div className={`w-[calc(100%-32px)] rounded-xl border p-4 relative ${
        isBuyer ? "bg-white border-zinc-200" : "bg-white border-zinc-200 ml-8"
      } ${isAccepted ? "ring-2 ring-emerald-400 shadow-emerald-50 shadow-md" : ""}
        ${isEscalate ? "ring-2 ring-amber-300" : ""}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${isBuyer ? "bg-blue-500" : "bg-emerald-500"}`}>
              {isBuyer ? "B" : "S"}
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-800">
                {isBuyer ? "Apex Growth Partners" : "Sarah Chen · CloudTrack Pro"}
                <span className="ml-1.5 text-zinc-400 font-normal">Round {round}</span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {isBuyer ? "Buyer Agent" : "Seller Agent"}
                {isAccepted && <span className="ml-1.5 text-emerald-600 font-medium">· Accepted</span>}
                {isEscalate && <span className="ml-1.5 text-amber-600 font-medium">· Needs Review</span>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xl font-bold font-mono ${isBuyer ? "text-blue-600" : "text-emerald-700"}`}>
              {fmt(proposal.purchasePrice)}
            </div>
          </div>
        </div>

        {/* Terms */}
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

        {/* Expandable reasoning */}
        {proposal.notes && (
          <div className="mt-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Agent reasoning
            </button>
            {expanded && (
              <div className="mt-2 text-xs text-zinc-500 leading-relaxed bg-zinc-50 rounded-lg p-3 border border-zinc-100">
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
  const { state, start, reset } = useNegotiation()
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
    <div className="min-h-screen bg-[#F8F8F8]">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">R</div>
            <span className="font-semibold text-zinc-900 text-sm">Relay</span>
            <span className="text-zinc-200">·</span>
            <span className="text-sm text-zinc-400">CloudTrack Pro</span>
          </div>
          <div className="flex items-center gap-2.5">
            {isRunning && (
              <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Agents active
              </div>
            )}
            {isAgreed && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Deal reached</Badge>}
            <Button variant="ghost" size="sm" onClick={() => router.push("/demo")} className="text-xs text-zinc-500 h-8">
              God-mode →
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="grid grid-cols-3 gap-5">

          {/* ── LEFT: Timeline ── */}
          <div className="col-span-2 space-y-3">

            {/* Idle state */}
            {state.status === "idle" && (
              <div className="bg-white border border-zinc-200 rounded-xl p-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-200">
                  <Zap className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-lg font-bold text-zinc-900 mb-2">Ready to negotiate</h2>
                <p className="text-sm text-zinc-500 mb-6 max-w-xs mx-auto leading-relaxed">
                  Two AI agents will negotiate the acquisition of CloudTrack Pro. Neither can see the other&apos;s confidential parameters.
                </p>
                <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mb-7 text-xs">
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-left">
                    <div className="font-semibold text-emerald-700 mb-1.5">Seller</div>
                    <div className="text-zinc-600">Sarah Chen</div>
                    <div className="text-zinc-400 font-mono mt-0.5">Ask $3.78M</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-left">
                    <div className="font-semibold text-blue-700 mb-1.5">Buyer</div>
                    <div className="text-zinc-600">James Park</div>
                    <div className="text-zinc-400 font-mono mt-0.5">Opens $2.4–2.7M</div>
                  </div>
                </div>
                <Button
                  onClick={() => start(true)}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2 h-10 px-7"
                >
                  <Play className="h-3.5 w-3.5" /> Start AI Negotiation
                </Button>
              </div>
            )}

            {/* Proposals */}
            {state.proposals.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold text-zinc-700">Negotiation Timeline</h2>
                  <span className="text-xs text-zinc-400">{Math.ceil(state.proposals.length / 2)} rounds · {state.proposals.length} proposals</span>
                </div>

                {state.proposals.map((p, i) => (
                  <ProposalCard key={p.id || i} proposal={p} index={i} />
                ))}

                {isRunning && (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm text-zinc-400">
                    <div className="flex gap-0.5">
                      {[0, 150, 300].map(d => (
                        <div key={d} className="w-1.5 h-1.5 rounded-full bg-zinc-300 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                    <span className="text-xs">Agent formulating response...</span>
                  </div>
                )}

                {state.status === "checkpoint" && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-zinc-900 text-sm mb-1">Human Approval Required</h3>
                        <p className="text-sm text-zinc-600 mb-4">{state.checkpointReason ?? "An agent has flagged this for review."}</p>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs">Approve &amp; Continue</Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 h-8 text-xs">Reject</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isDone && (
                  <div className={`rounded-xl p-6 border-2 ${isAgreed ? "bg-emerald-50 border-emerald-200" : "bg-white border-zinc-200"}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${isAgreed ? "bg-emerald-100" : "bg-zinc-100"}`}>
                        {isAgreed
                          ? <CheckCircle className="h-6 w-6 text-emerald-500" />
                          : <Clock className="h-6 w-6 text-zinc-400" />
                        }
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-zinc-900">{isAgreed ? "Deal Reached" : "Negotiation Complete"}</h3>
                        {state.summary && isAgreed && (
                          <p className="text-sm text-zinc-500 mt-0.5">
                            {fmt(state.proposals[state.proposals.length - 1]?.purchasePrice || 0)} · {state.summary.totalRounds} rounds · {(state.summary.fairnessScore * 100).toFixed(0)}% fairness
                          </p>
                        )}
                        {!isAgreed && (
                          <p className="text-sm text-zinc-500 mt-0.5">{state.round} rounds completed</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => router.push("/deal")}
                          className="bg-zinc-900 hover:bg-zinc-800 text-white gap-1.5 h-9 text-sm"
                        >
                          Deal Summary <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" onClick={reset} className="gap-1.5 h-9 text-sm">
                          <RotateCcw className="h-3.5 w-3.5" /> Again
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {state.status === "error" && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-red-800 mb-1">Negotiation error</p>
                    <p className="text-xs text-red-600">{state.error ?? "Connection failed. Please retry."}</p>
                    <Button size="sm" variant="outline" onClick={reset} className="mt-3 gap-1.5 h-8 text-xs">
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

            {/* Positions */}
            <div className="bg-white border border-zinc-200 rounded-xl p-4">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-3">Current Positions</div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    Seller ask
                  </div>
                  <span className="font-mono font-semibold text-sm text-emerald-700">{latestSeller ? fmt(latestSeller.purchasePrice) : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Buyer offer
                  </div>
                  <span className="font-mono font-semibold text-sm text-blue-600">{latestBuyer ? fmt(latestBuyer.purchasePrice) : "—"}</span>
                </div>
                {gap !== null && gap > 0 && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <TrendingDown className="h-3 w-3 text-amber-500" />
                        Gap
                      </div>
                      <span className="font-mono font-medium text-amber-600">{fmt(gap)}</span>
                    </div>
                    {gapPct !== null && (
                      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, gapPct)}%` }}
                        />
                      </div>
                    )}
                  </>
                )}
                {gap !== null && gap <= 0 && (
                  <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                    <CheckCircle className="h-3.5 w-3.5" /> Prices crossed — deal zone!
                  </div>
                )}
              </div>
            </div>

            {/* Convergence chart */}
            {state.convergenceHistory.length >= 2 && (
              <div className="bg-white border border-zinc-200 rounded-xl p-4">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-3">Price Convergence</div>
                <ResponsiveContainer width="100%" height={130}>
                  <LineChart data={state.convergenceHistory} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                    <XAxis dataKey="round" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1e6).toFixed(1)}M`} width={40} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(v) => [fmt(Number(v ?? 0))]}
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e4e4e7" }}
                    />
                    <Line type="monotone" dataKey="sellerPrice" stroke="#10B981" strokeWidth={2} dot={{ r: 2.5, fill: "#10B981" }} name="Seller" />
                    <Line type="monotone" dataKey="buyerPrice" stroke="#3B82F6" strokeWidth={2} dot={{ r: 2.5, fill: "#3B82F6" }} name="Buyer" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Convergence score */}
            {state.convergenceHistory.length > 0 && (
              <div className="bg-white border border-zinc-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Convergence</div>
                  <span className="text-sm font-bold text-zinc-700">{latestScore}%</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${latestScore}%`,
                      background: `linear-gradient(90deg, #10B981 0%, #3B82F6 100%)`
                    }}
                  />
                </div>
                <div className="text-[11px] text-zinc-400 mt-1.5">
                  {latestScore < 40 ? "Far apart — agents conceding" : latestScore < 70 ? "Narrowing gap" : latestScore < 90 ? "Near agreement" : "In deal zone"}
                </div>
              </div>
            )}

            {/* Deal summary */}
            {state.summary && (
              <div className="bg-zinc-900 text-white rounded-xl p-4">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-3">Fee Comparison</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Rounds</span>
                    <span className="font-semibold">{state.summary.totalRounds}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Relay (2.5%)</span>
                    <span className="font-mono font-semibold text-emerald-400">{fmt(state.summary.relayFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Traditional (9%)</span>
                    <span className="font-mono text-zinc-500 line-through">{fmt(state.summary.traditionalFee)}</span>
                  </div>
                  <Separator className="bg-zinc-700 my-1" />
                  <div className="flex justify-between text-emerald-400">
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
