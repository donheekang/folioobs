import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://mghfgcjcbpizjmfrtozi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1naGZnY2pjYnBpemptZnJ0b3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjQ3NzIsImV4cCI6MjA4ODI0MDc3Mn0.GlpiV6vgDmpitprIZpMBvDcD-8ZvnnYZuTo3VqdUDvQ');

async function main() {
  // 1. Get investor IDs
  const { data: investors } = await supabase
    .from('investors')
    .select('id, name')
    .in('name', ['George Soros', 'David Tepper', 'Chase Coleman', 'Dan Loeb', 'Seth Klarman']);

  console.log('=== INVESTORS ===');
  investors.forEach(i => console.log(i.id, i.name));

  // 2. Get Buffett insight format example
  const { data: buffettInsights } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('investor_id', 1)
    .limit(1);

  console.log('\n=== BUFFETT INSIGHT FORMAT ===');
  if (buffettInsights && buffettInsights[0]) {
    console.log(JSON.stringify(buffettInsights[0], null, 2));
  }

  // 3. Existing insights for 5 investors
  const targetIds = investors.map(i => i.id);
  const { data: existing } = await supabase
    .from('ai_insights')
    .select('investor_id, quarter')
    .in('investor_id', targetIds);

  console.log('\n=== EXISTING INSIGHTS ===');
  (existing || []).forEach(i => console.log(i.investor_id, i.quarter));

  // 4. Get top holdings for each
  for (const inv of investors) {
    const { data: filings } = await supabase
      .from('filings')
      .select('id, quarter, total_value, holding_count')
      .eq('investor_id', inv.id)
      .order('quarter', { ascending: false })
      .limit(2);

    if (!filings || filings.length === 0) {
      console.log('\nNo filings for', inv.name);
      continue;
    }

    const latestFiling = filings[0];
    const prevFiling = filings[1];

    const { data: holdings } = await supabase
      .from('holdings')
      .select('value, pct, shares, securities(ticker, name, sector)')
      .eq('filing_id', latestFiling.id)
      .order('value', { ascending: false })
      .limit(15);

    console.log(`\n=== ${inv.name} (id:${inv.id}) ===`);
    console.log(`Latest: ${latestFiling.quarter}, AUM: $${(latestFiling.total_value / 1e9).toFixed(1)}B, ${latestFiling.holding_count} holdings`);
    if (prevFiling) console.log(`Prev: ${prevFiling.quarter}, AUM: $${(prevFiling.total_value / 1e9).toFixed(1)}B`);
    console.log('Top 15:');
    (holdings || []).forEach(h => {
      const ticker = h.securities?.ticker || '?';
      const name = h.securities?.name || '?';
      const sector = h.securities?.sector || '?';
      console.log(`  ${ticker} | ${name} | $${(h.value / 1e6).toFixed(0)}M | ${(h.pct || 0).toFixed(1)}% | ${sector}`);
    });

    // Sector breakdown
    const { data: allHoldings } = await supabase
      .from('holdings')
      .select('value, securities(sector)')
      .eq('filing_id', latestFiling.id);

    const sectors = {};
    (allHoldings || []).forEach(h => {
      const s = h.securities?.sector || 'Other';
      sectors[s] = (sectors[s] || 0) + (h.value || 0);
    });
    const totalVal = Object.values(sectors).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(sectors).sort((a, b) => b[1] - a[1]).slice(0, 6);

    console.log('Sectors:');
    sorted.forEach(([s, v]) => console.log(`  ${s}: ${((v / totalVal) * 100).toFixed(1)}%`));

    // Major changes (holding_changes)
    const { data: changes } = await supabase
      .from('holding_changes')
      .select('securities(ticker, name), change_type, pct_change')
      .eq('investor_id', inv.id)
      .eq('quarter', latestFiling.quarter)
      .order('pct_change', { ascending: false })
      .limit(5);

    const { data: changesDown } = await supabase
      .from('holding_changes')
      .select('securities(ticker, name), change_type, pct_change')
      .eq('investor_id', inv.id)
      .eq('quarter', latestFiling.quarter)
      .order('pct_change', { ascending: true })
      .limit(5);

    console.log('Top increases:');
    (changes || []).forEach(c => console.log(`  ${c.securities?.ticker} ${c.change_type} ${c.pct_change > 0 ? '+' : ''}${(c.pct_change || 0).toFixed(0)}%`));
    console.log('Top decreases:');
    (changesDown || []).filter(c => c.pct_change < 0).forEach(c => console.log(`  ${c.securities?.ticker} ${c.change_type} ${(c.pct_change || 0).toFixed(0)}%`));
  }
}

main().catch(console.error);
