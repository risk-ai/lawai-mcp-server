"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchLawyers = searchLawyers;
exports.getLawyerProfile = getLawyerProfile;
exports.findLawyerByName = findLawyerByName;
exports.getPracticeAreas = getPracticeAreas;
exports.getJurisdictions = getJurisdictions;
exports.matchLawyerToMatter = matchLawyerToMatter;
const connection_js_1 = require("./connection.js");
const index_js_1 = require("../types/index.js");
const practice_area_classifier_js_1 = require("../data/practice-area-classifier.js");
const BASE_URL = process.env.LAW_AI_BASE_URL || 'https://law.ai';
function buildProfileUrl(slug, id) {
    return slug ? `${BASE_URL}/lawyers/${slug}` : `${BASE_URL}/lawyers/${id}`;
}
// Normalize state input to 2-letter abbreviation
function normalizeState(input) {
    const trimmed = input.trim();
    // Already abbreviation?
    if (trimmed.length === 2)
        return trimmed.toUpperCase();
    // Full name?
    const code = index_js_1.US_STATES[trimmed.toLowerCase()];
    return code || null;
}
// Normalize bar_status to canonical DB value so the btree index on bar_status can be used.
// DB values: Active, Delinquent, Disbarred, Suspended, Incapacitated, Inactive,
// 'Due to reregister within 30 days of birthday', 'Resigned from bar - disciplinary reason'.
const BAR_STATUS_CANONICAL = {
    'active': 'Active',
    'delinquent': 'Delinquent',
    'disbarred': 'Disbarred',
    'suspended': 'Suspended',
    'incapacitated': 'Incapacitated',
    'inactive': 'Inactive',
    'resigned': 'Resigned from bar - disciplinary reason',
};
function normalizeBarStatus(input) {
    const key = input.trim().toLowerCase();
    if (!key)
        return null;
    return BAR_STATUS_CANONICAL[key] || null;
}
// Clean practice areas — filter out dirty/bio data
function cleanPracticeAreas(raw) {
    if (!raw)
        return [];
    return raw
        .map(pa => pa.trim())
        .filter(pa => pa.length > 0 && pa.length < 80 && !pa.includes('$') && !pa.includes('|'));
}
async function searchLawyers(params) {
    const pool = (0, connection_js_1.getPool)();
    // Sanity bounds on free-text inputs — prevents pathological full-table scans against unindexable predicates.
    // No real practice_area, city, or bar_status value is longer than 80 chars.
    const MAX_TEXT_LEN = 80;
    if ((params.practice_area && params.practice_area.length > MAX_TEXT_LEN) ||
        (params.city && params.city.length > MAX_TEXT_LEN) ||
        (params.bar_status && params.bar_status.length > MAX_TEXT_LEN)) {
        return [];
    }
    const conditions = ['l.is_active = true'];
    const values = [];
    let paramIdx = 1;
    if (params.practice_area) {
        conditions.push(`EXISTS (SELECT 1 FROM unnest(l.practice_areas) pa WHERE LOWER(TRIM(pa)) LIKE LOWER($${paramIdx}))`);
        values.push(`%${params.practice_area}%`);
        paramIdx++;
    }
    if (params.state) {
        const stateCode = normalizeState(params.state);
        if (stateCode) {
            conditions.push(`l.region = $${paramIdx}`);
            values.push(stateCode);
            paramIdx++;
        }
    }
    if (params.city) {
        conditions.push(`LOWER(l.city) = LOWER($${paramIdx})`);
        values.push(params.city.trim());
        paramIdx++;
    }
    if (params.bar_status && params.bar_status.toLowerCase() !== 'any') {
        // Database stores canonical title-case values for bar_status (e.g. 'Active', 'Delinquent', 'Disbarred',
        // 'Suspended', 'Inactive'). Use a normalized equality so the btree index on bar_status is hit (LOWER()
        // wrapper or ILIKE both force a sequential scan against ~838K active lawyers, blowing the statement timeout).
        const normalized = normalizeBarStatus(params.bar_status);
        if (normalized) {
            conditions.push(`l.bar_status = $${paramIdx}`);
            values.push(normalized);
            paramIdx++;
        }
        else {
            // Unknown bar_status value — nothing will match, but keep the query well-formed.
            conditions.push(`l.bar_status = $${paramIdx}`);
            values.push(params.bar_status.trim());
            paramIdx++;
        }
    }
    // Advanced filters
    if (params.firm_size) {
        // Firm size heuristic based on practice_areas count and firm name patterns
        switch (params.firm_size) {
            case 'solo':
                conditions.push(`(l.firm IS NULL OR LOWER(l.firm) LIKE '%solo%' OR LOWER(l.firm) LIKE '%pllc%' OR LOWER(l.firm) LIKE '%law office%')`);
                break;
            case 'small':
                conditions.push(`(array_length(l.practice_areas, 1) BETWEEN 1 AND 3 AND l.firm IS NOT NULL AND LOWER(l.firm) NOT LIKE '%llp%' AND LOWER(l.firm) NOT LIKE '%associates%')`);
                break;
            case 'medium':
                conditions.push(`(array_length(l.practice_areas, 1) BETWEEN 3 AND 6 OR LOWER(l.firm) LIKE '%associates%' OR LOWER(l.firm) LIKE '%partners%')`);
                break;
            case 'large':
                conditions.push(`(array_length(l.practice_areas, 1) > 6 OR LOWER(l.firm) LIKE '%llp%' OR LOWER(l.firm) LIKE '%international%')`);
                break;
        }
    }
    if (params.min_experience_years) {
        conditions.push(`l.experience_years >= $${paramIdx}`);
        values.push(params.min_experience_years);
        paramIdx++;
    }
    if (params.max_experience_years) {
        conditions.push(`l.experience_years <= $${paramIdx}`);
        values.push(params.max_experience_years);
        paramIdx++;
    }
    if (params.languages && params.languages.length > 0) {
        // Check if any of the requested languages are in the lawyer's languages array
        const languageConditions = params.languages.map(() => {
            const condition = `EXISTS (SELECT 1 FROM unnest(l.languages) lang WHERE LOWER(TRIM(lang)) = LOWER($${paramIdx}))`;
            paramIdx++;
            return condition;
        });
        conditions.push(`(${languageConditions.join(' OR ')})`);
        values.push(...params.languages.map(lang => lang.trim()));
    }
    if (params.min_rating) {
        conditions.push(`l.rating >= $${paramIdx}`);
        values.push(params.min_rating);
        paramIdx++;
    }
    if (params.claimed_only) {
        conditions.push(`l.claimed = true`);
    }
    const limit = Math.min(params.limit || 10, 50);
    const offset = params.offset || 0;
    const query = `
    SELECT l.id, l.name, l.practice_areas, l.city, l.region, l.firm,
           l.bar_status, l.claimed, l.rating, l.review_count, l.slug,
           l.experience_years, l.languages
    FROM lawai.lawyers l
    WHERE ${conditions.join(' AND ')}
    ORDER BY
      l.claimed DESC,
      l.rating DESC NULLS LAST,
      l.review_count DESC NULLS LAST,
      l.experience_years DESC NULLS LAST,
      l.bio IS NOT NULL DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;
    values.push(limit, offset);
    const result = await pool.query(query, values);
    return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        practice_areas: cleanPracticeAreas(row.practice_areas),
        city: row.city,
        state: row.region,
        firm: row.firm,
        bar_status: row.bar_status,
        claimed: row.claimed || false,
        rating: row.rating,
        review_count: row.review_count,
        profile_url: buildProfileUrl(row.slug, row.id),
    }));
}
async function getLawyerProfile(lawyerId) {
    const pool = (0, connection_js_1.getPool)();
    const result = await pool.query(`
    SELECT l.id, l.name, l.practice_areas, l.city, l.region, l.firm,
           l.bar_status, l.claimed, l.rating, l.review_count, l.slug,
           l.bio, l.education, l.bar_number, l.bar_admissions,
           l.website_url, l.languages, l.experience_years,
           l.awards, l.professional_associations, l.publications,
           l.certifications, l.rate_min, l.rate_max, l.rate_currency,
           l.email, l.phone, l.contact_form_url, l.opt_in_status
    FROM lawai.lawyers l
    WHERE l.id = $1 AND l.is_active = true
  `, [lawyerId]);
    if (result.rows.length === 0)
        return null;
    const row = result.rows[0];
    const canShowContact = row.claimed === true;
    return {
        id: row.id,
        name: row.name,
        practice_areas: cleanPracticeAreas(row.practice_areas),
        city: row.city,
        state: row.region,
        firm: row.firm,
        bar_status: row.bar_status,
        claimed: row.claimed || false,
        rating: row.rating,
        review_count: row.review_count,
        profile_url: buildProfileUrl(row.slug, row.id),
        bio: row.bio,
        education: row.education,
        bar_number: row.bar_number,
        bar_admissions: row.bar_admissions,
        website_url: row.website_url,
        languages: row.languages,
        experience_years: row.experience_years,
        awards: row.awards,
        professional_associations: row.professional_associations,
        publications: row.publications,
        certifications: row.certifications,
        rate_min: row.rate_min ? parseFloat(row.rate_min) : null,
        rate_max: row.rate_max ? parseFloat(row.rate_max) : null,
        rate_currency: row.rate_currency,
        // Only show contact info for claimed profiles
        email: canShowContact ? row.email : null,
        phone: canShowContact ? row.phone : null,
        contact_form_url: canShowContact ? row.contact_form_url : null,
    };
}
async function findLawyerByName(name, state) {
    const pool = (0, connection_js_1.getPool)();
    const conditions = ['l.is_active = true'];
    const values = [];
    let paramIdx = 1;
    // Use full-text search if available, else ILIKE
    conditions.push(`l.name ILIKE $${paramIdx}`);
    values.push(`%${name.trim()}%`);
    paramIdx++;
    if (state) {
        const stateCode = normalizeState(state);
        if (stateCode) {
            conditions.push(`l.region = $${paramIdx}`);
            values.push(stateCode);
            paramIdx++;
        }
    }
    const result = await pool.query(`
    SELECT l.id, l.name, l.practice_areas, l.city, l.region, l.firm,
           l.bar_status, l.claimed, l.rating, l.review_count, l.slug
    FROM lawai.lawyers l
    WHERE ${conditions.join(' AND ')}
    ORDER BY
      l.claimed DESC,
      CASE WHEN LOWER(l.name) = LOWER($1) THEN 0 ELSE 1 END,
      l.rating DESC NULLS LAST
    LIMIT 20
  `, values);
    return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        practice_areas: cleanPracticeAreas(row.practice_areas),
        city: row.city,
        state: row.region,
        firm: row.firm,
        bar_status: row.bar_status,
        claimed: row.claimed || false,
        rating: row.rating,
        review_count: row.review_count,
        profile_url: buildProfileUrl(row.slug, row.id),
    }));
}
async function getPracticeAreas() {
    const pool = (0, connection_js_1.getPool)();
    // Use materialized view for fast, clean results
    const result = await pool.query(`
    SELECT practice_area, lawyer_count
    FROM public.mv_clean_practice_areas
    ORDER BY lawyer_count DESC
  `);
    return result.rows.map(row => ({
        name: row.practice_area,
        lawyer_count: parseInt(row.lawyer_count),
    }));
}
async function getJurisdictions() {
    const pool = (0, connection_js_1.getPool)();
    // Use materialized view for fast, clean results
    const result = await pool.query(`
    SELECT region, lawyer_count
    FROM public.mv_clean_jurisdictions
    ORDER BY lawyer_count DESC
  `);
    return result.rows.map(row => ({
        state: index_js_1.STATE_NAMES[row.region] || row.region,
        state_code: row.region,
        lawyer_count: parseInt(row.lawyer_count),
    }));
}
async function matchLawyerToMatter(params) {
    // Step 1: Classify the description into practice areas
    const classifications = (0, practice_area_classifier_js_1.classifyPracticeAreas)(params.description);
    if (classifications.length === 0) {
        // Fallback: broad search by location only
        const fallbackResults = await searchLawyers({
            state: params.location,
            limit: params.limit || 5,
        });
        return {
            matches: fallbackResults.map(l => ({
                lawyer: l,
                relevance_score: 0.5,
                matched_practice_areas: [],
                relevance_explanation: 'General match based on location (could not classify specific practice area from description).',
            })),
            classified_areas: [],
            classification_details: [],
        };
    }
    // Step 2: Use top practice areas to search
    const topAreas = classifications.slice(0, 3);
    const primaryArea = topAreas[0].practice_area;
    // Parse location for state/city
    let state;
    let city;
    if (params.location) {
        const loc = params.location.trim();
        // Try to split "City, State" or just "State"
        const parts = loc.split(',').map(s => s.trim());
        if (parts.length >= 2) {
            city = parts[0];
            state = parts[1];
        }
        else {
            // Could be just a state name/code
            const stateCode = normalizeState(loc);
            if (stateCode) {
                state = loc;
            }
            else {
                // Might be a city, search without state filter
                city = loc;
            }
        }
    }
    const limit = Math.min(params.limit || 5, 20);
    // Search with primary practice area
    // Use first word of practice area for broader DB matching
    // (DB practice_area values vary: "Landlord/Tenant", "Landlord-Tenant Law", etc.)
    const searchArea = primaryArea.includes('&') || primaryArea.includes('/')
        ? primaryArea.split(/[&\/]/)[0].trim()
        : primaryArea;
    const results = await searchLawyers({
        practice_area: searchArea,
        state,
        city,
        limit: limit * 2, // Get extra to re-rank
    });
    // Step 3: Score and rank
    const allAreaNames = new Set(topAreas.map(a => a.practice_area));
    const scored = results.map(lawyer => {
        let score = 0;
        const matchedAreas = [];
        // Practice area match scoring
        for (const area of topAreas) {
            const lawyerAreas = lawyer.practice_areas.map(a => a.toLowerCase());
            if (lawyerAreas.some(a => a.includes(area.practice_area.toLowerCase()) || area.practice_area.toLowerCase().includes(a))) {
                score += area.score * 2;
                matchedAreas.push(area.practice_area);
            }
        }
        // Boost factors
        if (lawyer.claimed)
            score += 5; // Verified profile
        if (lawyer.rating && lawyer.rating >= 4)
            score += 3;
        if (lawyer.review_count && lawyer.review_count > 0)
            score += 1;
        return { lawyer, score, matchedAreas };
    });
    scored.sort((a, b) => b.score - a.score);
    const matches = scored.slice(0, limit).map(({ lawyer, score, matchedAreas }) => {
        const maxPossible = topAreas.reduce((sum, a) => sum + a.score * 2, 0) + 9; // max boosts
        const normalizedScore = Math.min(Math.round((score / maxPossible) * 100) / 100, 1);
        const explanationParts = [];
        if (matchedAreas.length > 0)
            explanationParts.push(`Practices ${matchedAreas.join(', ')}`);
        if (lawyer.claimed)
            explanationParts.push('Verified profile');
        if (lawyer.rating && lawyer.rating >= 4)
            explanationParts.push(`${lawyer.rating}/5 rating`);
        if (lawyer.city && lawyer.state)
            explanationParts.push(`Located in ${lawyer.city}, ${lawyer.state}`);
        return {
            lawyer,
            relevance_score: normalizedScore,
            matched_practice_areas: matchedAreas,
            relevance_explanation: explanationParts.join(' • ') || 'General match',
        };
    });
    return {
        matches,
        classified_areas: topAreas.map(a => a.practice_area),
        classification_details: topAreas.map(a => ({ area: a.practice_area, score: a.score, keywords: a.matched_keywords })),
    };
}
//# sourceMappingURL=queries.js.map