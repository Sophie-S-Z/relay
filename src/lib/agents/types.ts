export interface SellerOnboardingData {
  companyName: string
  industry: string
  description: string
  foundedYear: number
  headquarters: string
  employeeCount: number
  financials: {
    revenue: number
    ebitda: number
    revenueGrowthRate: number
    grossMargin: number
    netIncome: number
    fiscalYearEnd: string
    // SDE components
    ownerSalary: number
    addBacks: { label: string; amount: number }[]
    depreciation: number
    interest: number
    // Quality indicators
    recurringRevenuePercent: number
    customerCount: number
    topCustomerPercent: number
    // 3-year history
    yearlyData: {
      year: number
      revenue: number
      expenses: number
      netIncome: number
    }[]
  }
  askingPrice: number | null
  dealStructurePreference: "asset_sale" | "stock_sale" | "merger" | "flexible"
  motivations: string[]
  timeline: "immediate" | "3_months" | "6_months" | "12_months_plus"
  exclusions: string[]
  confidentialityLevel: "high" | "standard"
  contactName: string
  contactEmail: string
}

export interface BuyerProfile {
  id: string
  organizationName: string
  buyerType: "strategic" | "financial" | "pe" | "family_office" | "individual"
  investmentThesis: string
  targetIndustries: string[]
  geographicFocus: string[]
  acquisitionCriteria: {
    revenueMin: number
    revenueMax: number
    ebitdaMin: number
    ebitdaMax: number
    employeeCountMin: number
    employeeCountMax: number
    preferredDealStructures: ("asset_sale" | "stock_sale" | "merger")[]
  }
  checkSize: {
    min: number
    max: number
    currency: string
  }
  holdingPeriod: string | null
  synergies: string[]
  previousAcquisitions: number
  qualificationStatus: "unqualified" | "in_review" | "qualified" | "disqualified"
  ndasigned: boolean
  contactName: string
  contactEmail: string
}

export type ValuationMethod =
  | "dcf"
  | "ebitda_multiple"
  | "revenue_multiple"
  | "precedent_transactions"
  | "public_comps"

export interface ValuationMemo {
  sessionId: string
  companyName: string
  analysisDate: string
  analystNotes: string
  methods: {
    method: ValuationMethod
    value: number
    weight: number
    assumptions: string[]
  }[]
  weightedValue: number
  range: {
    low: number
    mid: number
    high: number
  }
  sde: number
  sdeBreakdown: {
    netIncome: number
    ownerCompensation: number
    adjustments: number
  }
  adjustedMultiple: number
  keyValueDrivers: string[]
  risks: string[]
  comparableTransactions: {
    name: string
    date: string
    multiple: number
    metric: string
  }[]
  recommendation: string
  currency: string
}

export interface LOIProposal {
  id: string
  sessionId: string
  proposingParty: "buyer" | "seller"
  version: number
  submittedAt: string
  purchasePrice: number
  priceStructure: {
    cashAtClose: number
    earnout: number
    earnoutConditions: string | null
    sellerFinancing: number
    rolloverEquity: number
  }
  dealStructure: "asset_sale" | "stock_sale" | "merger"
  exclusivity: {
    requested: boolean
    periodDays: number | null
  }
  dueDiligencePeriodDays: number
  closingConditions: string[]
  representationsAndWarranties: boolean
  indemnificationCap: number | null
  nonCompetePeriodMonths: number | null
  keyPersonRetention: string[]
  breakupFee: number | null
  expiresAt: string
  notes: string
  status: "draft" | "submitted" | "countered" | "accepted" | "rejected" | "expired" | "escalate"
}

export interface NegotiationState {
  sessionId: string
  round: number
  status: "not_started" | "active" | "paused" | "converging" | "agreed" | "collapsed"
  sellerData: SellerOnboardingData
  buyerProfile: BuyerProfile
  valuation: ValuationMemo | null
  proposals: LOIProposal[]
  activeProposalId: string | null
  agreedTerms: Partial<LOIProposal> | null
  openIssues: string[]
  resolvedIssues: string[]
  agentMessages: {
    id: string
    timestamp: string
    content: string
    reasoning: string | null
    suggestedAction: string | null
  }[]
  convergenceScore: number
  lastActivityAt: string
  createdAt: string
}

export type AgentRole =
  | "neutral_facilitator"
  | "seller_advocate"
  | "buyer_advocate"
  | "valuation_analyst"
  | "document_generator"

export interface AgentMandate {
  agentId: string
  role: AgentRole
  sessionId: string
  constraints: {
    minAcceptablePrice: number | null
    maxOfferPrice: number | null
    mustHaveTerms: string[]
    dealBreakers: string[]
    priorityTerms: string[]
  }
  instructionOverrides: string[]
  allowedActions: (
    | "propose"
    | "counter"
    | "accept"
    | "reject"
    | "request_info"
    | "generate_document"
    | "escalate"
  )[]
  confidentialContext: string
  activatedAt: string
  expiresAt: string | null
}

export interface QualificationResult {
  buyerId: string
  sessionId: string
  evaluatedAt: string
  passed: boolean
  score: number
  maxScore: number
  criteria: {
    criterion: string
    weight: number
    score: number
    passed: boolean
    rationale: string
  }[]
  financialCapabilityVerified: boolean
  strategicFitScore: number
  culturalFitScore: number
  riskFlags: string[]
  recommendedNextStep:
    | "proceed_to_nda"
    | "request_more_info"
    | "schedule_management_call"
    | "disqualify"
  analystNotes: string
}

export interface SellerMandate {
  // Confidential — interpolated server-side into system prompt only, never sent to buyer
  minPrice: number          // walk-away floor; going below triggers "escalate"
  urgency: string           // reason for sale, e.g. "founder retirement" — never revealed
  maxSellerNote: number     // max seller financing as % of purchase price (0–100)
  maxTransition: number     // max post-sale transition commitment in months
  weaknesses: string[]      // risks/weaknesses seller wants to downplay — never revealed

  // Pre-authorized negotiation parameters
  targetPrice: number       // ideal exit value (from valuation)
  askingPrice: number       // opening position (matches SellerOnboardingData.askingPrice)
  structures: string[]      // acceptable deal structures, e.g. ["stock_sale", "asset_sale"]
  earnoutWillingness: string // e.g. "willing if metric is gross revenue, max 12 months"
  exclusivityWillingnessDays: number | null // max exclusivity period seller will grant
  hardNos: string[]         // absolute dealbreakers, e.g. ["asset-only sale", "stay > 3 months"]
}

export interface SellerAgentInput {
  sessionId: string
  negotiationState: NegotiationState
  sellerMandate: SellerMandate
  incomingProposal: LOIProposal | null  // null on the opening move (round 1)
}

export interface SellerAgentResponse {
  proposal: LOIProposal
  requiresHumanReview: boolean   // true when status === "escalate"
  escalationReason: string | null
}

export interface BuyerMandate {
  // Confidential — interpolated server-side into system prompt only, never sent to seller
  maxPrice: number              // walk-away ceiling; going above triggers "escalate"
  preferredStructure: string    // e.g. "80% cash at close, 20% seller note" — never revealed
  alternatives: string          // competing deals under consideration — never revealed
  timelineFlex: string          // e.g. "flexible up to 6 months" — never revealed
  riskConcerns: string[]        // specific risks identified in CIM — never revealed verbatim

  // Pre-authorized negotiation parameters
  openingRange: { low: number; high: number } // opening offer band
  financingCapacity: string     // e.g. "SBA 7(a) up to $5M + $500K cash equity"
  earnoutPreference: string     // e.g. "prefer earnout tied to EBITDA, max 24 months"
  ddPeriodDays: number          // due diligence period needed (days)
  exclusivityDays: number       // exclusivity period desired (days)
  closingTimelineDays: number   // target days to close from LOI signing
  hardConstraints: string[]     // absolute limits, e.g. ["no seller note > 20%", "no stock rollover"]
}
