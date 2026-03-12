import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { INVESTORS as MOCK_INVESTORS, HOLDINGS as MOCK_HOLDINGS, QUARTERLY_HISTORY as MOCK_QUARTERLY_HISTORY, QUARTERLY_ACTIVITY as MOCK_QUARTERLY_ACTIVITY } from '../data';

// ============================================================
// DB → 프론트엔드 형식 변환 유틸
// ============================================================

// DB name → string slug 매핑
const NAME_TO_SLUG = {
  'Warren Buffett': 'buffett',
  'Cathie Wood': 'cathie',
  'Stanley Druckenmiller': 'druckenmiller',
  'Ray Dalio': 'dalio',
  'Bill Ackman': 'ackman',
  'George Soros': 'soros',
};

const SLUG_TO_DBID = {}; // 런타임에 채워짐

function investorSlug(name) {
  return NAME_TO_SLUG[name] || name.toLowerCase().replace(/\s+/g, '_');
}

// "2024Q1" → "Q1'24" 변환
function formatQuarterLabel(q) {
  // 일별 인사이트 형식: 2026Q1-0306 → "Q1'26 (3/6)"
  const daily = q.match(/^(\d{4})Q(\d)-(\d{2})(\d{2})$/);
  if (daily) return `Q${daily[2]}'${daily[1].slice(2)} (${parseInt(daily[3])}/${parseInt(daily[4])})`;
  // 분기별 형식: 2026Q1 → "Q1'26"
  const m = q.match(/^(\d{4})Q(\d)$/);
  if (!m) return q;
  return `Q${m[2]}'${m[1].slice(2)}`;
}

// 정적 데이터에서 bioEn 가져오기 (DB에 bio_en이 없을 때 fallback)
const MOCK_BIO_EN = {};
MOCK_INVESTORS.forEach(inv => { if (inv.bioEn) MOCK_BIO_EN[inv.id] = inv.bioEn; });

// DB에 섹터 정보가 없는 종목을 위한 fallback 섹터 매핑
const SECTOR_FALLBACK = {
  // 헬스케어
  NTRA: '헬스케어', TEM: '헬스케어', EXAS: '헬스케어', TDOC: '헬스케어', VEEV: '헬스케어',
  ISRG: '헬스케어', DXCM: '헬스케어', ILMN: '헬스케어', NVTA: '헬스케어', BEAM: '헬스케어',
  CRSP: '헬스케어', TWST: '헬스케어', FATE: '헬스케어', PACB: '헬스케어', RPTX: '헬스케어',
  LLY: '헬스케어', UNH: '헬스케어', JNJ: '헬스케어', PFE: '헬스케어', ABBV: '헬스케어',
  TMO: '헬스케어', ABT: '헬스케어', MRK: '헬스케어', AMGN: '헬스케어', BMY: '헬스케어',
  // 기술
  AAPL: '기술', MSFT: '기술', GOOGL: '기술', GOOG: '기술', META: '기술',
  AMZN: '기술', NVDA: '기술', TSM: '기술', TSLA: '기술', AVGO: '기술',
  ORCL: '기술', CRM: '기술', AMD: '기술', ADBE: '기술', INTC: '기술',
  QCOM: '기술', NOW: '기술', SHOP: '기술', SQ: '기술', ROKU: '기술',
  SNOW: '기술', PLTR: '기술', PATH: '기술', U: '기술', TWLO: '기술',
  COIN: '기술', HOOD: '기술', NET: '기술', DDOG: '기술', ZS: '기술',
  // 금융
  BRK: '금융', JPM: '금융', V: '금융', MA: '금융', BAC: '금융',
  WFC: '금융', GS: '금융', MS: '금융', AXP: '금융', BLK: '금융',
  SCHW: '금융', C: '금융', USB: '금융', PNC: '금융', COF: '금융',
  // 경기소비재
  NKE: '경기소비재', MCD: '경기소비재', SBUX: '경기소비재', HD: '경기소비재', LOW: '경기소비재',
  TJX: '경기소비재', BKNG: '경기소비재', CMG: '경기소비재', ABNB: '경기소비재', LULU: '경기소비재',
  // 필수소비재
  KO: '필수소비재', PG: '필수소비재', PEP: '필수소비재', WMT: '필수소비재', COST: '필수소비재',
  PM: '필수소비재', MO: '필수소비재', KHC: '필수소비재', CL: '필수소비재',
  // 산업
  CAT: '산업', DE: '산업', UPS: '산업', RTX: '산업', HON: '산업',
  BA: '산업', LMT: '산업', GE: '산업', MMM: '산업', UNP: '산업',
  // 에너지
  XOM: '에너지', CVX: '에너지', COP: '에너지', SLB: '에너지', EOG: '에너지',
  OXY: '에너지', PSX: '에너지', MPC: '에너지', VLO: '에너지',
  // 통신
  DIS: '통신', NFLX: '통신', CMCSA: '통신', T: '통신', VZ: '통신', TMUS: '통신',
  // 유틸리티
  NEE: '유틸리티', DUK: '유틸리티', SO: '유틸리티', D: '유틸리티',
  // 부동산
  AMT: '부동산', PLD: '부동산', CCI: '부동산', EQIX: '부동산', SPG: '부동산',
  // 원자재
  LIN: '원자재', APD: '원자재', FCX: '원자재', NEM: '원자재',
};

// DB investor → 프론트엔드 형식
function mapInvestor(dbInv, metrics, holdingsAum) {
  const slug = investorSlug(dbInv.name);
  SLUG_TO_DBID[slug] = dbInv.id;

  // metrics에서 실제 값 가져오기
  const m = metrics[dbInv.id] || {};

  // AUM: holdings 데이터에서 직접 계산
  // SEC 13F filing에 따라 value가 $1000 단위 또는 실제 달러 단위일 수 있음
  // 합산값이 10억($1000 단위로 $1T) 이상이면 실제 달러 단위로 판단
  const aumFromHoldings = holdingsAum[dbInv.id] || 0;
  const isActualDollars = aumFromHoldings > 1_000_000_000;
  const aumB = isActualDollars
    ? aumFromHoldings / 1_000_000_000  // 실제 달러 → $B
    : aumFromHoldings / 1_000_000;     // $1000 단위 → $B

  return {
    id: slug,
    dbId: dbInv.id,
    name: dbInv.name,
    nameKo: dbInv.name_ko,
    fund: dbInv.fund_name,
    fundKo: dbInv.fund_name_ko,
    style: dbInv.style,
    color: dbInv.color,
    gradient: dbInv.gradient,
    avatar: dbInv.avatar,
    bio: dbInv.bio || '',
    bioEn: dbInv.bio_en || MOCK_BIO_EN[slug] || '',
    founded: dbInv.founded_year,
    aum: Math.round(aumB * 10) / 10, // 소수점 1자리
    metrics: {
      concentration: m.concentration || 0,
      sectorCount: m.sector_count || 0,
      holdingCount: m.holding_count || 0,
      topHoldingPct: m.top_holding_pct || 0,
      qoqChange: m.qoq_change || 0,
    },
  };
}

// HTML 엔티티 디코딩 (&amp; → &, &lt; → < 등)
function decodeHtmlEntities(str) {
  if (!str) return str;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// DB holding → 프론트엔드 형식
// isActualDollars: 해당 투자자의 value가 실제 달러 단위인지 여부
function mapHolding(dbHolding, isActualDollars) {
  const sec = dbHolding.securities || {};
  // ticker가 없거나 CUSIP 형태(6자리+숫자)인 경우 이름에서 약어 생성
  let ticker = sec.ticker || '';
  if (!ticker || /^\d{5,}/.test(ticker)) {
    // ticker가 없으면 이름의 첫 4글자를 대문자로
    const name = sec.name || dbHolding.issuer_name || 'N/A';
    ticker = name.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'N/A';
  }
  const divisor = isActualDollars ? 1_000_000_000 : 1_000_000;
  return {
    ticker,
    name: decodeHtmlEntities(sec.name_ko || sec.name || 'Unknown'),
    nameEn: decodeHtmlEntities(sec.name || 'Unknown'),
    shares: dbHolding.shares || 0,
    value: dbHolding.value ? dbHolding.value / divisor : 0, // → $B 단위
    pct: dbHolding.pct_of_portfolio || 0,
    sector: (() => {
      const dbSector = (sec.sector_ko && sec.sector_ko.trim()) || (sec.sector && sec.sector.trim()) || '';
      // DB에 "기타"/"Other"로 들어있거나 비어있으면 fallback 사용
      if (!dbSector || dbSector === '기타' || dbSector === 'Other') {
        return SECTOR_FALLBACK[ticker] || dbSector || '기타';
      }
      return dbSector;
    })(),
    change: 0, // 변동은 별도 쿼리 필요
  };
}

// ============================================================
// DataContext
// ============================================================
const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [investors, setInvestors] = useState(null);
  const [holdings, setHoldings] = useState(null);
  const [quarterlyHistory, setQuarterlyHistory] = useState(null);
  const [quarterlyActivity, setQuarterlyActivity] = useState(null);
  const [latestQuarter, setLatestQuarter] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');
  const [arkDailyTrades, setArkDailyTrades] = useState([]);
  const [aiInsights, setAiInsights] = useState({});
  const [stockPrices, setStockPrices] = useState({});  // { ticker: { current, quarterEnd, changePct } }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        // 1. 투자자 목록
        const { data: dbInvestors, error: invErr } = await supabase
          .from('investors')
          .select('*')
          .eq('is_active', true)
          .order('id');

        if (cancelled) return;
        if (invErr) throw invErr;
        if (!dbInvestors || dbInvestors.length === 0) throw new Error('No investors');

        // ID → slug 맵 미리 구축
        const idToSlug = {};
        dbInvestors.forEach(inv => {
          idToSlug[inv.id] = investorSlug(inv.name);
        });

        // 2. investor_metrics (전체 분기)
        const { data: dbMetrics } = await supabase
          .from('investor_metrics')
          .select('*')
          .order('quarter', { ascending: true });

        // 투자자별 최신 메트릭만 추출
        const metricsMap = {};
        (dbMetrics || []).forEach(m => {
          metricsMap[m.investor_id] = m; // 오름차순이므로 마지막이 최신
        });

        if (cancelled) return;
        // 3. 모든 투자자의 최신 holdings
        const { data: allFilings } = await supabase
          .from('filings')
          .select('id, investor_id, quarter, parsed_at, accession_no')
          .order('report_date', { ascending: false });

        const latestFilingByInvestor = {};
        let maxQuarter = '';
        let maxParsedAt = '';
        (allFilings || []).forEach(f => {
          if (!latestFilingByInvestor[f.investor_id]) {
            latestFilingByInvestor[f.investor_id] = f;
          }
          // ARK 일별 데이터(캐시 우드)는 최신 분기 계산에서 제외 — 13F 기준만 사용
          const isArkDaily = f.accession_no && f.accession_no.startsWith('ARK-');
          if (!isArkDaily && f.quarter > maxQuarter) maxQuarter = f.quarter;
          if (f.parsed_at && f.parsed_at > maxParsedAt) maxParsedAt = f.parsed_at;
        });

        setLatestQuarter(maxQuarter);
        setLastUpdatedAt(maxParsedAt);

        // 투자자별로 개별 holdings 쿼리 (Supabase 1000행 기본 제한 우회)
        const allDbHoldings = [];
        const holdingsAum = {};
        const investorDollarUnit = {}; // 투자자별 단위 감지

        for (const inv of dbInvestors) {
          const filing = latestFilingByInvestor[inv.id];
          if (!filing) continue;

          const { data: invHoldings, error: hErr } = await supabase
            .from('holdings')
            .select(`
              *,
              securities (ticker, name, name_ko, sector, sector_ko)
            `)
            .eq('filing_id', filing.id)
            .order('value', { ascending: false })
            .limit(2000); // 달리오 1040종목 대응

          if (hErr) { console.warn(`holdings 쿼리 실패 (${inv.name}):`, hErr.message); continue; }

          let aumSum = 0;
          (invHoldings || []).forEach(h => { aumSum += (h.value || 0); });
          holdingsAum[inv.id] = aumSum;
          // 합산값이 10억 이상이면 실제 달러 단위로 판단 ($1000 단위로 $1T 이상은 비현실적)
          const isActual = aumSum > 1_000_000_000;
          investorDollarUnit[inv.id] = isActual;
          allDbHoldings.push(...(invHoldings || []).map(h => ({ ...h, _isActualDollars: isActual })));

          const divisor = isActual ? 1_000_000_000 : 1_000_000;
          console.log(`[DataProvider] ${inv.name}: ${invHoldings?.length || 0}종목, rawAum=${aumSum}, aumB=${(aumSum / divisor).toFixed(1)}, unit=${isActual ? '$' : '$K'}`);
        }

        // 5. 투자자 변환
        const mappedInvestors = dbInvestors.map(inv => mapInvestor(inv, metricsMap, holdingsAum));

        // 5-1. Holdings 매핑 + 같은 ticker 통합 (share class dedup)
        const rawMappedHoldings = {};
        mappedInvestors.forEach(inv => { rawMappedHoldings[inv.id] = []; });
        allDbHoldings.forEach(h => {
          const inv = mappedInvestors.find(i => i.dbId === h.investor_id);
          if (inv) rawMappedHoldings[inv.id].push(mapHolding(h, h._isActualDollars));
        });

        const mappedHoldings = {};
        Object.entries(rawMappedHoldings).forEach(([invId, holdings]) => {
          const dedupMap = new Map();
          holdings.forEach(h => {
            if (dedupMap.has(h.ticker)) {
              const ex = dedupMap.get(h.ticker);
              ex.value += h.value;
              ex.shares += h.shares;
              ex.pct = Math.round((ex.pct + h.pct) * 100) / 100;
              if (h.change && h.change !== 0) ex.change = h.change;
            } else {
              dedupMap.set(h.ticker, { ...h });
            }
          });
          mappedHoldings[invId] = [...dedupMap.values()];
        });

        // 5-2. 투자자 metrics도 dedup된 종목수로 업데이트
        mappedInvestors.forEach(inv => {
          inv.metrics.holdingCount = mappedHoldings[inv.id]?.length || 0;
        });

        // 6. QUARTERLY_HISTORY 빌드 (investor_metrics에서)
        // Step 1: 투자자별로 raw 값 수집
        const qHistoryRaw = {};
        (dbMetrics || []).forEach(m => {
          const slug = idToSlug[m.investor_id];
          if (!slug || !m.total_aum) return;
          if (!qHistoryRaw[slug]) qHistoryRaw[slug] = [];
          // 분기별로 개별 단위 감지: total_aum이 10억 이상이면 실제 달러
          const isActual = m.total_aum > 1_000_000_000;
          const divisor = isActual ? 1_000_000_000 : 1_000_000;
          qHistoryRaw[slug].push({
            q: formatQuarterLabel(m.quarter),
            value: Math.round(m.total_aum / divisor * 10) / 10, // → $B
          });
        });
        // Step 2: 이상치 필터 — 중앙값 대비 너무 작거나(10% 미만) 너무 큰(300% 초과) 값 제거
        const qHistory = {};
        Object.keys(qHistoryRaw).forEach(slug => {
          const arr = qHistoryRaw[slug];
          if (arr.length < 3) { qHistory[slug] = arr; return; }
          const sorted = [...arr].map(a => a.value).sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          const lowThreshold = median * 0.1;
          const highThreshold = median * 3;
          qHistory[slug] = arr.filter(a => a.value >= lowThreshold && a.value <= highThreshold);
        });

        // 7. QUARTERLY_ACTIVITY 빌드 (holding_changes에서 — 투자자별 개별 쿼리)
        let dbChanges = [];
        for (const inv of dbInvestors) {
          const { data: invChanges, error: chErr } = await supabase
            .from('holding_changes')
            .select(`
              investor_id, quarter, change_type, pct_change,
              securities (ticker, name, name_ko)
            `)
            .eq('investor_id', inv.id)
            .order('quarter', { ascending: false })
            .limit(3000);

          if (chErr) { console.warn(`holding_changes 실패 (${inv.name}):`, chErr.message); continue; }
          if (invChanges?.length) {
            dbChanges.push(...invChanges);
            console.log(`[DataProvider] ${inv.name}: ${invChanges.length}개 변동 기록`);
          }
        }

        const qActivity = {};
        (dbChanges || []).forEach(c => {
          const slug = idToSlug[c.investor_id];
          if (!slug) return;
          if (!qActivity[slug]) qActivity[slug] = {};
          const qLabel = formatQuarterLabel(c.quarter);
          if (!qActivity[slug][qLabel]) qActivity[slug][qLabel] = [];

          const sec = c.securities || {};
          let ticker = sec.ticker || '';
          if (!ticker || /^\d{5,}/.test(ticker)) {
            ticker = (sec.name || '').replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'N/A';
          }

          // 같은 분기 내 동일 ticker 중복 방지 (share class 통합)
          const existing = qActivity[slug][qLabel].find(a => a.ticker === ticker);
          if (existing) {
            // pctChange가 더 큰 쪽 유지
            if (Math.abs(c.pct_change || 0) > Math.abs(existing.pctChange)) {
              existing.pctChange = c.pct_change || 0;
              existing.type = c.change_type;
            }
          } else {
            qActivity[slug][qLabel].push({
              ticker,
              name: decodeHtmlEntities(sec.name_ko || sec.name || 'Unknown'),
              type: c.change_type, // 'new', 'buy', 'sell', 'exit'
              pctChange: c.pct_change || 0,
            });
          }
        });

        // 포맷 변환: { slug: { "Q1'24": [...] } } → { slug: [{ q, actions }] }
        const qActivityFormatted = {};
        Object.keys(qActivity).forEach(slug => {
          qActivityFormatted[slug] = Object.entries(qActivity[slug])
            .map(([q, actions]) => ({
              q,
              actions: actions.sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange)).slice(0, 10),
            }));
        });

        // 7-1. 보유 종목의 change 필드 채우기 (최신 분기 holding_changes 데이터 활용)
        // holding_changes에서 각 투자자의 최신 분기 변동률을 holdings에 매핑
        const latestChangeByInvestor = {};  // { slug: { ticker: pctChange } }
        (dbChanges || []).forEach(c => {
          const slug = idToSlug[c.investor_id];
          if (!slug) return;
          const sec = c.securities || {};
          let ticker = sec.ticker || '';
          if (!ticker || /^\d{5,}/.test(ticker)) return;
          const qLabel = formatQuarterLabel(c.quarter);

          if (!latestChangeByInvestor[slug]) latestChangeByInvestor[slug] = { q: '', changes: {} };
          const inv = latestChangeByInvestor[slug];
          // 최신 분기만 유지
          if (qLabel > inv.q) {
            inv.q = qLabel;
            inv.changes = {};
          }
          if (qLabel === inv.q) {
            // 같은 ticker 중 더 큰 변동 유지
            if (!inv.changes[ticker] || Math.abs(c.pct_change || 0) > Math.abs(inv.changes[ticker])) {
              inv.changes[ticker] = c.pct_change || 0;
            }
          }
        });

        // mappedHoldings에 change 값 주입
        Object.entries(mappedHoldings).forEach(([invId, holdings]) => {
          const inv = mappedInvestors.find(i => i.id === invId);
          const slug = inv?.id;
          const changeMap = latestChangeByInvestor[slug]?.changes || {};
          holdings.forEach(h => {
            if (changeMap[h.ticker] !== undefined) {
              h.change = changeMap[h.ticker];
            }
          });
        });

        // 8. ARK 일별 매매 내역 로드 (최근 90일)
        let arkTrades = [];
        try {
          const { data: rawTrades, error: arkErr } = await supabase
            .from('ark_daily_trades')
            .select('*')
            .order('trade_date', { ascending: false })
            .limit(500);

          if (!arkErr && rawTrades?.length) {
            // 날짜별 그룹핑
            const byDate = {};
            rawTrades.forEach(t => {
              const d = t.trade_date;
              if (!byDate[d]) byDate[d] = [];
              byDate[d].push({
                ticker: t.ticker,
                company: t.company,
                direction: t.direction,
                sharesChange: t.shares_change,
                weightToday: t.weight_today,
                weightPrev: t.weight_prev,
                funds: t.funds,
                isNew: t.is_new,
                isExit: t.is_exit,
              });
            });
            // 날짜 내림차순 배열로 변환
            arkTrades = Object.entries(byDate)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([date, trades]) => ({
                date,
                trades: trades.sort((a, b) => Math.abs(b.sharesChange) - Math.abs(a.sharesChange)),
              }));
            console.log(`[DataProvider] ARK 일별 매매: ${rawTrades.length}건 (${arkTrades.length}일)`);
          }
        } catch (e) {
          console.warn('ARK 일별 매매 로드 실패:', e.message);
        }

        // 9. AI 인사이트 로드 — 투자자별 모든 날짜/분기 저장
        let aiInsightsMap = {};
        try {
          const { data: rawInsights, error: aiErr } = await supabase
            .from('ai_insights')
            .select('investor_id, quarter, insights, generated_at')
            .order('generated_at', { ascending: false });

          if (!aiErr && rawInsights?.length) {
            rawInsights.forEach(row => {
              const slug = idToSlug[row.investor_id];
              if (!slug) return;
              if (!aiInsightsMap[slug]) aiInsightsMap[slug] = {};
              // quarter 키별로 저장 (예: "2026Q1-0309", "2025Q4")
              const qKey = row.quarter;
              if (!aiInsightsMap[slug][qKey]) {
                aiInsightsMap[slug][qKey] = {
                  quarter: formatQuarterLabel(row.quarter),
                  quarterRaw: row.quarter,
                  insights: row.insights || [],
                  generatedAt: row.generated_at,
                };
              }
            });
            // 각 투자자별 최신 인사이트를 _latest에 저장
            Object.keys(aiInsightsMap).forEach(slug => {
              const entries = Object.values(aiInsightsMap[slug]);
              if (entries.length) {
                const latest = entries.sort((a, b) =>
                  new Date(b.generatedAt) - new Date(a.generatedAt)
                )[0];
                aiInsightsMap[slug]._latest = latest;
              }
            });
            console.log(`[DataProvider] AI 인사이트: ${Object.keys(aiInsightsMap).length}명 로드`);
          }
        } catch (e) {
          console.warn('AI 인사이트 로드 실패:', e.message);
        }

        // ===== stock_prices: 공시 후 성과 계산 =====
        let stockPricesMap = {};
        try {
          // 최신 분기 말 날짜 계산
          let priceQuarter = maxQuarter;
          const qMatch = priceQuarter.match(/^(\d{4})Q(\d)$/);
          if (qMatch) {
            let qYear = parseInt(qMatch[1]);
            let qNum = parseInt(qMatch[2]);
            let qEndDates = { 1: `${qYear}-03-31`, 2: `${qYear}-06-30`, 3: `${qYear}-09-30`, 4: `${qYear}-12-31` };
            let qEndDate = qEndDates[qNum];

            // 분기 말이 미래면 이전 분기 사용
            const today = new Date().toISOString().split('T')[0];
            if (qEndDate > today) {
              if (qNum === 1) { qYear--; qNum = 4; } else { qNum--; }
              qEndDates = { 1: `${qYear}-03-31`, 2: `${qYear}-06-30`, 3: `${qYear}-09-30`, 4: `${qYear}-12-31` };
              qEndDate = qEndDates[qNum];
              priceQuarter = `${qYear}Q${qNum}`;
              console.log(`[DataProvider] 분기 말이 미래 → 이전 분기 사용: ${priceQuarter} (${qEndDate})`);
            }

            // 모든 보유 종목 티커 수집
            const allTickers = new Set();
            Object.values(mappedHoldings).forEach(arr => arr.forEach(h => allTickers.add(h.ticker)));

            if (allTickers.size > 0 && qEndDate) {
              // 최신 시세 (가장 최근 날짜)
              const { data: latestPrices } = await supabase
                .from('stock_prices')
                .select('ticker, close_price, price_date, change_pct')
                .order('price_date', { ascending: false })
                .limit(allTickers.size * 2);

              // 분기 말 시세
              // 분기 말 당일 or ±3일 이내 가장 가까운 날짜
              const { data: quarterPrices } = await supabase
                .from('stock_prices')
                .select('ticker, close_price, price_date')
                .gte('price_date', (() => { const d = new Date(qEndDate); d.setDate(d.getDate() - 5); return d.toISOString().split('T')[0]; })())
                .lte('price_date', (() => { const d = new Date(qEndDate); d.setDate(d.getDate() + 3); return d.toISOString().split('T')[0]; })())
                .order('price_date', { ascending: false });

              // 티커별 최신 시세 매핑
              const currentMap = {};
              (latestPrices || []).forEach(p => {
                if (!currentMap[p.ticker]) currentMap[p.ticker] = p;
              });

              // 티커별 분기 말 시세 매핑
              const quarterMap = {};
              (quarterPrices || []).forEach(p => {
                if (!quarterMap[p.ticker]) quarterMap[p.ticker] = p;
              });

              // 공시 후 성과 계산
              for (const ticker of allTickers) {
                const curr = currentMap[ticker];
                const qEnd = quarterMap[ticker];
                if (curr) {
                  const currentPrice = parseFloat(curr.close_price);
                  const quarterEndPrice = qEnd ? parseFloat(qEnd.close_price) : null;
                  const sinceFiling = quarterEndPrice && quarterEndPrice > 0
                    ? ((currentPrice - quarterEndPrice) / quarterEndPrice) * 100
                    : null;

                  stockPricesMap[ticker] = {
                    current: currentPrice,
                    date: curr.price_date,
                    dailyChange: curr.change_pct ? parseFloat(curr.change_pct) : null,
                    quarterEnd: quarterEndPrice,
                    quarterEndDate: qEnd?.price_date || null,
                    sinceFiling: sinceFiling !== null ? Math.round(sinceFiling * 100) / 100 : null,
                  };
                }
              }
              console.log(`[DataProvider] 시세 데이터: ${Object.keys(stockPricesMap).length}개 종목`);
            }
          }
        } catch (e) {
          console.warn('시세 데이터 로드 실패:', e.message);
        }

        if (cancelled) return;
        setInvestors(mappedInvestors);
        setHoldings(mappedHoldings);
        setQuarterlyHistory(qHistory);
        setQuarterlyActivity(qActivityFormatted);
        setArkDailyTrades(arkTrades);
        setAiInsights(aiInsightsMap);
        setStockPrices(stockPricesMap);
        setUsingMock(false);
        setLoading(false);

      } catch (err) {
        if (cancelled) return;
        console.error('Supabase 로드 실패, mock 데이터로 전환:', err.message);
        // Supabase 실패 시 mock 데이터로 fallback → 빈 화면 방지
        setInvestors(MOCK_INVESTORS);
        setHoldings(MOCK_HOLDINGS);
        setQuarterlyHistory(MOCK_QUARTERLY_HISTORY);
        setQuarterlyActivity(MOCK_QUARTERLY_ACTIVITY);
        setLatestQuarter('2025Q4');
        setError(err.message);
        setUsingMock(true);
        setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(() => ({
    investors: investors || [],
    holdings: holdings || {},
    quarterlyHistory: quarterlyHistory || {},
    quarterlyActivity: quarterlyActivity || {},
    arkDailyTrades,
    aiInsights,
    stockPrices,
    latestQuarter,
    lastUpdatedAt,
    loading,
    error,
    usingMock,
    getDbId: (slug) => SLUG_TO_DBID[slug] || null,
  }), [investors, holdings, quarterlyHistory, quarterlyActivity, arkDailyTrades, aiInsights, stockPrices, latestQuarter, lastUpdatedAt, loading, error, usingMock]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

export default DataContext;
