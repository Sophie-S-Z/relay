"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, Loader2, BarChart3, TrendingUp, Users, FileText, AlertTriangle } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

interface CIMSection {
  title: string
  content: string
}

export default function CIMPage() {
  const router = useRouter()
  const [sections, setSections] = useState<CIMSection[]>([])
  const [loading, setLoading] = useState(true)
  const [valuation, setValuation] = useState<{ range: { low: number; mid: number; high: number } } | null>(null)

  useEffect(() => {
    const sessionId = sessionStorage.getItem("relay_session_id") || crypto.randomUUID()
    const sellerData = JSON.parse(sessionStorage.getItem("relay_seller_data") || "null")
    const val = JSON.parse(sessionStorage.getItem("relay_valuation") || "null")
    if (val) setValuation(val)

    fetch("/api/generate-cim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellerData, valuation: val, sessionId }),
    })
      .then(r => r.json())
      .then(d => setSections(d.sections || []))
      .finally(() => setLoading(false))
  }, [])

  const revenueData = [
    { year: "2022", revenue: 0.6, ebitda: 0.18 },
    { year: "2023", revenue: 0.86, ebitda: 0.28 },
    { year: "2024", revenue: 1.2, ebitda: 0.48 },
  ]

  const fmt = (n: number) => `$${(n / 1_000_000).toFixed(2)}M`

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Generating CIM...</p>
        </div>
      </div>
    )
  }

  const getSection = (title: string) => sections.find(s => s.title === title)?.content || ""

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">R</div>
            <span className="font-semibold text-zinc-900 text-sm">Relay</span>
            <span className="text-zinc-300 mx-2">·</span>
            <span className="text-sm text-zinc-500">CloudTrack Pro — CIM</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Confidential</Badge>
            <Button
              onClick={() => router.push("/negotiate")}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            >
              Proceed to Negotiation <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Hero summary */}
        <div className="bg-white border border-zinc-200 rounded-xl p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">CloudTrack Pro</h1>
              <p className="text-zinc-500 text-sm">B2B SaaS · Austin, TX · 18 employees</p>
            </div>
            {valuation && (
              <div className="text-right">
                <div className="text-xs text-zinc-400 mb-0.5">Asking Price Range</div>
                <div className="text-xl font-bold text-emerald-600">{fmt(valuation.range.low)} – {fmt(valuation.range.high)}</div>
              </div>
            )}
          </div>
          <p className="text-sm text-zinc-600 leading-relaxed">{getSection("Executive Summary")}</p>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-6 bg-white border border-zinc-200">
            <TabsTrigger value="overview" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Overview</TabsTrigger>
            <TabsTrigger value="financials" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Financials</TabsTrigger>
            <TabsTrigger value="growth" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Growth</TabsTrigger>
            <TabsTrigger value="deal" className="gap-1.5"><Users className="h-3.5 w-3.5" />Deal Terms</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-4">
              {["Business Description", "Investment Highlights", "Reason for Sale"].map(title => {
                const content = getSection(title)
                if (!content) return null
                return (
                  <div key={title} className="bg-white border border-zinc-200 rounded-xl p-6">
                    <h2 className="font-semibold text-zinc-900 mb-3">{title}</h2>
                    <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">{content}</p>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="financials">
            <div className="space-y-4">
              {/* Chart */}
              <div className="bg-white border border-zinc-200 rounded-xl p-6">
                <h2 className="font-semibold text-zinc-900 mb-4">Revenue & EBITDA Trend ($M)</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}M`} />
                    <Tooltip formatter={(v) => [`$${Number(v ?? 0)}M`]} />
                    <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: "#3B82F6" }} name="Revenue" />
                    <Line type="monotone" dataKey="ebitda" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4, fill: "#10B981" }} name="EBITDA" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Revenue (LTM)", value: "$1.2M", sub: "+40% YoY", color: "blue" },
                  { label: "EBITDA (LTM)", value: "$480K", sub: "40% margin", color: "emerald" },
                  { label: "Gross Margin", value: "85%", sub: "High-quality SaaS", color: "violet" },
                ].map(m => (
                  <div key={m.label} className="bg-white border border-zinc-200 rounded-xl p-4">
                    <div className="text-xs text-zinc-500 mb-1">{m.label}</div>
                    <div className="text-2xl font-bold text-zinc-900">{m.value}</div>
                    <div className={`text-xs text-${m.color}-600 font-medium mt-0.5`}>{m.sub}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-6">
                <h2 className="font-semibold text-zinc-900 mb-3">Financial Overview</h2>
                <pre className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap font-sans">{getSection("Financial Overview")}</pre>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="growth">
            <div className="space-y-4">
              <div className="bg-white border border-zinc-200 rounded-xl p-6">
                <h2 className="font-semibold text-zinc-900 mb-3">Growth Opportunities</h2>
                <p className="text-sm text-zinc-600 leading-relaxed">{getSection("Growth Opportunities")}</p>
              </div>
              <div className="bg-white border border-zinc-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h2 className="font-semibold text-zinc-900">Risk Factors</h2>
                </div>
                <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">{getSection("Risk Factors")}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="deal">
            <div className="space-y-4">
              <div className="bg-white border border-zinc-200 rounded-xl p-6">
                <h2 className="font-semibold text-zinc-900 mb-3">Transaction Overview</h2>
                <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">{getSection("Transaction Overview")}</p>
              </div>
              <div className="bg-white border border-zinc-200 rounded-xl p-6">
                <p className="text-xs text-zinc-400 italic">{getSection("Disclaimer")}</p>
              </div>
              <Button
                onClick={() => router.push("/negotiate")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 h-12"
              >
                Proceed to AI Negotiation <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
