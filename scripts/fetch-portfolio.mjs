#!/usr/bin/env node
/**
 * FolioObs — 포트폴리오 데이터 조회
 *
 * Cowork에서 Claude가 인사이트를 생성하기 위해 데이터를 읽어오는 스크립트.
 * JSON으로 출력하여 Claude가 분석할 수 있게 합니다.
 *
 * 사용법:
 *   SUPABASE_SERVICE_KEY="eyJ..." node scripts/fetch-portfolio.mjs --investor=cathie
 *   SUPABASE_SERVICE_KEY="eyJ..." node scripts/fetch-portfolio.mjs --investor=cathie --daily
 *   SUPABASE_SERVICE_KEY="eyJ..." node scripts/fetch-portfolio.mjs --all
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mghfgcjcbpizjmfrtozi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const investorArg = process.argv.find(a => a.startsWith('--investor='))?.split('=')[1];
const dailyFlag = process.argv.includes('--daily');
const allFlag = process.argv.includes('--all');

async function getInvestors() {
  const { data } = await supabase.from('investors').select('*').eq('is_active', true);
  return data || [];
}

async function getPortfolio(investorId, quarter) {
  const { data: holdings } = await supabase
    .from('holdings')
    .select('shares, value, pct_of_portfolio, option_type, securities (ticker, name, sector_ko)')
    .eq('investor_id', investorId)
    .eq('quarter', quarter)
    .order('value', { ascending: false })
    .limit(30);

  const { data: changes } = await supabase
    .from('holding_changes')
    .select('change_type, pct_change, shares_change, value_current, value_prev, securities (ticker, name)')
    .eq('investor_id', investorId)
    .eq('quarter', quarter)
    .order('value_current', { ascending: false })
    .limit(30);

  const { data: metrics } = await supabase
    .from('investor_metrics')
    .select('*')
    .eq('investor_id', investorId)
    .order('quarter', { ascending: false })
    .limit(4);

  return { holdings: holdings || [], changes: changes || [], metrics: metrics || [] };
}

async function getArkDailyTrades(days = 5) {
  const { data } = await supabase
    .from('ark_daily_trades')
    .select('*')
    .order('trade_date', { ascending: false })
    .limit(days * 80);

  if (!data?.length) return [];

  const byDate = {};
  data.forEach(t => {
    if (!byDate[t.trade_date]) byDate[t.trade_date] = [];
    byDate[t.trade_date].push(t);
  });

  return Object.keys(byDate).sort().reverse().slice(0, days).map(d => ({
    date: d,
    trades: byDate[d],
  }));
}

async function main() {
  const investors = await getInvestors();

  const targets = allFlag
    ? investors
    : investors.filter(inv => {
        const slug = inv.name.toLowerCase().replace(/\s+/g, '_');
        return slug.includes(investorArg) || inv.name_ko === investorArg;
      });

  if (targets.length === 0) {
    console.error(`❌ 투자자를 찾을 수 없습니다.`);
    process.exit(1);
  }

  const result = {};

  for (const investor of targets) {
    const { data: invFiling } = await supabase
      .from('filings')
      .select('quarter')
      .eq('investor_id', investor.id)
      .order('report_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!invFiling) continue;

    const portfolio = await getPortfolio(investor.id, invFiling.quarter);

    const entry = {
      name: investor.name,
      name_ko: investor.name_ko,
      quarter: invFiling.quarter,
      ...portfolio,
    };

    // 캐시우드 일별 데이터
    if (dailyFlag && investor.cik === '0001599922') {
      entry.dailyTrades = await getArkDailyTrades(5);
    }

    result[investor.name.toLowerCase().replace(/\s+/g, '_')] = entry;
  }

  // JSON 출력 (Claude가 읽을 수 있도록)
  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => { console.error('실패:', err); process.exit(1); });
