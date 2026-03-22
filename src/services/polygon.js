// ========== POLYGON.IO API SERVICE (via Edge Function Proxy) ==========
// API 키를 서버사이드에서만 사용 — 프론트엔드 노출 방지
// Docs: https://polygon.io/docs/stocks

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const PROXY_URL = `${SUPABASE_URL}/functions/v1/polygon-proxy`;

// ---- In-memory cache (separate from main api.js) ----
const cache = new Map();
const CACHE_TTL = {
  ticker_details: 24 * 60 * 60 * 1000,  // 24h — company info rarely changes
  snapshot: 60 * 1000,                    // 1min — price data
  aggregates: 5 * 60 * 1000,             // 5min — chart bars
  prev_close: 60 * 60 * 1000,            // 1h — previous close
  news: 10 * 60 * 1000,                  // 10min — news articles
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

// ---- Fetch helper (via Supabase Edge Function proxy) ----
async function polygonFetch(path, query = '', cacheTtl = 60000) {
  const cacheKey = `${path}?${query}`;
  const cached = getCached(cacheKey, cacheTtl);
  if (cached) return cached;

  const params = new URLSearchParams({ path });
  if (query) params.set('query', query);

  const res = await fetch(`${PROXY_URL}?${params.toString()}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

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
    '',
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
    '',
    CACHE_TTL.snapshot
  );
  return data.ticker || null;
}

/**
 * 차트 데이터 (OHLCV bars)
 */
export async function getAggregates(ticker, timespan = 'day', multiplier = 1, from, to, adjusted = true) {
  const data = await polygonFetch(
    `/v2/aggs/ticker/${ticker.toUpperCase()}/range/${multiplier}/${timespan}/${from}/${to}`,
    `adjusted=${adjusted}&sort=asc&limit=50000`,
    CACHE_TTL.aggregates
  );
  return data.results || [];
}

/**
 * 전일 종가
 */
export async function getPreviousClose(ticker) {
  const data = await polygonFetch(
    `/v2/aggs/ticker/${ticker.toUpperCase()}/prev`,
    'adjusted=true',
    CACHE_TTL.prev_close
  );
  return data.results?.[0] || null;
}

/**
 * 종목 관련 뉴스
 */
export async function getTickerNews(ticker, limit = 5) {
  const data = await polygonFetch(
    `/v2/reference/news`,
    `ticker=${ticker.toUpperCase()}&limit=${limit}&order=desc&sort=published_utc`,
    CACHE_TTL.news
  );
  return (data.results || []).map(n => ({
    id: n.id,
    title: n.title,
    author: n.author,
    publishedAt: n.published_utc,
    articleUrl: n.article_url,
    imageUrl: n.image_url,
    source: n.publisher?.name || '',
    sourceLogo: n.publisher?.logo_url || '',
    tickers: n.tickers || [],
  }));
}

// ========== HELPER: 기간별 차트 데이터 가져오기 ==========

/**
 * 기간 프리셋 + 선택적 타임프레임으로 차트 데이터 가져오기
 */
export async function getChartData(ticker, range = '1Y', timeframe = null) {
  const now = new Date();
  const to = formatDate(now);
  let from, timespan, multiplier;

  switch (range) {
    case '1D': {
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

  if (timeframe) {
    switch (timeframe) {
      case '15m': timespan = 'minute'; multiplier = 15; break;
      case '30m': timespan = 'minute'; multiplier = 30; break;
      case '1h': timespan = 'hour'; multiplier = 1; break;
      case '1d': timespan = 'day'; multiplier = 1; break;
      case '1w': timespan = 'week'; multiplier = 1; break;
      default: timespan = 'day'; multiplier = 1;
    }
  } else {
    switch (range) {
      case '1D': timespan = 'minute'; multiplier = 15; break;
      case '1W': timespan = 'minute'; multiplier = 30; break;
      case '1M': timespan = 'hour'; multiplier = 1; break;
      case '3M': case '1Y': timespan = 'day'; multiplier = 1; break;
      case '5Y': timespan = 'week'; multiplier = 1; break;
      default: timespan = 'day'; multiplier = 1;
    }
  }

  let results = await getAggregates(ticker, timespan, multiplier, from, to);

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

/**
 * 로고 URL을 프록시 경유로 가져오기
 * Polygon branding URL에 직접 apiKey를 붙이는 대신
 * 서버에서 가져와서 반환
 */
export function getLogoUrl(brandingUrl) {
  if (!brandingUrl) return null;
  // 이미지 프록시 모드: Polygon branding URL을 서버에서 가져와서 바이너리 반환
  const params = new URLSearchParams({ imageUrl: brandingUrl });
  return `${PROXY_URL}?${params.toString()}`;
}

// ========== EXPORT ==========
const polygon = {
  getTickerDetails,
  getSnapshot,
  getAggregates,
  getPreviousClose,
  getChartData,
  getTickerNews,
  getLogoUrl,
};

export default polygon;
