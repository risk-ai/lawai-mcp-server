"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KNOWN_PRACTICE_AREAS = exports.STATE_NAMES = exports.US_STATES = void 0;
// US state name ↔ abbreviation mapping
exports.US_STATES = {
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
exports.STATE_NAMES = Object.fromEntries(Object.entries(exports.US_STATES).map(([name, code]) => [code, name.replace(/\b\w/g, c => c.toUpperCase())]));
// Known clean practice areas (for filtering dirty data)
exports.KNOWN_PRACTICE_AREAS = [
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
//# sourceMappingURL=index.js.map