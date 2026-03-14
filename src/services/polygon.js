// ========== POLYGON.IO API SERVICE ==========
// $29/mo plan: unlimited calls, 15-min delayed data
// Docs: https://polygon.io/docs/stocks

const POLYGON_BASE = 'https://api.polygon.io';
const API_KEY = import.meta.env.VITE_POLYGON_API_KEY || '';

// ---- In-memory cache (separate from main api.js) ----
const cache = new Map();
const CACHE_TTL = {
  ticker_details: 24 * 60 * 60 * 1000,  // 24h — company info rarely changes
  snapshot: 60 * 1000,                    // 1min — price data
  aggregates: 5 * 60 * 1000,             // 5min — chart bars
  prev_close: 60 * 60 * 1000,            // 1h — previous close
};

function getCached(key, ttl) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttl) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// ---- Fetch helper ----
async function polygonFetch(endpoint, cacheTtl = 60000) {
  const cacheKey = endpoint;
  const cached = getCached(cacheKey, cacheTtl);
  if (cached) return cached;

  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${POLYGON_BASE}${endpoint}${separator}apiKey=${API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`Polygon ${res.status}: ${res.statusText}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  setCache(cacheKey, data);
  return data;
}

// ========== API ENDPOINTS ==========

/**
 * 종목 기본 정보 (회사명, 로고, 섹터, 시총, 설명 등)
 * GET /v3/reference/tickers/{ticker}
 */
export async function getTickerDetails(ticker) {
  const data = await polygonFetch(
    `/v3/reference/tickers/${ticker.toUpperCase()}`,
    CACHE_TTL.ticker_details
  );
  return data.results || null;
}

/**
 * 현재 가격 스냅샷 (현재가, 등락률, 거래량 등)
 * GET /v2/snapshot/locale/us/markets/stocks/tickers/{ticker}
 */
export async function getSnapshot(ticker) {
  const data = await polygonFetch(
    `/v2/snapshot/locale/us/markets/stocks/tickers/${ticker.toUpperCase()}`,
    CACHE_TTL.snapshot
  );
  return data.ticker || null;
}

/**
 * 차트 데이터 (OHLCV bars)
 * GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}
 * @param {string} ticker - 종목 심볼
 * @param {string} timespan - 'minute' | 'hour' | 'day' | 'week' | 'month'
 * @param {number} multiplier - 타임스팬 배수 (e.g. 5 = 5분봉)
 * @param {string} from - YYYY-MM-DD
 * @param {string} to - YYYY-MM-DD
 * @param {boolean} adjusted - 수정주가 여부
 */
export async function getAggregates(ticker, timespan = 'day', multiplier = 1, from, to, adjusted = true) {
  const data = await polygonFetch(
    `/v2/aggs/ticker/${ticker.toUpperCase()}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=${adjusted}&sort=asc&limit=50000`,
    CACHE_TTL.aggregates
  );
  return data.results || [];
}

/**
 * 전일 종가
 * GET /v2/aggs/ticker/{ticker}/prev
 */
export async function getPreviousClose(ticker) {
  const data = await polygonFetch(
    `/v2/aggs/ticker/${ticker.toUpperCase()}/prev?adjusted=true`,
    CACHE_TTL.prev_close
  );
  return data.results?.[0] || null;
}

// ========== HELPER: 기간별 차트 데이터 가져오기 ==========

/**
 * 기간 프리셋 + 선택적 타임프레임으로 차트 데이터 가져오기
 * @param {string} ticker
 * @param {'1D'|'1W'|'1M'|'3M'|'1Y'|'5Y'} range
 * @param {'15m'|'30m'|'1h'|'1d'|'1w'|null} timeframe - optional, overrides auto timeframe
 */
export async function getChartData(ticker, range = '1Y', timeframe = null) {
  const now = new Date();
  const to = formatDate(now);
  let from, timespan, multiplier;

  // Determine date range based on period
  switch (range) {
    case '1D': {
      // Go back 5 days to handle weekends/holidays — filter to last trading day later
      const d = new Date(now);
      d.setDate(d.getDate() - 5);
      from = formatDate(d);
      break;
    }
    case '1W': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      from = formatDate(d);
      break;
    }
    case '1M': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      from = formatDate(d);
      break;
    }
    case '3M': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      from = formatDate(d);
      break;
    }
    case '1Y': {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      from = formatDate(d);
      break;
    }
    case '5Y': {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 5);
      from = formatDate(d);
      break;
    }
    default: {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      from = formatDate(d);
    }
  }

  // Determine timeframe (timespan + multiplier)
  if (timeframe) {
    // Custom timeframe specified
    switch (timeframe) {
      case '15m':
        timespan = 'minute';
        multiplier = 15;
        break;
      case '30m':
        timespan = 'minute';
        multiplier = 30;
        break;
      case '1h':
        timespan = 'hour';
        multiplier = 1;
        break;
      case '1d':
        timespan = 'day';
        multiplier = 1;
        break;
      case '1w':
        timespan = 'week';
        multiplier = 1;
        break;
      default:
        // Fallback to auto
        timespan = 'day';
        multiplier = 1;
    }
  } else {
    // Auto timeframe based on range (smart default)
    switch (range) {
      case '1D':
        timespan = 'minute';
        multiplier = 15;
        break;
      case '1W':
        timespan = 'minute';
        multiplier = 30;
        break;
      case '1M':
        timespan = 'hour';
        multiplier = 1;
        break;
      case '3M':
      case '1Y':
        timespan = 'day';
        multiplier = 1;
        break;
      case '5Y':
        timespan = 'week';
        multiplier = 1;
        break;
      default:
        timespan = 'day';
        multiplier = 1;
    }
  }

  let results = await getAggregates(ticker, timespan, multiplier, from, to);

  // For intraday '1D' range, keep only the last trading day's data
  if (range === '1D' && results.length > 0) {
    const lastTs = results[results.length - 1].t;
    const lastDateStr = new Date(lastTs).toISOString().split('T')[0];
    results = results.filter(bar => new Date(bar.t).toISOString().split('T')[0] === lastDateStr);
  }

  return results;
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

// ========== EXPORT ==========
const polygon = {
  getTickerDetails,
  getSnapshot,
  getAggregates,
  getPreviousClose,
  getChartData,
};

export default polygon;
