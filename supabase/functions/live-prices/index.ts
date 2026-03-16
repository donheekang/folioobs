// Supabase Edge Function: live-prices
// Polygon.io Snapshot API로 15분 지연 실시간 시세 반환
// Snapshot 실패 시 Grouped Daily로 fallback
// DB 저장 없이 프록시 역할 → 무제한 호출 가능

const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY")!;

// 인메모리 캐시 (1분)
let cache: { data: Record<string, any>; timestamp: number; source: string } | null = null;
const CACHE_TTL = 60 * 1000;

// Polygon Snapshot API (15분 지연 실시간)
async function fetchSnapshot(tickers: string[]): Promise<Record<string, any> | null> {
  try {
    // 티커 100개씩 배치 처리 (URL 길이 제한)
    const priceMap: Record<string, any> = {};
    const BATCH = 100;

    for (let i = 0; i < tickers.length; i += BATCH) {
      const batch = tickers.slice(i, i + BATCH);
      const tickerParam = batch.join(",");
      const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickerParam}&apiKey=${POLYGON_API_KEY}`;
      const res = await fetch(url);

      if (!res.ok) {
        console.warn(`Snapshot API ${res.status} for batch ${i}`);
        return null; // Snapshot 미지원 → fallback
      }

      const data = await res.json();
      if (data.tickers) {
        for (const t of data.tickers) {
          const day = t.day || {};
          const prevDay = t.prevDay || {};
          // day.c가 0이면 장 미개장(주말/공휴일) → prevDay.c 사용
          const closePrice = (day.c && day.c > 0) ? day.c : (prevDay.c || 0);
          if (closePrice <= 0) continue; // 가격 데이터 없으면 건너뛰기
          const prevClose = prevDay.c || day.o || closePrice;
          const changePct = prevClose > 0 ? ((closePrice - prevClose) / prevClose) * 100 : 0;

          priceMap[t.ticker] = {
            c: Math.round(closePrice * 100) / 100,
            o: Math.round((day.o || prevDay.o || 0) * 100) / 100,
            h: Math.round((day.h || prevDay.h || 0) * 100) / 100,
            l: Math.round((day.l || prevDay.l || 0) * 100) / 100,
            ch: Math.round(changePct * 100) / 100,
          };
        }
      }
    }

    return Object.keys(priceMap).length > 0 ? priceMap : null;
  } catch (e) {
    console.warn("Snapshot failed:", e);
    return null;
  }
}

// Fallback: Grouped Daily (장 마감 후 데이터)
// Deno Deploy에서 toLocaleString timezone이 불안정하므로 UTC 기반 수동 계산
function getLastTradingDate(): string {
  const now = new Date();
  const utcMonth = now.getUTCMonth(); // 0-11
  // DST 간이 판정: 3월~10월 EDT(UTC-4), 11월~2월 EST(UTC-5)
  const isDST = utcMonth >= 2 && utcMonth <= 10;
  const offsetHours = isDST ? 4 : 5;

  // UTC → ET 변환
  const etMs = now.getTime() - offsetHours * 3600000;
  const et = new Date(etMs);
  const hour = et.getUTCHours();

  let y = et.getUTCFullYear();
  let m = et.getUTCMonth();
  let day = et.getUTCDate();

  // 장 마감(17:00 ET) 전이면 전일, 새벽(0-4시)이면 당일
  if (hour >= 4 && hour < 17) {
    day -= 1;
  }

  let d = new Date(Date.UTC(y, m, day));

  // 주말 건너뛰기
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() - 1);
  }

  const fy = d.getUTCFullYear();
  const fm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const fd = String(d.getUTCDate()).padStart(2, '0');
  return `${fy}-${fm}-${fd}`;
}

// UTC 기반 ET 시간 계산 헬퍼
function getETNow(): { hour: number; min: number; day: number } {
  const now = new Date();
  const utcMonth = now.getUTCMonth();
  const isDST = utcMonth >= 2 && utcMonth <= 10;
  const offsetHours = isDST ? 4 : 5;
  const etMs = now.getTime() - offsetHours * 3600000;
  const et = new Date(etMs);
  return { hour: et.getUTCHours(), min: et.getUTCMinutes(), day: et.getUTCDay() };
}

async function fetchGroupedDaily(date: string): Promise<Record<string, any>> {
  const url = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${date}?adjusted=true&apiKey=${POLYGON_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Grouped Daily error: ${res.status}`);
  const data = await res.json();

  const priceMap: Record<string, any> = {};
  for (const item of (data.results || [])) {
    if (!item.c || item.c <= 0) continue; // 비정상 가격 건너뛰기
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

      // 캐시 응답에도 장 상태 추가
      const etNowC = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
      const etHrC = etNowC.getHours(), etMnC = etNowC.getMinutes(), etDyC = etNowC.getDay();
      const isOpenC = etDyC >= 1 && etDyC <= 5 && ((etHrC === 9 && etMnC >= 30) || (etHrC >= 10 && etHrC < 16));

      return new Response(JSON.stringify({
        count: Object.keys(filtered).length,
        source: cache.source,
        cached: true,
        live: cache.source === 'snapshot',
        marketStatus: isOpenC ? "open" : "closed",
        lastTradeDate: getLastTradingDate(),
        prices: filtered,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let priceMap: Record<string, any> = {};
    let source = "grouped";

    // 1차: Snapshot API 시도 (15분 지연 실시간)
    if (requestedTickers.length > 0) {
      const snapshot = await fetchSnapshot(requestedTickers);
      if (snapshot) {
        priceMap = snapshot;
        source = "snapshot";
      }
    }

    // 2차: Snapshot 실패 또는 티커 미지정 → Grouped Daily fallback
    if (Object.keys(priceMap).length === 0) {
      const tradeDate = getLastTradingDate();
      console.log(`Snapshot 미사용, Grouped Daily fallback: ${tradeDate}`);
      const grouped = await fetchGroupedDaily(tradeDate);

      if (requestedSet) {
        for (const [k, v] of Object.entries(grouped)) {
          if (requestedSet.has(k)) priceMap[k] = v;
        }
      } else {
        priceMap = grouped;
      }
    }

    // 캐시 업데이트
    cache = { data: { ...cache?.data, ...priceMap }, timestamp: now, source };

    // 장 상태 메타데이터 계산 (UTC 기반 ET 계산)
    const etNow = getETNow();
    const isWeekday = etNow.day >= 1 && etNow.day <= 5;
    const isMarketHours = isWeekday && ((etNow.hour === 9 && etNow.min >= 30) || (etNow.hour >= 10 && etNow.hour < 16));
    const marketStatus = isMarketHours ? "open" : "closed";
    const lastTradeDate = getLastTradingDate();

    return new Response(JSON.stringify({
      count: Object.keys(priceMap).length,
      source,
      live: source === "snapshot",
      marketStatus,
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
