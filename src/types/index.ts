export interface LawyerSummary {
  id: number;
  name: string;
  practice_areas: string[];
  city: string | null;
  state: string | null;
  firm: string | null;
  bar_status: string | null;
  claimed: boolean;
  rating: number | null;
  review_count: number | null;
  profile_url: string;
}

export interface LawyerProfile extends LawyerSummary {
  bio: string | null;
  education: string | null;
  bar_number: string | null;
  bar_admissions: string[] | null;
  website_url: string | null;
  languages: string | null;
  experience_years: number | null;
  awards: string | null;
  professional_associations: string | null;
  publications: string | null;
  certifications: string[] | null;
  rate_min: number | null;
  rate_max: number | null;
  rate_currency: string | null;
  // Contact info only for claimed/opted-in profiles
  email: string | null;
  phone: string | null;
  contact_form_url: string | null;
}

export interface PracticeAreaInfo {
  name: string;
  lawyer_count: number;
}

export interface JurisdictionInfo {
  state: string;
  state_code: string;
  lawyer_count: number;
}

// US state name ↔ abbreviation mapping
export const US_STATES: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
};

// Reverse mapping: abbreviation → full name
export const STATE_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(US_STATES).map(([name, code]) => [code, name.replace(/\b\w/g, c => c.toUpperCase())])
);

// Known clean practice areas (for filtering dirty data)
export const KNOWN_PRACTICE_AREAS = [
  'Administrative Law', 'Admiralty & Maritime', 'Adoption', 'Agriculture',
  'Alternative Dispute Resolution', 'Animal Law', 'Antitrust', 'Appellate',
  'Arbitration & Mediation', 'Aviation', 'Banking & Finance', 'Bankruptcy',
  'Business Law', 'Cannabis Law', 'Civil Litigation', 'Civil Rights',
  'Class Action', 'Collections', 'Communications', 'Construction & Development',
  'Consumer Protection', 'Contracts & Agreements', 'Corporate Law',
  'Criminal Defense', 'Custody', 'Debt Collection', 'DUI/DWI',
  'Education Law', 'Elder Law', 'Election Law', 'Employment & Labor',
  'Energy', 'Entertainment', 'Environmental Law', 'Estate Planning',
  'Ethics', 'Family Law', 'Foreclosure', 'Franchise', 'Government',
  'Health Care', 'Immigration', 'Insurance', 'Intellectual Property',
  'International Law', 'Internet & Technology', 'Juvenile Law',
  'Landlord & Tenant', 'Land Use & Zoning', 'Legal Malpractice',
  'Litigation', 'Medical Malpractice', 'Mergers & Acquisitions',
  'Military Law', 'Municipal Law', 'Native American Law',
  'Nonprofit & Charity', 'Oil & Gas', 'Patents', 'Personal Injury',
  'Probate', 'Product Liability', 'Professional Malpractice',
  'Real Estate', 'Securities', 'Social Security', 'Sports & Recreation',
  'Tax', 'Telecommunications', 'Toxic Tort', 'Trademarks',
  'Traffic Violations', 'Transportation', 'Trusts', 'Veterans Affairs',
  'White Collar Crime', 'Wills', 'Workers Compensation', 'Wrongful Death',
  'Dissolutions', 'Visitation', 'Post-Judgment Issues',
];
