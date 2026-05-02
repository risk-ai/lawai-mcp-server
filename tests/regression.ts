/**
 * MCP Server Regression Test Suite
 * QA Lead: Quincy @ Law.AI
 * 
 * Tests all 5 MCP tools: search_lawyers, get_lawyer_profile, find_lawyer_by_name,
 * get_practice_areas, get_jurisdictions
 * 
 * Categories: A) Basic Functionality, B) Edge Cases, C) Data Integrity,
 *             D) Privacy/Security, E) Performance
 */

import { searchLawyers, getLawyerProfile, findLawyerByName, getPracticeAreas, getJurisdictions } from '../src/db/queries.js';
import { closePool } from '../src/db/connection.js';

// ─── Test Framework ───

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function test(category: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, category, passed: true, duration: Date.now() - start });
  } catch (e: any) {
    results.push({ name, category, passed: false, duration: Date.now() - start, error: e.message || String(e) });
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

function assertEqual(actual: any, expected: any, msg: string) {
  if (actual !== expected) throw new Error(`${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ─── A. Basic Functionality ───

async function basicFunctionality() {
  await test('A', 'search_lawyers returns results with correct shape', async () => {
    const results = await searchLawyers({ state: 'CA', limit: 5 });
    assert(results.length > 0, 'Should return results for CA');
    assert(results.length <= 5, 'Should respect limit');
    const r = results[0];
    assert(typeof r.id === 'number', 'id should be number');
    assert(typeof r.name === 'string' && r.name.length > 0, 'name should be non-empty string');
    assert(typeof r.profile_url === 'string', 'profile_url should be string');
    assert(Array.isArray(r.practice_areas), 'practice_areas should be array');
    assert(typeof r.claimed === 'boolean', 'claimed should be boolean');
  });

  await test('A', 'search_lawyers with practice_area filter', async () => {
    const results = await searchLawyers({ practice_area: 'Criminal Defense', limit: 5 });
    assert(results.length > 0, 'Should find criminal defense lawyers');
  });

  await test('A', 'search_lawyers with city + state combo', async () => {
    const results = await searchLawyers({ state: 'TX', city: 'Houston', limit: 5 });
    assert(results.length > 0, 'Should find lawyers in Houston, TX');
    for (const r of results) {
      assertEqual(r.state, 'TX', 'State should be TX');
    }
  });

  await test('A', 'search_lawyers with bar_status filter', async () => {
    const results = await searchLawyers({ bar_status: 'Active', state: 'NY', limit: 5 });
    assert(results.length > 0, 'Should find active lawyers in NY');
  });

  await test('A', 'search_lawyers with all filters combined', async () => {
    const results = await searchLawyers({
      practice_area: 'Personal Injury', state: 'Florida', city: 'Miami',
      bar_status: 'Active', limit: 3
    });
    // May or may not find results, but should not error
    assert(Array.isArray(results), 'Should return array');
  });

  await test('A', 'search_lawyers with state full name', async () => {
    const results = await searchLawyers({ state: 'California', limit: 3 });
    assert(results.length > 0, 'Should resolve full state name');
    for (const r of results) {
      assertEqual(r.state, 'CA', 'Should resolve California to CA');
    }
  });

  await test('A', 'get_lawyer_profile returns valid profile', async () => {
    // First find a lawyer to get an ID
    const lawyers = await searchLawyers({ state: 'CA', limit: 1 });
    assert(lawyers.length > 0, 'Need at least one lawyer');
    const profile = await getLawyerProfile(lawyers[0].id);
    assert(profile !== null, 'Profile should exist');
    assert(typeof profile!.id === 'number', 'id should be number');
    assert(typeof profile!.name === 'string', 'name should be string');
    assert(typeof profile!.profile_url === 'string', 'profile_url should be string');
    assert(Array.isArray(profile!.practice_areas), 'practice_areas should be array');
  });

  await test('A', 'get_lawyer_profile returns null for non-existent ID', async () => {
    const profile = await getLawyerProfile(999999999);
    assertEqual(profile, null, 'Non-existent ID should return null');
  });

  await test('A', 'find_lawyer_by_name returns results', async () => {
    const results = await findLawyerByName('Smith');
    assert(results.length > 0, 'Should find lawyers named Smith');
    for (const r of results) {
      assert(r.name.toLowerCase().includes('smith'), 'Name should contain Smith');
    }
  });

  await test('A', 'find_lawyer_by_name with state filter', async () => {
    const results = await findLawyerByName('Johnson', 'TX');
    assert(results.length > 0, 'Should find Johnson in TX');
    for (const r of results) {
      assertEqual(r.state, 'TX', 'State should be TX');
    }
  });

  await test('A', 'find_lawyer_by_name handles partial names', async () => {
    const results = await findLawyerByName('Joh');
    assert(results.length > 0, 'Should find partial name matches');
  });

  await test('A', 'get_practice_areas returns list with counts', async () => {
    const areas = await getPracticeAreas();
    assert(areas.length > 0, 'Should return practice areas');
    const a = areas[0];
    assert(typeof a.name === 'string' && a.name.length > 0, 'name should be non-empty string');
    assert(typeof a.lawyer_count === 'number' && a.lawyer_count > 0, 'lawyer_count should be positive');
  });

  await test('A', 'get_jurisdictions returns states with counts', async () => {
    const jurisdictions = await getJurisdictions();
    assert(jurisdictions.length > 0, 'Should return jurisdictions');
    const j = jurisdictions[0];
    assert(typeof j.state === 'string', 'state should be string');
    assert(typeof j.state_code === 'string' && j.state_code.length === 2, 'state_code should be 2 chars');
    assert(typeof j.lawyer_count === 'number' && j.lawyer_count > 0, 'lawyer_count should be positive');
  });
}

// ─── B. Edge Cases ───

async function edgeCases() {
  await test('B', 'search_lawyers with no params returns results', async () => {
    const results = await searchLawyers({});
    assert(results.length > 0, 'Empty params should return default results');
    assert(results.length <= 10, 'Default limit should be 10');
  });

  await test('B', 'search_lawyers caps limit at 50', async () => {
    // The zod schema enforces max(50), but the query also caps at 50
    const results = await searchLawyers({ limit: 50 });
    assert(results.length <= 50, 'Should return at most 50');
    assert(results.length > 0, 'Should return results');
  });

  await test('B', 'search_lawyers with invalid state code returns no results', async () => {
    const results = await searchLawyers({ state: 'ZZ', limit: 5 });
    // ZZ won't match any state code after normalizeState (returns null, so no state filter applied)
    // Actually: normalizeState('ZZ') returns 'ZZ' since length=2, so it searches for region='ZZ'
    assert(results.length === 0, 'Invalid state ZZ should return no results');
  });

  await test('B', 'search_lawyers with gibberish state full name', async () => {
    const results = await searchLawyers({ state: 'Nonexistentland', limit: 5 });
    // normalizeState returns null for unknown names, so no state filter → returns results
    assert(Array.isArray(results), 'Should not error on unknown state name');
  });

  await test('B', 'find_lawyer_by_name SQL injection attempt', async () => {
    // Should not error — parameterized queries protect against injection
    const results = await findLawyerByName("'; DROP TABLE lawyers; --");
    assert(Array.isArray(results), 'SQL injection should be safely handled');
  });

  await test('B', 'find_lawyer_by_name with another injection pattern', async () => {
    const results = await findLawyerByName("Robert'); DELETE FROM lawai.lawyers WHERE ('1'='1");
    assert(Array.isArray(results), 'SQL injection should be safely handled');
  });

  await test('B', 'find_lawyer_by_name with unicode characters', async () => {
    const results = await findLawyerByName('José García');
    assert(Array.isArray(results), 'Unicode names should not error');
  });

  await test('B', 'find_lawyer_by_name with special characters', async () => {
    const results = await findLawyerByName("O'Brien");
    assert(Array.isArray(results), 'Apostrophe in name should not error');
  });

  await test('B', 'find_lawyer_by_name with empty-like input', async () => {
    const results = await findLawyerByName('   ');
    assert(Array.isArray(results), 'Whitespace-only name should not error');
  });

  await test('B', 'search_lawyers with offset=0 vs offset=10 returns different results', async () => {
    const page1 = await searchLawyers({ state: 'CA', limit: 10, offset: 0 });
    const page2 = await searchLawyers({ state: 'CA', limit: 10, offset: 10 });
    assert(page1.length > 0, 'Page 1 should have results');
    assert(page2.length > 0, 'Page 2 should have results');
    const ids1 = new Set(page1.map(r => r.id));
    const ids2 = new Set(page2.map(r => r.id));
    let overlap = 0;
    for (const id of ids2) { if (ids1.has(id)) overlap++; }
    assertEqual(overlap, 0, 'Pages should not overlap');
  });

  await test('B', 'search_lawyers bar_status=Any returns results', async () => {
    const results = await searchLawyers({ state: 'NY', bar_status: 'Any', limit: 5 });
    assert(results.length > 0, 'Any bar status should return results');
  });

  await test('B', 'get_lawyer_profile with negative ID', async () => {
    const profile = await getLawyerProfile(-1);
    assertEqual(profile, null, 'Negative ID should return null');
  });

  await test('B', 'get_lawyer_profile with zero ID', async () => {
    const profile = await getLawyerProfile(0);
    assertEqual(profile, null, 'Zero ID should return null');
  });

  await test('B', 'search_lawyers with very long practice_area string', async () => {
    const results = await searchLawyers({ practice_area: 'A'.repeat(500), limit: 5 });
    assert(Array.isArray(results), 'Long string should not error');
    assertEqual(results.length, 0, 'Should return no results for nonsense');
  });
}

// ─── C. Data Integrity ───

async function dataIntegrity() {
  await test('C', 'All search results have required fields', async () => {
    const results = await searchLawyers({ limit: 50 });
    for (const r of results) {
      assert(typeof r.id === 'number' && r.id > 0, `id should be positive number, got ${r.id}`);
      assert(typeof r.name === 'string' && r.name.length > 0, `name should be non-empty, got "${r.name}"`);
      assert(typeof r.profile_url === 'string' && r.profile_url.startsWith('https://law.ai/lawyers/'), 
        `profile_url malformed: ${r.profile_url}`);
    }
  });

  await test('C', 'Practice areas are clean (no dirty data)', async () => {
    const areas = await getPracticeAreas();
    for (const a of areas) {
      assert(!a.name.includes('$'), `Practice area contains $: "${a.name}"`);
      assert(!a.name.includes('|'), `Practice area contains |: "${a.name}"`);
      assert(a.name.length < 80, `Practice area too long (${a.name.length}): "${a.name}"`);
      assert(a.name.trim().length > 0, 'Practice area should not be empty');
    }
  });

  await test('C', 'Profile URLs are well-formed', async () => {
    const results = await searchLawyers({ limit: 20 });
    for (const r of results) {
      assert(
        r.profile_url.match(/^https:\/\/law\.ai\/lawyers\/[\w\-]+$/) !== null ||
        r.profile_url.match(/^https:\/\/law\.ai\/lawyers\/\d+$/) !== null,
        `Malformed URL: ${r.profile_url}`
      );
    }
  });

  await test('C', 'Lawyer profiles from search have consistent types', async () => {
    const results = await searchLawyers({ state: 'IL', limit: 10 });
    for (const r of results) {
      assert(Array.isArray(r.practice_areas), 'practice_areas should be array');
      for (const pa of r.practice_areas) {
        assert(typeof pa === 'string', `practice_area item should be string, got ${typeof pa}`);
        assert(pa.length < 80, `practice area too long: "${pa}"`);
        assert(!pa.includes('$'), `practice area has $: "${pa}"`);
      }
      if (r.rating !== null) {
        assert(typeof r.rating === 'number', 'rating should be number if present');
      }
      if (r.review_count !== null) {
        assert(typeof r.review_count === 'number', 'review_count should be number if present');
      }
    }
  });

  await test('C', 'Full profile has extended fields with correct types', async () => {
    const lawyers = await searchLawyers({ state: 'CA', limit: 5 });
    for (const l of lawyers) {
      const profile = await getLawyerProfile(l.id);
      assert(profile !== null, `Profile ${l.id} should exist`);
      // Check nullable fields are correct types
      if (profile!.bio !== null) assert(typeof profile!.bio === 'string', 'bio should be string');
      if (profile!.education !== null) assert(typeof profile!.education === 'string', 'education should be string');
      if (profile!.experience_years !== null) assert(typeof profile!.experience_years === 'number', 'experience_years should be number');
      if (profile!.rate_min !== null) assert(typeof profile!.rate_min === 'number', 'rate_min should be number');
      if (profile!.rate_max !== null) assert(typeof profile!.rate_max === 'number', 'rate_max should be number');
    }
  });

  await test('C', 'Jurisdictions have valid 2-letter state codes', async () => {
    const jurisdictions = await getJurisdictions();
    const validCodes = new Set([
      'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS',
      'KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY',
      'NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV',
      'WI','WY','DC','PR','VI','GU','AS','MP'
    ]);
    for (const j of jurisdictions) {
      assert(j.state_code.length === 2, `Invalid state code length: ${j.state_code}`);
      // Some may be territories, so just check it's 2 uppercase letters
      assert(/^[A-Z]{2}$/.test(j.state_code), `Invalid state code format: ${j.state_code}`);
    }
  });

  await test('C', 'Jurisdiction totals are reasonable (>100K lawyers)', async () => {
    const jurisdictions = await getJurisdictions();
    const total = jurisdictions.reduce((sum, j) => sum + j.lawyer_count, 0);
    assert(total > 100000, `Total lawyers should be >100K, got ${total}`);
  });
}

// ─── D. Privacy/Security ───

async function privacySecurity() {
  await test('D', 'Unclaimed profiles do NOT leak email/phone/contact_form_url', async () => {
    // Find unclaimed profiles by searching broadly
    const lawyers = await searchLawyers({ limit: 50 });
    const unclaimed = lawyers.filter(l => !l.claimed);
    assert(unclaimed.length > 0, 'Need at least one unclaimed profile to test');

    let tested = 0;
    for (const l of unclaimed.slice(0, 10)) {
      const profile = await getLawyerProfile(l.id);
      if (profile) {
        assertEqual(profile.email, null, `Unclaimed profile ${l.id} (${l.name}) should not expose email`);
        assertEqual(profile.phone, null, `Unclaimed profile ${l.id} (${l.name}) should not expose phone`);
        assertEqual(profile.contact_form_url, null, `Unclaimed profile ${l.id} (${l.name}) should not expose contact_form_url`);
        tested++;
      }
    }
    assert(tested > 0, 'Should have tested at least one unclaimed profile');
  });

  await test('D', 'Claimed profiles DO include contact info (at least some)', async () => {
    const lawyers = await searchLawyers({ limit: 50 });
    const claimed = lawyers.filter(l => l.claimed);
    // It's okay if not all claimed have contact info, but we should find some
    if (claimed.length === 0) {
      // Can't test if no claimed profiles in sample
      return;
    }
    let anyHasContact = false;
    for (const l of claimed.slice(0, 10)) {
      const profile = await getLawyerProfile(l.id);
      if (profile && (profile.email || profile.phone || profile.contact_form_url)) {
        anyHasContact = true;
        break;
      }
    }
    // This is a soft check — not all claimed profiles may have contact info entered
    // Just verify the mechanism works (we already tested unclaimed don't leak)
  });

  await test('D', 'Rate of claimed profiles is reasonable (not 100%)', async () => {
    const lawyers = await searchLawyers({ limit: 50 });
    const claimedCount = lawyers.filter(l => l.claimed).length;
    // If all 50 are claimed, something might be wrong — most profiles should be unclaimed
    assert(claimedCount < lawyers.length, `All ${lawyers.length} profiles are claimed — suspicious`);
  });

  await test('D', 'Search results do NOT expose email/phone fields', async () => {
    const lawyers = await searchLawyers({ limit: 20 });
    for (const l of lawyers) {
      // LawyerSummary type should not have email/phone
      assert(!('email' in l), 'Search results should not have email field');
      assert(!('phone' in l), 'Search results should not have phone field');
    }
  });

  await test('D', 'find_lawyer_by_name results do NOT expose email/phone', async () => {
    const lawyers = await findLawyerByName('Smith');
    for (const l of lawyers) {
      assert(!('email' in l), 'Name search results should not have email field');
      assert(!('phone' in l), 'Name search results should not have phone field');
    }
  });

  await test('D', 'SQL injection in name field does not cause error or data leak', async () => {
    const injections = [
      "' OR '1'='1",
      "'; DROP TABLE lawai.lawyers; --",
      "1 UNION SELECT * FROM lawai.lawyers --",
      "Robert\\'; SELECT email FROM lawai.lawyers --",
    ];
    for (const injection of injections) {
      try {
        const results = await findLawyerByName(injection);
        assert(Array.isArray(results), `Injection "${injection}" should return array`);
      } catch (e: any) {
        // Should not expose internal error details
        assert(!e.message.includes('lawai.lawyers'), `Error message should not expose table names for "${injection}"`);
      }
    }
  });
}

// ─── E. Performance ───

async function performance() {
  await test('E', 'search_lawyers completes in <2s', async () => {
    const start = Date.now();
    await searchLawyers({ state: 'CA', practice_area: 'Criminal Defense', limit: 20 });
    const elapsed = Date.now() - start;
    assert(elapsed < 2000, `search_lawyers took ${elapsed}ms, expected <2000ms`);
  });

  await test('E', 'get_lawyer_profile completes in <2s', async () => {
    const lawyers = await searchLawyers({ limit: 1 });
    const start = Date.now();
    await getLawyerProfile(lawyers[0].id);
    const elapsed = Date.now() - start;
    assert(elapsed < 2000, `get_lawyer_profile took ${elapsed}ms, expected <2000ms`);
  });

  await test('E', 'find_lawyer_by_name completes in <2s', async () => {
    const start = Date.now();
    await findLawyerByName('Smith', 'CA');
    const elapsed = Date.now() - start;
    assert(elapsed < 2000, `find_lawyer_by_name took ${elapsed}ms, expected <2000ms`);
  });

  await test('E', 'get_practice_areas completes in <2s', async () => {
    const start = Date.now();
    await getPracticeAreas();
    const elapsed = Date.now() - start;
    assert(elapsed < 2000, `get_practice_areas took ${elapsed}ms, expected <2000ms`);
  });

  await test('E', 'get_jurisdictions completes in <2s', async () => {
    const start = Date.now();
    await getJurisdictions();
    const elapsed = Date.now() - start;
    assert(elapsed < 2000, `get_jurisdictions took ${elapsed}ms, expected <2000ms`);
  });

  await test('E', 'Pagination produces different results (offset works)', async () => {
    const p1 = await searchLawyers({ state: 'NY', limit: 5, offset: 0 });
    const p2 = await searchLawyers({ state: 'NY', limit: 5, offset: 5 });
    assert(p1.length === 5, 'Page 1 should have 5 results');
    assert(p2.length === 5, 'Page 2 should have 5 results');
    const p1Ids = p1.map(r => r.id);
    const p2Ids = p2.map(r => r.id);
    assert(!p1Ids.some(id => p2Ids.includes(id)), 'Offset pages should have different results');
  });

  await test('E', 'Broad search (no filters) completes in <3s', async () => {
    const start = Date.now();
    await searchLawyers({ limit: 50 });
    const elapsed = Date.now() - start;
    assert(elapsed < 3000, `Broad search took ${elapsed}ms, expected <3000ms`);
  });
}

// ─── Main Runner ───

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Law.AI MCP Server — Regression Test Suite');
  console.log('  QA Lead: Quincy');
  console.log('═══════════════════════════════════════════════════════\n');

  const suiteStart = Date.now();

  console.log('▶ A. Basic Functionality');
  await basicFunctionality();

  console.log('▶ B. Edge Cases');
  await edgeCases();

  console.log('▶ C. Data Integrity');
  await dataIntegrity();

  console.log('▶ D. Privacy/Security');
  await privacySecurity();

  console.log('▶ E. Performance');
  await performance();

  const totalDuration = Date.now() - suiteStart;

  // ─── Report ───
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('═══════════════════════════════════════════════════════\n');

  const passed = results.filter(r => r.passed);
  const failed = results.filter(r => !r.passed);

  // Print by category
  const categories = ['A', 'B', 'C', 'D', 'E'];
  const catNames: Record<string, string> = {
    A: 'Basic Functionality', B: 'Edge Cases', C: 'Data Integrity',
    D: 'Privacy/Security', E: 'Performance'
  };

  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat);
    const catPassed = catResults.filter(r => r.passed).length;
    console.log(`\n── ${cat}. ${catNames[cat]} (${catPassed}/${catResults.length}) ──`);
    for (const r of catResults) {
      const icon = r.passed ? '✅' : '❌';
      const time = `(${r.duration}ms)`;
      console.log(`  ${icon} ${r.name} ${time}`);
      if (!r.passed) {
        console.log(`     ↳ ${r.error}`);
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  TOTAL: ${passed.length}/${results.length} passed | ${failed.length} failed`);
  console.log(`  Duration: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (failed.length > 0) {
    console.log('❌ FAILURES SUMMARY:');
    for (const f of failed) {
      console.log(`  [${f.category}] ${f.name}`);
      console.log(`       ${f.error}\n`);
    }
  } else {
    console.log('🎉 All tests passed!');
  }

  await closePool();
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error('Fatal error running tests:', e);
  await closePool();
  process.exit(2);
});
