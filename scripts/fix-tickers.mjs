#!/usr/bin/env node
/**
 * FolioObs — Securities 테이블 티커 보정 스크립트
 *
 * 3단계 검증:
 *   Step 1: 수동 매핑 (CUSIP → 정확한 티커)
 *   Step 2: OpenFIGI 재조회 (의심스러운 티커)
 *   Step 3: Polygon.io 교차 검증 (모든 티커 유효성 + 이름 매칭)
 *
 * 사용법:
 *   SUPABASE_SERVICE_KEY="eyJ..." POLYGON_API_KEY="B1k..." node scripts/fix-tickers.mjs
 *
 *   옵션:
 *     --polygon-only   Polygon 검증만 실행 (Step 1,2 스킵)
 *     --dry-run        DB 수정 없이 결과만 출력
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://mghfgcjcbpizjmfrtozi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const POLYGON_API_KEY = process.env.POLYGON_API_KEY || process.env.VITE_POLYGON_API_KEY || '';

const ARGS = process.argv.slice(2);
const POLYGON_ONLY = ARGS.includes('--polygon-only');
const DRY_RUN = ARGS.includes('--dry-run');

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY 환경변수가 필요합니다.');
  process.exit(1);
}
if (!POLYGON_API_KEY) {
  console.warn('⚠️  POLYGON_API_KEY가 없습니다. Polygon 검증을 건너뜁니다.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// CUSIP 캐시
const CUSIP_FILE = join(__dirname, '.cusip-cache.json');
let cusipCache = {};
try { if (existsSync(CUSIP_FILE)) cusipCache = JSON.parse(readFileSync(CUSIP_FILE, 'utf-8')); } catch (e) { /* */ }

// Polygon 검증 결과 캐시
const POLYGON_CACHE_FILE = join(__dirname, '.polygon-verify-cache.json');
let polygonCache = {};
try { if (existsSync(POLYGON_CACHE_FILE)) polygonCache = JSON.parse(readFileSync(POLYGON_CACHE_FILE, 'utf-8')); } catch (e) { /* */ }

// ============================================================
// 확실한 수동 매핑 (OpenFIGI가 못 찾는 종목들)
// ============================================================
const MANUAL_OVERRIDES = {
  // ─── 주요 대형주 (자동매핑 실패 종목) ───
  '67066G104': 'NVDA', '166764100': 'CVX', '22160K105': 'COST',
  '084670702': 'BRK.B', '30231G102': 'XOM', '478160104': 'JNJ',
  '68622V106': 'OGN', '879433829': 'TDS',
  // ─── US 종목 ───
  '22266T109': 'CPNG', '149123101': 'CAT', '126408103': 'CSX',
  '126650100': 'CVS', '101137107': 'BSX', '100557107': 'SAM',
  '101121101': 'BXP', '143130102': 'KMX', '143658300': 'CCL',
  '127097103': 'CTRA', '125896100': 'CMS', '141788109': 'CARG',
  '148929102': 'CAVA', '150870103': 'CE', '149568107': 'CVCO',
  '146229109': 'CRI', '144285103': 'CRS', '142339100': 'CSL',
  '114340102': 'AZTA', '147528103': 'CASY', '148806102': 'CTLT',
  '130788102': 'CWT', '125269100': 'CF', '126117100': 'CNA',
  '126402106': 'CSWI', '104674106': 'BRC', '103304101': 'BYD',
  '105368203': 'BDN', '156431108': 'CENX', '153527205': 'CENT',
  '398905109': 'GPI', '44107P104': 'HST', '02376R102': 'AAL',
  '650111104': 'NYT', '674599105': 'OXY', '907818108': 'UNP',
  '31620M106': 'FIS', '256677105': 'DG', '26969P108': 'EXP',
  // ─── &amp; 이름 종목 ───
  '093671105': 'HRB', '070830104': 'BBWI', '075887109': 'BDX',
  '968223206': 'WLY', '171340102': 'CHD', '36467J108': 'GLPI',
  '50077B207': 'KTOS', '48251W104': 'KKR', '55261F104': 'MTB',
  '524660107': 'LEG', '372460105': 'GPC', '60855R100': 'MOH',
  // ─── G-prefix (해외 상장) ───
  'G0084W101': 'ADNT', 'G01767105': 'ALKS', 'G0176J109': 'ALLE',
  'G0250X107': 'AMCR', 'G02602103': 'DOX', 'G0260P102': 'AS',
  'G0378L100': 'AU', 'G0403H108': 'AON', 'G0450A105': 'ACGL',
  'G0585R106': 'AGO', 'G0692U109': 'AXS', 'G0750C108': 'AXTA',
  'G0896C103': 'TBBB', 'G1110E107': 'BHVN', 'G1151C101': 'ACN',
  'G16962105': 'BG', 'G1890L107': 'CPRI', 'G2143T103': 'CMPR',
  'G21810109': 'CLVT', 'G25457105': 'CRDO', 'G25508105': 'CRH',
  'G25839104': 'CCEP', 'G2662B103': 'CRML', 'G29183103': 'ETN',
  'G3075P101': 'ESGR', 'G3198U102': 'ESNT', 'G3223R108': 'EG',
  'G3265R107': 'APTV', 'G3643J108': 'FLUT', 'G36738105': 'FDP',
  'G3730V105': 'FTAI', 'G39108108': 'GTES', 'G3922B107': 'G',
  'G4124C109': 'GRAB', 'G4388N106': 'HELE', 'G4412G101': 'HLF',
  'G4474Y214': 'JHG', 'G46188101': 'HZNP', 'G4701H109': 'IHS',
  'G4705A100': 'ICLR', 'G4740B105': 'ICHR', 'G4863A108': 'IGT',
  'G48833118': 'WFRD', 'G491BT108': 'IVZ', 'G50871105': 'JAZZ',
  'G51502105': 'JCI', 'G5480U104': 'LBTYA', 'G5480U120': 'LBTYK',
  'G54950103': 'LIN', 'G5960L103': 'MDT', 'G6095L109': 'APTV',
  'G61188101': 'LBTYA', 'G61188127': 'LBTYK', 'G65163100': 'JOBY',
  'G65431127': 'NE', 'G6564A105': 'NOMD', 'G6674U108': 'NVCR',
  'G6683N103': 'NU', 'G6700G107': 'NVT', 'G68707101': 'PAGS',
  'G7496G103': 'RNR', 'G7709Q104': 'RPRX', 'G7997R103': 'STX',
  'G7997W102': 'SDRL', 'G7S00T104': 'PNR', 'G8060N102': 'ST',
  'G8068L108': 'SN', 'G81276100': 'SIG', 'G8267P108': 'SW',
  'G8473T100': 'STE', 'G85158106': 'STNE', 'G87052109': 'TEL',
  'G87110105': 'FTI', 'G8807B106': 'TBPH', 'G8994E103': 'TT',
  'G9001E102': 'LILAK', 'G9001E128': 'LILA', 'G9087Q102': 'TROX',
  'G93A5A101': 'VIK', 'G9456A100': 'GLNG', 'G9460G101': 'VAL',
  'G9618E107': 'WTM', 'G96629103': 'WTW', 'G97822103': 'PRGO',
};

// ============================================================
// OpenFIGI 배치 조회
// ============================================================
async function batchResolveFIGI(cusipList) {
  const results = {};
  const batchSize = 10;

  for (let i = 0; i < cusipList.length; i += batchSize) {
    const batch = cusipList.slice(i, i + batchSize);
    const body = batch.map(cusip => ({ idType: 'ID_CUSIP', idValue: cusip }));

    try {
      await sleep(1200);
      const res = await fetch('https://api.openfigi.com/v3/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        for (let j = 0; j < data.length; j++) {
          const ticker = data[j]?.data?.[0]?.ticker;
          if (ticker) results[batch[j]] = ticker;
        }
      } else {
        console.log(`  ⚠️ OpenFIGI ${res.status} (batch ${Math.floor(i / batchSize) + 1})`);
      }
    } catch (e) {
      console.log(`  ⚠️ OpenFIGI 오류: ${e.message}`);
    }

    const progress = Math.min(i + batchSize, cusipList.length);
    process.stdout.write(`\r  OpenFIGI 조회 중... ${progress}/${cusipList.length}`);
  }
  console.log('');
  return results;
}

// ============================================================
// Polygon.io 티커 검증
// ============================================================
async function polygonVerifyTicker(ticker) {
  // 캐시 확인 (24시간 유효)
  const cached = polygonCache[ticker];
  if (cached && Date.now() - cached.ts < 24 * 60 * 60 * 1000) {
    return cached.result;
  }

  try {
    const url = `https://api.polygon.io/v3/reference/tickers/${encodeURIComponent(ticker)}?apiKey=${POLYGON_API_KEY}`;
    const res = await fetch(url);

    if (res.status === 404) {
      const result = { valid: false, reason: 'NOT_FOUND' };
      polygonCache[ticker] = { result, ts: Date.now() };
      return result;
    }

    if (res.status === 429) {
      console.log(`  ⏳ Rate limited, waiting 12s...`);
      await sleep(12000);
      return polygonVerifyTicker(ticker); // retry
    }

    if (!res.ok) {
      return { valid: false, reason: `HTTP_${res.status}` };
    }

    const data = await res.json();
    const info = data.results || {};
    const result = {
      valid: true,
      name: info.name || '',
      active: info.active !== false,
      exchange: info.primary_exchange || '',
      type: info.type || '',
      market: info.market || '',
      locale: info.locale || '',
    };
    polygonCache[ticker] = { result, ts: Date.now() };
    return result;
  } catch (e) {
    return { valid: false, reason: `ERROR: ${e.message}` };
  }
}

/** Polygon 티커 검색 (잘못된 티커의 올바른 매칭 찾기) */
async function polygonSearchTicker(query) {
  try {
    const url = `https://api.polygon.io/v3/reference/tickers?search=${encodeURIComponent(query)}&active=true&market=stocks&limit=5&apiKey=${POLYGON_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map(r => ({
      ticker: r.ticker,
      name: r.name,
      exchange: r.primary_exchange,
    }));
  } catch {
    return [];
  }
}

/** 이름 유사도 비교 (간단한 단어 겹침) */
function nameSimilarity(a, b) {
  if (!a || !b) return 0;
  const wordsA = a.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 1);
  const wordsB = b.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 1);
  const setB = new Set(wordsB);
  const overlap = wordsA.filter(w => setB.has(w)).length;
  return overlap / Math.max(wordsA.length, 1);
}

// ============================================================
// 메인
// ============================================================
async function main() {
  console.log('FolioObs — Securities 티커 보정 스크립트 (v2 + Polygon 검증)');
  console.log('═'.repeat(60));
  if (DRY_RUN) console.log('🧪 DRY RUN 모드 — DB 수정 없음\n');

  // 1) DB에서 모든 securities 가져오기
  console.log('▶ Step 1: DB securities 조회');
  let securities = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error: pgErr } = await supabase
      .from('securities')
      .select('id, cusip, ticker, name')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (pgErr) { console.error('❌ DB 조회 실패:', pgErr.message); return; }
    if (!data || data.length === 0) break;
    securities = securities.concat(data);
    if (data.length < pageSize) break;
    page++;
  }
  console.log(`  총 ${securities.length}개 종목\n`);

  // ────────────────────────────────────────────
  // Step 2 & 3: 수동 매핑 + OpenFIGI (--polygon-only면 스킵)
  // ────────────────────────────────────────────
  if (!POLYGON_ONLY) {
    // 2) 수동 매핑
    console.log('▶ Step 2: 수동 매핑 적용');
    let manualFixed = 0;
    const needsFIGI = [];

    for (const sec of securities) {
      if (MANUAL_OVERRIDES[sec.cusip]) {
        const correctTicker = MANUAL_OVERRIDES[sec.cusip];
        if (sec.ticker !== correctTicker) {
          if (!DRY_RUN) {
            await supabase.from('securities').update({ ticker: correctTicker }).eq('id', sec.id);
            cusipCache[sec.cusip] = { ticker: correctTicker, name: sec.name };
          }
          manualFixed++;
          console.log(`  ✅ ${sec.ticker} → ${correctTicker} (${sec.name})`);
          sec.ticker = correctTicker; // 메모리도 업데이트
        }
      } else {
        const t = sec.ticker || '';
        const isSuspicious = /^\d/.test(t) ||
          (t.length <= 3 && t !== t.toUpperCase()) ||
          (t.length >= 5 && !['GOOGL','GOOG','BRK.A','BRK.B'].includes(t)) ||
          t.includes('&') ||
          (t.length <= 2 && sec.name.split(/\s+/).length > 2);

        if (isSuspicious) needsFIGI.push(sec);
      }
    }
    console.log(`  수동 매핑 수정: ${manualFixed}개`);
    console.log(`  OpenFIGI 재조회 필요: ${needsFIGI.length}개\n`);

    // 3) OpenFIGI 배치 조회
    if (needsFIGI.length > 0) {
      console.log('▶ Step 3: OpenFIGI 배치 조회');
      const figiResults = await batchResolveFIGI(needsFIGI.map(s => s.cusip));
      let figiFixed = 0;
      for (const sec of needsFIGI) {
        const newTicker = figiResults[sec.cusip];
        if (newTicker && newTicker !== sec.ticker) {
          if (!DRY_RUN) {
            await supabase.from('securities').update({ ticker: newTicker }).eq('id', sec.id);
            cusipCache[sec.cusip] = { ticker: newTicker, name: sec.name };
          }
          figiFixed++;
          if (figiFixed <= 15) console.log(`  🔧 ${sec.ticker} → ${newTicker} (${sec.name})`);
          sec.ticker = newTicker;
        }
      }
      if (figiFixed > 15) console.log(`  ... 외 ${figiFixed - 15}개`);
      console.log(`  OpenFIGI 보정: ${figiFixed}개\n`);
    }
  }

  // ────────────────────────────────────────────
  // Step 4: Polygon.io 교차 검증 (핵심!)
  // ────────────────────────────────────────────
  if (POLYGON_API_KEY) {
    console.log('▶ Step 4: Polygon.io 교차 검증');
    console.log('  (모든 고유 티커를 Polygon API로 유효성 확인)\n');

    // 고유 티커 추출
    const tickerMap = new Map(); // ticker → [securities]
    for (const sec of securities) {
      const t = (sec.ticker || '').toUpperCase();
      if (!t || t === 'N/A') continue;
      // BRK.B → BRK-B for Polygon (Polygon uses hyphen)
      if (!tickerMap.has(t)) tickerMap.set(t, []);
      tickerMap.get(t).push(sec);
    }

    const uniqueTickers = [...tickerMap.keys()];
    console.log(`  고유 티커: ${uniqueTickers.length}개\n`);

    const invalid = [];    // Polygon에서 못 찾은 티커
    const inactive = [];   // 비활성 (상폐/변경)
    const mismatch = [];   // 이름 불일치 (의심)
    const verified = [];   // 정상 확인

    let processed = 0;
    for (const ticker of uniqueTickers) {
      // Polygon API 호출 간 딜레이 (rate limit 방지)
      if (processed > 0 && processed % 5 === 0) await sleep(250);

      const polygonTicker = ticker.replace('.', '-'); // BRK.B → BRK-B
      const result = await polygonVerifyTicker(polygonTicker);

      processed++;
      if (processed % 50 === 0) {
        process.stdout.write(`\r  검증 중... ${processed}/${uniqueTickers.length}`);
      }

      const secs = tickerMap.get(ticker);
      const dbName = secs[0]?.name || '';

      if (!result.valid) {
        invalid.push({ ticker, dbName, reason: result.reason, secs });
      } else if (!result.active) {
        inactive.push({ ticker, dbName, polygonName: result.name, secs });
      } else {
        // 이름 매칭 확인
        const sim = nameSimilarity(dbName, result.name);
        if (sim < 0.2 && dbName.length > 3 && result.name.length > 3) {
          mismatch.push({ ticker, dbName, polygonName: result.name, similarity: sim, secs });
        } else {
          verified.push(ticker);
        }
      }
    }
    console.log(`\r  검증 완료: ${processed}/${uniqueTickers.length}          \n`);

    // ─── 결과 리포트 ───
    console.log('┌─────────────────────────────────────────────────');
    console.log(`│ ✅ 정상 확인: ${verified.length}개`);
    console.log(`│ ❌ 존재하지 않음: ${invalid.length}개`);
    console.log(`│ ⚠️  비활성/상폐: ${inactive.length}개`);
    console.log(`│ 🔍 이름 불일치: ${mismatch.length}개`);
    console.log('└─────────────────────────────────────────────────\n');

    // 존재하지 않는 티커 상세
    if (invalid.length > 0) {
      console.log('❌ Polygon에서 찾을 수 없는 티커:');
      let autoFixed = 0;
      for (const { ticker, dbName, reason, secs } of invalid) {
        console.log(`   ${ticker} — "${dbName}" (${reason})`);

        // 회사명으로 Polygon 검색해서 올바른 티커 찾기
        if (dbName && dbName !== 'N/A') {
          await sleep(300);
          const suggestions = await polygonSearchTicker(dbName);
          if (suggestions.length > 0) {
            const best = suggestions[0];
            const sim = nameSimilarity(dbName, best.name);
            if (sim >= 0.3) {
              console.log(`     → 추천: ${best.ticker} (${best.name}) [유사도 ${(sim * 100).toFixed(0)}%]`);

              if (!DRY_RUN && sim >= 0.5) {
                // 자동 수정 (유사도 50% 이상)
                for (const sec of secs) {
                  await supabase.from('securities').update({ ticker: best.ticker }).eq('id', sec.id);
                  cusipCache[sec.cusip] = { ticker: best.ticker, name: sec.name };
                }
                autoFixed++;
                console.log(`     ✅ 자동 수정 완료!`);
              }
            } else if (suggestions.length > 0) {
              console.log(`     → 후보: ${suggestions.map(s => `${s.ticker}(${s.name})`).join(', ')}`);
            }
          }
        }
      }
      if (autoFixed > 0) console.log(`\n  🔧 Polygon 기반 자동 수정: ${autoFixed}개`);
      console.log('');
    }

    // 비활성 티커
    if (inactive.length > 0) {
      console.log('⚠️  비활성/상장폐지 종목:');
      for (const { ticker, dbName, polygonName } of inactive.slice(0, 20)) {
        console.log(`   ${ticker} — DB: "${dbName}" / Polygon: "${polygonName}"`);
      }
      if (inactive.length > 20) console.log(`   ... 외 ${inactive.length - 20}개`);
      console.log('');
    }

    // 이름 불일치 (잠재적 오류)
    if (mismatch.length > 0) {
      console.log('🔍 이름 불일치 (수동 확인 필요):');
      for (const { ticker, dbName, polygonName, similarity } of mismatch.slice(0, 20)) {
        console.log(`   ${ticker} — DB: "${dbName}" ↔ Polygon: "${polygonName}" (${(similarity * 100).toFixed(0)}%)`);
      }
      if (mismatch.length > 20) console.log(`   ... 외 ${mismatch.length - 20}개`);
      console.log('');
    }

    // Polygon 캐시 저장
    writeFileSync(POLYGON_CACHE_FILE, JSON.stringify(polygonCache, null, 2));
    console.log(`  💾 Polygon 검증 캐시 저장 (${Object.keys(polygonCache).length}개)\n`);
  }

  // ────────────────────────────────────────────
  // 캐시 저장 & 최종 요약
  // ────────────────────────────────────────────
  if (!DRY_RUN) {
    writeFileSync(CUSIP_FILE, JSON.stringify(cusipCache, null, 2));
  }

  console.log('═'.repeat(60));

  // 최종 상태 확인 — 아직 의심스러운 티커
  const { data: finalCheck } = await supabase
    .from('securities')
    .select('cusip, ticker, name')
    .or('ticker.like.%&%,ticker.like.1%,ticker.like.2%,ticker.like.3%,ticker.like.4%,ticker.like.5%,ticker.like.6%,ticker.like.7%,ticker.like.8%,ticker.like.9%,ticker.like.0%')
    .limit(20);

  if (finalCheck && finalCheck.length > 0) {
    console.log(`\n⚠️ 아직 의심스러운 티커 ${finalCheck.length}개:`);
    for (const s of finalCheck.slice(0, 10)) {
      console.log(`   ${s.cusip}: ${s.ticker} — ${s.name}`);
    }
  } else {
    console.log('\n✅ 모든 티커가 정상입니다!');
  }

  console.log('\n✅ 티커 보정 완료!');
}

main().catch(console.error);
