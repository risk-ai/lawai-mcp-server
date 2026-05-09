import { LawyerSummary, LawyerProfile, PracticeAreaInfo, JurisdictionInfo } from '../types/index.js';
export declare function searchLawyers(params: {
    practice_area?: string;
    state?: string;
    city?: string;
    bar_status?: string;
    limit?: number;
    offset?: number;
    firm_size?: 'solo' | 'small' | 'medium' | 'large';
    min_experience_years?: number;
    max_experience_years?: number;
    languages?: string[];
    min_rating?: number;
    claimed_only?: boolean;
}): Promise<LawyerSummary[]>;
export declare function getLawyerProfile(lawyerId: number): Promise<LawyerProfile | null>;
export declare function findLawyerByName(name: string, state?: string): Promise<LawyerSummary[]>;
export declare function getPracticeAreas(): Promise<PracticeAreaInfo[]>;
export declare function getJurisdictions(): Promise<JurisdictionInfo[]>;
export interface MatchResult {
    lawyer: LawyerSummary;
    relevance_score: number;
    matched_practice_areas: string[];
    relevance_explanation: string;
}
export declare function matchLawyerToMatter(params: {
    description: string;
    location?: string;
    urgency?: string;
    budget?: string;
    limit?: number;
}): Promise<{
    matches: MatchResult[];
    classified_areas: string[];
    classification_details: {
        area: string;
        score: number;
        keywords: string[];
    }[];
}>;
