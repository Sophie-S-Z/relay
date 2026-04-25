"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, TrendingUp, AlertTriangle, CheckCircle, Info, Lock, Plus } from "lucide-react"
import type { ValuationMemo } from "@/lib/agents/types"
import type { SellerOnboardingData } from "@/lib/agents/types"

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

function fmtK(n: number) {
  return n >= 1_000_000 ? fmt(n) : `$${n.toLocaleString()}`
}

export default function ValuationPage() {
  const router = useRouter()
  const [valuation, setValuation] = useState<ValuationMemo | null>(null)
  const [seller, setSeller] = useState<SellerOnboardingData | null>(null)

  useEffect(() => {
    const v = sessionStorage.getItem("relay_valuation")
    const s = sessionStorage.getItem("relay_seller_data")
    if (!v || !s) { router.push("/seller"); return }
    setValuation(JSON.parse(v))
    setSeller(JSON.parse(s))
  }, [router])

  if (!valuation || !seller) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="animate-spin w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const sde = valuation.sde ?? 0
  const breakdown = valuation.sdeBreakdown ?? { netIncome: 0, ownerCompensation: 0, adjustments: 0 }
  const multiple = valuation.adjustedMultiple ?? 3
  const totalAddBacks = (seller.financials.addBacks ?? []).reduce((s, a) => s + a.amount, 0)

  const midPct = (valuation.range.mid - valuation.range.low) / (valuation.range.high - valuation.range.low)

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">R</div>
            <span className="font-semibold text-zinc-900 text-sm">Relay</span>
            <span className="text-zinc-300 mx-1">·</span>
            <span className="text-sm text-zinc-500">{seller.companyName}</span>
          </div>
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Valuation Complete</Badge>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-5">

        {/* Hero card: range */}
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-8 pt-8 pb-6">
            <div className="text-xs text-zinc-400 font-medium uppercase tracking-wide mb-1">{seller.industry} · {new Date(valuation.analysisDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
            <h1 className="text-xl font-bold text-zinc-900 mb-6">AI Valuation Report</h1>

            <div className="mb-2">
              <div className="flex justify-between text-xs text-zinc-400 mb-3">
                <span>Conservative</span>
                <span className="text-zinc-600 font-medium">Recommended</span>
                <span>Optimistic</span>
              </div>
              <div className="relative h-12 bg-zinc-100 rounded-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-100 via-emerald-300 to-emerald-100 opacity-40" />
                <div className="absolute top-0 bottom-0 bg-emerald-500/20 rounded-xl"
                  style={{ left: "20%", right: "20%" }} />
                <div
                  className="absolute top-2 bottom-2 w-1 bg-emerald-600 rounded-full shadow"
                  style={{ left: `calc(${midPct * 100}% - 2px)` }}
                />
              </div>
              <div className="flex justify-between mt-2.5">
                <div className="text-left">
                  <div className="text-lg font-bold text-zinc-600">{fmt(valuation.range.low)}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600">{fmt(valuation.range.mid)}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">Mid-point anchor</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-zinc-600">{fmt(valuation.range.high)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 pb-6">
            <div className="flex items-start gap-2 p-3.5 bg-emerald-50 rounded-lg border border-emerald-200">
              <Info className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800 leading-relaxed">{valuation.recommendation}</p>
            </div>
          </div>
        </div>

        {/* SDE Waterfall */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-zinc-900 text-sm">SDE Waterfall</h2>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Lock className="h-3 w-3" /> Confidential — not shared with buyers
            </div>
          </div>

          <div className="space-y-0">
            {[
              { label: "Net Income (LTM)", amount: breakdown.netIncome, color: "text-zinc-800", bg: "bg-zinc-50", border: "border-zinc-200" },
              { label: `+ Owner Salary & Compensation`, amount: breakdown.ownerCompensation, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-100" },
              ...(totalAddBacks > 0 ? [{ label: `+ Discretionary Add-Backs (${(seller.financials.addBacks ?? []).length} items)`, amount: totalAddBacks, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-100" }] : []),
              ...((breakdown.adjustments - totalAddBacks) > 0 ? [{ label: "+ D&A & Interest", amount: breakdown.adjustments - totalAddBacks, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-100" }] : []),
            ].map((row, i) => (
              <div key={i} className={`flex items-center justify-between px-4 py-3 ${row.bg} border ${row.border} ${i === 0 ? "rounded-t-lg" : "border-t-0"}`}>
                <span className="text-sm text-zinc-600">{row.label}</span>
                <span className={`font-mono font-semibold text-sm ${row.color}`}>{fmtK(row.amount)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3.5 bg-emerald-600 text-white rounded-b-lg">
              <div>
                <div className="font-semibold text-sm">= Seller&apos;s Discretionary Earnings (SDE)</div>
                <div className="text-xs text-emerald-200 mt-0.5">× {multiple.toFixed(2)}x adjusted industry multiple</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold font-mono">{fmtK(sde)}</div>
                <div className="text-xs text-emerald-200">÷ {multiple.toFixed(2)}× = {fmt(valuation.range.mid)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Valuation methods */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <h2 className="font-semibold text-zinc-900 text-sm mb-4">Valuation Methods</h2>
          <div className="space-y-2.5">
            {valuation.methods.map(m => (
              <div key={m.method} className="flex items-center gap-4 p-3.5 bg-zinc-50 rounded-lg border border-zinc-100">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-800 capitalize">{m.method.replace(/_/g, " ")}</div>
                  <div className="text-xs text-zinc-400 mt-0.5 truncate">{m.assumptions[0]}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-semibold text-zinc-900 font-mono">{fmtK(m.value)}</div>
                  <div className="text-xs text-zinc-400">{(m.weight * 100).toFixed(0)}% weight</div>
                </div>
                <div className="w-12 bg-zinc-200 rounded-full h-1.5 flex-shrink-0">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${m.weight * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Drivers & Risks */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-zinc-200 rounded-xl p-5">
            <h2 className="font-semibold text-zinc-900 text-sm mb-3 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Value Drivers
            </h2>
            <ul className="space-y-2">
              {valuation.keyValueDrivers.slice(0, 5).map((d, i) => (
                <li key={i} className="text-xs text-zinc-600 leading-relaxed pl-3 border-l-2 border-emerald-200">
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border border-zinc-200 rounded-xl p-5">
            <h2 className="font-semibold text-zinc-900 text-sm mb-3 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Risk Factors
            </h2>
            {valuation.risks.length > 0 ? (
              <ul className="space-y-2">
                {valuation.risks.slice(0, 5).map((r, i) => (
                  <li key={i} className="text-xs text-zinc-600 leading-relaxed pl-3 border-l-2 border-amber-200 line-clamp-2">
                    {r}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> No significant risk factors
              </div>
            )}
          </div>
        </div>

        {/* Mandate CTA */}
        <div className="bg-zinc-900 text-white rounded-xl p-7">
          <h2 className="text-lg font-bold mb-1.5">Set your confidential mandate</h2>
          <p className="text-zinc-400 text-sm mb-5 leading-relaxed max-w-lg">
            Your mandate defines your private negotiation floor: minimum price, earnout tolerance, and hard no&apos;s. Buyers never see these parameters — only the AI agent does.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Min price (private)", value: fmtK(Math.round(valuation.range.mid * 0.85)) },
              { label: "Ask price (public)", value: fmtK(Math.round(valuation.range.mid * 1.05)) },
              { label: "Adjusted multiple", value: `${multiple.toFixed(2)}×` },
            ].map(item => (
              <div key={item.label} className="bg-white/10 rounded-lg p-3">
                <div className="text-zinc-400 text-xs mb-1">{item.label}</div>
                <div className="font-semibold font-mono">{item.value}</div>
              </div>
            ))}
          </div>
          <Button
            onClick={() => router.push("/demo")}
            className="bg-emerald-500 hover:bg-emerald-400 text-white gap-2 h-10"
          >
            Proceed to Negotiation Demo <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-xs text-zinc-400 text-center pb-4">
          Valuation generated {new Date(valuation.analysisDate).toLocaleDateString()} · {seller.financials.yearlyData?.length ?? 1}-year historical data · {seller.industry}
        </p>
      </div>
    </div>
  )
}
