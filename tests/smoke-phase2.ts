import { matchLawyerToMatter } from '../src/db/queries.js';
import { closePool } from '../src/db/connection.js';
import { findCostData, REGIONAL_ADJUSTMENTS } from '../src/data/legal-costs.js';
import { classifyPracticeAreas, classifyComplexity } from '../src/data/practice-area-classifier.js';

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (e) {
    console.error(`❌ ${name}: ${(e as Error).message}`);
  }
}

async function main() {
  console.log('=== Phase 2 Smoke Tests ===\n');

  // Tool 1: match_lawyer_to_matter
  await test('match: landlord/tenant issue in TX', async () => {
    const r = await matchLawyerToMatter({ description: 'My landlord wont return my security deposit', location: 'Texas' });
    console.log(`   Classified: ${r.classified_areas.join(', ')}`);
    console.log(`   Matches: ${r.matches.length}`);
    if (r.matches[0]) console.log(`   Top: ${r.matches[0].lawyer.name} (${r.matches[0].relevance_score})`);
    if (r.classified_areas.length === 0) throw new Error('No classification');
    if (r.matches.length === 0) throw new Error('No matches');
  });

  await test('match: car accident in California', async () => {
    const r = await matchLawyerToMatter({ description: 'I was injured in a car accident and the other driver was at fault', location: 'CA' });
    console.log(`   Classified: ${r.classified_areas.join(', ')}`);
    console.log(`   Matches: ${r.matches.length}`);
    if (!r.classified_areas.some(a => a.includes('Personal Injury'))) throw new Error('Should classify as PI');
  });

  await test('match: divorce in New York', async () => {
    const r = await matchLawyerToMatter({ description: 'I need help with a contested divorce involving child custody', location: 'New York' });
    console.log(`   Classified: ${r.classified_areas.join(', ')}`);
    if (!r.classified_areas.some(a => a.includes('Family'))) throw new Error('Should classify as Family Law');
  });

  await test('match: DUI in Florida', async () => {
    const r = await matchLawyerToMatter({ description: 'I got arrested for drunk driving last night', location: 'FL' });
    console.log(`   Classified: ${r.classified_areas.join(', ')}`);
    if (!r.classified_areas.some(a => a.includes('DUI') || a.includes('Criminal'))) throw new Error('Should classify as DUI/Criminal');
  });

  // Classifier unit tests
  await test('classifier: bankruptcy keywords', async () => {
    const r = classifyPracticeAreas('I have too much credit card debt and am considering chapter 7 bankruptcy');
    if (!r.some(c => c.practice_area === 'Bankruptcy')) throw new Error(`Got: ${r.map(c=>c.practice_area).join(', ')}`);
  });

  await test('classifier: immigration keywords', async () => {
    const r = classifyPracticeAreas('I need help with my H1B visa application and green card process');
    if (!r.some(c => c.practice_area === 'Immigration')) throw new Error(`Got: ${r.map(c=>c.practice_area).join(', ')}`);
  });

  // Complexity classifier
  await test('complexity: simple case', async () => {
    const c = classifyComplexity('simple uncontested divorce, no kids, no assets');
    if (c !== 'simple') throw new Error(`Got: ${c}`);
  });

  await test('complexity: complex case', async () => {
    const c = classifyComplexity('contested divorce with disputed custody, multiple properties, need expert witness');
    if (c !== 'complex' && c !== 'high_stakes') throw new Error(`Got: ${c}`);
  });

  await test('complexity: high stakes', async () => {
    const c = classifyComplexity('federal securities fraud charges, multiple parties, jury trial expected, potential appeal');
    if (c !== 'high_stakes') throw new Error(`Got: ${c}`);
  });

  // Tool 2: get_legal_cost_estimate
  await test('cost estimate: Criminal Defense', async () => {
    const data = findCostData('Criminal Defense');
    if (!data) throw new Error('No data found');
    console.log(`   Billing: ${data.common_billing}`);
    console.log(`   Duration: ${data.typical_duration}`);
    if (!data.billing_structures.flat_fee) throw new Error('Should have flat_fee');
  });

  await test('cost estimate: Personal Injury', async () => {
    const data = findCostData('Personal Injury');
    if (!data) throw new Error('No data found');
    if (!data.billing_structures.contingency) throw new Error('Should have contingency');
    console.log(`   Contingency: ${data.billing_structures.contingency.typical_percent}%`);
  });

  await test('cost estimate: regional adjustments', async () => {
    const nyMult = REGIONAL_ADJUSTMENTS['NY'];
    const msMult = REGIONAL_ADJUSTMENTS['MS'];
    if (!nyMult || !msMult) throw new Error('Missing regional data');
    if (nyMult <= msMult) throw new Error(`NY (${nyMult}) should be higher than MS (${msMult})`);
    console.log(`   NY: ${nyMult}x, MS: ${msMult}x`);
  });

  await test('cost estimate: fuzzy match', async () => {
    const data = findCostData('family law');
    if (!data) throw new Error('Should fuzzy match Family Law');
    console.log(`   Found: ${data.practice_area}`);
  });

  await closePool();
  console.log('\nAll Phase 2 smoke tests complete.');
}

main().catch(e => { console.error(e); process.exit(1); });
