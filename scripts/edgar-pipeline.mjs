#!/usr/bin/env node
/**
 * FolioObs — SEC EDGAR 13F 데이터 파이프라인
 *
 * 사용법:
 *   node scripts/edgar-pipeline.mjs
 *
 * 이 스크립트가 하는 일:
 *   1. SEC EDGAR에서 투자자별 13F 제출 기록 조회
 *   2. 최신 13F XML 파싱하여 보유종목 추출
 *   3. CUSIP → 티커 매핑
 *   4. FolioObs 앱이 쓸 수 있는 JSON 파일로 출력
 *
 * 필요한 것: Node.js 18+ (fetch 내장)
 * API 키: 불필요 (SEC EDGAR는 이메일만 있으면 됨)
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'src', 'data', 'generated');

// ============================================================
// 설정 — 여기만 수정하면 됨
// ============================================================

// ⚠️ 본인 이메일로 반드시 변경!
const USER_AGENT = 'FolioObs ehsgml12345@gmail.com';

// 추적할 투자자 목록 (CIK 번호)
// SEC EDGAR에서 CIK를 찾는 법: https://www.sec.gov/cgi-bin/browse-edgar?company=berkshire&CIK=&type=13F&dateb=&owner=include&count=10&search_text=&action=getcompany
const TRACKED_INVESTORS = [
  {
    cik: '0001067983',
    name: 'Warren Buffett',
    nameKo: '워렌 버핏',
    fund: 'Berkshire Hathaway',
    fundKo: '버크셔 해서웨이',
    style: '가치투자',
    color: '#6366F1',
    gradient: 'linear-gradient(135deg, #6366F1, #818CF8)',
    avatar: 'WB',
  },
  {
    cik: '0001599922',  // ARK Investment Management
    name: 'Cathie Wood',
    nameKo: '캐시 우드',
    fund: 'ARK Invest',
    fundKo: 'ARK 인베스트',
    style: '성장주투자',
    color: '#06B6D4',
    gradient: 'linear-gradient(135deg, #06B6D4, #22D3EE)',
    avatar: 'CW',
  },
  {
    cik: '0001536411',  // Duquesne Family Office
    name: 'Stanley Druckenmiller',
    nameKo: '스탠리 드러켄밀러',
    fund: 'Duquesne Family Office',
    fundKo: '듀케인 패밀리 오피스',
    style: '매크로투자',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
    avatar: 'SD',
  },
  {
    cik: '0001350694',  // Bridgewater Associates
    name: 'Ray Dalio',
    nameKo: '레이 달리오',
    fund: 'Bridgewater Associates',
    fundKo: '브릿지워터 어소시에이츠',
    style: '분산투자',
    color: '#10B981',
    gradient: 'linear-gradient(135deg, #10B981, #34D399)',
    avatar: 'RD',
  },
  {
    cik: '0001336528',  // Pershing Square
    name: 'Bill Ackman',
    nameKo: '빌 애크먼',
    fund: 'Pershing Square',
    fundKo: '퍼싱 스퀘어',
    style: '행동주의투자',
    color: '#A855F7',
    gradient: 'linear-gradient(135deg, #A855F7, #C084FC)',
    avatar: 'BA',
  },
  {
    cik: '0001061768',  // Soros Fund Management
    name: 'George Soros',
    nameKo: '조지 소로스',
    fund: 'Soros Fund Management',
    fundKo: '소로스 펀드 매니지먼트',
    style: '매크로투자',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444, #F87171)',
    avatar: 'GS',
  },
];

// SEC API 요청 간격 (밀리초) — 초당 10건 제한 준수
const REQUEST_DELAY = 150;

// ============================================================
// CUSIP → 티커 매핑 캐시
// ============================================================
const CUSIP_CACHE_FILE = join(__dirname, '.cusip-cache.json');
let cusipCache = {};

function loadCusipCache() {
  try {
    if (existsSync(CUSIP_CACHE_FILE)) {
      cusipCache = JSON.parse(readFileSync(CUSIP_CACHE_FILE, 'utf-8'));
      console.log(`  캐시 로드: ${Object.keys(cusipCache).length}개 CUSIP 매핑`);
    }
  } catch (e) {
    cusipCache = {};
  }
}

function saveCusipCache() {
  writeFileSync(CUSIP_CACHE_FILE, JSON.stringify(cusipCache, null, 2));
}

// ============================================================
// SEC EDGAR API 호출
// ============================================================

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchSEC(url) {
  await sleep(REQUEST_DELAY);

  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json, text/xml, */*',
    },
  });

  if (!res.ok) {
    throw new Error(`SEC API 에러: ${res.status} ${res.statusText} — ${url}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('json')) {
    return { type: 'json', data: await res.json() };
  }
  return { type: 'text', data: await res.text() };
}

// ============================================================
// Step 1: 투자자별 최신 13F 파일링 정보 가져오기
// ============================================================

async function getLatestFilings(cik) {
  console.log(`  [${cik}] 제출 기록 조회 중...`);

  const { data } = await fetchSEC(
    `https://data.sec.gov/submissions/CIK${cik}.json`
  );

  const filings = data.filings?.recent || {};
  const forms = filings.form || [];
  const dates = filings.filingDate || [];
  const accessions = filings.accessionNumber || [];
  const primaryDocs = filings.primaryDocument || [];

  // 13F-HR 또는 13F-HR/A (수정본) 찾기
  const thirteenFs = [];
  for (let i = 0; i < forms.length; i++) {
    if (forms[i] === '13F-HR' || forms[i] === '13F-HR/A') {
      thirteenFs.push({
        form: forms[i],
        date: dates[i],
        accession: accessions[i],
        primaryDoc: primaryDocs[i],
        accessionClean: accessions[i].replace(/-/g, ''),
      });
    }
  }

  if (thirteenFs.length === 0) {
    console.log(`  [${cik}] ⚠️  13F 파일링이 없습니다.`);
    return [];
  }

  console.log(`  [${cik}] 13F 파일링 ${thirteenFs.length}개 발견 (최신: ${thirteenFs[0].date})`);
  return thirteenFs;
}

// ============================================================
// Step 2: 13F XML 파싱 — 보유종목 추출
// ============================================================

async function parse13FHoldings(cik, filing) {
  const accPath = filing.accession.replace(/-/g, '');

  // 13F 정보 테이블 (infotable.xml) 찾기
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik.replace(/^0+/, '')}/${accPath}/`;

  console.log(`  [${cik}] 파일 목록 조회: ${filing.date}`);
  const { data: indexHtml } = await fetchSEC(indexUrl);

  // infotable XML 파일명 찾기
  const xmlMatch = indexHtml.match(/href="([^"]*infotable[^"]*\.xml)"/i)
    || indexHtml.match(/href="([^"]*13[fF][^"]*\.xml)"/i)
    || indexHtml.match(/href="([^"]*information[^"]*table[^"]*\.xml)"/i);

  if (!xmlMatch) {
    // 대안: primary document 자체가 XML일 수 있음
    console.log(`  [${cik}] infotable XML 못 찾음, primary doc 시도`);
    const primaryUrl = `${indexUrl}${filing.primaryDoc}`;
    try {
      const { data: primaryData } = await fetchSEC(primaryUrl);
      return parseInfoTableXML(primaryData);
    } catch (e) {
      console.log(`  [${cik}] ⚠️  파싱 실패: ${e.message}`);
      return [];
    }
  }

  const xmlUrl = `${indexUrl}${xmlMatch[1]}`;
  console.log(`  [${cik}] XML 파싱 중: ${xmlMatch[1]}`);
  const { data: xmlData } = await fetchSEC(xmlUrl);

  return parseInfoTableXML(xmlData);
}

function parseInfoTableXML(xml) {
  const holdings = [];

  // <infoTable> 안의 각 <infoTable> 항목 파싱
  // SEC 13F XML 구조: <nameOfIssuer>, <cusip>, <value>, <shrsOrPrnAmt><sshPrnamt>
  const entries = xml.split(/<\/infoTable>/i);

  for (const entry of entries) {
    const name = extractTag(entry, 'nameOfIssuer');
    const cusip = extractTag(entry, 'cusip');
    const valueStr = extractTag(entry, 'value');
    const sharesStr = extractTag(entry, 'sshPrnamt') || extractTag(entry, 'sshPrnAmt');
    const putCall = extractTag(entry, 'putCall');

    if (!cusip || !valueStr) continue;

    holdings.push({
      cusip: cusip.trim(),
      name: name?.trim() || 'Unknown',
      value: parseInt(valueStr.replace(/,/g, ''), 10),  // 천 달러 단위
      shares: parseInt((sharesStr || '0').replace(/,/g, ''), 10),
      optionType: putCall?.trim() || null,
    });
  }

  console.log(`    → ${holdings.length}개 종목 파싱 완료`);
  return holdings;
}

function extractTag(text, tagName) {
  // 대소문자 무시, 네임스페이스 무시
  const regex = new RegExp(`<(?:[\\w]+:)?${tagName}[^>]*>([^<]*)<`, 'i');
  const match = text.match(regex);
  return match ? match[1] : null;
}

// ============================================================
// Step 3: CUSIP → 티커 매핑
// ============================================================

async function resolveTicker(cusip, name) {
  // 캐시에 있으면 바로 반환
  if (cusipCache[cusip]) return cusipCache[cusip];

  // OpenFIGI API로 CUSIP → 티커 조회 (무료, 키 불필요)
  try {
    await sleep(100);
    const res = await fetch('https://api.openfigi.com/v3/mapping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ idType: 'ID_CUSIP', idValue: cusip }]),
    });

    if (res.ok) {
      const data = await res.json();
      if (data[0]?.data?.[0]?.ticker) {
        const info = data[0].data[0];
        cusipCache[cusip] = {
          ticker: info.ticker,
          name: info.name || name,
          exchange: info.exchCode || '',
          marketSector: info.marketSector || '',
        };
        return cusipCache[cusip];
      }
    }
  } catch (e) {
    // OpenFIGI 실패 시 종목명 기반 추정
  }

  // 매핑 실패 시 CUSIP 자체를 티커로 사용
  cusipCache[cusip] = { ticker: cusip, name, exchange: '', marketSector: '' };
  return cusipCache[cusip];
}

// ============================================================
// Step 4: 섹터 자동 분류
// ============================================================

const SECTOR_KEYWORDS = {
  '기술': ['APPLE', 'MICROSOFT', 'GOOGLE', 'ALPHABET', 'META', 'NVIDIA', 'AMD', 'INTEL', 'TESLA', 'AMAZON', 'SALESFORCE', 'ORACLE', 'ADOBE', 'TSMC', 'SAMSUNG', 'BROADCOM', 'QUALCOMM', 'CISCO', 'IBM', 'UBER', 'SNOWFLAKE', 'PALANTIR', 'COINBASE', 'BLOCK', 'ROKU', 'ZOOM', 'TWILIO', 'UIPATH', 'DRAFTKINGS'],
  '금융': ['BANK', 'GOLDMAN', 'MORGAN', 'JPMORGAN', 'WELLS FARGO', 'CITIGROUP', 'VISA', 'MASTERCARD', 'AMERICAN EXPRESS', 'CAPITAL ONE', 'SCHWAB', 'BLACKROCK', 'MOODY', 'S&P GLOBAL', 'MARSH', 'AON'],
  '헬스케어': ['PFIZER', 'JOHNSON', 'UNITEDHEALTH', 'ELI LILLY', 'MERCK', 'ABBVIE', 'AMGEN', 'GILEAD', 'MODERNA', 'BIONTECH', 'CRISPR', 'TELADOC', 'DAVITA', 'HUMANA', 'CENTENE'],
  '필수소비재': ['COCA-COLA', 'PEPSI', 'PROCTER', 'KRAFT', 'WALMART', 'COSTCO', 'COLGATE', 'MONDELEZ', 'GENERAL MILLS', 'KROGER', 'ESTEE'],
  '에너지': ['EXXON', 'CHEVRON', 'CONOCO', 'OCCIDENTAL', 'SHELL', 'BP ', 'MARATHON', 'HALLIBURTON', 'SCHLUMBERGER', 'PIONEER', 'DEVON'],
  '경기소비재': ['NIKE', 'STARBUCKS', 'MCDONALD', 'HOME DEPOT', 'LOWES', 'TARGET', 'TJX', 'BOOKING', 'HILTON', 'MARRIOTT', 'DISNEY'],
  '산업': ['CATERPILLAR', 'DEERE', 'HONEYWELL', 'UNION PACIFIC', 'GENERAL ELECTRIC', '3M', 'RAYTHEON', 'LOCKHEED', 'BOEING', 'EMERSON'],
  '원자재': ['GOLD', 'SILVER', 'NEWMONT', 'FREEPORT', 'NUCOR', 'BARRICK'],
  '채권': ['TREASURY', 'BOND', 'TIPS', 'ISHARES.*BOND', 'VANGUARD.*BOND', 'PIMCO'],
  '지수': ['S&P 500', 'SPDR', 'ISHARES.*CORE', 'VANGUARD.*INDEX', 'QQQ', 'INVESCO'],
};

function classifySector(name) {
  const upper = (name || '').toUpperCase();
  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    if (keywords.some(kw => upper.includes(kw) || new RegExp(kw).test(upper))) {
      return sector;
    }
  }
  return '기타';
}

// ============================================================
// Step 5: 분기별 변동 계산
// ============================================================

function computeChanges(currentHoldings, previousHoldings) {
  const prevMap = new Map(previousHoldings.map(h => [h.cusip, h]));
  const changes = [];

  for (const curr of currentHoldings) {
    const prev = prevMap.get(curr.cusip);
    if (!prev) {
      // 신규 매수
      changes.push({ ...curr, changeType: 'new', pctChange: 100 });
    } else {
      const pctChange = prev.shares > 0
        ? ((curr.shares - prev.shares) / prev.shares * 100)
        : 0;
      if (Math.abs(pctChange) > 1) {
        changes.push({
          ...curr,
          changeType: pctChange > 0 ? 'buy' : 'sell',
          pctChange: Math.round(pctChange * 10) / 10,
        });
      } else {
        changes.push({ ...curr, changeType: 'hold', pctChange: 0 });
      }
      prevMap.delete(curr.cusip);
    }
  }

  // 이전에 있었는데 현재 없는 종목 = 전량 매도
  for (const [cusip, prev] of prevMap) {
    changes.push({ ...prev, changeType: 'exit', pctChange: -100 });
  }

  return changes;
}

// ============================================================
// Step 6: FolioObs 앱 형식으로 변환 + JSON 출력
// ============================================================

function toFolioObsFormat(allData) {
  // investors.js 형식
  const investors = allData.map(d => ({
    id: d.config.name.toLowerCase().split(' ')[0].replace(/[^a-z]/g, '')
      || d.config.cik,
    name: d.config.name,
    nameKo: d.config.nameKo,
    fund: d.config.fund,
    fundKo: d.config.fundKo,
    style: d.config.style,
    color: d.config.color,
    gradient: d.config.gradient,
    avatar: d.config.avatar,
    aum: Math.round(d.totalValue / 1000),  // 천달러 → 10억달러(B)
    bio: '',
    founded: 0,
    metrics: {
      concentration: d.holdings.length > 0
        ? Math.round(d.holdings.slice(0, 10).reduce((s, h) => s + h.pctOfPortfolio, 0)) / 100
        : 0,
      sectorCount: new Set(d.holdings.map(h => h.sector)).size,
      holdingCount: d.holdings.length,
      topHoldingPct: d.holdings.length > 0 ? d.holdings[0].pctOfPortfolio : 0,
      qoqChange: 0,
    },
  }));

  // holdings.js 형식
  const holdings = {};
  allData.forEach(d => {
    const id = investors.find(i => i.nameKo === d.config.nameKo)?.id;
    if (!id) return;
    holdings[id] = d.holdings.slice(0, 30).map(h => ({
      ticker: h.ticker,
      name: h.nameKo || h.name,
      shares: h.shares,
      value: Math.round(h.value / 1000 * 10) / 10,  // 천달러 → 10억(B)
      pct: h.pctOfPortfolio,
      sector: h.sector,
      change: h.pctChange || 0,
    }));
  });

  return { investors, holdings };
}

// ============================================================
// 메인 실행
// ============================================================

async function main() {
  console.log('='.repeat(60));
  console.log('FolioObs — SEC EDGAR 13F 데이터 파이프라인');
  console.log('='.repeat(60));
  console.log(`User-Agent: ${USER_AGENT}`);
  console.log(`추적 투자자: ${TRACKED_INVESTORS.length}명`);
  console.log();

  loadCusipCache();

  const allData = [];

  for (const investor of TRACKED_INVESTORS) {
    console.log(`\n▶ ${investor.nameKo} (${investor.name})`);
    console.log(`  CIK: ${investor.cik}`);

    try {
      // 1. 최신 13F 파일링 목록
      const filings = await getLatestFilings(investor.cik);
      if (filings.length === 0) continue;

      // 최신 2개 (현재 + 이전 분기)
      const latest = filings[0];
      const previous = filings.length > 1 ? filings[1] : null;

      // 2. 현재 분기 보유종목 파싱
      const currentHoldings = await parse13FHoldings(investor.cik, latest);

      // 3. CUSIP → 티커 매핑
      console.log(`  [${investor.cik}] 티커 매핑 중 (${currentHoldings.length}개)...`);
      for (const h of currentHoldings) {
        const info = await resolveTicker(h.cusip, h.name);
        h.ticker = info.ticker;
        h.exchange = info.exchange;
      }

      // 4. 총 가치 계산 + 비중
      const totalValue = currentHoldings.reduce((s, h) => s + h.value, 0);
      const enriched = currentHoldings
        .map(h => ({
          ...h,
          sector: classifySector(h.name),
          pctOfPortfolio: Math.round(h.value / totalValue * 10000) / 100,
          nameKo: h.name,  // TODO: 한국어 번역 매핑 추가
        }))
        .sort((a, b) => b.value - a.value);

      // 5. 이전 분기와 비교 (변동 계산)
      let changes = enriched.map(h => ({ ...h, pctChange: 0, changeType: 'hold' }));
      if (previous) {
        console.log(`  [${investor.cik}] 이전 분기 비교 (${previous.date})...`);
        const prevHoldings = await parse13FHoldings(investor.cik, previous);
        changes = computeChanges(enriched, prevHoldings);

        // 변동 정보를 enriched에 머지
        const changeMap = new Map(changes.map(c => [c.cusip, c]));
        enriched.forEach(h => {
          const ch = changeMap.get(h.cusip);
          if (ch) {
            h.pctChange = ch.pctChange;
            h.changeType = ch.changeType;
          }
        });
      }

      allData.push({
        config: investor,
        filingDate: latest.date,
        totalValue,
        holdings: enriched,
        changes: changes.filter(c => c.changeType !== 'hold'),
      });

      console.log(`  ✅ ${investor.nameKo}: ${enriched.length}개 종목, $${(totalValue / 1000000).toFixed(1)}B`);

    } catch (err) {
      console.error(`  ❌ ${investor.nameKo} 실패: ${err.message}`);
    }
  }

  // 6. CUSIP 캐시 저장
  saveCusipCache();

  // 7. JSON 출력
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // FolioObs 형식 변환
  const { investors, holdings } = toFolioObsFormat(allData);

  // 원본 데이터 (전체)
  writeFileSync(
    join(OUTPUT_DIR, 'raw-filings.json'),
    JSON.stringify(allData, null, 2)
  );

  // FolioObs 앱용 데이터
  writeFileSync(
    join(OUTPUT_DIR, 'investors.json'),
    JSON.stringify(investors, null, 2)
  );
  writeFileSync(
    join(OUTPUT_DIR, 'holdings.json'),
    JSON.stringify(holdings, null, 2)
  );

  // 메타데이터
  const meta = {
    generatedAt: new Date().toISOString(),
    investorCount: allData.length,
    latestFiling: allData.map(d => ({ name: d.config.nameKo, date: d.filingDate })),
    totalHoldings: allData.reduce((s, d) => s + d.holdings.length, 0),
  };
  writeFileSync(
    join(OUTPUT_DIR, 'meta.json'),
    JSON.stringify(meta, null, 2)
  );

  console.log('\n' + '='.repeat(60));
  console.log('✅ 완료!');
  console.log(`   출력 경로: ${OUTPUT_DIR}/`);
  console.log(`   - raw-filings.json  (원본 전체 데이터)`);
  console.log(`   - investors.json    (앱용 투자자 데이터)`);
  console.log(`   - holdings.json     (앱용 보유종목 데이터)`);
  console.log(`   - meta.json         (메타 정보)`);
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('파이프라인 실행 실패:', err);
  process.exit(1);
});
