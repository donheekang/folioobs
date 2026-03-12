// Supabase Edge Function: live-prices
// Polygon.io Grouped Daily API로 실시간(15분 지연) 시세를 가져와 바로 반환
// DB 저장 없이 프록시 역할 → 무제한 호출 가능

const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY")!;

// 인메모리 캐시 (같은 인스턴스 내에서 중복 호출 방지)
let cache: { data: Record<string, any>; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1분 캐시

function getLastTradingDate(): string {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  let d = new Date(et);
  if (d.getHours() < 17) {
    d.setDate(d.getDate() - 1);
  }
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString().split("T")[0];
}

async function fetchGroupedDaily(date: string): Promise<any[]> {
  const url = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${date}?adjusted=true&apiKey=${POLYGON_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Polygon API error: ${res.status}`);
  }
  const data = await res.json();
  return data.results || [];
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
    // 요청에서 티커 목록 가져오기 (선택적)
    let requestedTickers: Set<string> | null = null;
    try {
      const body = await req.json();
      if (body.tickers && Array.isArray(body.tickers)) {
        requestedTickers = new Set(body.tickers.map((t: string) => t.toUpperCase()));
      }
    } catch {
      // body 없어도 OK — 전체 반환
    }

    const tradeDate = getLastTradingDate();

    // 캐시 확인
    const now = Date.now();
    if (cache && (now - cache.timestamp) < CACHE_TTL) {
      // 캐시에서 필터링해서 반환
      const filtered = requestedTickers
        ? Object.fromEntries(Object.entries(cache.data).filter(([k]) => requestedTickers!.has(k)))
        : cache.data;

      return new Response(JSON.stringify({
        date: tradeDate,
        count: Object.keys(filtered).length,
        cached: true,
        prices: filtered,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Polygon Grouped Daily 호출 (1번 호출로 전체 시장)
    const grouped = await fetchGroupedDaily(tradeDate);

    // 전체 시세 맵 생성
    const priceMap: Record<string, any> = {};
    for (const item of grouped) {
      const prevClose = item.o || item.c; // open as proxy for prev close
      const changePct = prevClose > 0 ? ((item.c - prevClose) / prevClose) * 100 : 0;
      priceMap[item.T] = {
        c: Math.round(item.c * 100) / 100,     // close (현재가)
        o: Math.round((item.o || 0) * 100) / 100, // open
        h: Math.round((item.h || 0) * 100) / 100, // high
        l: Math.round((item.l || 0) * 100) / 100, // low
        ch: Math.round(changePct * 100) / 100,   // change %
      };
    }

    // 캐시 업데이트
    cache = { data: priceMap, timestamp: now };

    // 요청된 티커만 필터링
    const filtered = requestedTickers
      ? Object.fromEntries(Object.entries(priceMap).filter(([k]) => requestedTickers!.has(k)))
      : priceMap;

    return new Response(JSON.stringify({
      date: tradeDate,
      count: Object.keys(filtered).length,
      prices: filtered,
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
