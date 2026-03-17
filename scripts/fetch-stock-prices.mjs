#!/usr/bin/env node
/**
 * FolioObs — 주가 수집 스크립트
 *
 * holdings 테이블의 모든 고유 티커에 대해 Polygon.io에서 가격을 가져와
 * stock_prices 테이블에 upsert합니다.
 *
 * 사용법:
 *   node scripts/fetch-stock-prices.mjs
 *   node scripts/fetch-stock-prices.mjs --quarter-end    # 분기말 가격도 수집
 *   node scripts/fetch-stock-prices.mjs --ticker=AAPL    # 특정 티커만
 *   node scripts/fetch-stock-prices.mjs --missing-only   # stock_prices에 없는 티커만
 *
 * 환경변수:
 *   POLYGON_API_KEY  (필수) Polygon.io API 키
 *   SUPABASE_URL     (선택) 기본: https://mghfgcjcbpizjmfrtozi.supabase.co
 *   SUPABASE_KEY     (선택) anon key 또는 service key
 */

import { createClient } from '@supabase/supabase-js';

// ===== 설정 =====
const POLYGON_API_KEY = process.env.POLYGON_API_KEY || 'B1kOZdIwGvpx0YtiZmrgveaR9lKBoT_7';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mghfgcjcbpizjmfrtozi.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1naGZnY2pjYnBpemptZnJ0b3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjQ3NzIsImV4cCI6MjA4ODI0MDc3Mn0.GlpiV6vgDmpitprIZpMBvDcD-8ZvnnYZuTo3VqdUDvQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// CLI 인자 파싱
const args = process.argv.slice(2);
const quarterEndFlag = args.includes('--quarter-end');
const missingOnlyFlag = args.includes('--missing-only');
const tickerArg = args.find(a => a.startsWith('--ticker='))?.split('=')[1];

// Polygon API 호출 (rate limit: 5 req/min for free, higher for paid)
const RATE_LIMIT_MS = 250; // 250ms = 4 req/sec (paid plan)
let lastRequestTime = 0;

async function polygonFetch(url) {
  const now = Date.now();
  const wait = RATE_LIMIT_MS - (now - lastRequestTime);
  if (wait > 0) await sleep(wait);
  lastRequestTime = Date.now();

  const fullUrl = `${url}${url.includes('?') ? '&' : '?'}apiKey=${POLYGON_API_KEY}`;
  const res = await fetch(fullUrl);

  if (res.status === 429) {
    console.warn('⏳ Rate limited, waiting 60s...');
    await sleep(60000);
    return polygonFetch(url);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Polygon API ${res.status}: ${text}`);
  }

  return res.json();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// 날짜 유틸
function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function getPrevBusinessDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  return formatDate(d);
}

function getQuarterEndDate(quarter) {
  const m = quarter.match(/^(\d{4})Q(\d)$/);
  if (!m) return null;
  const year = parseInt(m[1]);
  const q = parseInt(m[2]);
  const ends = { 1: `${year}-03-31`, 2: `${year}-06-30`, 3: `${year}-09-30`, 4: `${year}-12-31` };
  return ends[q];
}

// ===== 1. holdings에서 모든 고유 티커 수집 =====
async function getAllTickers() {
  console.log('📋 holdings 테이블에서 티커 수집 중...');

  // securities 테이블에서 ticker 목록 가져오기
  const { data: securities, error } = await supabase
    .from('securities')
    .select('ticker')
    .not('ticker', 'is', null);

  if (error) throw new Error(`Securities 조회 실패: ${error.message}`);

  const tickers = [...new Set(securities.map(s => s.ticker).filter(Boolean))];
  console.log(`  → 총 ${tickers.length}개 고유 티커`);
  return tickers.sort();
}

// ===== 2. stock_prices에 이미 있는 티커 확인 =====
async function getExistingTickers() {
  const { data, error } = await supabase
    .from('stock_prices')
    .select('ticker')
    .order('price_date', { ascending: false });

  if (error) throw new Error(`stock_prices 조회 실패: ${error.message}`);

  const existing = new Set();
  (data || []).forEach(d => existing.add(d.ticker));
  return existing;
}

// ===== 3. Polygon에서 최신 가격 가져오기 =====
async function fetchLatestPrice(ticker) {
  try {
    // Previous close endpoint (가장 안정적)
    const data = await polygonFetch(
      `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev`
    );

    if (data.results && data.results.length > 0) {
      const r = data.results[0];
      return {
        ticker,
        price_date: formatDate(new Date(r.t)), // timestamp → date
        open_price: r.o,
        close_price: r.c,
        high_price: r.h,
        low_price: r.l,
        volume: r.v,
        prev_close: null, // prev endpoint 자체가 전일 데이터
        change_pct: null, // 별도 계산 필요
      };
    }
    return null;
  } catch (e) {
    console.warn(`  ⚠ ${ticker}: ${e.message}`);
    return null;
  }
}

// ===== 4. Polygon에서 특정 날짜 근처 가격 가져오기 (분기말) =====
async function fetchPriceNearDate(ticker, targetDate) {
  try {
    // targetDate ±5 영업일 범위에서 가격 조회
    const from = new Date(targetDate + 'T12:00:00Z');
    from.setDate(from.getDate() - 7);
    const to = new Date(targetDate + 'T12:00:00Z');
    to.setDate(to.getDate() + 3);

    const data = await polygonFetch(
      `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${formatDate(from)}/${formatDate(to)}?sort=desc&limit=5`
    );

    if (data.results && data.results.length > 0) {
      // targetDate에 가장 가까운 날짜 선택
      const target = new Date(targetDate + 'T12:00:00Z').getTime();
      let closest = data.results[0];
      let minDiff = Math.abs(closest.t - target);

      for (const r of data.results) {
        const diff = Math.abs(r.t - target);
        if (diff < minDiff) {
          minDiff = diff;
          closest = r;
        }
      }

      return {
        ticker,
        price_date: formatDate(new Date(closest.t)),
        open_price: closest.o,
        close_price: closest.c,
        high_price: closest.h,
        low_price: closest.l,
        volume: closest.v,
        prev_close: null,
        change_pct: null,
      };
    }
    return null;
  } catch (e) {
    console.warn(`  ⚠ ${ticker} (${targetDate}): ${e.message}`);
    return null;
  }
}

// ===== 5. Supabase에 upsert =====
async function upsertPrices(prices) {
  if (prices.length === 0) return;

  // stock_prices에는 unique constraint on (ticker, price_date) 필요
  // 없으면 기존 레코드 확인 후 insert or update
  const now = new Date().toISOString();
  const rows = prices.map(p => ({
    ticker: p.ticker,
    price_date: p.price_date,
    open_price: p.open_price,
    close_price: p.close_price,
    high_price: p.high_price,
    low_price: p.low_price,
    volume: p.volume,
    prev_close: p.prev_close,
    change_pct: p.change_pct,
    fetched_at: now,
  }));

  // 배치 upsert (50개씩)
  const batchSize = 50;
  let upserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from('stock_prices')
      .upsert(batch, { onConflict: 'ticker,price_date' });

    if (error) {
      console.error(`  ❌ Upsert 실패 (batch ${Math.floor(i/batchSize)+1}):`, error.message);
      // 개별 insert 시도
      for (const row of batch) {
        const { error: singleErr } = await supabase
          .from('stock_prices')
          .upsert(row, { onConflict: 'ticker,price_date' });
        if (singleErr) {
          console.error(`    ❌ ${row.ticker} ${row.price_date}: ${singleErr.message}`);
        } else {
          upserted++;
        }
      }
    } else {
      upserted += batch.length;
    }
  }

  return upserted;
}

// ===== 6. 일간 변동률 계산 =====
async function calcDailyChanges() {
  console.log('\n📊 일간 변동률 계산 중...');

  // 각 티커별로 최근 2일 가격을 가져와서 change_pct 업데이트
  const { data: prices } = await supabase
    .from('stock_prices')
    .select('id, ticker, price_date, close_price, change_pct')
    .order('price_date', { ascending: false })
    .limit(5000);

  if (!prices || prices.length === 0) return;

  // 티커별 그룹핑 (최근 날짜순)
  const byTicker = {};
  prices.forEach(p => {
    if (!byTicker[p.ticker]) byTicker[p.ticker] = [];
    byTicker[p.ticker].push(p);
  });

  let updated = 0;
  for (const [ticker, tickerPrices] of Object.entries(byTicker)) {
    // 최신 가격과 그 전 가격
    if (tickerPrices.length >= 2) {
      const latest = tickerPrices[0];
      const prev = tickerPrices[1];
      const prevClose = parseFloat(prev.close_price);
      const currClose = parseFloat(latest.close_price);

      if (prevClose > 0) {
        const changePct = ((currClose - prevClose) / prevClose) * 100;
        const rounded = Math.round(changePct * 100) / 100;

        if (latest.change_pct === null || Math.abs(latest.change_pct - rounded) > 0.01) {
          const { error } = await supabase
            .from('stock_prices')
            .update({ change_pct: rounded, prev_close: prevClose })
            .eq('id', latest.id);

          if (!error) updated++;
        }
      }
    }
  }
  console.log(`  → ${updated}개 종목 변동률 업데이트`);
}

// ===== MAIN =====
async function main() {
  console.log('🚀 FolioObs 주가 수집 시작');
  console.log(`  Polygon API Key: ${POLYGON_API_KEY.slice(0, 8)}...`);
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log('');

  // 1) 티커 목록 수집
  let tickers;
  if (tickerArg) {
    tickers = [tickerArg.toUpperCase()];
    console.log(`🎯 단일 티커 모드: ${tickers[0]}`);
  } else {
    tickers = await getAllTickers();
  }

  // 2) 이미 있는 티커 확인 (--missing-only)
  if (missingOnlyFlag) {
    const existing = await getExistingTickers();
    const before = tickers.length;
    tickers = tickers.filter(t => !existing.has(t));
    console.log(`🔍 missing-only 모드: ${before} → ${tickers.length}개 (${before - tickers.length}개 이미 존재)`);
  }

  if (tickers.length === 0) {
    console.log('✅ 수집할 티커가 없습니다.');
    return;
  }

  // 3) 최신 가격 수집
  console.log(`\n📈 최신 가격 수집 (${tickers.length}개 티커)...`);
  const latestPrices = [];
  let success = 0, fail = 0;

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    const progress = `[${i+1}/${tickers.length}]`;

    const price = await fetchLatestPrice(ticker);
    if (price) {
      latestPrices.push(price);
      success++;
      if ((i + 1) % 50 === 0 || i === tickers.length - 1) {
        console.log(`  ${progress} ${ticker} ✓ (${price.close_price}) — 성공: ${success}, 실패: ${fail}`);
      }
    } else {
      fail++;
      console.log(`  ${progress} ${ticker} ✗ — 가격 없음`);
    }
  }

  console.log(`\n💾 Supabase에 최신 가격 저장 (${latestPrices.length}개)...`);
  const upsertedLatest = await upsertPrices(latestPrices);
  console.log(`  → ${upsertedLatest}개 저장 완료`);

  // 4) 분기말 가격 수집 (--quarter-end 플래그)
  if (quarterEndFlag) {
    // 최근 분기 확인
    const { data: filings } = await supabase
      .from('filings')
      .select('quarter')
      .not('accession_no', 'like', 'ARK-%')
      .order('report_date', { ascending: false })
      .limit(1);

    if (filings && filings.length > 0) {
      const quarter = filings[0].quarter;
      const qEndDate = getQuarterEndDate(quarter);
      console.log(`\n📅 분기말 가격 수집: ${quarter} (${qEndDate})`);

      const quarterPrices = [];
      for (let i = 0; i < tickers.length; i++) {
        const ticker = tickers[i];
        const price = await fetchPriceNearDate(ticker, qEndDate);
        if (price) {
          quarterPrices.push(price);
          if ((i + 1) % 50 === 0 || i === tickers.length - 1) {
            console.log(`  [${i+1}/${tickers.length}] ${ticker} ✓ (${price.close_price} on ${price.price_date})`);
          }
        }
      }

      console.log(`\n💾 분기말 가격 저장 (${quarterPrices.length}개)...`);
      const upsertedQ = await upsertPrices(quarterPrices);
      console.log(`  → ${upsertedQ}개 저장 완료`);
    }
  }

  // 5) 일간 변동률 계산
  await calcDailyChanges();

  // 6) 결과 요약
  console.log('\n========================================');
  console.log(`✅ 완료!`);
  console.log(`  최신 가격: ${success}/${tickers.length} 성공`);
  if (fail > 0) console.log(`  ⚠ ${fail}개 티커 가격 조회 실패 (상장폐지/변경 가능)`);
  console.log('========================================');
}

main().catch(err => {
  console.error('❌ 실패:', err);
  process.exit(1);
});
