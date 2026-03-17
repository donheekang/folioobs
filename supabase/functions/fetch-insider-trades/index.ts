// Supabase Edge Function: fetch-insider-trades
// FMP API에서 최신 내부자 거래 데이터를 가져와 insider_trades 테이블에 저장
// Polygon.io API로 종목 유효성 검증 및 회사 정보 보강
// 매일 1~2회 실행 권장 (장 마감 후 + 장 시작 전)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FMP_API_KEY = Deno.env.get("FMP_API_KEY")!;
const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ===== Polygon.io 종목 검증 캐시 (Edge Function 인스턴스 내) =====
const tickerCache: Record<string, { valid: boolean; name?: string; sector?: string; marketCap?: number }> = {};

// ===== Polygon.io: 종목 유효성 검증 & 회사 정보 =====
// /v3/reference/tickers/{ticker} 로 상장 여부 확인 + 회사명/섹터/시가총액 보강
async function verifyTickerWithPolygon(ticker: string): Promise<{
  valid: boolean;
  name?: string;
  sector?: string;
  marketCap?: number;
}> {
  // 캐시에 있으면 재사용
  if (tickerCache[ticker]) return tickerCache[ticker];

  try {
    const url = `https://api.polygon.io/v3/reference/tickers/${ticker}?apiKey=${POLYGON_API_KEY}`;
    const res = await fetch(url);

    if (res.status === 429) {
      // Rate limit — 유효하다고 가정하고 스킵
      console.warn(`[Polygon] Rate limited for ${ticker}, assuming valid`);
      const result = { valid: true };
      tickerCache[ticker] = result;
      return result;
    }

    if (!res.ok) {
      // 404 등 → 비상장/잘못된 티커
      const result = { valid: false };
      tickerCache[ticker] = result;
      return result;
    }

    const data = await res.json();
    const r = data.results;

    if (!r || r.active === false) {
      // 상장폐지 또는 비활성 종목
      const result = { valid: false };
      tickerCache[ticker] = result;
      return result;
    }

    const result = {
      valid: true,
      name: r.name || undefined,
      sector: r.sic_description || undefined,
      marketCap: r.market_cap || undefined,
    };
    tickerCache[ticker] = result;
    return result;
  } catch (e) {
    // 네트워크 에러 → 유효하다고 가정
    console.warn(`[Polygon] Error verifying ${ticker}:`, e);
    const result = { valid: true };
    tickerCache[ticker] = result;
    return result;
  }
}

// ===== Polygon.io: 배치 검증 (rate limit 고려) =====
async function batchVerifyTickers(
  symbols: string[]
): Promise<Record<string, { valid: boolean; name?: string; sector?: string; marketCap?: number }>> {
  const unique = [...new Set(symbols)];
  const results: Record<string, typeof tickerCache[string]> = {};

  for (const sym of unique) {
    results[sym] = await verifyTickerWithPolygon(sym);
    // Polygon 무료 플랜: 5 req/min, 유료: 무제한
    // 안전하게 250ms 간격
    await new Promise(r => setTimeout(r, 250));
  }

  return results;
}

// ===== FMP Stable API: 최신 내부자 거래 목록 =====
// 무료 플랜: page=0만 가능, 최대 100건/회
// 매일 실행하면 데이터가 자동 누적됨 (UNIQUE 제약으로 중복 방지)
async function fetchLatestInsiderTrades(limit = 100): Promise<any[]> {
  const url = `https://financialmodelingprep.com/stable/insider-trading/latest?page=0&limit=${Math.min(limit, 100)}&apikey=${FMP_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`FMP API error: ${res.status} ${await res.text()}`);
  }
  return await res.json();
}

// ===== FMP Stable API: 특정 종목 내부자 거래 검색 =====
async function fetchInsiderTradesBySymbol(symbol: string, limit = 50): Promise<any[]> {
  const url = `https://financialmodelingprep.com/stable/insider-trading/search?symbol=${symbol}&page=0&limit=${limit}&apikey=${FMP_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`FMP API error for ${symbol}: ${res.status}`);
  }
  return await res.json();
}

// ===== FolioObs 추적 종목 → 투자자 매핑 가져오기 =====
// 반환: { tickerSet, tickerToInvestors }
async function getTrackedTickersWithInvestors(): Promise<{
  tickerSet: Set<string>;
  tickerToInvestors: Record<string, string[]>;
}> {
  const tickerSet = new Set<string>();
  const tickerToInvestors: Record<string, string[]> = {};

  // 1) 투자자 목록
  const { data: investors } = await supabase
    .from("investors")
    .select("id, name, name_ko");

  const investorMap: Record<string, string> = {};
  if (investors) {
    for (const inv of investors) {
      investorMap[inv.id] = inv.name_ko || inv.name || inv.id;
    }
  }

  // 2) holdings → securities 조인으로 투자자별 보유종목
  let from = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("holdings")
      .select("investor_id, securities!inner(ticker)")
      .range(from, from + batchSize - 1);

    if (error || !data || data.length === 0) break;

    for (const h of data) {
      const ticker = (h as any).securities?.ticker?.toUpperCase();
      const invId = (h as any).investor_id;
      if (!ticker) continue;

      tickerSet.add(ticker);
      if (!tickerToInvestors[ticker]) tickerToInvestors[ticker] = [];
      const invName = investorMap[invId] || invId;
      if (!tickerToInvestors[ticker].includes(invName)) {
        tickerToInvestors[ticker].push(invName);
      }
    }

    if (data.length < batchSize) break;
    from += batchSize;
  }

  return { tickerSet, tickerToInvestors };
}

// ===== 데이터 변환 & DB 저장 (Polygon.io 검증 포함) =====
async function processAndSave(
  trades: any[],
  tickerSet: Set<string>,
  tickerToInvestors: Record<string, string[]>
) {
  if (!trades || trades.length === 0) return { inserted: 0, skipped: 0, invalidTickers: 0 };

  // 1) 기본 필터링
  const validTrades = trades.filter(t => t.symbol && t.reportingName && t.transactionType);

  // 2) Polygon.io로 종목 유효성 배치 검증
  const symbols = validTrades.map(t => t.symbol.toUpperCase());
  const polygonResults = POLYGON_API_KEY
    ? await batchVerifyTickers(symbols)
    : {};

  let invalidTickers = 0;

  // 3) 유효한 종목만 rows로 변환
  const rows = validTrades
    .filter(t => {
      const sym = t.symbol.toUpperCase();
      const polygonInfo = polygonResults[sym];
      // Polygon API 키 없으면 전부 통과, 있으면 검증
      if (polygonInfo && !polygonInfo.valid) {
        invalidTickers++;
        console.log(`[Polygon] Filtered out invalid ticker: ${sym}`);
        return false;
      }
      return true;
    })
    .map(t => {
      const sym = t.symbol.toUpperCase();
      const investors = tickerToInvestors[sym] || [];
      const polygonInfo = polygonResults[sym];

      return {
        symbol: sym,
        // Polygon에서 회사명 보강 (FMP에 없는 경우)
        company_name: polygonInfo?.name || null,
        reporting_name: t.reportingName,
        type_of_owner: t.typeOfOwner || null,
        transaction_type: t.transactionType,
        acquisition_or_disposition: t.acquisitionOrDisposition || null,
        securities_transacted: t.securitiesTransacted || 0,
        price: t.price || 0,
        transaction_value: (t.price || 0) * (t.securitiesTransacted || 0),
        securities_owned: t.securitiesOwned || 0,
        security_name: t.securityName || null,
        filing_date: t.filingDate,
        transaction_date: t.transactionDate || t.filingDate,
        sec_link: t.url || t.link || null,
        form_type: t.formType || null,
        is_tracked_stock: tickerSet.has(sym),
        tracked_by_investors: investors.length > 0 ? investors.join(', ') : null,
      };
    });

  // 4) 100개씩 배치 upsert
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { data, error } = await supabase
      .from("insider_trades")
      .upsert(batch, {
        onConflict: "symbol,reporting_name,transaction_date,transaction_type,securities_transacted",
        ignoreDuplicates: true,
      });

    if (error) {
      console.error(`Batch ${i} error:`, error.message);
      skipped += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, skipped, invalidTickers };
}

// ===== 메인 핸들러 =====
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 요청 body에서 옵션 파싱
    let mode = "latest"; // "latest" | "tracked" | "symbol"
    let symbol: string | null = null;
    let limit = 500;

    try {
      const body = await req.json();
      if (body?.mode) mode = body.mode;
      if (body?.symbol) symbol = body.symbol;
      if (body?.limit) limit = Math.min(body.limit, 1000);
    } catch { /* no body = default */ }

    console.log(`[fetch-insider-trades] mode=${mode}, symbol=${symbol}, limit=${limit}`);

    // 추적 종목 + 투자자 매핑 가져오기
    const { tickerSet: trackedTickers, tickerToInvestors } = await getTrackedTickersWithInvestors();
    console.log(`[fetch-insider-trades] Tracked tickers: ${trackedTickers.size}`);

    let trades: any[] = [];

    if (mode === "symbol" && symbol) {
      // 특정 종목만
      trades = await fetchInsiderTradesBySymbol(symbol, limit);
    } else if (mode === "tracked") {
      // 추적 종목들만 (각각 호출 — rate limit 주의)
      const tickerArray = Array.from(trackedTickers).slice(0, 50); // 상위 50개만
      for (const t of tickerArray) {
        try {
          const result = await fetchInsiderTradesBySymbol(t, 10);
          trades.push(...result);
          // Rate limit 방지: 300ms 대기
          await new Promise(r => setTimeout(r, 300));
        } catch (e) {
          console.warn(`Failed for ${t}:`, e);
        }
      }
    } else {
      // 최신 전체 내부자 거래
      trades = await fetchLatestInsiderTrades(limit);
    }

    console.log(`[fetch-insider-trades] Fetched ${trades.length} trades`);

    // DB에 저장
    const result = await processAndSave(trades, trackedTickers, tickerToInvestors);

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        fetched: trades.length,
        inserted: result.inserted,
        skipped: result.skipped,
        invalidTickers: result.invalidTickers || 0,
        polygonVerified: !!POLYGON_API_KEY,
        trackedTickers: trackedTickers.size,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    console.error("[fetch-insider-trades] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
