"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Plus, Trash2, Lock } from "lucide-react"
import type { SellerOnboardingData } from "@/lib/agents/types"

const STEPS = ["Business Profile", "P&L & SDE", "Quality Signals", "Sale Terms"]

const INDUSTRIES = [
  "B2B SaaS", "SaaS", "E-Commerce", "Professional Services",
  "Healthcare", "Manufacturing", "Retail", "Hospitality", "Construction", "Other",
]

const currentYear = new Date().getFullYear()

type AddBack = { id: string; label: string; amount: string }

export default function SellerOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    description: "",
    foundedYear: String(currentYear - 5),
    headquarters: "",
    employeeCount: "10",
    contactName: "",
    contactEmail: "",
    year1: { revenue: "", expenses: "", netIncome: "" },
    year2: { revenue: "", expenses: "", netIncome: "" },
    year3: { revenue: "", expenses: "", netIncome: "" },
    ownerSalary: "",
    depreciation: "",
    interest: "",
    recurringRevenuePercent: "",
    customerCount: "",
    topCustomerPercent: "",
    grossMargin: "",
    askingPrice: "",
    dealStructurePreference: "flexible",
    timeline: "6_months",
    motivations: "",
    exclusions: "",
    confidentialityLevel: "high",
  })

  const [addBacks, setAddBacks] = useState<AddBack[]>([
    { id: "1", label: "Owner personal expenses", amount: "" },
  ])

  const set = (k: string, v: string | null) => setForm(f => ({ ...f, [k]: v ?? "" }))

  const setNested = (year: "year1" | "year2" | "year3", field: string, v: string) => {
    setForm(f => ({ ...f, [year]: { ...f[year], [field]: v } }))
  }

  const addAddBack = () => {
    setAddBacks(prev => [...prev, { id: crypto.randomUUID(), label: "", amount: "" }])
  }

  const removeAddBack = (id: string) => {
    setAddBacks(prev => prev.filter(a => a.id !== id))
  }

  const updateAddBack = (id: string, field: "label" | "amount", value: string) => {
    setAddBacks(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a))
  }

  const parseNum = (s: string) => Number(s.replace(/[^0-9.-]/g, "")) || 0

  const computedSDE = () => {
    const netIncome = parseNum(form.year3.netIncome)
    const ownerSalary = parseNum(form.ownerSalary)
    const totalAddBacks = addBacks.reduce((sum, a) => sum + parseNum(a.amount), 0)
    const depreciation = parseNum(form.depreciation)
    const interest = parseNum(form.interest)
    return netIncome + ownerSalary + totalAddBacks + depreciation + interest
  }

  const buildPayload = (): SellerOnboardingData => {
    const y1r = parseNum(form.year1.revenue)
    const y3r = parseNum(form.year3.revenue)
    const growthRate = y1r > 0 ? (y3r - y1r) / y1r / 2 : 0

    const netIncome = parseNum(form.year3.netIncome)
    const ownerSalary = parseNum(form.ownerSalary)
    const depreciation = parseNum(form.depreciation)
    const interest = parseNum(form.interest)
    const parsedAddBacks = addBacks
      .filter(a => a.label && parseNum(a.amount) > 0)
      .map(a => ({ label: a.label, amount: parseNum(a.amount) }))
    const totalAddBacks = parsedAddBacks.reduce((s, a) => s + a.amount, 0)
    const sde = netIncome + ownerSalary + totalAddBacks + depreciation + interest

    return {
      companyName: form.companyName,
      industry: form.industry,
      description: form.description,
      foundedYear: Number(form.foundedYear),
      headquarters: form.headquarters,
      employeeCount: Number(form.employeeCount),
      financials: {
        revenue: y3r,
        ebitda: sde,
        revenueGrowthRate: growthRate,
        grossMargin: parseNum(form.grossMargin) / 100,
        netIncome,
        fiscalYearEnd: "December",
        ownerSalary,
        addBacks: parsedAddBacks,
        depreciation,
        interest,
        recurringRevenuePercent: parseNum(form.recurringRevenuePercent),
        customerCount: Number(form.customerCount) || 0,
        topCustomerPercent: parseNum(form.topCustomerPercent),
        yearlyData: [
          { year: currentYear - 2, revenue: parseNum(form.year1.revenue), expenses: parseNum(form.year1.expenses), netIncome: parseNum(form.year1.netIncome) },
          { year: currentYear - 1, revenue: parseNum(form.year2.revenue), expenses: parseNum(form.year2.expenses), netIncome: parseNum(form.year2.netIncome) },
          { year: currentYear, revenue: y3r, expenses: parseNum(form.year3.expenses), netIncome },
        ],
      },
      askingPrice: form.askingPrice ? parseNum(form.askingPrice) : null,
      dealStructurePreference: form.dealStructurePreference as SellerOnboardingData["dealStructurePreference"],
      timeline: form.timeline as SellerOnboardingData["timeline"],
      motivations: form.motivations.split(",").map(s => s.trim()).filter(Boolean),
      exclusions: form.exclusions.split(",").map(s => s.trim()).filter(Boolean),
      contactName: form.contactName,
      contactEmail: form.contactEmail,
      confidentialityLevel: form.confidentialityLevel as "high" | "standard",
    }
  }

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

  const canAdvance = () => {
    if (step === 0) return form.companyName && form.industry && form.description
    if (step === 1) return form.year3.revenue && form.year3.netIncome
    return true
  }

  const sde = computedSDE()
  const fmtCurrency = (n: number) => n > 0 ? `$${n.toLocaleString()}` : "—"

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-lime flex items-center justify-center text-foreground font-bold text-sm">R</div>
            <span className="font-semibold text-foreground">Relay</span>
          </div>
          <Badge variant="secondary" className="bg-lime/30 text-foreground border-lime/50 rounded-full">
            Seller Onboarding
          </Badge>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Step indicators */}
        <div className="flex items-center gap-1.5 mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  i === step
                    ? "bg-lime/30 text-foreground"
                    : i < step
                    ? "text-foreground hover:text-foreground/80 cursor-pointer"
                    : "text-muted-foreground cursor-default"
                }`}
              >
                {i < step ? (
                  <CheckCircle className="h-3.5 w-3.5 text-foreground" />
                ) : (
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${i === step ? "border-foreground text-foreground bg-lime" : "border-border text-muted-foreground"}`}>{i + 1}</span>
                )}
                <span className="hidden sm:inline">{s}</span>
              </button>
              {i < STEPS.length - 1 && <div className={`h-px w-4 ${i < step ? "bg-foreground/30" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm">
          <div className="px-8 pt-8 pb-6 border-b border-border">
            <h1 className="text-lg font-bold text-foreground">{STEPS[step]}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {step === 0 && "Tell us about your business so buyers can understand what you've built."}
              {step === 1 && "Three years of P&L data drives the AI valuation. Owner add-backs are calculated into SDE."}
              {step === 2 && "Revenue quality and customer metrics affect your valuation multiple."}
              {step === 3 && "Define your sale terms. These become your agent's confidential mandate."}
            </p>
          </div>

          <div className="p-8 space-y-5">
            {/* ── Step 0: Business Profile ── */}
            {step === 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">Company Name *</Label>
                    <Input value={form.companyName} onChange={e => set("companyName", e.target.value)} placeholder="CloudTrack Pro" className="rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">Industry *</Label>
                    <Select value={form.industry} onValueChange={v => set("industry", v)}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-foreground mb-1.5 block">Business Description *</Label>
                  <Textarea
                    value={form.description}
                    onChange={e => set("description", e.target.value)}
                    placeholder="Describe your product, customer segments, and key competitive advantages..."
                    className="h-24 resize-none text-sm rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">Founded</Label>
                    <Input type="number" value={form.foundedYear} onChange={e => set("foundedYear", e.target.value)} className="rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">Headquarters</Label>
                    <Input value={form.headquarters} onChange={e => set("headquarters", e.target.value)} placeholder="Austin, TX" className="rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">Employees</Label>
                    <Input type="number" value={form.employeeCount} onChange={e => set("employeeCount", e.target.value)} className="rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">Contact Name</Label>
                    <Input value={form.contactName} onChange={e => set("contactName", e.target.value)} placeholder="Sarah Chen" className="rounded-xl" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">Contact Email</Label>
                    <Input type="email" value={form.contactEmail} onChange={e => set("contactEmail", e.target.value)} placeholder="sarah@company.com" className="rounded-xl" />
                  </div>
                </div>
              </>
            )}

            {/* ── Step 1: P&L & SDE ── */}
            {step === 1 && (
              <>
                <div className="flex items-start gap-2 p-3 bg-lime/20 rounded-xl border border-lime/30 text-xs text-foreground">
                  <Lock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>Financial data is encrypted and used only for valuation. It is never shared with buyers directly.</span>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground mb-2 block">3-Year P&amp;L Summary (USD)</Label>
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary border-b border-border">
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-36">Metric</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">{currentYear - 2}</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">{currentYear - 1}</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-foreground bg-lime/10">{currentYear} (LTM) *</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(["revenue", "expenses", "netIncome"] as const).map((field, fi) => (
                          <tr key={field} className={fi < 2 ? "border-b border-border" : "bg-lime/5"}>
                            <td className="px-4 py-2.5 text-xs font-medium text-foreground">
                              {field === "revenue" ? "Revenue" : field === "expenses" ? "Total Expenses" : "Net Income"}
                              {field === "netIncome" && <span className="text-muted-foreground font-normal"> *</span>}
                            </td>
                            {(["year1", "year2", "year3"] as const).map((yr, yi) => (
                              <td key={yr} className={`px-3 py-1.5 text-right ${yi === 2 ? "bg-secondary/50" : ""}`}>
                                <Input
                                  value={form[yr][field]}
                                  onChange={e => setNested(yr, field, e.target.value)}
                                  placeholder="0"
                                  className="h-7 text-right text-xs font-mono border-border w-28 ml-auto rounded-lg"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">* LTM = Last Twelve Months. Net Income is required for SDE calculation.</p>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-semibold text-foreground">Owner Add-Backs</Label>
                    <span className="text-xs text-muted-foreground">Expenses that flow back as owner benefit</span>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Owner Salary / Compensation</Label>
                        <Input
                          value={form.ownerSalary}
                          onChange={e => set("ownerSalary", e.target.value)}
                          placeholder="150,000"
                          className="font-mono text-sm rounded-xl"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Depreciation &amp; Amortization</Label>
                        <Input
                          value={form.depreciation}
                          onChange={e => set("depreciation", e.target.value)}
                          placeholder="12,000"
                          className="font-mono text-sm rounded-xl"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Interest Expense</Label>
                      <Input
                        value={form.interest}
                        onChange={e => set("interest", e.target.value)}
                        placeholder="0"
                        className="font-mono text-sm rounded-xl"
                      />
                    </div>

                    <div className="space-y-2 pt-1">
                      <Label className="text-xs text-muted-foreground block">Discretionary Add-Backs</Label>
                      {addBacks.map(ab => (
                        <div key={ab.id} className="flex items-center gap-2">
                          <Input
                            value={ab.label}
                            onChange={e => updateAddBack(ab.id, "label", e.target.value)}
                            placeholder="e.g. Personal auto lease"
                            className="text-sm flex-1 rounded-xl"
                          />
                          <Input
                            value={ab.amount}
                            onChange={e => updateAddBack(ab.id, "amount", e.target.value)}
                            placeholder="Amount"
                            className="text-sm font-mono w-28 rounded-xl"
                          />
                          <button
                            onClick={() => removeAddBack(ab.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={addAddBack}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add line
                      </button>
                    </div>
                  </div>
                </div>

                {sde > 0 && (
                  <div className="mt-2 p-4 bg-lime/20 border border-lime/30 rounded-xl">
                    <div className="text-xs text-foreground font-semibold mb-2">Calculated SDE (Seller&apos;s Discretionary Earnings)</div>
                    <div className="space-y-1 text-xs text-foreground/80">
                      <div className="flex justify-between">
                        <span>Net Income ({currentYear})</span>
                        <span className="font-mono">{fmtCurrency(parseNum(form.year3.netIncome))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>+ Owner Salary</span>
                        <span className="font-mono">{fmtCurrency(parseNum(form.ownerSalary))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>+ D&amp;A &amp; Interest</span>
                        <span className="font-mono">{fmtCurrency(parseNum(form.depreciation) + parseNum(form.interest))}</span>
                      </div>
                      {addBacks.some(a => parseNum(a.amount) > 0) && (
                        <div className="flex justify-between">
                          <span>+ Discretionary Add-Backs</span>
                          <span className="font-mono">{fmtCurrency(addBacks.reduce((s, a) => s + parseNum(a.amount), 0))}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-lime/30 font-semibold text-foreground">
                        <span>= Adjusted SDE</span>
                        <span className="font-mono">{fmtCurrency(sde)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Step 2: Quality Signals ── */}
            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">Recurring Revenue %</Label>
                    <div className="relative">
                      <Input
                        type="number" min="0" max="100"
                        value={form.recurringRevenuePercent}
                        onChange={e => set("recurringRevenuePercent", e.target.value)}
                        placeholder="85"
                        className="pr-8 rounded-xl"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Subscriptions, retainers, auto-renewals</p>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">Gross Margin %</Label>
                    <div className="relative">
                      <Input
                        type="number" min="0" max="100"
                        value={form.grossMargin}
                        onChange={e => set("grossMargin", e.target.value)}
                        placeholder="82"
                        className="pr-8 rounded-xl"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">Active Customer Count</Label>
                    <Input
                      type="number"
                      value={form.customerCount}
                      onChange={e => set("customerCount", e.target.value)}
                      placeholder="240"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">Top Customer % of Revenue</Label>
                    <div className="relative">
                      <Input
                        type="number" min="0" max="100"
                        value={form.topCustomerPercent}
                        onChange={e => set("topCustomerPercent", e.target.value)}
                        placeholder="12"
                        className="pr-8 rounded-xl"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">&gt;40% triggers concentration risk flag</p>
                  </div>
                </div>

                <div className="p-4 bg-secondary border border-border rounded-xl space-y-3">
                  <div className="text-xs font-semibold text-foreground">Quality Signal Preview</div>
                  {[
                    { label: "Recurring Revenue", value: form.recurringRevenuePercent, threshold: 70, unit: "%", good: "High — strong multiple uplift", bad: "Low — adds revenue risk discount" },
                    { label: "Customer Concentration", value: form.topCustomerPercent, threshold: 30, unit: "%", good: "Diversified — no discount applied", bad: "Concentrated — multiple reduction likely", invert: true },
                    { label: "Gross Margin", value: form.grossMargin, threshold: 60, unit: "%", good: "Strong — supports premium multiple", bad: "Thin — limits scalability premium" },
                  ].map(item => {
                    const v = Number(item.value)
                    if (!v) return null
                    const positive = item.invert ? v < item.threshold : v >= item.threshold
                    return (
                      <div key={item.label} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-foreground">{v}{item.unit}</span>
                          <span className={positive ? "text-foreground font-medium" : "text-muted-foreground"}>{positive ? item.good : item.bad}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* ── Step 3: Sale Terms ── */}
            {step === 3 && (
              <>
                <div>
                  <Label className="text-xs font-semibold text-foreground mb-1.5 block">Asking Price (optional — AI will suggest)</Label>
                  <Input
                    value={form.askingPrice}
                    onChange={e => set("askingPrice", e.target.value)}
                    placeholder="Leave blank for AI recommendation"
                    className="rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">Deal Structure</Label>
                    <Select value={form.dealStructurePreference} onValueChange={v => set("dealStructurePreference", v)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flexible">Flexible</SelectItem>
                        <SelectItem value="asset_sale">Asset Sale</SelectItem>
                        <SelectItem value="stock_sale">Stock Sale</SelectItem>
                        <SelectItem value="merger">Merger</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-1.5 block">Target Timeline</Label>
                    <Select value={form.timeline} onValueChange={v => set("timeline", v)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
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
                  <Label className="text-xs font-semibold text-foreground mb-1.5 block">Reasons for Selling</Label>
                  <Input
                    value={form.motivations}
                    onChange={e => set("motivations", e.target.value)}
                    placeholder="Founder retirement, pursuing next venture"
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Comma-separated. Informs agent mandate — not shared with buyers.</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-foreground mb-1.5 block">Asset Exclusions</Label>
                  <Input
                    value={form.exclusions}
                    onChange={e => set("exclusions", e.target.value)}
                    placeholder="Personal vehicle, IP unrelated to core product"
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Comma-separated. These will be included in the LOI exclusions clause.</p>
                </div>
                <div className="p-4 bg-foreground text-background rounded-xl text-xs">
                  <div className="font-semibold mb-2 text-background/80">What happens next</div>
                  <ul className="space-y-1.5 text-background/60">
                    <li className="flex gap-2"><span className="text-lime">1.</span> AI generates your indicative valuation range using SDE × industry multiple</li>
                    <li className="flex gap-2"><span className="text-lime">2.</span> You review and set your confidential mandate (floor price, hard no&apos;s)</li>
                    <li className="flex gap-2"><span className="text-lime">3.</span> Qualified buyers receive a redacted CIM — financials withheld until NDA</li>
                    <li className="flex gap-2"><span className="text-lime">4.</span> Relay&apos;s dual agents negotiate on your behalf, autonomously</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => step === 0 ? router.push("/") : setStep(s => s - 1)}
            className="gap-2 rounded-full border-border text-foreground hover:bg-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 0 ? "Home" : "Back"}
          </Button>
          <Button
            onClick={handleNext}
            disabled={loading || !canAdvance()}
            className="gap-2 bg-foreground hover:bg-foreground/90 text-background rounded-full"
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
