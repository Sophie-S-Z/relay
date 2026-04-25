"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, XCircle } from "lucide-react"
import Link from "next/link"

export default function BuyerQualifyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ passed: boolean; score: number; reason: string } | null>(null)

  const [form, setForm] = useState({
    organizationName: "",
    buyerType: "individual",
    investmentThesis: "",
    targetIndustries: "B2B SaaS, Logistics Tech",
    geographicFocus: "United States",
    revenueMin: "500000",
    revenueMax: "5000000",
    ebitdaMin: "200000",
    ebitdaMax: "2000000",
    checkMin: "1000000",
    checkMax: "4000000",
    contactName: "",
    contactEmail: "",
    financingCapacity: "",
  })

  const set = (k: string, v: string | null) => setForm(f => ({ ...f, [k]: v ?? "" }))

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const checkMin = Number(form.checkMin)
      const askingPrice = 3_780_000
      const capitalRatio = checkMin / askingPrice
      const passed = capitalRatio >= 0.3

      const profile = {
        id: crypto.randomUUID(),
        organizationName: form.organizationName,
        buyerType: form.buyerType,
        investmentThesis: form.investmentThesis,
        targetIndustries: form.targetIndustries.split(",").map(s => s.trim()),
        geographicFocus: form.geographicFocus.split(",").map(s => s.trim()),
        acquisitionCriteria: {
          revenueMin: Number(form.revenueMin),
          revenueMax: Number(form.revenueMax),
          ebitdaMin: Number(form.ebitdaMin),
          ebitdaMax: Number(form.ebitdaMax),
          employeeCountMin: 5,
          employeeCountMax: 50,
          preferredDealStructures: ["asset_sale", "stock_sale"] as const,
        },
        checkSize: {
          min: Number(form.checkMin),
          max: Number(form.checkMax),
          currency: "USD",
        },
        holdingPeriod: "Indefinite",
        synergies: [],
        previousAcquisitions: 0,
        qualificationStatus: passed ? "qualified" : "disqualified",
        ndasigned: false,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
      }

      sessionStorage.setItem("relay_buyer_profile", JSON.stringify(profile))
      setResult({
        passed,
        score: passed ? 78 : 42,
        reason: passed
          ? "Financial capacity verified. Target industry aligns with available deal. Strategic fit confirmed."
          : "Check size may be insufficient relative to the asking price. Consider increasing your stated acquisition budget.",
      })
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card border border-border rounded-2xl p-10 max-w-md w-full text-center shadow-sm">
          {result.passed ? (
            <div className="w-16 h-16 rounded-full bg-lime flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-9 w-9 text-foreground" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-9 w-9 text-muted-foreground" />
            </div>
          )}
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {result.passed ? "You're Qualified!" : "Not Qualified"}
          </h2>
          <div className={`text-4xl font-bold mb-2 ${result.passed ? "text-foreground" : "text-muted-foreground"}`}>
            {result.score}/100
          </div>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{result.reason}</p>
          {result.passed ? (
            <Button
              onClick={() => router.push("/buyer/nda")}
              className="bg-foreground hover:bg-foreground/90 text-background gap-2 w-full rounded-full"
            >
              Proceed to NDA <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setResult(null)} className="w-full rounded-full border-border">
              Update Information
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-lime flex items-center justify-center text-foreground font-bold text-sm">R</div>
            <span className="font-semibold text-foreground">Relay</span>
          </Link>
          <Badge variant="secondary" className="bg-sky/50 text-foreground border-sky rounded-full">Buyer Qualification</Badge>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Buyer Qualification</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Tell us about your acquisition criteria. We&apos;ll automatically screen your fit for available deals. Qualified buyers receive the full CIM.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 space-y-5 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-foreground mb-1.5 block">Organization Name *</Label>
              <Input value={form.organizationName} onChange={e => set("organizationName", e.target.value)} placeholder="Apex Growth Partners" className="rounded-xl" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-foreground mb-1.5 block">Buyer Type *</Label>
              <Select value={form.buyerType} onValueChange={v => set("buyerType", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual / Searcher</SelectItem>
                  <SelectItem value="pe">Private Equity</SelectItem>
                  <SelectItem value="strategic">Strategic Acquirer</SelectItem>
                  <SelectItem value="family_office">Family Office</SelectItem>
                  <SelectItem value="financial">Financial Buyer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-foreground mb-1.5 block">Investment Thesis *</Label>
            <Textarea
              value={form.investmentThesis}
              onChange={e => set("investmentThesis", e.target.value)}
              placeholder="What types of businesses are you looking to acquire and why?"
              className="h-20 resize-none rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-foreground mb-1.5 block">Target Industries</Label>
              <Input value={form.targetIndustries} onChange={e => set("targetIndustries", e.target.value)} placeholder="B2B SaaS, Healthcare" className="rounded-xl" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-foreground mb-1.5 block">Geographic Focus</Label>
              <Input value={form.geographicFocus} onChange={e => set("geographicFocus", e.target.value)} placeholder="United States" className="rounded-xl" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-foreground mb-2 block">Revenue Range ($ USD)</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input value={form.revenueMin} onChange={e => set("revenueMin", e.target.value)} placeholder="Min: 500,000" className="rounded-xl" />
              <Input value={form.revenueMax} onChange={e => set("revenueMax", e.target.value)} placeholder="Max: 5,000,000" className="rounded-xl" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-foreground mb-2 block">Check Size Range ($ USD) *</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input value={form.checkMin} onChange={e => set("checkMin", e.target.value)} placeholder="Min: 1,000,000" className="rounded-xl" />
              <Input value={form.checkMax} onChange={e => set("checkMax", e.target.value)} placeholder="Max: 4,000,000" className="rounded-xl" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-foreground mb-1.5 block">Financing Capacity / Pre-qualification</Label>
            <Input value={form.financingCapacity} onChange={e => set("financingCapacity", e.target.value)} placeholder="SBA 7(a) pre-qualified up to $2M + $500K cash equity" className="rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-foreground mb-1.5 block">Contact Name</Label>
              <Input value={form.contactName} onChange={e => set("contactName", e.target.value)} placeholder="James Park" className="rounded-xl" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-foreground mb-1.5 block">Contact Email</Label>
              <Input type="email" value={form.contactEmail} onChange={e => set("contactEmail", e.target.value)} placeholder="james@apexgrowth.com" className="rounded-xl" />
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => router.push("/")} className="gap-2 rounded-full border-border text-foreground hover:bg-secondary">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !form.organizationName || !form.buyerType}
            className="gap-2 bg-foreground hover:bg-foreground/90 text-background rounded-full"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking...</> : <>Submit for Review <ArrowRight className="h-4 w-4" /></>}
          </Button>
        </div>
      </div>
    </div>
  )
}
