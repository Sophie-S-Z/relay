"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle, Download, RotateCcw, TrendingDown, ArrowRight,
  Loader2, DollarSign, Clock, Shield, Star
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

function fmt(n: number) {
  if (!n) return "$0"
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

export default function DealPage() {
  const router = useRouter()
  const [loiContent, setLoiContent] = useState("")
  const [generating, setGenerating] = useState(false)
  const [loiDone, setLoiDone] = useState(false)

  // Demo fallback values
  const agreedPrice = 3_100_000
  const relayFee = Math.round(agreedPrice * 0.025)
  const traditionalFee = Math.round(agreedPrice * 0.09)
  const savings = traditionalFee - relayFee
  const rounds = 4
  const fairness = 91

  const feeData = [
    { name: "Relay (2.5%)", value: relayFee, color: "#10B981" },
    { name: "Traditional (9%)", value: traditionalFee, color: "#EF4444" },
  ]

  const dealStructure = [
    { label: "Cash at Closing (70%)", value: Math.round(agreedPrice * 0.70), color: "#10B981" },
    { label: "Seller Note (15%)", value: Math.round(agreedPrice * 0.15), color: "#3B82F6" },
    { label: "Earnout (15%)", value: Math.round(agreedPrice * 0.15), color: "#8B5CF6" },
  ]

  const generateLOI = async () => {
    setGenerating(true)
    try {
      const res = await fetch("/api/generate-loi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposal: {
            id: crypto.randomUUID(),
            sessionId: sessionStorage.getItem("relay_session_id") || "demo",
            proposingParty: "seller",
            version: 8,
            submittedAt: new Date().toISOString(),
            purchasePrice: agreedPrice,
            priceStructure: {
              cashAtClose: Math.round(agreedPrice * 0.70),
              earnout: Math.round(agreedPrice * 0.15),
              earnoutConditions: "Revenue retention ≥ 90% in Year 1",
              sellerFinancing: Math.round(agreedPrice * 0.15),
              rolloverEquity: 0,
            },
            dealStructure: "stock_sale",
            exclusivity: { requested: true, periodDays: 75 },
            dueDiligencePeriodDays: 75,
            closingConditions: [
              "Completion of satisfactory due diligence",
              "Board approval from both parties",
              "Key employee retention agreements",
            ],
            representationsAndWarranties: true,
            indemnificationCap: Math.round(agreedPrice * 0.15),
            nonCompetePeriodMonths: 36,
            keyPersonRetention: ["Sarah Chen (90-day transition)"],
            breakupFee: null,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            notes: "Agreed terms after 4 rounds of AI-facilitated negotiation.",
            status: "accepted",
          },
          sellerCompany: "CloudTrack Pro",
          buyerName: "Apex Growth Partners",
        }),
      })
      const data = await res.json()
      setLoiContent(data.content || "")
      setLoiDone(true)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">R</div>
            <span className="font-semibold text-zinc-900 text-sm">Relay</span>
          </div>
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Deal Complete</Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Hero deal card */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl p-8 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-emerald-100 text-sm mb-1">CloudTrack Pro × Apex Growth Partners</div>
                <h1 className="text-3xl font-bold mb-1">Deal Agreed</h1>
                <div className="text-emerald-100 text-sm">{rounds} rounds · {fairness}% fairness score</div>
              </div>
              <CheckCircle className="h-12 w-12 text-emerald-200" />
            </div>
            <div className="text-5xl font-bold mb-2">{fmt(agreedPrice)}</div>
            <div className="text-emerald-100 text-sm">Stock Sale · 75-day due diligence · 90-day transition</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { icon: DollarSign, label: "Relay Fee (2.5%)", value: fmt(relayFee), sub: `vs ${fmt(traditionalFee)} traditional`, good: true },
            { icon: TrendingDown, label: "Your Savings", value: fmt(savings), sub: "vs. 9% broker fee", good: true },
            { icon: Clock, label: "Time to LOI", value: `${rounds} rounds`, sub: "~8 minutes live", good: true },
          ].map(({ icon: Icon, label, value, sub, good }) => (
            <div key={label} className="bg-white border border-zinc-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${good ? "text-emerald-500" : "text-zinc-500"}`} />
                <span className="text-xs text-zinc-500">{label}</span>
              </div>
              <div className="text-2xl font-bold text-zinc-900 mb-0.5">{value}</div>
              <div className="text-xs text-zinc-400">{sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Deal structure */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6">
            <h2 className="font-semibold text-zinc-900 mb-4">Deal Structure</h2>
            <div className="space-y-3">
              {dealStructure.map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-600">{item.label}</span>
                    <span className="font-semibold text-zinc-900">{fmt(item.value)}</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(item.value / agreedPrice) * 100}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fee comparison */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6">
            <h2 className="font-semibold text-zinc-900 mb-4">Fee Comparison</h2>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={feeData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v) => [fmt(Number(v ?? 0))]} />
                <Bar dataKey="value" radius={4}>
                  {feeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 p-2 bg-emerald-50 rounded-lg text-xs text-emerald-700 text-center font-medium border border-emerald-200">
              You save {fmt(savings)} with Relay
            </div>
          </div>
        </div>

        {/* Key terms */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6 mb-6">
          <h2 className="font-semibold text-zinc-900 mb-4">Key Terms Agreed</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { term: "Purchase Price", value: fmt(agreedPrice) },
              { term: "Deal Structure", value: "Stock Sale" },
              { term: "Cash at Closing", value: `${fmt(Math.round(agreedPrice * 0.70))} (70%)` },
              { term: "Due Diligence", value: "75 days" },
              { term: "Seller Note", value: `${fmt(Math.round(agreedPrice * 0.15))} @ 5% / 3yr` },
              { term: "Exclusivity", value: "75 days from signing" },
              { term: "Earnout", value: `${fmt(Math.round(agreedPrice * 0.15))} — 90% rev retention` },
              { term: "Non-Compete", value: "36 months" },
              { term: "Transition Period", value: "90 days (founder)" },
              { term: "Indemnification Cap", value: `${fmt(Math.round(agreedPrice * 0.15))} (15%)` },
            ].map(({ term, value }) => (
              <div key={term} className="flex justify-between p-2 bg-zinc-50 rounded-lg">
                <span className="text-zinc-500">{term}</span>
                <span className="font-medium text-zinc-900">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* LOI generation */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-zinc-900">Letter of Intent (Non-Binding)</h2>
              <p className="text-sm text-zinc-500 mt-0.5">AI-generated LOI based on agreed terms. Review before signing.</p>
            </div>
            {!loiDone && (
              <Button
                onClick={generateLOI}
                disabled={generating}
                className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2"
              >
                {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <>Generate LOI <ArrowRight className="h-4 w-4" /></>}
              </Button>
            )}
          </div>

          {loiContent && (
            <div className="bg-zinc-50 rounded-lg border border-zinc-200 p-4 max-h-80 overflow-y-auto">
              <pre className="text-xs text-zinc-700 font-mono whitespace-pre-wrap leading-relaxed">{loiContent}</pre>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6 justify-center">
          <Button variant="outline" onClick={() => router.push("/negotiate")} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Run Another Demo
          </Button>
          <Button variant="outline" onClick={() => router.push("/demo")} className="gap-2">
            <Shield className="h-4 w-4" /> God-Mode View
          </Button>
        </div>
      </div>
    </div>
  )
}
