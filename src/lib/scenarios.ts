// ═══════════════════════════════════════════════════════════════
// Relay — Demo Scenarios
// Pre-built data for the CloudTrack Pro hackathon demo
// ═══════════════════════════════════════════════════════════════

import type {
  SellerOnboardingData,
  BuyerProfile,
  SellerMandate,
  BuyerMandate,
  NegotiationState,
} from "@/lib/agents/types"

// ─── SELLER DATA ──────────────────────────────────────────────

export const DEMO_SELLER: SellerOnboardingData = {
  companyName: "CloudTrack Pro",
  industry: "B2B SaaS",
  description: "B2B SaaS fleet management and logistics optimization platform serving mid-market transportation and delivery companies.",
  foundedYear: 2021,
  headquarters: "Austin, TX",
  employeeCount: 18,
  financials: {
    revenue: 1_200_000,
    ebitda: 645_600,           // SDE: $360K net + $150K owner salary + $15.6K add-backs + $120K D&A
    revenueGrowthRate: 0.40,
    grossMargin: 0.85,
    netIncome: 360_000,
    fiscalYearEnd: "December",
    ownerSalary: 150_000,
    addBacks: [
      { label: "Owner personal vehicle", amount: 9_600 },
      { label: "Owner health insurance", amount: 6_000 },
    ],
    depreciation: 12_000,
    interest: 8_000,
    recurringRevenuePercent: 88,
    customerCount: 247,
    topCustomerPercent: 11,
    yearlyData: [
      { year: 2022, revenue: 614_000, expenses: 498_000, netIncome: 116_000 },
      { year: 2023, revenue: 857_000, expenses: 614_000, netIncome: 243_000 },
      { year: 2024, revenue: 1_200_000, expenses: 840_000, netIncome: 360_000 },
    ],
  },
  askingPrice: 3_600_000,
  dealStructurePreference: "flexible",
  motivations: ["Founder retirement after 5 years", "Seeking liquidity for next venture"],
  timeline: "6_months",
  exclusions: [],
  confidentialityLevel: "high",
  contactName: "Sarah Chen",
  contactEmail: "sarah@cloudtrackpro.com",
}

// ─── BUYER DATA ───────────────────────────────────────────────

export const DEMO_BUYER: BuyerProfile = {
  id: "buyer-demo-001",
  organizationName: "Apex Growth Partners",
  buyerType: "individual",
  investmentThesis: "Acquire owner-operated SaaS businesses with strong recurring revenue, proven product-market fit, and operational efficiency opportunities.",
  targetIndustries: ["B2B SaaS", "Logistics Tech", "Fleet Management"],
  geographicFocus: ["United States"],
  acquisitionCriteria: {
    revenueMin: 500_000,
    revenueMax: 5_000_000,
    ebitdaMin: 200_000,
    ebitdaMax: 2_000_000,
    employeeCountMin: 5,
    employeeCountMax: 50,
    preferredDealStructures: ["stock_sale", "asset_sale"],
  },
  checkSize: { min: 1_000_000, max: 4_000_000, currency: "USD" },
  holdingPeriod: "Indefinite (owner-operator)",
  synergies: ["Operational expertise in SaaS", "Sales team expansion", "Product roadmap acceleration"],
  previousAcquisitions: 0,
  qualificationStatus: "qualified",
  ndasigned: true,
  contactName: "James Park",
  contactEmail: "james@apexgrowth.com",
}

// ─── SELLER MANDATE ───────────────────────────────────────────

export const DEMO_SELLER_MANDATE: SellerMandate = {
  minPrice: 2_800_000,           // CONFIDENTIAL
  urgency: "Founder retirement — moderate urgency, willing to wait for right deal",  // CONFIDENTIAL
  maxSellerNote: 20,             // CONFIDENTIAL — max 20% seller financing
  maxTransition: 3,              // CONFIDENTIAL — max 3 months post-sale
  weaknesses: [
    "Founder handles all enterprise sales directly",
    "No formal customer success team — founder manages top accounts",
  ],                             // CONFIDENTIAL

  targetPrice: 3_600_000,
  askingPrice: 3_780_000,        // ~5% above target
  structures: ["stock_sale", "asset_sale"],
  earnoutWillingness: "Willing if metric is customer retention rate or ARR — not net-new growth. Max 12 months.",
  exclusivityWillingnessDays: 75,
  hardNos: [
    "Will not stay longer than 3 months post-sale",
    "Will not accept less than 60% cash at closing",
    "No clawback provisions on earned compensation",
  ],
}

// ─── BUYER MANDATE ────────────────────────────────────────────

export const DEMO_BUYER_MANDATE: BuyerMandate = {
  maxPrice: 3_200_000,           // CONFIDENTIAL
  preferredStructure: "70% cash at close, 15% seller note, 15% performance earnout",  // CONFIDENTIAL
  alternatives: "None currently — this is the primary target",  // CONFIDENTIAL
  timelineFlex: "Flexible up to 6 months, prefer 4 months",    // CONFIDENTIAL
  riskConcerns: [
    "Founder handles all enterprise sales — key person risk",
    "No dedicated customer success function",
    "Product roadmap dependent on founder vision",
  ],                             // CONFIDENTIAL

  openingRange: { low: 2_400_000, high: 2_700_000 },
  financingCapacity: "SBA 7(a) pre-qualified up to $2M + $500K cash equity + $300K ROBS",
  earnoutPreference: "Strong preference for 15-20% earnout tied to customer retention over 12 months",
  ddPeriodDays: 75,
  exclusivityDays: 90,
  closingTimelineDays: 150,
  hardConstraints: [
    "Total price cannot exceed $3.5M under any structure",
    "Minimum 60 days due diligence",
    "Seller must stay at least 2 months for transition",
  ],
}

// ─── INITIAL NEGOTIATION STATE ────────────────────────────────

export function buildDemoNegotiationState(sessionId: string): NegotiationState {
  return {
    sessionId,
    round: 1,
    status: "active",
    sellerData: DEMO_SELLER,
    buyerProfile: DEMO_BUYER,
    valuation: null,
    proposals: [],
    activeProposalId: null,
    agreedTerms: null,
    openIssues: [
      "Purchase price",
      "Deal structure (cash/note/earnout split)",
      "Earnout terms",
      "Exclusivity period",
      "Due diligence timeline",
      "Transition period",
    ],
    resolvedIssues: [],
    agentMessages: [],
    convergenceScore: 0,
    lastActivityAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }
}
