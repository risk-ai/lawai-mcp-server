// Quick smoke test — verifies DB queries work against live data
import { searchLawyers, getLawyerProfile, findLawyerByName, getPracticeAreas, getJurisdictions } from '../src/db/queries.js';
import { closePool } from '../src/db/connection.js';

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (e) {
    console.error(`❌ ${name}: ${(e as Error).message}`);
  }
}

async function main() {
  await test('search_lawyers — by state', async () => {
    const results = await searchLawyers({ state: 'California', limit: 5 });
    if (results.length === 0) throw new Error('No results');
    console.log(`   Found ${results.length} lawyers in CA. First: ${results[0].name}`);
  });

  await test('search_lawyers — by practice area + state', async () => {
    const results = await searchLawyers({ practice_area: 'Criminal Defense', state: 'TX', limit: 5 });
    if (results.length === 0) throw new Error('No results');
    console.log(`   Found ${results.length} criminal defense lawyers in TX. First: ${results[0].name}`);
  });

  await test('search_lawyers — by city', async () => {
    const results = await searchLawyers({ city: 'Chicago', state: 'IL', limit: 3 });
    if (results.length === 0) throw new Error('No results');
    console.log(`   Found ${results.length} lawyers in Chicago. First: ${results[0].name}`);
  });

  await test('get_lawyer_profile', async () => {
    // Get first result from search, then fetch profile
    const search = await searchLawyers({ state: 'NY', limit: 1 });
    if (search.length === 0) throw new Error('No search results');
    const profile = await getLawyerProfile(search[0].id);
    if (!profile) throw new Error('Profile not found');
    console.log(`   Profile: ${profile.name}, ${profile.city}, ${profile.state}`);
    console.log(`   Practice areas: ${profile.practice_areas.slice(0, 3).join(', ')}`);
    console.log(`   Has bio: ${!!profile.bio}, Has education: ${!!profile.education}`);
  });

  await test('find_lawyer_by_name', async () => {
    const results = await findLawyerByName('Smith', 'NY');
    if (results.length === 0) throw new Error('No results');
    console.log(`   Found ${results.length} Smiths in NY. First: ${results[0].name}`);
  });

  await test('get_practice_areas', async () => {
    const areas = await getPracticeAreas();
    if (areas.length === 0) throw new Error('No practice areas');
    console.log(`   ${areas.length} practice areas. Top 5: ${areas.slice(0, 5).map(a => `${a.name}(${a.lawyer_count})`).join(', ')}`);
  });

  await test('get_jurisdictions', async () => {
    const jurisdictions = await getJurisdictions();
    if (jurisdictions.length === 0) throw new Error('No jurisdictions');
    console.log(`   ${jurisdictions.length} states. Top 5: ${jurisdictions.slice(0, 5).map(j => `${j.state_code}(${j.lawyer_count})`).join(', ')}`);
  });

  await closePool();
  console.log('\nAll tests complete.');
}

main().catch(e => { console.error(e); process.exit(1); });
