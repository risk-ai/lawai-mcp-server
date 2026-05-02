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
export declare const US_STATES: Record<string, string>;
export declare const STATE_NAMES: Record<string, string>;
export declare const KNOWN_PRACTICE_AREAS: string[];
