#!/usr/bin/env node
/**
 * FolioObs — ARK Invest CSV → Supabase 파이프라인
 *
 * ARK Invest는 ETF 운용사로 13F가 아닌 매일 CSV로 보유종목을 공개합니다.
 * 이 스크립트는 ARK의 주요 ETF(ARKK, ARKW, ARKG, ARKF, ARKQ) 보유종목을
 * 통합하여 Supabase에 저장합니다.
 *
 * 사용법:
 *   SUPABASE_SERVICE_KEY="eyJ..." node scripts/ark-to-supabase.mjs
 *   SUPABASE_SERVICE_KEY="eyJ..." ANTHROPIC_API_KEY="sk-..." node scripts/ark-to-supabase.mjs --with-insights
 *
 * 옵션:
 *   --force           이미 등록된 날짜도 재처리
 *   --with-insights   파이프라인 끝에 캐시우드 AI 인사이트 자동 생성
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================
// Supabase 설정
// ============================================================
const SUPABASE_URL = 'https://mghfgcjcbpizjmfrtozi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY 환경변수가 필요합니다.');
  console.error('   실행: SUPABASE_SERVICE_KEY="eyJ..." node scripts/ark-to-supabase.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================
// ARK ETF CSV URLs
// ============================================================
const ARK_FUNDS = [
  { name: 'ARKK', label: 'ARK Innovation ETF', url: 'https://assets.ark-funds.com/fund-documents/funds-etf-csv/ARK_INNOVATION_ETF_ARKK_HOLDINGS.csv' },
  { name: 'ARKW', label: 'ARK Next Generation Internet ETF', url: 'https://assets.ark-funds.com/fund-documents/funds-etf-csv/ARK_NEXT_GENERATION_INTERNET_ETF_ARKW_HOLDINGS.csv' },
  { name: 'ARKG', label: 'ARK Genomic Revolution ETF', url: 'https://assets.ark-funds.com/fund-documents/funds-etf-csv/ARK_GENOMIC_REVOLUTION_ETF_ARKG_HOLDINGS.csv' },
  { name: 'ARKF', label: 'ARK Fintech Innovation ETF', url: 'https://assets.ark-funds.com/fund-documents/funds-etf-csv/ARK_FINTECH_INNOVATION_ETF_ARKF_HOLDINGS.csv' },
  { name: 'ARKQ', label: 'ARK Autonomous Tech. & Robotics ETF', url: 'https://assets.ark-funds.com/fund-documents/funds-etf-csv/ARK_AUTONOMOUS_TECH._&_ROBOTICS_ETF_ARKQ_HOLDINGS.csv' },
];

// ============================================================
// 섹터 분류
// ============================================================
const SECTOR_KEYWORDS = {
  '기술': ['APPLE', 'MICROSOFT', 'GOOGLE', 'ALPHABET', 'META', 'NVIDIA', 'AMD', 'TESLA', 'AMAZON', 'SALESFORCE', 'ORACLE', 'ADOBE', 'TSMC', 'BROADCOM', 'QUALCOMM', 'UBER', 'PALANTIR', 'COINBASE', 'ROKU', 'ZOOM', 'TWILIO', 'SNOWFLAKE', 'SERVICENOW', 'INTUIT', 'CROWDSTRIKE', 'DATADOG', 'SHOPIFY', 'ARISTA', 'ROBLOX', 'UNITY', 'UIPATH', 'CLOUDFLARE', 'CONFLUENT', 'PINTEREST', 'SNAP', 'SPOTIFY', 'BLOCK', 'SQUARE', 'STRIPE', 'ROBINHOOD', 'SOFI', 'TOAST', 'GITLAB', 'MONGODB', 'ELASTIC', 'HASHICORP', 'TWST', 'PLTR'],
  '금융': ['BANK', 'GOLDMAN', 'MORGAN', 'JPMORGAN', 'WELLS FARGO', 'VISA', 'MASTERCARD', 'AMERICAN EXPRESS', 'SCHWAB', 'BLACKROCK', 'MOODY', 'CITIGROUP', 'CAPITAL ONE', 'S&P GLOBAL', 'INTERCONTINENTAL', 'CME GROUP', 'MARSH'],
  '헬스케어': ['PFIZER', 'JOHNSON', 'UNITEDHEALTH', 'ELI LILLY', 'MERCK', 'ABBVIE', 'AMGEN', 'MODERNA', 'CRISPR', 'DAVITA', 'HUMANA', 'THERMO FISHER', 'DANAHER', 'INTUITIVE SURG', 'REGENERON', 'EXACT SCIENCES', 'TELADOC', 'INVITAE', 'PACIFIC BIOSCI', 'IONIS', 'FATE THERAPEUT', 'BEAM THERAPEUT', 'INTELLIA', 'ARCTUS', 'TWIST BIOSCI', 'GINKGO', 'RECURSION', 'TEMPUS', 'VERACYTE', 'SCHRODINGER', 'REPLIGEN', 'CERTARA', 'GUARDANT'],
  '필수소비재': ['COCA-COLA', 'PEPSI', 'PROCTER', 'KRAFT', 'WALMART', 'COSTCO', 'KROGER', 'COLGATE', 'MONDELEZ', 'GENERAL MILLS'],
  '에너지': ['EXXON', 'CHEVRON', 'CONOCO', 'OCCIDENTAL', 'MARATHON', 'HALLIBURTON', 'SHELL', 'PIONEER', 'DEVON'],
  '경기소비재': ['NIKE', 'STARBUCKS', 'MCDONALD', 'HOME DEPOT', 'TARGET', 'DISNEY', 'BOOKING', 'HILTON', 'MARRIOTT', 'LOWES', 'TJX'],
  '산업': ['CATERPILLAR', 'DEERE', 'HONEYWELL', 'BOEING', 'GENERAL ELECTRIC', 'LOCKHEED', 'RAYTHEON', 'UNION PACIFIC', '3M', 'EMERSON', 'KRATOS', 'IRIDIUM', 'JOBY', 'ARCHER AVIATION', 'AEROVIRONMENT', 'ROCKET LAB'],
  '통신': ['AT&T', 'VERIZON', 'T-MOBILE', 'LUMEN'],
  '부동산': ['REALTY', 'PROLOGIS', 'EQUINIX', 'DIGITAL REALTY', 'ZILLOW', 'REDFIN', 'OPENDOOR'],
};

function classifySector(name) {
  const u = (name || '').toUpperCase();
  for (const [sector, kws] of Object.entries(SECTOR_KEYWORDS)) {
    if (kws.some(kw => u.includes(kw))) return sector;
  }
  return '기타';
}

// ============================================================
// CSV 파싱
// ============================================================
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  // 헤더 찾기 (첫 줄 또는 빈 줄 건너뛰기)
  let headerIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (lower.includes('date') && (lower.includes('company') || lower.includes('ticker'))) {
      headerIdx = i;
      break;
    }
  }

  const headers = lines[headerIdx].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
  console.log(`    헤더: ${headers.join(', ')}`);

  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith(',,,')) continue;

    // CSV 파싱 (따옴표 내 쉼표 처리)
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }

  return rows;
}

// ============================================================
// 메인 파이프라인
// ============================================================
async function main() {
  console.log('═'.repeat(60));
  console.log('FolioObs — ARK Invest CSV → Supabase 파이프라인');
  console.log('═'.repeat(60));

  // ---- Step 1: Cathie Wood 투자자 확인 ----
  const { data: cwInvestor } = await supabase
    .from('investors')
    .select('id')
    .eq('cik', '0001599922')
    .maybeSingle();

  if (!cwInvestor) {
    console.error('❌ 캐시 우드 투자자 레코드가 없습니다. edgar-to-supabase.mjs를 먼저 실행하세요.');
    process.exit(1);
  }

  const investorId = cwInvestor.id;
  console.log(`\n▶ 캐시 우드 (investor_id: ${investorId})`);

  // ---- Step 2: 각 ETF CSV 다운로드 + 통합 ----
  const allHoldings = new Map(); // ticker → { company, cusip, shares, value, weight, funds }
  let reportDate = null;

  for (const fund of ARK_FUNDS) {
    console.log(`\n  📥 ${fund.name} (${fund.label})`);
    try {
      const res = await fetch(fund.url, {
        headers: { 'User-Agent': 'FolioObs/1.0' },
      });

      if (!res.ok) {
        console.log(`    ⚠️ HTTP ${res.status}`);
        continue;
      }

      const csvText = await res.text();
      const rows = parseCSV(csvText);
      console.log(`    ${rows.length}개 종목`);

      for (const row of rows) {
        // 다양한 컬럼명 대응 (공백/괄호 차이 처리)
        const findCol = (keys) => {
          for (const k of keys) {
            if (row[k] !== undefined) return row[k];
          }
          // 부분 매칭 fallback
          for (const k of keys) {
            const found = Object.keys(row).find(rk => rk.includes(k) || k.includes(rk));
            if (found && row[found]) return row[found];
          }
          return '';
        };

        const date = findCol(['date', '날짜']);
        const company = findCol(['company', 'name']);
        const ticker = findCol(['ticker', 'symbol']);
        const cusip = findCol(['cusip']);
        const weightStr = findCol(['weight (%)', 'weight(%)', 'weight', '%']) || '0';
        const sharesStr = findCol(['shares', 'shares held']) || '0';
        const valueStr = findCol(['market value ($)', 'market value($)', 'market value', 'value']) || '0';

        if (!ticker || !company || ticker === '-') continue;

        // 날짜 추출 (첫 유효 날짜를 report date로 사용)
        if (!reportDate && date) {
          reportDate = date;
        }

        const shares = parseInt(sharesStr.replace(/[,$]/g, ''), 10) || 0;
        const value = Math.round(parseFloat(valueStr.replace(/[,$]/g, '')) / 1000) || 0; // SEC 형식 ($1000 단위)
        const weight = parseFloat(weightStr.replace(/[%,$]/g, '')) || 0;

        if (allHoldings.has(ticker)) {
          const existing = allHoldings.get(ticker);
          existing.shares += shares;
          existing.value += value;
          existing.weight += weight;
          existing.funds.push(fund.name);
        } else {
          allHoldings.set(ticker, {
            company,
            ticker,
            cusip,
            shares,
            value,
            weight,
            funds: [fund.name],
          });
        }
      }
    } catch (err) {
      console.log(`    ❌ 실패: ${err.message}`);
    }
  }

  if (allHoldings.size === 0) {
    console.error('\n❌ 종목을 가져오지 못했습니다.');
    process.exit(1);
  }

  // 날짜 정리
  const now = new Date();
  if (!reportDate) {
    reportDate = now.toISOString().split('T')[0];
  } else {
    // MM/DD/YYYY → YYYY-MM-DD
    const parts = reportDate.split('/');
    if (parts.length === 3) {
      reportDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
  }

  const rd = new Date(reportDate);
  const quarter = `${rd.getFullYear()}Q${Math.ceil((rd.getMonth() + 1) / 3)}`;
  const holdings = [...allHoldings.values()];
  const totalValue = holdings.reduce((s, h) => s + h.value, 0);

  console.log(`\n▶ 통합 결과: ${holdings.length}개 종목 (중복 ETF 합산)`);
  console.log(`  날짜: ${reportDate} (${quarter})`);
  console.log(`  총 가치: $${(totalValue / 1000).toFixed(1)}M (x$1000 단위)\n`);

  // ---- Step 3: 기존 데이터 확인 + 삭제 ----
  const accessionNo = `ARK-${reportDate}`;

  const { data: existingFiling } = await supabase
    .from('filings')
    .select('id, holding_count')
    .eq('accession_no', accessionNo)
    .maybeSingle();

  if (existingFiling) {
    if (existingFiling.holding_count >= holdings.length * 0.8) {
      console.log(`  ⏭️  이미 등록됨 (${existingFiling.holding_count}종목)`);
      console.log('  --force 플래그로 강제 업데이트 가능');
      if (!process.argv.includes('--force')) {
        process.exit(0);
      }
    }
    console.log(`  🔄 기존 데이터 삭제 후 재등록`);
    await supabase.from('holding_changes').delete().eq('investor_id', investorId).eq('quarter', quarter);
    await supabase.from('holdings').delete().eq('filing_id', existingFiling.id);
    await supabase.from('investor_metrics').delete().eq('investor_id', investorId).eq('quarter', quarter);
    await supabase.from('filings').delete().eq('id', existingFiling.id);
  }

  // ---- Step 4: Filing 등록 ----
  const { data: newFiling, error: filingErr } = await supabase
    .from('filings')
    .insert({
      investor_id: investorId,
      accession_no: accessionNo,
      filing_date: reportDate,
      report_date: reportDate,
      quarter,
      total_value: totalValue,
      holding_count: holdings.length,
      xml_url: ARK_FUNDS[0].url,
      parsed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (filingErr) {
    console.error(`  ❌ 파일링 등록 실패: ${filingErr.message}`);
    process.exit(1);
  }

  console.log(`  ✅ Filing 등록 (id: ${newFiling.id})`);

  // ---- Step 5: Securities + Holdings ----
  let insertCount = 0;
  const batchSize = 20;

  // 비중 재계산 (통합 기준)
  const sortedHoldings = holdings.sort((a, b) => b.value - a.value);

  for (let i = 0; i < sortedHoldings.length; i += batchSize) {
    const batch = sortedHoldings.slice(i, i + batchSize);

    for (const h of batch) {
      const sector = classifySector(h.company);
      const cusip = h.cusip || h.ticker; // cusip 없으면 ticker 사용

      // Security upsert
      const { data: sec } = await supabase
        .from('securities')
        .upsert({
          cusip,
          ticker: h.ticker,
          name: h.company,
          name_ko: h.company,
          sector,
          sector_ko: sector,
        }, { onConflict: 'cusip' })
        .select('id')
        .single();

      if (!sec) continue;

      // Holding insert
      const pct = totalValue > 0 ? Math.round(h.value / totalValue * 10000) / 100 : 0;
      const { error: holdErr } = await supabase
        .from('holdings')
        .insert({
          filing_id: newFiling.id,
          investor_id: investorId,
          security_id: sec.id,
          quarter,
          shares: h.shares,
          value: h.value,
          pct_of_portfolio: pct,
          option_type: null,
        });

      if (!holdErr) insertCount++;
    }

    const progress = Math.min(i + batchSize, sortedHoldings.length);
    process.stdout.write(`\r  진행: ${progress}/${sortedHoldings.length}`);
  }

  console.log(`\n  ✅ DB 등록: ${insertCount}/${sortedHoldings.length}개 종목`);

  // ---- Step 6: Metrics ----
  const sectors = new Set(holdings.map(h => classifySector(h.company)));
  const top10Pct = sortedHoldings.slice(0, 10).reduce((s, h) => s + (totalValue > 0 ? h.value / totalValue : 0), 0);

  await supabase.from('investor_metrics').upsert({
    investor_id: investorId,
    quarter,
    total_aum: totalValue,
    holding_count: holdings.length,
    sector_count: sectors.size,
    concentration: Math.round(top10Pct * 1000) / 1000,
    top_holding_pct: totalValue > 0 ? Math.round(sortedHoldings[0].value / totalValue * 10000) / 100 : 0,
    qoq_change: 0,
  }, { onConflict: 'investor_id,quarter' });

  // ---- Step 7: 이전 분기 대비 holding_changes 계산 ----
  console.log(`\n  📊 분기 간 변동 계산...`);

  // 이 투자자의 모든 분기 목록 조회 (ARK 일별 데이터는 같은 분기에 여러 filing이 있으므로
  // 분기별 최신 filing만 사용하여 중복 분기 비교 방지)
  const { data: allFilings } = await supabase
    .from('filings')
    .select('id, quarter, total_value, report_date')
    .eq('investor_id', investorId)
    .order('report_date', { ascending: true });

  // 분기별 최신 filing만 남기기 (같은 분기 내 중복 제거)
  const quarterMap = new Map();
  (allFilings || []).forEach(f => {
    const existing = quarterMap.get(f.quarter);
    if (!existing || f.report_date > existing.report_date) {
      quarterMap.set(f.quarter, f);
    }
  });
  const uniqueFilings = [...quarterMap.values()].sort((a, b) => a.quarter.localeCompare(b.quarter));
  const quarters = uniqueFilings.map(f => f.quarter);
  console.log(`  보유 분기: ${quarters.join(', ')} (${(allFilings || []).length}건 → ${quarters.length}개 분기)`);

  if (quarters.length >= 2) {
    // 기존 holding_changes 전체 삭제 후 재계산
    await supabase.from('holding_changes').delete().eq('investor_id', investorId);

    for (let qi = 1; qi < quarters.length; qi++) {
      const prevQ = quarters[qi - 1];
      const currQ = quarters[qi];
      const prevFil = uniqueFilings[qi - 1];
      const currFil = uniqueFilings[qi];

      // filing_id 기준 조회: 같은 분기에 여러 filing이 있어도 최신 것만 사용
      const { data: prevHoldings } = await supabase
        .from('holdings')
        .select('security_id, shares, value')
        .eq('filing_id', prevFil.id)
        .limit(2000);

      const { data: currHoldings } = await supabase
        .from('holdings')
        .select('security_id, shares, value')
        .eq('filing_id', currFil.id)
        .limit(2000);

      if (!prevHoldings?.length || !currHoldings?.length) continue;

      const prevMap = new Map(prevHoldings.map(h => [h.security_id, h]));
      const changes = [];

      for (const curr of currHoldings) {
        const prev = prevMap.get(curr.security_id);
        if (!prev) {
          // 신규 매수
          changes.push({ investor_id: investorId, security_id: curr.security_id, quarter: currQ, prev_quarter: prevQ, change_type: 'new', shares_change: curr.shares, pct_change: 100, value_current: curr.value, value_prev: 0 });
        } else {
          const pct = prev.shares > 0 ? ((curr.shares - prev.shares) / prev.shares * 100) : 0;
          if (Math.abs(pct) > 1) {
            changes.push({ investor_id: investorId, security_id: curr.security_id, quarter: currQ, prev_quarter: prevQ, change_type: pct > 0 ? 'buy' : 'sell', shares_change: curr.shares - prev.shares, pct_change: Math.round(pct * 10) / 10, value_current: curr.value, value_prev: prev.value });
          }
          prevMap.delete(curr.security_id);
        }
      }

      // 완전 청산
      for (const [secId, prev] of prevMap) {
        changes.push({ investor_id: investorId, security_id: secId, quarter: currQ, prev_quarter: prevQ, change_type: 'exit', shares_change: -prev.shares, pct_change: -100, value_current: 0, value_prev: prev.value });
      }

      if (changes.length > 0) {
        for (let ci = 0; ci < changes.length; ci += 50) {
          await supabase.from('holding_changes').insert(changes.slice(ci, ci + 50));
        }
        const nc = changes.filter(c => c.change_type === 'new').length;
        const bc = changes.filter(c => c.change_type === 'buy').length;
        const sc = changes.filter(c => c.change_type === 'sell').length;
        const ec = changes.filter(c => c.change_type === 'exit').length;
        console.log(`    ${prevQ}→${currQ}: 신규 ${nc} / 매수 ${bc} / 매도 ${sc} / 청산 ${ec}`);
      }
    }

    // QoQ AUM 변동 업데이트 (분기별 최신 filing만 사용)
    for (let qi = 1; qi < uniqueFilings.length; qi++) {
      const prev = uniqueFilings[qi - 1];
      const curr = uniqueFilings[qi];
      if (prev.total_value > 0) {
        const qoq = Math.round((curr.total_value - prev.total_value) / prev.total_value * 1000) / 10;
        await supabase.from('investor_metrics')
          .update({ qoq_change: qoq })
          .eq('investor_id', investorId)
          .eq('quarter', curr.quarter);
      }
    }
    console.log(`  ✅ QoQ 변동 업데이트 완료`);
  } else {
    console.log(`  ⚠️ 분기가 1개뿐이라 변동 계산 불가`);
  }

  // ---- Step 8: 일별 매매 내역 (ark_daily_trades) ----
  console.log(`\n  📅 일별 매매 내역 계산...`);

  // 전일 데이터 가져오기: 가장 최근 filing 중 오늘이 아닌 것
  const { data: prevFiling } = await supabase
    .from('filings')
    .select('id, accession_no, report_date')
    .eq('investor_id', investorId)
    .neq('accession_no', accessionNo)
    .like('accession_no', 'ARK-%')
    .order('report_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (prevFiling) {
    console.log(`  전일 데이터: ${prevFiling.report_date} (${prevFiling.accession_no})`);

    // 전일 보유종목 로드
    const { data: prevHolds } = await supabase
      .from('holdings')
      .select('security_id, shares, value, pct_of_portfolio, securities (ticker, name)')
      .eq('filing_id', prevFiling.id)
      .limit(2000);

    if (prevHolds?.length) {
      const prevMap = new Map();
      prevHolds.forEach(h => {
        const tk = h.securities?.ticker;
        if (tk) prevMap.set(tk, { shares: h.shares, value: h.value, pct: h.pct_of_portfolio || 0, name: h.securities.name });
      });

      // 오늘 보유종목 맵
      const todayMap = new Map();
      sortedHoldings.forEach(h => {
        const pct = totalValue > 0 ? Math.round(h.value / totalValue * 10000) / 100 : 0;
        todayMap.set(h.ticker, { shares: h.shares, value: h.value, pct, name: h.company, funds: h.funds.join(',') });
      });

      const trades = [];

      // 1) 오늘 있는 종목 체크
      for (const [ticker, today] of todayMap) {
        const prev = prevMap.get(ticker);
        if (!prev) {
          // 신규 편입
          trades.push({
            trade_date: reportDate,
            ticker,
            company: today.name,
            direction: 'buy',
            shares_change: today.shares,
            weight_today: today.pct,
            weight_prev: 0,
            funds: today.funds,
            is_new: true,
            is_exit: false,
          });
        } else {
          const diff = today.shares - prev.shares;
          if (diff !== 0) {
            trades.push({
              trade_date: reportDate,
              ticker,
              company: today.name,
              direction: diff > 0 ? 'buy' : 'sell',
              shares_change: diff,
              weight_today: today.pct,
              weight_prev: prev.pct,
              funds: today.funds,
              is_new: false,
              is_exit: false,
            });
          }
        }
      }

      // 2) 전일에만 있고 오늘 없는 종목 = 완전 청산
      for (const [ticker, prev] of prevMap) {
        if (!todayMap.has(ticker)) {
          trades.push({
            trade_date: reportDate,
            ticker,
            company: prev.name,
            direction: 'sell',
            shares_change: -prev.shares,
            weight_today: 0,
            weight_prev: prev.pct,
            funds: '',
            is_new: false,
            is_exit: true,
          });
        }
      }

      if (trades.length > 0) {
        // 기존 같은 날짜 데이터 삭제 후 재입력
        await supabase.from('ark_daily_trades').delete().eq('trade_date', reportDate);

        for (let i = 0; i < trades.length; i += 50) {
          const { error: tradeErr } = await supabase.from('ark_daily_trades').insert(trades.slice(i, i + 50));
          if (tradeErr) console.warn(`  ⚠️ 일별 매매 저장 오류: ${tradeErr.message}`);
        }

        const buys = trades.filter(t => t.direction === 'buy');
        const sells = trades.filter(t => t.direction === 'sell');
        const newPos = trades.filter(t => t.is_new);
        const exits = trades.filter(t => t.is_exit);

        console.log(`  ✅ 일별 매매 저장: ${trades.length}건`);
        console.log(`     매수 ${buys.length}건 / 매도 ${sells.length}건 / 신규 ${newPos.length}건 / 청산 ${exits.length}건`);

        // 주요 매매 출력
        if (trades.length > 0) {
          console.log(`\n  📋 오늘의 매매 내역 (${reportDate}):`);
          trades
            .sort((a, b) => Math.abs(b.shares_change) - Math.abs(a.shares_change))
            .slice(0, 15)
            .forEach(t => {
              const emoji = t.is_new ? '🆕' : t.is_exit ? '🚪' : t.direction === 'buy' ? '🟢' : '🔴';
              const label = t.is_new ? '신규' : t.is_exit ? '청산' : t.direction === 'buy' ? '매수' : '매도';
              const sharesFmt = Math.abs(t.shares_change).toLocaleString();
              const weightDiff = (t.weight_today - t.weight_prev).toFixed(2);
              console.log(`     ${emoji} ${label} ${t.ticker} — ${sharesFmt}주 (비중 ${t.weight_prev}%→${t.weight_today}%, ${weightDiff > 0 ? '+' : ''}${weightDiff}%p)`);
            });
        }
      } else {
        console.log(`  ℹ️  전일 대비 변동 없음`);
      }
    } else {
      console.log(`  ⚠️ 전일 보유종목 데이터 없음`);
    }
  } else {
    console.log(`  ℹ️  전일 데이터 없음 (첫 실행) — 일별 매매 내역 생략`);
  }

  // 상위 10 종목 출력
  console.log(`\n  📊 상위 10 종목:`);
  sortedHoldings.slice(0, 10).forEach((h, i) => {
    const pct = totalValue > 0 ? (h.value / totalValue * 100).toFixed(1) : 0;
    console.log(`     ${i + 1}. ${h.ticker} (${h.company}) — ${pct}% [${h.funds.join(', ')}]`);
  });

  console.log(`\n  📈 메트릭: AUM $${(totalValue / 1000).toFixed(1)}M / ${holdings.length}종목 / ${sectors.size}섹터`);

  // ---- Step 9a: Cowork용 포트폴리오 요약 JSON 저장 ----
  // Claude Cowork에서 인사이트를 생성할 때 이 파일을 읽습니다 (API 비용 $0)
  try {
    const { writeFileSync, mkdirSync } = await import('fs');
    const { join } = await import('path');

    const dataDir = join(process.cwd(), 'scripts', 'data');
    mkdirSync(dataDir, { recursive: true });

    // 포트폴리오 요약 데이터
    const sectorMap = {};
    sortedHoldings.forEach(h => {
      const sec = classifySector(h.company);
      sectorMap[sec] = (sectorMap[sec] || 0) + (totalValue > 0 ? h.value / totalValue * 100 : 0);
    });

    // 일별 매매 변동 요약
    let tradesSummary = null;
    const { data: recentTrades } = await supabase
      .from('ark_daily_trades')
      .select('*')
      .order('trade_date', { ascending: false })
      .limit(400); // 최근 5일분

    if (recentTrades?.length) {
      const byDate = {};
      recentTrades.forEach(t => {
        if (!byDate[t.trade_date]) byDate[t.trade_date] = [];
        byDate[t.trade_date].push(t);
      });
      const dates = Object.keys(byDate).sort().reverse().slice(0, 5);
      tradesSummary = dates.map(d => ({
        date: d,
        trades: byDate[d].sort((a, b) => Math.abs(b.shares_change) - Math.abs(a.shares_change)).slice(0, 15),
      }));
    }

    const summary = {
      investor: '캐시 우드 (Cathie Wood / ARK Invest)',
      quarter,
      reportDate,
      aum: `$${(totalValue / 1000).toFixed(1)}M`,
      holdingCount: holdings.length,
      sectorCount: sectors.size,
      concentration: `${(top10Pct * 100).toFixed(1)}%`,
      topHoldings: sortedHoldings.slice(0, 20).map((h, i) => ({
        rank: i + 1,
        ticker: h.ticker,
        company: h.company,
        pct: totalValue > 0 ? +(h.value / totalValue * 100).toFixed(2) : 0,
        value: h.value,
        sector: classifySector(h.company),
        funds: h.funds,
      })),
      sectorDistribution: Object.entries(sectorMap)
        .sort((a, b) => b[1] - a[1])
        .map(([s, p]) => ({ sector: s, pct: +p.toFixed(1) })),
      dailyTrades: tradesSummary,
      savedAt: new Date().toISOString(),
    };

    const filePath = join(dataDir, 'cathie-latest.json');
    writeFileSync(filePath, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`\n  💾 Cowork용 데이터 저장: scripts/data/cathie-latest.json`);
  } catch (e) {
    console.warn(`  ⚠️ Cowork 데이터 저장 실패 (무시): ${e.message}`);
  }

  // ---- Step 9b: --with-insights 옵션 → 자동 AI 인사이트 생성 ----
  if (process.argv.includes('--with-insights')) {
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      console.log('\n  ⚠️  --with-insights: ANTHROPIC_API_KEY 없음. 인사이트 생략.');
    } else {
      console.log('\n  🧠 AI 인사이트 생성 중 (캐시우드 일별)...');
      try {
        const { execSync } = await import('child_process');
        const envVars = `SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY}" ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"`;
        const cmd = `${envVars} node scripts/generate-insights.mjs --investor=cathie --daily`;
        const output = execSync(cmd, {
          cwd: process.cwd(),
          encoding: 'utf8',
          timeout: 60000, // 60초 타임아웃
        });
        // 핵심 결과만 출력
        output.split('\n').filter(l => l.includes('✅') || l.includes('❌') || l.includes('⏭️')).forEach(l => console.log('  ' + l.trim()));
      } catch (err) {
        console.error(`  ❌ 인사이트 생성 실패: ${err.message}`);
      }
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✅ ARK 파이프라인 완료!');
  console.log('═'.repeat(60));
}

main().catch(err => { console.error('실패:', err); process.exit(1); });
