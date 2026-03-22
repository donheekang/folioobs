// Supabase Edge Function: polygon-proxy
// 프론트엔드에서 Polygon API 키 노출을 방지하기 위한 프록시
// 모든 Polygon API 호출 + 로고 이미지를 서버사이드에서 처리

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

// 로고/브랜딩 이미지 URL 패턴 (별도 처리 — 바이너리 반환)
const IMAGE_PATTERN = /^https:\/\/api\.polygon\.io\//;

// 인메모리 캐시
const cache = new Map<string, { data: unknown; ts: number }>();
const imageCache = new Map<string, { data: ArrayBuffer; contentType: string; ts: number }>();
const CACHE_TTL: Record<string, number> = {
  "reference/tickers": 24 * 60 * 60 * 1000, // 24h
  "snapshot": 60 * 1000,                      // 1min
  "aggs": 5 * 60 * 1000,                     // 5min
  "prev": 60 * 60 * 1000,                    // 1h
  "news": 10 * 60 * 1000,                    // 10min
};
const IMAGE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h for logos

function getCacheTtl(path: string): number {
  for (const [key, ttl] of Object.entries(CACHE_TTL)) {
    if (path.includes(key)) return ttl;
  }
  return 60 * 1000; // default 1min
}

const CORS_BASE = {
  "Access-Control-Allow-Origin": "*",
};

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        ...CORS_BASE,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey",
      },
    });
  }

  const corsJson = { ...CORS_BASE, "Content-Type": "application/json" };

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path");
    const query = url.searchParams.get("query") || "";
    const imageUrl = url.searchParams.get("imageUrl");

    // ===== 이미지 프록시 모드 =====
    if (imageUrl) {
      // 보안: polygon.io 도메인만 허용
      if (!IMAGE_PATTERN.test(imageUrl)) {
        return new Response(
          JSON.stringify({ error: "Image URL not allowed" }),
          { status: 403, headers: corsJson }
        );
      }

      // 이미지 캐시 확인
      const imgCached = imageCache.get(imageUrl);
      if (imgCached && Date.now() - imgCached.ts < IMAGE_CACHE_TTL) {
        return new Response(imgCached.data, {
          headers: {
            ...CORS_BASE,
            "Content-Type": imgCached.contentType,
            "Cache-Control": "public, max-age=86400",
          },
        });
      }

      // Polygon 이미지 가져오기
      const separator = imageUrl.includes("?") ? "&" : "?";
      const imgRes = await fetch(`${imageUrl}${separator}apiKey=${POLYGON_API_KEY}`);

      if (!imgRes.ok) {
        return new Response(
          JSON.stringify({ error: `Image fetch ${imgRes.status}` }),
          { status: imgRes.status, headers: corsJson }
        );
      }

      const contentType = imgRes.headers.get("Content-Type") || "image/png";
      const imgData = await imgRes.arrayBuffer();

      // 캐시 저장
      imageCache.set(imageUrl, { data: imgData, contentType, ts: Date.now() });

      return new Response(imgData, {
        headers: {
          ...CORS_BASE,
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // ===== API 프록시 모드 =====
    if (!path) {
      return new Response(
        JSON.stringify({ error: "Missing 'path' or 'imageUrl' parameter" }),
        { status: 400, headers: corsJson }
      );
    }

    // 보안 검증: 허용된 경로만 프록시
    const isAllowed = ALLOWED_PATTERNS.some((pattern) => pattern.test(path));
    if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: "Path not allowed" }),
        { status: 403, headers: corsJson }
      );
    }

    // 캐시 확인
    const cacheKey = `${path}?${query}`;
    const ttl = getCacheTtl(path);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < ttl) {
      return new Response(JSON.stringify(cached.data), { headers: corsJson });
    }

    // Polygon API 호출
    const separator = query ? "&" : "";
    const polygonUrl = `${POLYGON_BASE}${path}?${query}${separator}apiKey=${POLYGON_API_KEY}`;
    const res = await fetch(polygonUrl);

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Polygon API ${res.status}` }),
        { status: res.status, headers: corsJson }
      );
    }

    const data = await res.json();
    cache.set(cacheKey, { data, ts: Date.now() });

    return new Response(JSON.stringify(data), { headers: corsJson });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: corsJson }
    );
  }
});
