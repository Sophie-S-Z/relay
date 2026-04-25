"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, CheckCircle, Loader2 } from "lucide-react"
import type { SellerOnboardingData } from "@/lib/agents/types"

const STEPS = ["Business Basics", "Financials", "Sale Preferences"]

const INDUSTRIES = [
  "B2B SaaS", "SaaS", "E-Commerce", "Professional Services",
  "Healthcare", "Manufacturing", "Retail", "Hospitality", "Construction", "Other",
]

export default function SellerOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    description: "",
    foundedYear: new Date().getFullYear() - 5,
    headquarters: "",
    employeeCount: 10,
    revenue: "",
    ebitda: "",
    netIncome: "",
    revenueGrowthRate: "",
    grossMargin: "",
    askingPrice: "",
    dealStructurePreference: "flexible",
    timeline: "6_months",
    motivations: "",
    exclusions: "",
    contactName: "",
    contactEmail: "",
    confidentialityLevel: "high",
  })

  const set = (k: string, v: string | number | null) => setForm(f => ({ ...f, [k]: v ?? "" }))

  const buildPayload = (): SellerOnboardingData => ({
    companyName: form.companyName,
    industry: form.industry,
    description: form.description,
    foundedYear: Number(form.foundedYear),
    headquarters: form.headquarters,
    employeeCount: Number(form.employeeCount),
    financials: {
      revenue: Number(form.revenue.replace(/[^0-9.]/g, "")),
      ebitda: Number(form.ebitda.replace(/[^0-9.]/g, "")),
      netIncome: Number(form.netIncome.replace(/[^0-9.]/g, "")),
      revenueGrowthRate: Number(form.revenueGrowthRate) / 100,
      grossMargin: Number(form.grossMargin) / 100,
      fiscalYearEnd: "December",
    },
    askingPrice: form.askingPrice ? Number(form.askingPrice.replace(/[^0-9.]/g, "")) : null,
    dealStructurePreference: form.dealStructurePreference as SellerOnboardingData["dealStructurePreference"],
    timeline: form.timeline as SellerOnboardingData["timeline"],
    motivations: form.motivations.split(",").map(s => s.trim()).filter(Boolean),
    exclusions: form.exclusions.split(",").map(s => s.trim()).filter(Boolean),
    contactName: form.contactName,
    contactEmail: form.contactEmail,
    confidentialityLevel: form.confidentialityLevel as "high" | "standard",
  })

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      setLoading(true)
      try {
        const payload = buildPayload()
        const sessionId = crypto.randomUUID()
        const res = await fetch("/api/valuation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sellerData: payload, sessionId }),
        })
        const memo = await res.json()
        sessionStorage.setItem("relay_seller_data", JSON.stringify(payload))
        sessionStorage.setItem("relay_valuation", JSON.stringify(memo))
        sessionStorage.setItem("relay_session_id", sessionId)
        router.push("/seller/valuation")
      } catch {
        alert("Failed to calculate valuation. Please try again.")
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">R</div>
            <span className="font-semibold text-zinc-900 text-sm">Relay</span>
          </div>
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
            Seller Onboarding
          </Badge>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Steps */}
        <div className="flex items-center gap-2 mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 text-sm font-medium ${i === step ? "text-emerald-700" : i < step ? "text-emerald-600" : "text-zinc-400"}`}>
                {i < step ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold ${i === step ? "border-emerald-500 text-emerald-500" : "border-zinc-300 text-zinc-400"}`}>
                    {i + 1}
                  </div>
                )}
                <span className="hidden sm:inline">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`h-px w-8 ${i < step ? "bg-emerald-400" : "bg-zinc-200"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 p-8">
          <h1 className="text-xl font-bold text-zinc-900 mb-1">{STEPS[step]}</h1>
          <p className="text-sm text-zinc-500 mb-6">
            {step === 0 && "Tell us about your business so buyers can understand what you've built."}
            {step === 1 && "Your financial data drives the AI valuation. We protect this with your confidentiality settings."}
            {step === 2 && "Set your sale preferences. These become your agent's mandate — fully confidential."}
          </p>

          {/* Step 0: Business Basics */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">Company Name *</Label>
                  <Input value={form.companyName} onChange={e => set("companyName", e.target.value)} placeholder="CloudTrack Pro" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">Industry *</Label>
                  <Select value={form.industry} onValueChange={v => set("industry", v)}>
                    <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">Business Description *</Label>
                <Textarea
                  value={form.description}
                  onChange={e => set("description", e.target.value)}
                  placeholder="Describe your business, product/service, and customer base..."
                  className="h-24 resize-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">Founded Year</Label>
                  <Input type="number" value={form.foundedYear} onChange={e => set("foundedYear", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">Headquarters</Label>
                  <Input value={form.headquarters} onChange={e => set("headquarters", e.target.value)} placeholder="Austin, TX" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">Employees</Label>
                  <Input type="number" value={form.employeeCount} onChange={e => set("employeeCount", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">Contact Name</Label>
                  <Input value={form.contactName} onChange={e => set("contactName", e.target.value)} placeholder="Sarah Chen" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">Contact Email</Label>
                  <Input type="email" value={form.contactEmail} onChange={e => set("contactEmail", e.target.value)} placeholder="sarah@company.com" />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Financials */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="p-3 bg-emerald-50 rounded-lg text-xs text-emerald-700 border border-emerald-200">
                Your financial data is encrypted and only used to generate your valuation and agent mandate. It is never shared with buyers directly.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">Annual Revenue (LTM) *</Label>
                  <Input value={form.revenue} onChange={e => set("revenue", e.target.value)} placeholder="1,200,000" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">EBITDA (LTM) *</Label>
                  <Input value={form.ebitda} onChange={e => set("ebitda", e.target.value)} placeholder="480,000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">Net Income</Label>
                  <Input value={form.netIncome} onChange={e => set("netIncome", e.target.value)} placeholder="360,000" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">Revenue Growth Rate (% YoY)</Label>
                  <Input type="number" value={form.revenueGrowthRate} onChange={e => set("revenueGrowthRate", e.target.value)} placeholder="40" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">Gross Margin (%)</Label>
                <Input type="number" value={form.grossMargin} onChange={e => set("grossMargin", e.target.value)} placeholder="85" />
              </div>
            </div>
          )}

          {/* Step 2: Sale Preferences */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">Asking Price (optional — AI will suggest)</Label>
                <Input value={form.askingPrice} onChange={e => set("askingPrice", e.target.value)} placeholder="Leave blank for AI recommendation" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">Deal Structure Preference</Label>
                  <Select value={form.dealStructurePreference} onValueChange={v => set("dealStructurePreference", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flexible">Flexible</SelectItem>
                      <SelectItem value="asset_sale">Asset Sale</SelectItem>
                      <SelectItem value="stock_sale">Stock Sale</SelectItem>
                      <SelectItem value="merger">Merger</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">Target Timeline</Label>
                  <Select value={form.timeline} onValueChange={v => set("timeline", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate (&lt; 30 days)</SelectItem>
                      <SelectItem value="3_months">3 months</SelectItem>
                      <SelectItem value="6_months">6 months</SelectItem>
                      <SelectItem value="12_months_plus">12+ months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">Reasons for Selling (comma-separated)</Label>
                <Input value={form.motivations} onChange={e => set("motivations", e.target.value)} placeholder="Founder retirement, seeking liquidity for next venture" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">Asset Exclusions (comma-separated, if any)</Label>
                <Input value={form.exclusions} onChange={e => set("exclusions", e.target.value)} placeholder="Personal vehicle, IP not related to core product" />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => step === 0 ? router.push("/") : setStep(s => s - 1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 0 ? "Back to Home" : "Previous"}
          </Button>
          <Button
            onClick={handleNext}
            disabled={loading}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Calculating valuation...</>
            ) : step === STEPS.length - 1 ? (
              <>Get My Valuation <ArrowRight className="h-4 w-4" /></>
            ) : (
              <>Continue <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
