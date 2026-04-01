// Supabase Edge Function: save-daily-snapshot
// 매일 장 마감 후 추적 종목의 시세 스냅샷을 DB에 저장
// live-prices와 동일한 Polygon Snapshot API 사용
// 랭킹(상승률/하락률/거래액) 계산 후 저장

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const POLYGON_API_KEY = Deno.env.get("POLYGON_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ===== 추적 종목 + 투자자 매핑 가져오기 =====
async function getTrackedTickers(): Promise<{
  tickers: string[];
  tickerToInvestors: Record<string, string[]>;
}> {
  const tickerSet = new Set<string>();
  const tickerToInvestors: Record<string, string[]> = {};

  // 투자자 목록
  const { data: investors } = await supabase
    .from("investors")
    .select("id, name, name_ko");

  const investorMap: Record<string, string> = {};
  if (investors) {
    for (const inv of investors) {
      investorMap[inv.id] = inv.name_ko || inv.name || inv.id;
    }
  }

  // holdings → securities 조인
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

  return { tickers: Array.from(tickerSet), tickerToInvestors };
}

// ===== Polygon Snapshot API =====
async function fetchSnapshot(tickers: string[]): Promise<{
  prices: Record<string, any>;
  lastTradeDate: string | null;
}> {
  const priceMap: Record<string, any> = {};
  let detectedDate: string | null = null;
  const BATCH = 100;

  for (let i = 0; i < tickers.length; i += BATCH) {
    const batch = tickers.slice(i, i + BATCH);
    const tickerParam = batch.join(",");
    const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickerParam}&apiKey=${POLYGON_API_KEY}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`Snapshot API ${res.status} for batch ${i}`);
        continue;
      }

      const data = await res.json();
      if (!data.tickers) continue;

      // 첫 번째 배치에서 거래일 추출
      if (!detectedDate && data.tickers.length > 0) {
        for (const t of data.tickers) {
          if (t.updated) {
            const ms = typeof t.updated === "number" && t.updated > 1e15
              ? Math.floor(t.updated / 1e6)
              : t.updated;
            const d = new Date(ms);
            const etStr = d.toLocaleString("en-US", { timeZone: "America/New_York" });
            const etDate = new Date(etStr);
            detectedDate = `${etDate.getFullYear()}-${String(etDate.getMonth() + 1).padStart(2, "0")}-${String(etDate.getDate()).padStart(2, "0")}`;
            break;
          }
        }
      }

      for (const t of data.tickers) {
        const day = t.day || {};
        const prevDay = t.prevDay || {};
        const prevClose = prevDay.c || 0;
        const regularClose = day.c && day.c > 0 ? day.c : prevClose;
        if (regularClose <= 0) continue;

        const changePct = prevClose > 0
          ? ((regularClose - prevClose) / prevClose) * 100
          : 0;

        // 애프터마켓
        const totalChange = t.todaysChange || 0;
        const regularChange = prevClose > 0 ? regularClose - prevClose : 0;
        const ahDiff1 = totalChange - regularChange;
        const lastTradeP = t.lastTrade?.p || 0;
        const ahDiff2 = lastTradeP > 0 ? lastTradeP - regularClose : 0;
        const ahDiff = Math.abs(ahDiff1) >= Math.abs(ahDiff2) ? ahDiff1 : ahDiff2;
        const hasAH = Math.abs(ahDiff) > 0.005;

        priceMap[t.ticker] = {
          close: Math.round(regularClose * 100) / 100,
          prevClose: Math.round(prevClose * 100) / 100,
          open: Math.round((day.o || prevDay.o || 0) * 100) / 100,
          high: Math.round((day.h || prevDay.h || 0) * 100) / 100,
          low: Math.round((day.l || prevDay.l || 0) * 100) / 100,
          changePct: Math.round(changePct * 100) / 100,
          volume: day.v || prevDay.v || 0,
          vwap: Math.round((day.vw || prevDay.vw || 0) * 100) / 100,
          ahPrice: hasAH ? Math.round((regularClose + ahDiff) * 100) / 100 : null,
          ahChangePct: hasAH ? Math.round((ahDiff / regularClose) * 10000) / 100 : null,
        };
      }
    } catch (e) {
      console.warn(`Snapshot batch ${i} error:`, e);
    }
  }

  return { prices: priceMap, lastTradeDate: detectedDate };
}

// ===== Fallback: 마지막 거래일 =====
async function fetchLastTradeDate(): Promise<string> {
  try {
    const res = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/AAPL/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.results?.[0]?.t) {
        const d = new Date(data.results[0].t);
        const etStr = d.toLocaleString("en-US", { timeZone: "America/New_York" });
        const etDate = new Date(etStr);
        return `${etDate.getFullYear()}-${String(etDate.getMonth() + 1).padStart(2, "0")}-${String(etDate.getDate()).padStart(2, "0")}`;
      }
    }
  } catch (e) {
    console.warn("Last trade date fetch failed:", e);
  }
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

// ===== Main Handler =====
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 옵션 파싱
    let forceDate: string | null = null;
    try {
      const body = await req.json();
      if (body?.date) forceDate = body.date; // 특정 날짜 강제 지정
    } catch { /* no body */ }

    console.log("[save-daily-snapshot] Starting...");

    // 1) 추적 종목 가져오기
    const { tickers, tickerToInvestors } = await getTrackedTickers();
    console.log(`[save-daily-snapshot] Tracked tickers: ${tickers.length}`);

    if (tickers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No tracked tickers" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2) Polygon Snapshot 가져오기
    const { prices, lastTradeDate } = await fetchSnapshot(tickers);
    const snapshotDate = forceDate || lastTradeDate || await fetchLastTradeDate();
    console.log(`[save-daily-snapshot] Fetched ${Object.keys(prices).length} prices, date: ${snapshotDate}`);

    // 3) 랭킹 계산
    const entries = Object.entries(prices).map(([ticker, p]) => ({
      ticker,
      ...p,
      tradingValue: (p.volume || 0) * (p.vwap || p.close || 0),
      investorCount: tickerToInvestors[ticker]?.length || 0,
      investorNames: tickerToInvestors[ticker]?.join(", ") || null,
    }));

    // 상승률 랭킹
    const byGainers = [...entries].sort((a, b) => b.changePct - a.changePct);
    byGainers.forEach((e, i) => { e.rankGainers = i + 1; });

    // 하락률 랭킹
    const byLosers = [...entries].sort((a, b) => a.changePct - b.changePct);
    byLosers.forEach((e, i) => { e.rankLosers = i + 1; });

    // 거래액 랭킹
    const byVolume = [...entries].sort((a, b) => b.tradingValue - a.tradingValue);
    byVolume.forEach((e, i) => { e.rankVolume = i + 1; });

    // 랭킹을 원래 entries에 매핑
    const rankMap: Record<string, { g: number; l: number; v: number }> = {};
    byGainers.forEach((e) => { if (!rankMap[e.ticker]) rankMap[e.ticker] = { g: 0, l: 0, v: 0 }; rankMap[e.ticker].g = e.rankGainers; });
    byLosers.forEach((e) => { if (!rankMap[e.ticker]) rankMap[e.ticker] = { g: 0, l: 0, v: 0 }; rankMap[e.ticker].l = e.rankLosers; });
    byVolume.forEach((e) => { if (!rankMap[e.ticker]) rankMap[e.ticker] = { g: 0, l: 0, v: 0 }; rankMap[e.ticker].v = e.rankVolume; });

    // 4) DB rows 생성
    const rows = entries.map((e) => ({
      date: snapshotDate,
      ticker: e.ticker,
      close_price: e.close,
      prev_close: e.prevClose,
      open_price: e.open,
      high_price: e.high,
      low_price: e.low,
      daily_change_pct: e.changePct,
      volume: e.volume,
      vwap: e.vwap,
      trading_value: e.tradingValue,
      after_hours_price: e.ahPrice,
      after_hours_change_pct: e.ahChangePct,
      investor_count: e.investorCount,
      tracked_by_investors: e.investorNames,
      rank_gainers: rankMap[e.ticker]?.g || null,
      rank_losers: rankMap[e.ticker]?.l || null,
      rank_volume: rankMap[e.ticker]?.v || null,
    }));

    // 5) 배치 upsert
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await supabase
        .from("daily_snapshots")
        .upsert(batch, {
          onConflict: "date,ticker",
          ignoreDuplicates: false, // 기존 데이터 업데이트
        });

      if (error) {
        console.error(`Batch ${i} error:`, error.message);
        errors += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    console.log(`[save-daily-snapshot] Done: ${inserted} saved, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        date: snapshotDate,
        totalTickers: tickers.length,
        pricesFetched: Object.keys(prices).length,
        saved: inserted,
        errors,
        topGainers: byGainers.slice(0, 5).map((e) => ({
          ticker: e.ticker,
          change: e.changePct,
        })),
        topLosers: byLosers.slice(0, 5).map((e) => ({
          ticker: e.ticker,
          change: e.changePct,
        })),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    console.error("[save-daily-snapshot] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
