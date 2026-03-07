#!/usr/bin/env node
/**
 * FolioObs — Securities 테이블 티커 보정 스크립트
 *
 * CUSIP 캐시의 잘못된 약어를 OpenFIGI API로 재조회하여 정확한 티커로 수정합니다.
 *
 * 사용법:
 *   SUPABASE_SERVICE_KEY="eyJ..." node scripts/fix-tickers.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://mghfgcjcbpizjmfrtozi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// CUSIP 캐시
const CUSIP_FILE = join(__dirname, '.cusip-cache.json');
let cusipCache = {};
try { if (existsSync(CUSIP_FILE)) cusipCache = JSON.parse(readFileSync(CUSIP_FILE, 'utf-8')); } catch (e) { /* */ }

// ============================================================
// 확실한 수동 매핑 (OpenFIGI가 못 찾는 종목들)
// ============================================================
const MANUAL_OVERRIDES = {
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
// OpenFIGI 배치 조회 (최대 100개씩)
// ============================================================
async function batchResolveFIGI(cusipList) {
  const results = {};
  const batchSize = 10; // OpenFIGI 무료 limit (50은 413 에러 발생)

  for (let i = 0; i < cusipList.length; i += batchSize) {
    const batch = cusipList.slice(i, i + batchSize);
    const body = batch.map(cusip => ({ idType: 'ID_CUSIP', idValue: cusip }));

    try {
      await sleep(1200); // Rate limit: 25 req/min for free tier
      const res = await fetch('https://api.openfigi.com/v3/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        for (let j = 0; j < data.length; j++) {
          const ticker = data[j]?.data?.[0]?.ticker;
          if (ticker) {
            results[batch[j]] = ticker;
          }
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
// 메인
// ============================================================
async function main() {
  console.log('FolioObs — Securities 티커 보정 스크립트');
  console.log('═'.repeat(50));

  // 1) DB에서 모든 securities 가져오기 (페이지네이션)
  console.log('\n▶ Step 1: DB securities 조회');
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
  console.log(`  총 ${securities.length}개 종목 (${page + 1}페이지)`);

  // 2) 수동 매핑 먼저 적용
  console.log('\n▶ Step 2: 수동 매핑 적용');
  let manualFixed = 0;
  const needsFIGI = []; // OpenFIGI로 조회할 CUSIP 목록

  for (const sec of securities) {
    if (MANUAL_OVERRIDES[sec.cusip]) {
      const correctTicker = MANUAL_OVERRIDES[sec.cusip];
      if (sec.ticker !== correctTicker) {
        const { error: upErr } = await supabase
          .from('securities')
          .update({ ticker: correctTicker })
          .eq('id', sec.id);
        if (!upErr) {
          manualFixed++;
          console.log(`  ✅ ${sec.ticker} → ${correctTicker} (${sec.name})`);
          // 캐시도 업데이트
          cusipCache[sec.cusip] = { ticker: correctTicker, name: sec.name };
        }
      }
    } else {
      // 티커가 의심스러운 경우만 OpenFIGI 재시도
      const t = sec.ticker || '';
      const isSuspicious = /^\d/.test(t) ||                    // 숫자로 시작
        (t.length <= 3 && t !== t.toUpperCase()) ||             // 소문자 섞임
        (t.length >= 5 && !['GOOGL','GOOG'].includes(t)) ||    // 너무 긴 티커 (5+)
        t.includes('&') ||                                      // 특수문자
        (t.length <= 2 && sec.name.split(/\s+/).length > 2);   // 이름은 긴데 티커가 1-2글자

      if (isSuspicious) {
        needsFIGI.push(sec);
      }
    }
  }
  console.log(`  수동 매핑 수정: ${manualFixed}개`);
  console.log(`  OpenFIGI 재조회 필요: ${needsFIGI.length}개`);

  // 3) OpenFIGI 배치 조회
  if (needsFIGI.length > 0) {
    console.log('\n▶ Step 3: OpenFIGI 배치 조회');
    const cusipList = needsFIGI.map(s => s.cusip);
    const figiResults = await batchResolveFIGI(cusipList);

    console.log(`  OpenFIGI 결과: ${Object.keys(figiResults).length}개 매핑 성공`);

    // DB + 캐시 업데이트
    let figiFixed = 0;
    for (const sec of needsFIGI) {
      const newTicker = figiResults[sec.cusip];
      if (newTicker && newTicker !== sec.ticker) {
        const { error: upErr } = await supabase
          .from('securities')
          .update({ ticker: newTicker })
          .eq('id', sec.id);
        if (!upErr) {
          figiFixed++;
          if (figiFixed <= 15) console.log(`  🔧 ${sec.ticker} → ${newTicker} (${sec.name})`);
          cusipCache[sec.cusip] = { ticker: newTicker, name: sec.name };
        }
      }
    }
    if (figiFixed > 15) console.log(`  ... 외 ${figiFixed - 15}개 추가 수정`);
    console.log(`  ✅ OpenFIGI 보정: ${figiFixed}개 수정됨`);
  }

  // 4) 캐시 저장
  writeFileSync(CUSIP_FILE, JSON.stringify(cusipCache, null, 2));

  // 5) 결과 요약
  console.log('\n' + '═'.repeat(50));

  // 최종 상태 확인
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
    console.log('✅ 모든 티커가 정상입니다!');
  }

  // CPNG 확인
  const { data: cpngCheck } = await supabase
    .from('securities')
    .select('cusip, ticker, name')
    .eq('cusip', '22266T109');

  if (cpngCheck && cpngCheck.length > 0) {
    console.log(`\n🔍 CPNG 확인: ${cpngCheck[0].ticker} (${cpngCheck[0].name})`);
  }

  console.log('\n✅ 티커 보정 완료!');
}

main().catch(console.error);
