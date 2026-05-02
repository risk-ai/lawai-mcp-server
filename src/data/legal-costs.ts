/**
 * Curated legal cost reference data.
 * Sources: Clio Legal Trends Report, Martindale-Nolo surveys, legal industry benchmarks.
 * All figures in USD. Base = "moderate" complexity in a mid-market US city.
 */

export interface CostData {
  practice_area: string;
  billing_structures: {
    hourly?: { low: number; mid: number; high: number };
    flat_fee?: { low: number; mid: number; high: number };
    contingency?: { typical_percent: number; range: string };
    retainer?: { low: number; mid: number; high: number };
  };
  typical_duration: string;
  common_billing: string; // Most common billing structure
  complexity_multipliers: { simple: number; moderate: number; complex: number; high_stakes: number };
  cost_drivers: string[];
  notes?: string;
}

export const LEGAL_COST_DATA: CostData[] = [
  {
    practice_area: 'Personal Injury',
    billing_structures: {
      contingency: { typical_percent: 33, range: '25-40%' },
      hourly: { low: 200, mid: 350, high: 600 },
    },
    typical_duration: '6-18 months',
    common_billing: 'Contingency (no win, no fee)',
    complexity_multipliers: { simple: 0.4, moderate: 1, complex: 2, high_stakes: 4 },
    cost_drivers: [
      'Severity of injuries',
      'Number of defendants',
      'Whether case goes to trial vs. settlement',
      'Need for expert witnesses (medical, accident reconstruction)',
      'Insurance company cooperation',
    ],
  },
  {
    practice_area: 'Criminal Defense',
    billing_structures: {
      flat_fee: { low: 1500, mid: 5000, high: 25000 },
      hourly: { low: 150, mid: 300, high: 500 },
      retainer: { low: 2500, mid: 10000, high: 50000 },
    },
    typical_duration: '1-12 months',
    common_billing: 'Flat fee for misdemeanors, retainer for felonies',
    complexity_multipliers: { simple: 0.3, moderate: 1, complex: 2.5, high_stakes: 5 },
    cost_drivers: [
      'Misdemeanor vs. felony charges',
      'Number of charges',
      'Plea deal vs. trial',
      'Evidence complexity',
      'Federal vs. state court',
      'Prior criminal history',
    ],
  },
  {
    practice_area: 'Family Law',
    billing_structures: {
      hourly: { low: 150, mid: 300, high: 500 },
      flat_fee: { low: 1500, mid: 5000, high: 15000 },
      retainer: { low: 2500, mid: 7500, high: 25000 },
    },
    typical_duration: '3-18 months',
    common_billing: 'Hourly with retainer',
    complexity_multipliers: { simple: 0.3, moderate: 1, complex: 2.5, high_stakes: 4.5 },
    cost_drivers: [
      'Contested vs. uncontested',
      'Child custody disputes',
      'Asset division complexity',
      'Business valuations needed',
      'Expert witnesses (custody evaluators, forensic accountants)',
      'Interstate or international issues',
    ],
  },
  {
    practice_area: 'DUI/DWI',
    billing_structures: {
      flat_fee: { low: 1000, mid: 3500, high: 10000 },
      hourly: { low: 150, mid: 250, high: 400 },
    },
    typical_duration: '1-6 months',
    common_billing: 'Flat fee',
    complexity_multipliers: { simple: 0.4, moderate: 1, complex: 2, high_stakes: 3.5 },
    cost_drivers: [
      'First offense vs. repeat offense',
      'BAC level',
      'Whether accident/injury involved',
      'License suspension hearing',
      'Breath test challenges',
      'State mandatory minimums',
    ],
  },
  {
    practice_area: 'Bankruptcy',
    billing_structures: {
      flat_fee: { low: 1000, mid: 2500, high: 8000 },
      hourly: { low: 200, mid: 350, high: 500 },
    },
    typical_duration: '3-5 months (Ch. 7), 3-5 years (Ch. 13)',
    common_billing: 'Flat fee for Chapter 7, hourly for Chapter 11/13',
    complexity_multipliers: { simple: 0.5, moderate: 1, complex: 2, high_stakes: 4 },
    cost_drivers: [
      'Chapter 7 vs. 13 vs. 11',
      'Number of creditors',
      'Asset complexity',
      'Business bankruptcy vs. personal',
      'Adversary proceedings',
      'Means test complications',
    ],
  },
  {
    practice_area: 'Immigration',
    billing_structures: {
      flat_fee: { low: 1500, mid: 5000, high: 15000 },
      hourly: { low: 200, mid: 350, high: 500 },
    },
    typical_duration: '3-24 months',
    common_billing: 'Flat fee per petition/application',
    complexity_multipliers: { simple: 0.4, moderate: 1, complex: 2.5, high_stakes: 4 },
    cost_drivers: [
      'Visa type (family, employment, humanitarian)',
      'Deportation/removal defense',
      'Criminal history complications',
      'USCIS processing backlogs',
      'Appeals to BIA or federal court',
      'Government filing fees (separate from attorney fees)',
    ],
  },
  {
    practice_area: 'Employment & Labor',
    billing_structures: {
      hourly: { low: 200, mid: 350, high: 600 },
      contingency: { typical_percent: 33, range: '25-40%' },
      flat_fee: { low: 1000, mid: 3000, high: 10000 },
    },
    typical_duration: '3-18 months',
    common_billing: 'Contingency for employee-side; hourly for employer-side',
    complexity_multipliers: { simple: 0.4, moderate: 1, complex: 2, high_stakes: 4 },
    cost_drivers: [
      'Individual vs. class action',
      'EEOC/agency process involvement',
      'Discrimination type and evidence strength',
      'Settlement vs. litigation',
      'Number of witnesses',
      'Document discovery volume',
    ],
  },
  {
    practice_area: 'Estate Planning',
    billing_structures: {
      flat_fee: { low: 300, mid: 1500, high: 5000 },
      hourly: { low: 150, mid: 300, high: 500 },
    },
    typical_duration: '1-4 weeks',
    common_billing: 'Flat fee for standard packages',
    complexity_multipliers: { simple: 0.3, moderate: 1, complex: 2.5, high_stakes: 5 },
    cost_drivers: [
      'Simple will vs. comprehensive trust',
      'Size and complexity of estate',
      'Business succession planning',
      'Tax planning requirements',
      'Number of beneficiaries',
      'Special needs trusts',
    ],
  },
  {
    practice_area: 'Real Estate',
    billing_structures: {
      flat_fee: { low: 500, mid: 1500, high: 5000 },
      hourly: { low: 200, mid: 350, high: 500 },
    },
    typical_duration: '2-8 weeks (transactions), 3-12 months (disputes)',
    common_billing: 'Flat fee for closings, hourly for disputes',
    complexity_multipliers: { simple: 0.4, moderate: 1, complex: 2, high_stakes: 3.5 },
    cost_drivers: [
      'Transaction vs. dispute/litigation',
      'Commercial vs. residential',
      'Title issues',
      'Environmental concerns',
      'Zoning/permitting',
      'Multi-party transactions',
    ],
  },
  {
    practice_area: 'Business Law',
    billing_structures: {
      hourly: { low: 200, mid: 400, high: 700 },
      flat_fee: { low: 500, mid: 3000, high: 15000 },
      retainer: { low: 2000, mid: 5000, high: 15000 },
    },
    typical_duration: 'Varies widely — days for formation, months for disputes',
    common_billing: 'Flat fee for formation, hourly/retainer for ongoing',
    complexity_multipliers: { simple: 0.3, moderate: 1, complex: 2.5, high_stakes: 5 },
    cost_drivers: [
      'Business formation vs. ongoing counsel',
      'Number of owners/partners',
      'Industry regulations',
      'Contract complexity',
      'Litigation involvement',
      'M&A transactions',
    ],
  },
  {
    practice_area: 'Intellectual Property',
    billing_structures: {
      hourly: { low: 300, mid: 450, high: 800 },
      flat_fee: { low: 2000, mid: 8000, high: 25000 },
    },
    typical_duration: '1-36 months',
    common_billing: 'Flat fee for filings, hourly for litigation',
    complexity_multipliers: { simple: 0.3, moderate: 1, complex: 2.5, high_stakes: 5 },
    cost_drivers: [
      'Patent vs. trademark vs. copyright',
      'Registration vs. enforcement/litigation',
      'Technical complexity (patents)',
      'International filings',
      'Number of claims/classes',
      'Opposition proceedings',
    ],
  },
  {
    practice_area: 'Medical Malpractice',
    billing_structures: {
      contingency: { typical_percent: 33, range: '25-40%' },
      hourly: { low: 250, mid: 400, high: 700 },
    },
    typical_duration: '12-36 months',
    common_billing: 'Contingency (plaintiff-side)',
    complexity_multipliers: { simple: 0.5, moderate: 1, complex: 2, high_stakes: 3.5 },
    cost_drivers: [
      'Expert medical witness costs ($5K-$25K+)',
      'Complexity of medical issues',
      'Number of defendants (doctors, hospitals)',
      'Case review and records analysis',
      'State damage caps',
      'Settlement vs. trial',
    ],
  },
  {
    practice_area: 'Workers Compensation',
    billing_structures: {
      contingency: { typical_percent: 15, range: '10-20%' },
      hourly: { low: 150, mid: 250, high: 400 },
    },
    typical_duration: '3-12 months',
    common_billing: 'Contingency (often regulated by state)',
    complexity_multipliers: { simple: 0.4, moderate: 1, complex: 2, high_stakes: 3 },
    cost_drivers: [
      'Severity of injury',
      'Disputed vs. accepted claim',
      'Need for independent medical exam',
      'Permanent disability rating',
      'Employer/insurer cooperation',
      'State fee schedules',
    ],
  },
  {
    practice_area: 'Landlord & Tenant',
    billing_structures: {
      flat_fee: { low: 500, mid: 1500, high: 5000 },
      hourly: { low: 150, mid: 250, high: 400 },
    },
    typical_duration: '2-8 weeks (eviction), 1-6 months (disputes)',
    common_billing: 'Flat fee for evictions, hourly for disputes',
    complexity_multipliers: { simple: 0.3, moderate: 1, complex: 2, high_stakes: 3 },
    cost_drivers: [
      'Eviction vs. lease dispute vs. habitability claim',
      'Rent-controlled jurisdiction',
      'Commercial vs. residential',
      'Number of tenants/units',
      'Counter-claims',
      'Local ordinance complexity',
    ],
  },
  {
    practice_area: 'Tax',
    billing_structures: {
      hourly: { low: 250, mid: 400, high: 700 },
      flat_fee: { low: 1000, mid: 5000, high: 20000 },
    },
    typical_duration: '1-24 months',
    common_billing: 'Hourly for audits/disputes, flat fee for planning',
    complexity_multipliers: { simple: 0.3, moderate: 1, complex: 2.5, high_stakes: 5 },
    cost_drivers: [
      'Audit defense vs. planning vs. controversy',
      'Amount of tax at issue',
      'IRS vs. state tax authority',
      'Criminal tax implications',
      'International tax issues',
      'Entity type and structure',
    ],
  },
  {
    practice_area: 'Civil Litigation',
    billing_structures: {
      hourly: { low: 200, mid: 350, high: 600 },
      contingency: { typical_percent: 33, range: '25-40%' },
      retainer: { low: 5000, mid: 15000, high: 50000 },
    },
    typical_duration: '6-24 months',
    common_billing: 'Hourly with retainer, or contingency (plaintiff-side)',
    complexity_multipliers: { simple: 0.4, moderate: 1, complex: 2.5, high_stakes: 5 },
    cost_drivers: [
      'Amount in controversy',
      'Number of parties',
      'Discovery volume (document production)',
      'Expert witness needs',
      'Settlement vs. trial',
      'Appeals',
    ],
  },
  {
    practice_area: 'Corporate Law',
    billing_structures: {
      hourly: { low: 300, mid: 500, high: 1000 },
      retainer: { low: 5000, mid: 15000, high: 50000 },
      flat_fee: { low: 2000, mid: 10000, high: 50000 },
    },
    typical_duration: 'Varies — weeks for deals, ongoing for counsel',
    common_billing: 'Hourly or retainer',
    complexity_multipliers: { simple: 0.3, moderate: 1, complex: 2.5, high_stakes: 5 },
    cost_drivers: [
      'Transaction size and complexity',
      'Number of parties/investors',
      'Regulatory approvals needed',
      'Due diligence scope',
      'Securities compliance',
      'Cross-border elements',
    ],
  },
  {
    practice_area: 'Contracts & Agreements',
    billing_structures: {
      flat_fee: { low: 300, mid: 1500, high: 5000 },
      hourly: { low: 200, mid: 350, high: 500 },
    },
    typical_duration: '1-4 weeks (drafting), 3-12 months (disputes)',
    common_billing: 'Flat fee for drafting, hourly for disputes',
    complexity_multipliers: { simple: 0.3, moderate: 1, complex: 2, high_stakes: 3.5 },
    cost_drivers: [
      'Drafting vs. review vs. dispute',
      'Contract complexity',
      'Number of parties',
      'Industry-specific regulations',
      'Negotiation rounds',
      'Litigation if breached',
    ],
  },
  {
    practice_area: 'Traffic Violations',
    billing_structures: {
      flat_fee: { low: 150, mid: 500, high: 1500 },
      hourly: { low: 100, mid: 200, high: 350 },
    },
    typical_duration: '1-4 weeks',
    common_billing: 'Flat fee per ticket/appearance',
    complexity_multipliers: { simple: 0.5, moderate: 1, complex: 2, high_stakes: 3 },
    cost_drivers: [
      'Type of violation (speeding vs. reckless driving)',
      'Points on license',
      'Commercial driver license implications',
      'Court appearance requirements',
      'Prior violations',
      'License suspension risk',
    ],
  },
  {
    practice_area: 'Consumer Protection',
    billing_structures: {
      hourly: { low: 200, mid: 350, high: 500 },
      contingency: { typical_percent: 33, range: '25-40%' },
      flat_fee: { low: 500, mid: 2000, high: 5000 },
    },
    typical_duration: '2-12 months',
    common_billing: 'Contingency or hourly depending on case type',
    complexity_multipliers: { simple: 0.4, moderate: 1, complex: 2, high_stakes: 4 },
    cost_drivers: [
      'Individual vs. class action',
      'Type of consumer harm',
      'Defendant size and resources',
      'State vs. federal claims',
      'Documentation and evidence',
      'Regulatory agency involvement',
    ],
  },
];

// Regional cost multipliers (relative to national average = 1.0)
export const REGIONAL_ADJUSTMENTS: Record<string, number> = {
  // High-cost metros
  'NY': 1.4, 'CA': 1.35, 'DC': 1.35, 'MA': 1.25, 'CT': 1.2,
  'NJ': 1.15, 'IL': 1.1, 'WA': 1.15, 'CO': 1.1, 'VA': 1.05,
  'MD': 1.1, 'HI': 1.15, 'OR': 1.05, 'PA': 1.0, 'MN': 1.0,
  // Average
  'FL': 1.0, 'TX': 0.95, 'GA': 0.95, 'AZ': 0.95, 'NC': 0.95,
  'OH': 0.9, 'MI': 0.9, 'TN': 0.9, 'MO': 0.9, 'WI': 0.9,
  // Lower-cost
  'AL': 0.8, 'AR': 0.8, 'MS': 0.75, 'WV': 0.8, 'KY': 0.85,
  'LA': 0.85, 'OK': 0.8, 'KS': 0.85, 'IA': 0.85, 'NE': 0.85,
  'SC': 0.85, 'NM': 0.85, 'ID': 0.85, 'MT': 0.85, 'ND': 0.8,
  'SD': 0.8, 'WY': 0.85, 'UT': 0.9, 'NV': 0.95, 'IN': 0.85,
  'NH': 1.05, 'VT': 0.95, 'ME': 0.9, 'RI': 1.05, 'DE': 1.05,
  'AK': 1.1,
};

/**
 * Find cost data for a practice area (fuzzy match).
 */
export function findCostData(practiceArea: string): CostData | null {
  const lower = practiceArea.toLowerCase();
  return LEGAL_COST_DATA.find(d =>
    d.practice_area.toLowerCase() === lower ||
    d.practice_area.toLowerCase().includes(lower) ||
    lower.includes(d.practice_area.toLowerCase())
  ) || null;
}
