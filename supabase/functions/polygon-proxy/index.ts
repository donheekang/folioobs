// Supabase Edge Function: polygon-proxy
// 프론트엔드에서 Polygon API 키 노출을 방지하기 위한 프록시
// 모든 Polygon API 호출을 서버사이드에서 처리

const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY")!;
const POLYGON_BASE = "https://api.polygon.io";

// 허용된 경로 패턴 (보안: 임의의 URL 프록시 방지)
const ALLOWED_PATTERNS = [
  /^\/v3\/reference\/tickers\/[A-Z0-9.]+$/,          // ticker details
  /^\/v2\/snapshot\/locale\/us\/markets\/stocks\/tickers\/[A-Z0-9.]+$/, // snapshot
  /^\/v2\/aggs\/ticker\/[A-Z0-9.]+\/range\/\d+\/\w+\/[\d-]+\/[\d-]+$/, // aggregates
  /^\/v2\/aggs\/ticker\/[A-Z0-9.]+\/prev$/,          // prev close
  /^\/v2\/reference\/news$/,                           // news
];

// 인메모리 캐시
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL: Record<string, number> = {
  "reference/tickers": 24 * 60 * 60 * 1000, // 24h
  "snapshot": 60 * 1000,                      // 1min
  "aggs": 5 * 60 * 1000,                     // 5min
  "prev": 60 * 60 * 1000,                    // 1h
  "news": 10 * 60 * 1000,                    // 10min
};

function getCacheTtl(path: string): number {
  for (const [key, ttl] of Object.entries(CACHE_TTL)) {
    if (path.includes(key)) return ttl;
  }
  return 60 * 1000; // default 1min
}

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey",
      },
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path");
    const query = url.searchParams.get("query") || "";

    if (!path) {
      return new Response(
        JSON.stringify({ error: "Missing 'path' parameter" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 보안 검증: 허용된 경로만 프록시
    const isAllowed = ALLOWED_PATTERNS.some((pattern) => pattern.test(path));
    if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: "Path not allowed" }),
        { status: 403, headers: corsHeaders }
      );
    }

    // 캐시 확인
    const cacheKey = `${path}?${query}`;
    const ttl = getCacheTtl(path);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < ttl) {
      return new Response(JSON.stringify(cached.data), { headers: corsHeaders });
    }

    // Polygon API 호출
    const separator = query ? "&" : "";
    const polygonUrl = `${POLYGON_BASE}${path}?${query}${separator}apiKey=${POLYGON_API_KEY}`;
    const res = await fetch(polygonUrl);

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Polygon API ${res.status}` }),
        { status: res.status, headers: corsHeaders }
      );
    }

    const data = await res.json();
    cache.set(cacheKey, { data, ts: Date.now() });

    return new Response(JSON.stringify(data), { headers: corsHeaders });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
