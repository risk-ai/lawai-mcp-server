/**
 * Regression test runner with DB persistence.
 * Runs the full regression suite and saves results to lawai.mcp_test_runs.
 * Used by daily cron and manual runs.
 *
 * Usage: npx tsx tests/regression-runner.ts [--save]
 *   --save: persist results to database (default when run by cron)
 */

import { searchLawyers, getLawyerProfile, findLawyerByName, getPracticeAreas, getJurisdictions } from '../src/db/queries.js';
import { getPool, closePool } from '../src/db/connection.js';

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
    const dur = Date.now() - start;
    results.push({ name, category, passed: true, duration: dur });
    console.log(`  ✅ ${name} (${dur}ms)`);
  } catch (e: any) {
    const dur = Date.now() - start;
    const msg = e.message || String(e);
    results.push({ name, category, passed: false, duration: dur, error: msg });
    console.log(`  ❌ ${name} (${dur}ms)`);
    console.log(`     ↳ ${msg}`);
  }
}

function assert(condition: boolean, msg: string) { if (!condition) throw new Error(msg); }
function assertEqual(actual: any, expected: any, msg: string) {
  if (actual !== expected) throw new Error(`${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ─── A. Basic Functionality ───
async function basicFunctionality() {
  console.log('\n▶ A. Basic Functionality');

  await test('A', 'search_lawyers returns results with correct shape', async () => {
    const r = await searchLawyers({ state: 'CA', limit: 5 });
    assert(r.length > 0 && r.length <= 5, 'Should return 1-5 results');
    const l = r[0];
    assert(typeof l.id === 'number', 'id should be number');
    assert(typeof l.name === 'string' && l.name.length > 0, 'name non-empty');
    assert(typeof l.profile_url === 'string', 'profile_url exists');
    assert(Array.isArray(l.practice_areas), 'practice_areas is array');
    assert(typeof l.claimed === 'boolean', 'claimed is boolean');
  });

  await test('A', 'search_lawyers with practice_area filter', async () => {
    const r = await searchLawyers({ practice_area: 'Criminal Defense', limit: 5 });
    assert(r.length > 0, 'Should find criminal defense lawyers');
  });

  await test('A', 'search_lawyers with city + state combo', async () => {
    const r = await searchLawyers({ state: 'TX', city: 'Houston', limit: 5 });
    assert(r.length > 0, 'Should find lawyers in Houston TX');
    for (const l of r) assertEqual(l.state, 'TX', 'State should be TX');
  });

  await test('A', 'search_lawyers with bar_status filter', async () => {
    const r = await searchLawyers({ bar_status: 'Active', state: 'NY', limit: 5 });
    assert(r.length > 0, 'Should find active lawyers in NY');
  });

  await test('A', 'search_lawyers with all filters combined', async () => {
    const r = await searchLawyers({ practice_area: 'Personal Injury', state: 'Florida', city: 'Miami', bar_status: 'Active', limit: 3 });
    assert(Array.isArray(r), 'Should return array');
  });

  await test('A', 'search_lawyers resolves full state name', async () => {
    const r = await searchLawyers({ state: 'California', limit: 3 });
    assert(r.length > 0, 'Should resolve full state name');
    for (const l of r) assertEqual(l.state, 'CA', 'Should resolve to CA');
  });

  await test('A', 'get_lawyer_profile returns valid profile', async () => {
    const s = await searchLawyers({ state: 'CA', limit: 1 });
    assert(s.length > 0, 'Need a lawyer');
    const p = await getLawyerProfile(s[0].id);
    assert(p !== null, 'Profile should exist');
    assert(typeof p!.id === 'number' && typeof p!.name === 'string', 'Has id and name');
    assert(Array.isArray(p!.practice_areas), 'Has practice_areas');
  });

  await test('A', 'get_lawyer_profile returns null for non-existent ID', async () => {
    assertEqual(await getLawyerProfile(999999999), null, 'Should return null');
  });

  await test('A', 'find_lawyer_by_name returns results', async () => {
    const r = await findLawyerByName('Smith');
    assert(r.length > 0, 'Should find Smiths');
    for (const l of r) assert(l.name.toLowerCase().includes('smith'), 'Name contains Smith');
  });

  await test('A', 'find_lawyer_by_name with state filter', async () => {
    const r = await findLawyerByName('Johnson', 'TX');
    assert(r.length > 0, 'Should find Johnson in TX');
    for (const l of r) assertEqual(l.state, 'TX', 'State should be TX');
  });

  await test('A', 'find_lawyer_by_name handles partial names', async () => {
    const r = await findLawyerByName('Joh');
    assert(r.length > 0, 'Should find partial matches');
  });

  await test('A', 'get_practice_areas returns list with counts', async () => {
    const a = await getPracticeAreas();
    assert(a.length > 0, 'Should return areas');
    assert(typeof a[0].name === 'string' && a[0].lawyer_count > 0, 'Has name and count');
  });

  await test('A', 'get_jurisdictions returns states with counts', async () => {
    const j = await getJurisdictions();
    assert(j.length > 0, 'Should return jurisdictions');
    assert(typeof j[0].state_code === 'string' && j[0].state_code.length === 2, 'Has 2-char code');
  });
}

// ─── B. Edge Cases ───
async function edgeCases() {
  console.log('\n▶ B. Edge Cases');

  await test('B', 'search_lawyers with no params', async () => {
    const r = await searchLawyers({});
    assert(r.length > 0 && r.length <= 10, 'Default limit 10');
  });

  await test('B', 'search_lawyers caps limit at 50', async () => {
    const r = await searchLawyers({ limit: 50 });
    assert(r.length > 0 && r.length <= 50, 'Max 50 results');
  });

  await test('B', 'search_lawyers with invalid state code ZZ', async () => {
    const r = await searchLawyers({ state: 'ZZ', limit: 5 });
    assertEqual(r.length, 0, 'ZZ should return no results');
  });

  await test('B', 'search_lawyers with unknown state name', async () => {
    const r = await searchLawyers({ state: 'Nonexistentland', limit: 5 });
    assert(Array.isArray(r), 'Should not error');
  });

  await test('B', 'find_lawyer_by_name SQL injection attempt 1', async () => {
    const r = await findLawyerByName("'; DROP TABLE lawyers; --");
    assert(Array.isArray(r), 'Injection safely handled');
  });

  await test('B', 'find_lawyer_by_name SQL injection attempt 2', async () => {
    const r = await findLawyerByName("Robert'); DELETE FROM lawai.lawyers WHERE ('1'='1");
    assert(Array.isArray(r), 'Injection safely handled');
  });

  await test('B', 'find_lawyer_by_name with unicode', async () => {
    const r = await findLawyerByName('José García');
    assert(Array.isArray(r), 'Unicode should not error');
  });

  await test('B', 'find_lawyer_by_name with apostrophe', async () => {
    const r = await findLawyerByName("O'Brien");
    assert(Array.isArray(r), 'Apostrophe should not error');
  });

  await test('B', 'find_lawyer_by_name with whitespace-only', async () => {
    const r = await findLawyerByName('   ');
    assert(Array.isArray(r), 'Should not error');
  });

  await test('B', 'search_lawyers pagination produces different pages', async () => {
    const p1 = await searchLawyers({ state: 'CA', limit: 10, offset: 0 });
    const p2 = await searchLawyers({ state: 'CA', limit: 10, offset: 10 });
    assert(p1.length > 0 && p2.length > 0, 'Both pages have results');
    const ids1 = new Set(p1.map(r => r.id));
    let overlap = 0;
    for (const l of p2) if (ids1.has(l.id)) overlap++;
    assertEqual(overlap, 0, 'Pages should not overlap');
  });

  await test('B', 'search_lawyers bar_status=Any', async () => {
    const r = await searchLawyers({ state: 'NY', bar_status: 'Any', limit: 5 });
    assert(r.length > 0, 'Any should return results');
  });

  await test('B', 'get_lawyer_profile with negative ID', async () => {
    assertEqual(await getLawyerProfile(-1), null, 'Negative ID → null');
  });

  await test('B', 'get_lawyer_profile with zero ID', async () => {
    assertEqual(await getLawyerProfile(0), null, 'Zero ID → null');
  });

  await test('B', 'search_lawyers with very long practice_area', async () => {
    const r = await searchLawyers({ practice_area: 'A'.repeat(500), limit: 5 });
    assert(Array.isArray(r) && r.length === 0, 'Long string → no results');
  });
}

// ─── C. Data Integrity ───
async function dataIntegrity() {
  console.log('\n▶ C. Data Integrity');

  await test('C', 'All search results have required fields', async () => {
    const r = await searchLawyers({ limit: 50 });
    for (const l of r) {
      assert(l.id > 0, `id positive: ${l.id}`);
      assert(l.name.length > 0, `name non-empty`);
      assert(l.profile_url.startsWith('https://law.ai/lawyers/'), `URL well-formed: ${l.profile_url}`);
    }
  });

  await test('C', 'Practice areas are clean', async () => {
    const areas = await getPracticeAreas();
    for (const a of areas) {
      assert(!a.name.includes('$') && !a.name.includes('|'), `Dirty: "${a.name}"`);
      assert(a.name.length < 80 && a.name.trim().length > 0, `Length: "${a.name}"`);
    }
  });

  await test('C', 'Profile URLs are well-formed', async () => {
    const r = await searchLawyers({ limit: 20 });
    for (const l of r) {
      assert(/^https:\/\/law\.ai\/lawyers\/[\w\-]+$/.test(l.profile_url) || /^https:\/\/law\.ai\/lawyers\/\d+$/.test(l.profile_url),
        `URL: ${l.profile_url}`);
    }
  });

  await test('C', 'Search results have consistent types', async () => {
    const r = await searchLawyers({ state: 'IL', limit: 10 });
    for (const l of r) {
      assert(Array.isArray(l.practice_areas), 'practice_areas array');
      for (const pa of l.practice_areas) {
        assert(typeof pa === 'string' && pa.length < 80 && !pa.includes('$'), `Clean PA: "${pa}"`);
      }
    }
  });

  await test('C', 'Full profile has correct field types', async () => {
    const lawyers = await searchLawyers({ state: 'CA', limit: 5 });
    for (const l of lawyers) {
      const p = await getLawyerProfile(l.id);
      assert(p !== null, `Profile ${l.id} exists`);
      if (p!.bio !== null) assert(typeof p!.bio === 'string', 'bio string');
      if (p!.experience_years !== null) assert(typeof p!.experience_years === 'number', 'exp number');
      if (p!.rate_min !== null) assert(typeof p!.rate_min === 'number', 'rate_min number');
    }
  });

  await test('C', 'Jurisdictions have valid state codes', async () => {
    const j = await getJurisdictions();
    for (const s of j) {
      assert(/^[A-Z]{2}$/.test(s.state_code), `Invalid code: ${s.state_code}`);
    }
  });

  await test('C', 'Total lawyers across jurisdictions >100K', async () => {
    const j = await getJurisdictions();
    const total = j.reduce((sum, s) => sum + s.lawyer_count, 0);
    assert(total > 100000, `Total ${total} should be >100K`);
  });
}

// ─── D. Privacy/Security ───
async function privacySecurity() {
  console.log('\n▶ D. Privacy/Security');

  await test('D', 'Unclaimed profiles do NOT leak PII', async () => {
    // Search with offset to get past claimed profiles (sorted first)
    const lawyers = await searchLawyers({ state: 'CA', limit: 50, offset: 100 });
    const unclaimed = lawyers.filter(l => !l.claimed);
    assert(unclaimed.length > 0, 'Need unclaimed profiles (try larger offset)');
    let tested = 0;
    for (const l of unclaimed.slice(0, 10)) {
      const p = await getLawyerProfile(l.id);
      if (p) {
        assertEqual(p.email, null, `Unclaimed ${l.id} leaks email`);
        assertEqual(p.phone, null, `Unclaimed ${l.id} leaks phone`);
        assertEqual(p.contact_form_url, null, `Unclaimed ${l.id} leaks contact_form_url`);
        tested++;
      }
    }
    assert(tested > 0, 'Should test at least one unclaimed profile');
  });

  await test('D', 'Search results do NOT expose email/phone', async () => {
    const lawyers = await searchLawyers({ limit: 20 });
    for (const l of lawyers) {
      assert(!('email' in l), 'Search results should not have email');
      assert(!('phone' in l), 'Search results should not have phone');
    }
  });

  await test('D', 'find_lawyer_by_name results do NOT expose email/phone', async () => {
    const lawyers = await findLawyerByName('Smith');
    for (const l of lawyers) {
      assert(!('email' in l), 'Name search should not have email');
      assert(!('phone' in l), 'Name search should not have phone');
    }
  });

  await test('D', 'SQL injection attempts are safe', async () => {
    const injections = [
      "' OR '1'='1",
      "'; DROP TABLE lawai.lawyers; --",
      "1 UNION SELECT * FROM lawai.lawyers --",
      "Robert\\'; SELECT email FROM lawai.lawyers --",
    ];
    for (const inj of injections) {
      const r = await findLawyerByName(inj);
      assert(Array.isArray(r), `Injection safe: "${inj}"`);
    }
  });
}

// ─── E. Performance ───
async function performance() {
  console.log('\n▶ E. Performance');

  await test('E', 'search_lawyers <3s', async () => {
    const s = Date.now();
    await searchLawyers({ state: 'CA', practice_area: 'Criminal Defense', limit: 20 });
    assert(Date.now() - s < 3000, `Took ${Date.now() - s}ms`);
  });

  await test('E', 'get_lawyer_profile <2s', async () => {
    const l = await searchLawyers({ limit: 1 });
    const s = Date.now();
    await getLawyerProfile(l[0].id);
    assert(Date.now() - s < 2000, `Took ${Date.now() - s}ms`);
  });

  await test('E', 'find_lawyer_by_name <2s', async () => {
    const s = Date.now();
    await findLawyerByName('Smith', 'CA');
    assert(Date.now() - s < 2000, `Took ${Date.now() - s}ms`);
  });

  await test('E', 'get_practice_areas <3s', async () => {
    const s = Date.now();
    await getPracticeAreas();
    assert(Date.now() - s < 3000, `Took ${Date.now() - s}ms`);
  });

  await test('E', 'get_jurisdictions <2s', async () => {
    const s = Date.now();
    await getJurisdictions();
    assert(Date.now() - s < 2000, `Took ${Date.now() - s}ms`);
  });

  await test('E', 'Broad search (no filters) <3s', async () => {
    const s = Date.now();
    await searchLawyers({ limit: 50 });
    assert(Date.now() - s < 3000, `Took ${Date.now() - s}ms`);
  });
}

// ─── Main ───
async function main() {
  const shouldSave = process.argv.includes('--save');

  console.log('═══════════════════════════════════════════════════════');
  console.log('  Law.AI MCP Server — Regression Test Suite');
  console.log(`  ${new Date().toISOString()} | Save: ${shouldSave}`);
  console.log('═══════════════════════════════════════════════════════');

  const suiteStart = Date.now();

  await basicFunctionality();
  await edgeCases();
  await dataIntegrity();
  await privacySecurity();
  await performance();

  const totalDuration = Date.now() - suiteStart;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  const catNames: Record<string, string> = {
    A: 'Basic Functionality', B: 'Edge Cases', C: 'Data Integrity',
    D: 'Privacy/Security', E: 'Performance'
  };

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  TOTAL: ${passed}/${results.length} passed | ${failed} failed | ${(totalDuration/1000).toFixed(1)}s`);
  console.log('═══════════════════════════════════════════════════════');

  if (failed > 0) {
    console.log('\n❌ FAILURES:');
    for (const f of results.filter(r => !r.passed)) {
      console.log(`  [${f.category}] ${f.name}: ${f.error}`);
    }
  } else {
    console.log('\n🎉 All tests passed!');
  }

  // Build summary
  const categories = ['A', 'B', 'C', 'D', 'E'];
  const summaryParts = categories.map(cat => {
    const catResults = results.filter(r => r.category === cat);
    const catPassed = catResults.filter(r => r.passed).length;
    return `${cat}. ${catNames[cat]}: ${catPassed}/${catResults.length}`;
  });
  const summary = `${passed}/${results.length} passed, ${failed} failed (${(totalDuration/1000).toFixed(1)}s) — ${summaryParts.join(' | ')}`;

  // Save to DB if --save flag
  if (shouldSave) {
    try {
      const pool = getPool();
      await pool.query(
        `INSERT INTO lawai.mcp_test_runs (total_tests, passed, failed, duration_ms, results, summary)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [results.length, passed, failed, totalDuration, JSON.stringify(results), summary]
      );
      console.log('\n✅ Results saved to lawai.mcp_test_runs');
    } catch (e: any) {
      console.error('\n⚠️ Failed to save results:', e.message);
    }
  }

  // Output JSON for programmatic consumers
  const output = {
    run_at: new Date().toISOString(),
    total_tests: results.length,
    passed,
    failed,
    duration_ms: totalDuration,
    summary,
    results,
  };
  console.log('\n__JSON_OUTPUT__');
  console.log(JSON.stringify(output));

  await closePool();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error('Fatal error:', e);
  await closePool();
  process.exit(2);
});
