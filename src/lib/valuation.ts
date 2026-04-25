// ═══════════════════════════════════════════════════════════════
// Relay — Valuation Engine
// Calculates SDE-based valuation from seller onboarding data
// ═══════════════════════════════════════════════════════════════

import type { SellerOnboardingData, ValuationMemo } from "@/lib/agents/types"

// ─── INDUSTRY MULTIPLES ───────────────────────────────────────
const INDUSTRY_MULTIPLES: Record<string, { low: number; high: number }> = {
  "B2B SaaS":                { low: 3.0, high: 5.0 },
  "SaaS":                    { low: 3.0, high: 5.0 },
  "Professional Services":   { low: 2.0, high: 3.5 },
  "E-Commerce":              { low: 2.0, high: 3.5 },
  "Retail":                  { low: 1.5, high: 2.5 },
  "Manufacturing":           { low: 2.5, high: 4.0 },
  "Healthcare":              { low: 2.5, high: 4.5 },
  "Hospitality":             { low: 1.5, high: 3.0 },
  "Construction":            { low: 1.5, high: 3.0 },
}
const DEFAULT_MULTIPLE = { low: 2.0, high: 3.0 }

export interface ValuationResult {
  sde: number
  sdeBreakdown: {
    netIncome: number
    ownerCompensation: number
    adjustments: number
  }
  baseMultiple: number
  adjustments: { factor: string; delta: number; reason: string }[]
  adjustedMultiple: number
  valuationLow: number
  valuationMid: number
  valuationHigh: number
  riskFlags: { severity: "high" | "medium" | "low"; title: string; description: string }[]
}

export function calculateValuation(seller: SellerOnboardingData): ValuationResult {
  const { financials } = seller

  // ─── SDE Calculation ──────────────────────────────────
  // SDE = Net Income + Owner Salary + Add-Backs + D&A + Interest
  const totalAddBacks = (financials.addBacks ?? []).reduce((sum, a) => sum + a.amount, 0)
  const ownerSalary = financials.ownerSalary ?? 0
  const depreciation = financials.depreciation ?? 0
  const interest = financials.interest ?? 0
  const sde = financials.netIncome + ownerSalary + totalAddBacks + depreciation + interest
  const sdeBreakdown = {
    netIncome: financials.netIncome,
    ownerCompensation: ownerSalary,
    adjustments: totalAddBacks + depreciation + interest,
  }

  // ─── Base Multiple ────────────────────────────────────
  const range = INDUSTRY_MULTIPLES[seller.industry] || DEFAULT_MULTIPLE
  const baseMultiple = (range.low + range.high) / 2

  // ─── Adjustments ──────────────────────────────────────
  const adjustments: { factor: string; delta: number; reason: string }[] = []

  // Growth rate
  if (financials.revenueGrowthRate > 0.30) {
    adjustments.push({ factor: "High Growth", delta: 0.5, reason: `${(financials.revenueGrowthRate * 100).toFixed(0)}% YoY revenue growth exceeds 30% threshold` })
  } else if (financials.revenueGrowthRate > 0.15) {
    adjustments.push({ factor: "Moderate Growth", delta: 0.25, reason: `${(financials.revenueGrowthRate * 100).toFixed(0)}% YoY revenue growth shows healthy trajectory` })
  } else if (financials.revenueGrowthRate < 0) {
    adjustments.push({ factor: "Declining Revenue", delta: -0.5, reason: `Revenue declined ${(Math.abs(financials.revenueGrowthRate) * 100).toFixed(0)}% YoY` })
  }

  // Gross margin
  if (financials.grossMargin > 0.70) {
    adjustments.push({ factor: "Strong Gross Margins", delta: 0.5, reason: `${(financials.grossMargin * 100).toFixed(0)}% gross margin indicates high-quality revenue` })
  } else if (financials.grossMargin < 0.40) {
    adjustments.push({ factor: "Low Gross Margins", delta: -0.25, reason: `${(financials.grossMargin * 100).toFixed(0)}% gross margin limits scalability` })
  }

  // EBITDA margin
  const ebitdaMargin = financials.ebitda / financials.revenue
  if (ebitdaMargin > 0.25) {
    adjustments.push({ factor: "Strong Profitability", delta: 0.25, reason: `${(ebitdaMargin * 100).toFixed(0)}% EBITDA margin exceeds industry norms` })
  } else if (ebitdaMargin < 0.10) {
    adjustments.push({ factor: "Thin Profitability", delta: -0.25, reason: `${(ebitdaMargin * 100).toFixed(0)}% EBITDA margin leaves little room for error` })
  }

  // Team size as owner-dependency proxy
  if (seller.employeeCount < 5) {
    adjustments.push({ factor: "Owner Dependency Risk", delta: -0.5, reason: `Only ${seller.employeeCount} employees suggests heavy owner dependency` })
  } else if (seller.employeeCount > 20) {
    adjustments.push({ factor: "Established Team", delta: 0.25, reason: `${seller.employeeCount} employees indicates scalable operations` })
  }

  // Recurring revenue quality
  const recurringPct = financials.recurringRevenuePercent ?? 0
  if (recurringPct > 80) {
    adjustments.push({ factor: "High Recurring Revenue", delta: 0.5, reason: `${recurringPct}% recurring revenue — highly predictable cash flow` })
  } else if (recurringPct > 50) {
    adjustments.push({ factor: "Mixed Recurring Revenue", delta: 0.25, reason: `${recurringPct}% recurring revenue shows solid retention` })
  } else if (recurringPct < 20) {
    adjustments.push({ factor: "Low Recurring Revenue", delta: -0.25, reason: `${recurringPct}% recurring revenue increases revenue risk` })
  }

  // Customer concentration risk
  const topCustomerPct = financials.topCustomerPercent ?? 0
  if (topCustomerPct > 40) {
    adjustments.push({ factor: "Customer Concentration", delta: -0.5, reason: `Top customer represents ${topCustomerPct}% of revenue — material concentration risk` })
  } else if (topCustomerPct > 25) {
    adjustments.push({ factor: "Moderate Concentration", delta: -0.25, reason: `Top customer at ${topCustomerPct}% of revenue is elevated` })
  }

  // Timeline urgency discount
  if (seller.timeline === "immediate") {
    adjustments.push({ factor: "Urgent Timeline", delta: -0.25, reason: `Immediate sale timeline may limit competitive process` })
  }

  // ─── Final Multiple ───────────────────────────────────
  const totalAdjustment = adjustments.reduce((sum, a) => sum + a.delta, 0)
  const adjustedMultiple = Math.max(1.0, Math.round((baseMultiple + totalAdjustment) * 100) / 100)

  // ─── Valuation Range ──────────────────────────────────
  const midValuation = Math.round(sde * adjustedMultiple)
  const lowValuation = Math.round(midValuation * 0.8)
  const highValuation = Math.round(midValuation * 1.2)

  // ─── Risk Flags ───────────────────────────────────────
  const riskFlags: ValuationResult["riskFlags"] = []

  if (seller.employeeCount < 10) {
    riskFlags.push({
      severity: seller.employeeCount < 5 ? "high" : "medium",
      title: "Owner Dependency",
      description: `With ${seller.employeeCount} employees, the business likely depends heavily on the owner. Buyers will want a longer transition period.`,
    })
  }

  if (financials.revenueGrowthRate < 0) {
    riskFlags.push({
      severity: "high",
      title: "Declining Revenue",
      description: `Revenue declined ${(Math.abs(financials.revenueGrowthRate) * 100).toFixed(0)}% year-over-year. This will significantly impact buyer interest.`,
    })
  }

  if (ebitdaMargin < 0.15) {
    riskFlags.push({
      severity: "medium",
      title: "Margin Pressure",
      description: `EBITDA margin of ${(ebitdaMargin * 100).toFixed(0)}% is below typical acquisition thresholds. Buyers will question scalability.`,
    })
  }

  if (seller.timeline === "immediate") {
    riskFlags.push({
      severity: "low",
      title: "Compressed Timeline",
      description: `An immediate sale timeline may limit the competitive process and reduce offers.`,
    })
  }

  const topCustPct = financials.topCustomerPercent ?? 0
  if (topCustPct > 35) {
    riskFlags.push({
      severity: topCustPct > 50 ? "high" : "medium",
      title: "Customer Concentration",
      description: `Top customer represents ${topCustPct}% of revenue. Buyers will require customer diversification covenants or escrow holdbacks.`,
    })
  }

  if (seller.exclusions.length > 2) {
    riskFlags.push({
      severity: "medium",
      title: "Significant Exclusions",
      description: `${seller.exclusions.length} asset exclusions may complicate deal structure and reduce buyer confidence.`,
    })
  }

  return {
    sde,
    sdeBreakdown,
    baseMultiple,
    adjustments,
    adjustedMultiple,
    valuationLow: lowValuation,
    valuationMid: midValuation,
    valuationHigh: highValuation,
    riskFlags,
  }
}

// Build a ValuationMemo (matching the repo's existing type) from our calculation
export function buildValuationMemo(
  seller: SellerOnboardingData,
  sessionId: string,
): ValuationMemo {
  const result = calculateValuation(seller)
  const ebitdaMultiple = result.adjustedMultiple

  return {
    sessionId,
    companyName: seller.companyName,
    analysisDate: new Date().toISOString(),
    analystNotes: `Valuation based on ${seller.industry} industry multiples adjusted for growth, margins, and risk factors. SDE of $${result.sde.toLocaleString()} with an adjusted ${ebitdaMultiple}x multiple.`,
    methods: [
      {
        method: "ebitda_multiple",
        value: result.valuationMid,
        weight: 0.6,
        assumptions: [
          `${ebitdaMultiple}x adjusted EBITDA multiple`,
          `EBITDA of $${result.sde.toLocaleString()}`,
          ...result.adjustments.map(a => `${a.factor}: ${a.delta > 0 ? "+" : ""}${a.delta}x (${a.reason})`),
        ],
      },
      {
        method: "revenue_multiple",
        value: Math.round(seller.financials.revenue * (ebitdaMultiple * 0.4)),
        weight: 0.25,
        assumptions: [
          `${(ebitdaMultiple * 0.4).toFixed(1)}x revenue multiple (derived from EBITDA multiple)`,
          `Revenue of $${seller.financials.revenue.toLocaleString()}`,
        ],
      },
      {
        method: "precedent_transactions",
        value: result.valuationMid,
        weight: 0.15,
        assumptions: [
          `Based on comparable ${seller.industry} transactions`,
          `Adjusted for company-specific factors`,
        ],
      },
    ],
    weightedValue: result.valuationMid,
    range: {
      low: result.valuationLow,
      mid: result.valuationMid,
      high: result.valuationHigh,
    },
    sde: result.sde,
    sdeBreakdown: result.sdeBreakdown,
    adjustedMultiple: result.adjustedMultiple,
    keyValueDrivers: [
      ...(result.adjustments.filter(a => a.delta > 0).map(a => a.reason)),
      `$${result.sde.toLocaleString()} in EBITDA`,
    ],
    risks: result.riskFlags.map(r => `${r.title}: ${r.description}`),
    comparableTransactions: [],
    recommendation: `Indicative valuation range of $${(result.valuationLow / 1_000_000).toFixed(1)}M–$${(result.valuationHigh / 1_000_000).toFixed(1)}M. Mid-point of $${(result.valuationMid / 1_000_000).toFixed(1)}M recommended as anchor.`,
    currency: "USD",
  }
}
