"use strict";
/**
 * Keyword-based practice area classifier.
 * Maps common legal terms/phrases to practice areas.
 * No LLM dependency — pure pattern matching.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyPracticeAreas = classifyPracticeAreas;
exports.classifyComplexity = classifyComplexity;
// keyword/phrase → practice area(s)
const KEYWORD_MAP = {
    // Family Law
    'divorce': ['Family Law'],
    'custody': ['Family Law'],
    'child support': ['Family Law'],
    'alimony': ['Family Law'],
    'spousal support': ['Family Law'],
    'prenup': ['Family Law'],
    'prenuptial': ['Family Law'],
    'separation': ['Family Law'],
    'visitation': ['Family Law'],
    'adoption': ['Family Law', 'Adoption'],
    'paternity': ['Family Law'],
    'domestic violence': ['Family Law', 'Criminal Defense'],
    'restraining order': ['Family Law'],
    'child custody': ['Family Law'],
    'marital': ['Family Law'],
    // Criminal Defense
    'criminal': ['Criminal Defense'],
    'arrested': ['Criminal Defense'],
    'charged': ['Criminal Defense'],
    'felony': ['Criminal Defense'],
    'misdemeanor': ['Criminal Defense'],
    'assault': ['Criminal Defense'],
    'theft': ['Criminal Defense'],
    'robbery': ['Criminal Defense'],
    'burglary': ['Criminal Defense'],
    'drug charge': ['Criminal Defense'],
    'drug possession': ['Criminal Defense'],
    'murder': ['Criminal Defense'],
    'manslaughter': ['Criminal Defense'],
    'bail': ['Criminal Defense'],
    'plea': ['Criminal Defense'],
    'probation': ['Criminal Defense'],
    'parole': ['Criminal Defense'],
    'sex crime': ['Criminal Defense'],
    'fraud': ['Criminal Defense', 'White Collar Crime'],
    'white collar': ['White Collar Crime'],
    'embezzlement': ['White Collar Crime', 'Criminal Defense'],
    // DUI/DWI
    'dui': ['DUI/DWI', 'Criminal Defense'],
    'dwi': ['DUI/DWI', 'Criminal Defense'],
    'drunk driving': ['DUI/DWI', 'Criminal Defense'],
    'impaired driving': ['DUI/DWI', 'Criminal Defense'],
    'breathalyzer': ['DUI/DWI'],
    // Personal Injury
    'personal injury': ['Personal Injury'],
    'slip and fall': ['Personal Injury'],
    'car accident': ['Personal Injury'],
    'auto accident': ['Personal Injury'],
    'truck accident': ['Personal Injury'],
    'motorcycle accident': ['Personal Injury'],
    'injured': ['Personal Injury'],
    'negligence': ['Personal Injury', 'Medical Malpractice'],
    'wrongful death': ['Wrongful Death', 'Personal Injury'],
    'dog bite': ['Personal Injury'],
    'premises liability': ['Personal Injury'],
    'product liability': ['Product Liability'],
    'defective product': ['Product Liability'],
    // Medical Malpractice
    'medical malpractice': ['Medical Malpractice'],
    'misdiagnosis': ['Medical Malpractice'],
    'surgical error': ['Medical Malpractice'],
    'doctor negligence': ['Medical Malpractice'],
    'hospital error': ['Medical Malpractice'],
    'birth injury': ['Medical Malpractice'],
    // Employment & Labor
    'fired': ['Employment & Labor'],
    'wrongful termination': ['Employment & Labor'],
    'discrimination': ['Employment & Labor', 'Civil Rights'],
    'harassment': ['Employment & Labor'],
    'sexual harassment': ['Employment & Labor'],
    'wage theft': ['Employment & Labor'],
    'overtime': ['Employment & Labor'],
    'workers comp': ['Workers Compensation'],
    'workers compensation': ['Workers Compensation'],
    'workplace injury': ['Workers Compensation'],
    'on the job injury': ['Workers Compensation'],
    'unemployment': ['Employment & Labor'],
    'severance': ['Employment & Labor'],
    'non-compete': ['Employment & Labor'],
    'retaliation': ['Employment & Labor'],
    'whistleblower': ['Employment & Labor'],
    'hostile work environment': ['Employment & Labor'],
    // Real Estate
    'real estate': ['Real Estate'],
    'property': ['Real Estate'],
    'mortgage': ['Real Estate'],
    'foreclosure': ['Real Estate', 'Foreclosure'],
    'title': ['Real Estate'],
    'deed': ['Real Estate'],
    'zoning': ['Land Use & Zoning'],
    'land use': ['Land Use & Zoning'],
    'closing': ['Real Estate'],
    'home purchase': ['Real Estate'],
    'easement': ['Real Estate'],
    'boundary dispute': ['Real Estate'],
    // Landlord & Tenant
    'landlord': ['Landlord & Tenant'],
    'tenant': ['Landlord & Tenant'],
    'eviction': ['Landlord & Tenant'],
    'lease': ['Landlord & Tenant'],
    'rent': ['Landlord & Tenant'],
    'security deposit': ['Landlord & Tenant'],
    // Bankruptcy
    'bankruptcy': ['Bankruptcy'],
    'chapter 7': ['Bankruptcy'],
    'chapter 11': ['Bankruptcy'],
    'chapter 13': ['Bankruptcy'],
    'debt relief': ['Bankruptcy'],
    'insolvency': ['Bankruptcy'],
    'creditor': ['Bankruptcy', 'Debt Collection'],
    // Immigration
    'immigration': ['Immigration'],
    'visa': ['Immigration'],
    'green card': ['Immigration'],
    'deportation': ['Immigration'],
    'asylum': ['Immigration'],
    'citizenship': ['Immigration'],
    'naturalization': ['Immigration'],
    'daca': ['Immigration'],
    'h1b': ['Immigration'],
    'work permit': ['Immigration'],
    // Estate Planning
    'estate planning': ['Estate Planning'],
    'will': ['Wills', 'Estate Planning'],
    'testament': ['Wills', 'Estate Planning'],
    'trust': ['Trusts', 'Estate Planning'],
    'probate': ['Probate', 'Estate Planning'],
    'inheritance': ['Estate Planning', 'Probate'],
    'power of attorney': ['Estate Planning'],
    'living will': ['Estate Planning'],
    'estate': ['Estate Planning'],
    'executor': ['Probate'],
    'beneficiary': ['Estate Planning'],
    // Business Law
    'business': ['Business Law'],
    'corporation': ['Corporate Law'],
    'llc': ['Business Law'],
    'partnership': ['Business Law'],
    'incorporate': ['Corporate Law', 'Business Law'],
    'business formation': ['Business Law'],
    'shareholder': ['Corporate Law'],
    'merger': ['Mergers & Acquisitions'],
    'acquisition': ['Mergers & Acquisitions'],
    'startup': ['Business Law'],
    // Intellectual Property
    'intellectual property': ['Intellectual Property'],
    'patent': ['Patents', 'Intellectual Property'],
    'trademark': ['Trademarks', 'Intellectual Property'],
    'copyright': ['Intellectual Property'],
    'trade secret': ['Intellectual Property'],
    'ip': ['Intellectual Property'],
    'infringement': ['Intellectual Property'],
    // Tax
    'tax': ['Tax'],
    'irs': ['Tax'],
    'tax audit': ['Tax'],
    'tax evasion': ['Tax', 'Criminal Defense'],
    'tax debt': ['Tax'],
    'back taxes': ['Tax'],
    // Consumer Protection
    'consumer': ['Consumer Protection'],
    'scam': ['Consumer Protection'],
    'lemon law': ['Consumer Protection'],
    'unfair business': ['Consumer Protection'],
    'deceptive practices': ['Consumer Protection'],
    // Civil Litigation
    'lawsuit': ['Civil Litigation', 'Litigation'],
    'sue': ['Civil Litigation', 'Litigation'],
    'litigation': ['Civil Litigation', 'Litigation'],
    'dispute': ['Civil Litigation'],
    'court': ['Civil Litigation'],
    'appeal': ['Appellate'],
    // Traffic
    'traffic ticket': ['Traffic Violations'],
    'speeding ticket': ['Traffic Violations'],
    'traffic violation': ['Traffic Violations'],
    'moving violation': ['Traffic Violations'],
    'license suspended': ['Traffic Violations'],
    // Contracts
    'contract': ['Contracts & Agreements'],
    'breach of contract': ['Contracts & Agreements', 'Civil Litigation'],
    'agreement': ['Contracts & Agreements'],
    'nda': ['Contracts & Agreements'],
    // Elder Law
    'elder': ['Elder Law'],
    'nursing home': ['Elder Law'],
    'medicaid': ['Elder Law'],
    'medicare': ['Elder Law', 'Health Care'],
    'guardianship': ['Elder Law', 'Family Law'],
    // Social Security
    'social security': ['Social Security'],
    'disability': ['Social Security'],
    'ssi': ['Social Security'],
    'ssdi': ['Social Security'],
    // Civil Rights
    'civil rights': ['Civil Rights'],
    'police brutality': ['Civil Rights'],
    'excessive force': ['Civil Rights'],
    'constitutional': ['Civil Rights'],
    'voting rights': ['Civil Rights'],
    // Insurance
    'insurance claim': ['Insurance'],
    'insurance denial': ['Insurance'],
    'bad faith insurance': ['Insurance'],
    'insurance dispute': ['Insurance'],
    // Environmental
    'environmental': ['Environmental Law'],
    'pollution': ['Environmental Law'],
    'contamination': ['Environmental Law'],
    'epa': ['Environmental Law'],
};
/**
 * Classify a description into practice areas.
 * Returns scored results sorted by relevance.
 */
function classifyPracticeAreas(description) {
    const lower = description.toLowerCase();
    const scores = new Map();
    for (const [keyword, areas] of Object.entries(KEYWORD_MAP)) {
        // Check for keyword match (word boundary aware for short keywords)
        const regex = keyword.length <= 3
            ? new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i')
            : new RegExp(escapeRegex(keyword), 'i');
        if (regex.test(lower)) {
            for (const area of areas) {
                const existing = scores.get(area) || { score: 0, keywords: [] };
                // Longer keyword matches get more weight
                existing.score += keyword.length >= 10 ? 3 : keyword.length >= 5 ? 2 : 1;
                existing.keywords.push(keyword);
                scores.set(area, existing);
            }
        }
    }
    return Array.from(scores.entries())
        .map(([area, data]) => ({
        practice_area: area,
        score: data.score,
        matched_keywords: data.keywords,
    }))
        .sort((a, b) => b.score - a.score);
}
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/**
 * Classify complexity from a description.
 */
function classifyComplexity(description) {
    const lower = description.toLowerCase();
    const highStakesSignals = [
        'federal', 'appeal', 'supreme court', 'jury trial', 'class action',
        'multi-million', 'millions', 'international', 'multiple parties',
        'rico', 'securities fraud', 'death penalty', 'capital',
    ];
    const complexSignals = [
        'contested', 'multiple', 'trial', 'litigation', 'complex',
        'disputed', 'expert witness', 'discovery', 'deposition',
        'high asset', 'business valuation', 'multiple charges',
        'felony', 'serious', 'extensive',
    ];
    const simpleSignals = [
        'simple', 'uncontested', 'straightforward', 'basic',
        'first offense', 'first-offense', 'minor', 'routine',
        'no contest', 'agreed', 'amicable', 'mutual',
        'quick', 'standard',
    ];
    let score = 0; // -2 = simple, 0 = moderate, +2 = complex, +4 = high_stakes
    for (const s of highStakesSignals) {
        if (lower.includes(s))
            score += 3;
    }
    for (const s of complexSignals) {
        if (lower.includes(s))
            score += 1;
    }
    for (const s of simpleSignals) {
        if (lower.includes(s))
            score -= 2;
    }
    if (score >= 4)
        return 'high_stakes';
    if (score >= 2)
        return 'complex';
    if (score <= -2)
        return 'simple';
    return 'moderate';
}
//# sourceMappingURL=practice-area-classifier.js.map