/**
 * Keyword-based practice area classifier.
 * Maps common legal terms/phrases to practice areas.
 * No LLM dependency — pure pattern matching.
 */
export interface ClassificationResult {
    practice_area: string;
    score: number;
    matched_keywords: string[];
}
/**
 * Classify a description into practice areas.
 * Returns scored results sorted by relevance.
 */
export declare function classifyPracticeAreas(description: string): ClassificationResult[];
/**
 * Classify complexity from a description.
 */
export declare function classifyComplexity(description: string): 'simple' | 'moderate' | 'complex' | 'high_stakes';
