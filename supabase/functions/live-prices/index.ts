// Supabase Edge Function: live-prices
// Polygon.io Snapshot API로 15분 지연 실시간 시세 반환
// Snapshot 실패 시 Grouped Daily로 fallback
// 장 상태 및 마지막 거래일은 Polygon API에서 직접 가져옴

const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY")!;

// 인메모리 캐시 (1분)
let cache: { data: Record<string, any>; timestamp: number; source: string; lastTradeDate: string; marketStatus: string } | null = null;
const CACHE_TTL = 60 * 1000;

// 장 상태 캐시 (5분 — 자주 안 바뀌니까)
let marketStatusCache: { status: string; serverTime: string; lastTradeDate: string; timestamp: number } | null = null;
const MARKET_STATUS_TTL = 5 * 60 * 1000;

// ===== Polygon Market Status API =====
// 직접 시간 계산 대신 Polygon이 알려주는 장 상태를 사용
async function fetchMarketStatus(): Promise<{ status: string; serverTime: string }> {
  // 캐시 확인
  if (marketStatusCache && (Date.now() - marketStatusCache.timestamp) < MARKET_STATUS_TTL) {
    return { status: marketStatusCache.status, serverTime: marketStatusCache.serverTime };
  }

  try {
    const res = await fetch(`https://api.polygon.io/v1/marketstatus/now?apiKey=${POLYGON_API_KEY}`);
    if (res.ok) {
      const data = await res.json();
      // data.market: "open", "closed", "extended-hours"
      // data.earlyHours: true (프리마켓 4AM~9:30AM ET)
      // data.afterHours: true (애프터마켓 4PM~8PM ET)
      // data.serverTime: "2026-03-23T16:30:00-04:00"
      let status = "closed";
      if (data.market === "open") {
        status = "open";
      } else if (data.market === "extended-hours" || data.earlyHours === true || data.afterHours === true) {
        // 프리마켓 vs 애프터마켓 구분
        status = data.earlyHours === true ? "pre-market" : "after-hours";
      }
      const serverTime = data.serverTime || new Date().toISOString();
      marketStatusCache = { status, serverTime, lastTradeDate: "", timestamp: Date.now() };
      return { status, serverTime };
    }
  } catch (e) {
    console.warn("Market status API failed:", e);
  }

  // fallback: 기본값
  return { status: "closed", serverTime: new Date().toISOString() };
}

// ===== Snapshot API에서 마지막 거래일 추출 =====
// Snapshot 응답의 updated 타임스탬프에서 실제 거래 날짜를 가져옴
function extractTradeDateFromSnapshot(tickers: any[]): string | null {
  for (const t of tickers) {
    // updated는 나노초 Unix timestamp
    if (t.updated) {
      const ms = typeof t.updated === 'number' && t.updated > 1e15
        ? Math.floor(t.updated / 1e6) // 나노초 → 밀리초
        : t.updated;
      const d = new Date(ms);
      // ET로 변환해서 날짜 추출
      const etStr = d.toLocaleString("en-US", { timeZone: "America/New_York" });
      const etDate = new Date(etStr);
      const y = etDate.getFullYear();
      const m = String(etDate.getMonth() + 1).padStart(2, '0');
      const day = String(etDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    // lastTrade 타임스탬프도 활용
    if (t.lastTrade?.t) {
      const ms = typeof t.lastTrade.t === 'number' && t.lastTrade.t > 1e15
        ? Math.floor(t.lastTrade.t / 1e6)
        : t.lastTrade.t;
      const d = new Date(ms);
      const etStr = d.toLocaleString("en-US", { timeZone: "America/New_York" });
      const etDate = new Date(etStr);
      const y = etDate.getFullYear();
      const m = String(etDate.getMonth() + 1).padStart(2, '0');
      const day = String(etDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }
  return null;
}

// ===== Polygon Snapshot API (15분 지연 실시간) =====
async function fetchSnapshot(tickers: string[]): Promise<{ prices: Record<string, any>; lastTradeDate: string | null } | null> {
  try {
    const priceMap: Record<string, any> = {};
    let detectedDate: string | null = null;
    const BATCH = 100;

    for (let i = 0; i < tickers.length; i += BATCH) {
      const batch = tickers.slice(i, i + BATCH);
      const tickerParam = batch.join(",");
      const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickerParam}&apiKey=${POLYGON_API_KEY}`;
      const res = await fetch(url);

      if (!res.ok) {
        console.warn(`Snapshot API ${res.status} for batch ${i}`);
        return null;
      }

      const data = await res.json();
      if (data.tickers) {
        // 첫 번째 배치에서 거래일 추출
        if (!detectedDate && data.tickers.length > 0) {
          detectedDate = extractTradeDateFromSnapshot(data.tickers);
        }

        for (const t of data.tickers) {
          const day = t.day || {};
          const prevDay = t.prevDay || {};
          const prevClose = prevDay.c || 0;

          // 정규장 종가 (day.c)
          const regularClose = (day.c && day.c > 0) ? day.c : prevClose;
          if (regularClose <= 0) continue;

          // 정규장 변동률 (day.c vs prevDay.c)
          const regularChange = prevClose > 0 ? regularClose - prevClose : 0;
          const regularChangePct = prevClose > 0
            ? ((regularClose - prevClose) / prevClose) * 100 : 0;

          // 애프터마켓 감지 (이중 체크 — 더 큰 차이를 사용)
          // 방법1: todaysChange(전체) vs regularChange(정규장)
          const totalChange = t.todaysChange || 0;
          const ahDiff1 = totalChange - regularChange;
          // 방법2: lastTrade.p vs day.c (직접 비교)
          const lastTradeP = t.lastTrade?.p || 0;
          const ahDiff2 = lastTradeP > 0 ? lastTradeP - regularClose : 0;
          // 둘 중 절대값이 큰 쪽 사용
          const ahDiff = Math.abs(ahDiff1) >= Math.abs(ahDiff2) ? ahDiff1 : ahDiff2;
          const hasAfterHours = Math.abs(ahDiff) > 0.005;
          const ahPrice = hasAfterHours ? regularClose + ahDiff : 0;
          const ahChangePct = hasAfterHours && regularClose > 0
            ? (ahDiff / regularClose) * 100 : 0;

          const entry: Record<string, any> = {
            c: Math.round(regularClose * 100) / 100,       // 정규장 종가
            pc: Math.round(prevClose * 100) / 100,          // 전일 종가
            o: Math.round((day.o || prevDay.o || 0) * 100) / 100,
            h: Math.round((day.h || prevDay.h || 0) * 100) / 100,
            l: Math.round((day.l || prevDay.l || 0) * 100) / 100,
            ch: Math.round(regularChangePct * 100) / 100,   // 정규장 변동률
            v: day.v || prevDay.v || 0,
            vw: day.vw || prevDay.vw || 0,
          };

          // 애프터마켓 데이터 (존재할 때만)
          if (hasAfterHours) {
            entry.ah = Math.round(ahPrice * 100) / 100;     // 애프터 가격
            entry.ahCh = Math.round(ahChangePct * 100) / 100; // 애프터 변동률(정규장 종가 대비)
          }

          priceMap[t.ticker] = entry;
        }
      }
    }

    if (Object.keys(priceMap).length === 0) return null;
    return { prices: priceMap, lastTradeDate: detectedDate };
  } catch (e) {
    console.warn("Snapshot failed:", e);
    return null;
  }
}

// ===== Fallback: Grouped Daily =====
async function fetchGroupedDaily(date: string): Promise<Record<string, any>> {
  const url = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${date}?adjusted=true&apiKey=${POLYGON_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Grouped Daily error: ${res.status}`);
  const data = await res.json();

  const priceMap: Record<string, any> = {};
  for (const item of (data.results || [])) {
    if (!item.c || item.c <= 0) continue;
    const prevClose = item.o || item.c;
    const changePct = prevClose > 0 ? ((item.c - prevClose) / prevClose) * 100 : 0;
    priceMap[item.T] = {
      c: Math.round(item.c * 100) / 100,
      o: Math.round((item.o || 0) * 100) / 100,
      h: Math.round((item.h || 0) * 100) / 100,
      l: Math.round((item.l || 0) * 100) / 100,
      ch: Math.round(changePct * 100) / 100,
    };
  }
  return priceMap;
}

// ===== Fallback 전용: 마지막 거래일 찾기 =====
// Polygon /v2/aggs/prev 로 아무 유명 종목의 전일 종가를 가져와서 날짜 추출
async function fetchLastTradeDateFromPrev(): Promise<string> {
  try {
    const res = await fetch(`https://api.polygon.io/v2/aggs/ticker/AAPL/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`);
    if (res.ok) {
      const data = await res.json();
      if (data.results?.[0]?.t) {
        const d = new Date(data.results[0].t);
        const etStr = d.toLocaleString("en-US", { timeZone: "America/New_York" });
        const etDate = new Date(etStr);
        return `${etDate.getFullYear()}-${String(etDate.getMonth() + 1).padStart(2, '0')}-${String(etDate.getDate()).padStart(2, '0')}`;
      }
    }
  } catch (e) {
    console.warn("Prev close date fetch failed:", e);
  }
  // 최후의 fallback: UTC 기준 오늘
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

// ===== Main Handler =====
Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 요청에서 티커 목록 가져오기
    let requestedTickers: string[] = [];
    try {
      const body = await req.json();
      if (body.tickers && Array.isArray(body.tickers)) {
        requestedTickers = body.tickers.map((t: string) => t.toUpperCase());
      }
    } catch {
      // body 없어도 OK
    }

    const requestedSet = requestedTickers.length > 0 ? new Set(requestedTickers) : null;

    // 캐시 확인
    const now = Date.now();
    if (cache && (now - cache.timestamp) < CACHE_TTL) {
      const filtered = requestedSet
        ? Object.fromEntries(Object.entries(cache.data).filter(([k]) => requestedSet.has(k)))
        : cache.data;

      // 장 상태는 Polygon API에서 가져오기
      const ms = await fetchMarketStatus();

      return new Response(JSON.stringify({
        count: Object.keys(filtered).length,
        source: cache.source,
        cached: true,
        live: cache.source === 'snapshot',
        marketStatus: ms.status,
        lastTradeDate: cache.lastTradeDate,
        prices: filtered,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let priceMap: Record<string, any> = {};
    let source = "grouped";
    let lastTradeDate = "";

    // 1차: Snapshot API 시도 (15분 지연 실시간)
    if (requestedTickers.length > 0) {
      const snapshot = await fetchSnapshot(requestedTickers);
      if (snapshot) {
        priceMap = snapshot.prices;
        lastTradeDate = snapshot.lastTradeDate || "";
        source = "snapshot";
      }
    }

    // 2차: Snapshot 실패 또는 티커 미지정 → Grouped Daily fallback
    if (Object.keys(priceMap).length === 0) {
      // Polygon prev close에서 마지막 거래일 가져오기
      const tradeDate = await fetchLastTradeDateFromPrev();
      console.log(`Snapshot 미사용, Grouped Daily fallback: ${tradeDate}`);
      lastTradeDate = tradeDate;

      const grouped = await fetchGroupedDaily(tradeDate);
      if (requestedSet) {
        for (const [k, v] of Object.entries(grouped)) {
          if (requestedSet.has(k)) priceMap[k] = v;
        }
      } else {
        priceMap = grouped;
      }
    }

    // lastTradeDate가 아직 비어있으면 Polygon prev에서 가져오기
    if (!lastTradeDate) {
      lastTradeDate = await fetchLastTradeDateFromPrev();
    }

    // 장 상태는 Polygon Market Status API에서 가져오기
    const ms = await fetchMarketStatus();

    // 캐시 업데이트
    cache = { data: { ...cache?.data, ...priceMap }, timestamp: now, source, lastTradeDate };

    return new Response(JSON.stringify({
      count: Object.keys(priceMap).length,
      source,
      live: source === "snapshot",
      marketStatus: ms.status,
      lastTradeDate,
      prices: priceMap,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("live-prices error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
