// Supabase Edge Function: fetch-stock-prices
// Polygon.io에서 보유 종목 시세를 가져와 stock_prices 테이블에 저장
// 매일 한국시간 새벽 6시(미국 장 마감 후) 실행 권장

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Polygon API: 전일 종가 (Grouped Daily)
async function fetchGroupedDaily(date: string) {
  const url = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${date}?adjusted=true&apiKey=${POLYGON_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Polygon API error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.results || [];
}

// 보유 종목 티커 목록 조회 (holdings에서 unique tickers)
async function getHeldTickers(): Promise<Set<string>> {
  // filing_id 기준으로 최신 filing의 holdings에서 ticker 추출
  const { data: holdings, error } = await supabase
    .from("holdings")
    .select("securities!inner(ticker)")
    .limit(3000);

  if (error) {
    console.error("Failed to fetch holdings:", error);
    return new Set();
  }

  const tickers = new Set<string>();
  for (const h of holdings || []) {
    const ticker = (h as any).securities?.ticker;
    if (ticker) tickers.add(ticker.toUpperCase());
  }
  return tickers;
}

// 특정 날짜의 개별 종목 시세 가져오기 (fallback)
async function fetchTickerDaily(ticker: string, date: string) {
  const url = `https://api.polygon.io/v1/open-close/${ticker}/${date}?adjusted=true&apiKey=${POLYGON_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status === "NOT_FOUND" || data.status === "ERROR") return null;
  return data;
}

// 가장 최근 거래일 계산 (주말/공휴일 건너뛰기)
function getLastTradingDate(): string {
  const now = new Date();
  // UTC 기준 현재 시각 → 미국 동부 시간 고려
  // 미장은 16:00 ET에 마감, UTC 기준 21:00
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));

  let d = new Date(et);
  // 장 마감 전이면 전일 기준
  if (d.getHours() < 17) {
    d.setDate(d.getDate() - 1);
  }

  // 주말 건너뛰기
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }

  return d.toISOString().split("T")[0];
}

// 분기 말 날짜 계산 (공시 기준일)
function getQuarterEndDate(quarter: string): string {
  // "2025Q4" → "2025-12-31"
  const match = quarter.match(/^(\d{4})Q(\d)$/);
  if (!match) return "";
  const year = parseInt(match[1]);
  const q = parseInt(match[2]);
  const endDates: Record<number, string> = {
    1: `${year}-03-31`,
    2: `${year}-06-30`,
    3: `${year}-09-30`,
    4: `${year}-12-31`,
  };
  return endDates[q] || "";
}

Deno.serve(async (req) => {
  try {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };

    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    console.log("=== fetch-stock-prices 시작 ===");

    // 1. 보유 종목 티커 목록 가져오기
    const heldTickers = await getHeldTickers();
    console.log(`보유 종목 수: ${heldTickers.size}`);

    if (heldTickers.size === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No held tickers found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. 가장 최근 거래일
    const tradeDate = getLastTradingDate();
    console.log(`거래일: ${tradeDate}`);

    // 3. 이미 가져온 데이터 확인
    const { data: existing } = await supabase
      .from("stock_prices")
      .select("ticker")
      .eq("price_date", tradeDate);

    const existingTickers = new Set((existing || []).map((e: any) => e.ticker));
    const needFetch = [...heldTickers].filter(t => !existingTickers.has(t));
    console.log(`이미 존재: ${existingTickers.size}, 새로 가져올: ${needFetch.length}`);

    if (needFetch.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "All prices already fetched", date: tradeDate, count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Polygon Grouped Daily로 전체 시장 데이터 가져오기 (효율적)
    let priceMap: Record<string, any> = {};
    try {
      const grouped = await fetchGroupedDaily(tradeDate);
      console.log(`Grouped daily 결과: ${grouped.length}개 종목`);
      for (const item of grouped) {
        priceMap[item.T] = item; // T = ticker
      }
    } catch (e) {
      console.error("Grouped daily 실패, 개별 조회로 전환:", e);
    }

    // 5. 누락된 종목은 개별 API로 조회
    const rows: any[] = [];
    let fetchedCount = 0;
    let failedTickers: string[] = [];

    for (const ticker of needFetch) {
      let priceData = priceMap[ticker];

      if (!priceData) {
        // 개별 조회 fallback
        const individual = await fetchTickerDaily(ticker, tradeDate);
        if (individual) {
          priceData = {
            T: ticker,
            o: individual.open,
            c: individual.close,
            h: individual.high,
            l: individual.low,
            v: individual.volume,
            pc: individual.preMarket || null,
          };
        }
      }

      if (priceData) {
        const prevClose = priceData.pc || priceData.o || priceData.c;
        const changePct = prevClose > 0 ? ((priceData.c - prevClose) / prevClose) * 100 : 0;

        rows.push({
          ticker: ticker,
          price_date: tradeDate,
          open_price: priceData.o || null,
          close_price: priceData.c,
          high_price: priceData.h || null,
          low_price: priceData.l || null,
          volume: priceData.v || null,
          prev_close: prevClose || null,
          change_pct: Math.round(changePct * 100) / 100,
        });
        fetchedCount++;
      } else {
        failedTickers.push(ticker);
      }
    }

    console.log(`시세 확보: ${fetchedCount}, 실패: ${failedTickers.length}`);
    if (failedTickers.length > 0) {
      console.log(`실패 종목: ${failedTickers.slice(0, 20).join(", ")}`);
    }

    // 6. Supabase에 저장 (batch upsert)
    if (rows.length > 0) {
      // 100개씩 나눠서 upsert
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await supabase
          .from("stock_prices")
          .upsert(batch, { onConflict: "ticker,price_date" });

        if (error) {
          console.error(`Batch ${i / batchSize} upsert error:`, error);
        }
      }
    }

    // 7. 분기 말 기준가도 가져오기 (공시 후 성과 계산에 필요)
    // 최신 분기의 마지막 거래일 시세
    const { data: filings } = await supabase
      .from("filings")
      .select("quarter")
      .order("quarter", { ascending: false })
      .limit(1);

    let quarterEndFetched = 0;
    if (filings && filings.length > 0) {
      const latestQuarter = filings[0].quarter;
      const qEndDate = getQuarterEndDate(latestQuarter);

      if (qEndDate) {
        // 분기 말 데이터가 이미 있는지 확인
        const { data: qExisting } = await supabase
          .from("stock_prices")
          .select("ticker")
          .eq("price_date", qEndDate)
          .limit(1);

        if (!qExisting || qExisting.length === 0) {
          // 분기 말 날짜의 시세도 가져오기
          try {
            const qGrouped = await fetchGroupedDaily(qEndDate);
            const qRows: any[] = [];
            for (const item of qGrouped) {
              if (heldTickers.has(item.T)) {
                qRows.push({
                  ticker: item.T,
                  price_date: qEndDate,
                  open_price: item.o || null,
                  close_price: item.c,
                  high_price: item.h || null,
                  low_price: item.l || null,
                  volume: item.v || null,
                  prev_close: null,
                  change_pct: null,
                });
              }
            }
            if (qRows.length > 0) {
              for (let i = 0; i < qRows.length; i += 100) {
                await supabase
                  .from("stock_prices")
                  .upsert(qRows.slice(i, i + 100), { onConflict: "ticker,price_date" });
              }
              quarterEndFetched = qRows.length;
            }
            console.log(`분기 말(${qEndDate}) 시세: ${quarterEndFetched}개`);
          } catch (e) {
            console.error("분기 말 시세 조회 실패:", e);
          }
        }
      }
    }

    const result = {
      success: true,
      date: tradeDate,
      fetched: fetchedCount,
      failed: failedTickers.length,
      quarterEndFetched,
      failedTickers: failedTickers.slice(0, 10),
    };

    console.log("=== 완료 ===", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge Function 오류:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
