/**
 * Curated legal cost reference data.
 * Sources: Clio Legal Trends Report, Martindale-Nolo surveys, legal industry benchmarks.
 * All figures in USD. Base = "moderate" complexity in a mid-market US city.
 */
export interface CostData {
    practice_area: string;
    billing_structures: {
        hourly?: {
            low: number;
            mid: number;
            high: number;
        };
        flat_fee?: {
            low: number;
            mid: number;
            high: number;
        };
        contingency?: {
            typical_percent: number;
            range: string;
        };
        retainer?: {
            low: number;
            mid: number;
            high: number;
        };
    };
    typical_duration: string;
    common_billing: string;
    complexity_multipliers: {
        simple: number;
        moderate: number;
        complex: number;
        high_stakes: number;
    };
    cost_drivers: string[];
    notes?: string;
}
export declare const LEGAL_COST_DATA: CostData[];
export declare const REGIONAL_ADJUSTMENTS: Record<string, number>;
/**
 * Find cost data for a practice area (fuzzy match).
 */
export declare function findCostData(practiceArea: string): CostData | null;
