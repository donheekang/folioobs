import { useMemo, memo, useState, useEffect, useRef } from "react";
import {
  ArrowUpRight, ArrowDownRight, Briefcase, Plus, BarChart3, ChevronDown, TrendingUp, Activity, Trophy, Zap, Target, Layers, DollarSign
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useLocale } from "../hooks/useLocale";
import { useData } from "../hooks/useDataProvider";
import { STYLE_ICONS } from "../data";
import { formatUSD } from "../utils/format";
import { trackCtaClick } from "../utils/analytics";
import { GlassCard, Badge, MiniChart, WatchButton } from "../components/shared";
import OverlapHeatmap from "../components/OverlapHeatmap";

// Skeleton card placeholder
const SkeletonCard = () => (
  <div className="rounded-2xl overflow-hidden" aria-busy="true" aria-label="Loading" style={{ background: 'rgba(128,128,128,0.04)', border: '1px solid rgba(128,128,128,0.06)' }}>
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="skeleton w-11 h-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-3 w-32 rounded" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="skeleton h-5 w-16 rounded-full" />
        <div className="skeleton h-5 w-14 rounded-full" />
      </div>
      <div className="flex gap-3">
        <div className="skeleton h-8 w-16 rounded" />
        <div className="skeleton h-8 w-12 rounded" />
        <div className="skeleton h-8 w-14 rounded" />
      </div>
    </div>
  </div>
);

const DashboardPage = memo(({ onNavigate, watchlist }) => {
  const t = useTheme();
  const L = useLocale();
  const { investors: INVESTORS, holdings: HOLDINGS, quarterlyHistory: QUARTERLY_HISTORY, quarterlyActivity: QUARTERLY_ACTIVITY, arkDailyTrades, stockPrices, latestQuarter, lastUpdatedAt, loading: dataLoading } = useData();
  const { toggleInvestor, isWatchedInv } = watchlist;
  const totalAUM = useMemo(() => INVESTORS.reduce((s,i) => s+i.aum, 0), [INVESTORS]);
  const avgH = useMemo(() => {
    if (!INVESTORS.length) return 0;
    return Math.round(INVESTORS.reduce((s,i)=>s+i.metrics.holdingCount,0)/INVESTORS.length);
  }, [INVESTORS]);
  const totalStocks = useMemo(() => {
    const tickers = new Set();
    Object.values(HOLDINGS).forEach(arr => arr.forEach(h => tickers.add(h.ticker)));
    return tickers.size;
  }, [HOLDINGS]);

  const investorGridRef = useRef(null);

  // Brief skeleton on first mount (smooth entry feel)
  const [ready, setReady] = useState(false);
  useEffect(() => { const id = setTimeout(() => setReady(true), 350); return () => clearTimeout(id); }, []);

  // Collapse state for recent quarter changes (show 5 items initially)
  const COLLAPSE_LIMIT = 5;
  const [showAllNew, setShowAllNew] = useState(false);
  const [showAllBuy, setShowAllBuy] = useState(false);
  const [showAllSell, setShowAllSell] = useState(false);

  // ===== 공시 후 포트폴리오 성과 계산 (캐시 우드 제외 — ARK는 일별 매매 공개) =====
  const portfolioPerformance = useMemo(() => {
    if (!stockPrices || Object.keys(stockPrices).length === 0) return [];
    return INVESTORS.filter(inv => inv.id !== 'cathie').map(inv => {
      const h = HOLDINGS[inv.id] || [];
      if (h.length === 0) return null;
      let totalWeight = 0;
      let weightedReturn = 0;
      let priceCount = 0;
      h.forEach(holding => {
        const sp = stockPrices[holding.ticker];
        if (sp && sp.sinceFiling !== null && holding.pct > 0) {
          weightedReturn += (holding.pct / 100) * sp.sinceFiling;
          totalWeight += holding.pct / 100;
          priceCount++;
        }
      });
      if (totalWeight === 0) return null;
      const perf = weightedReturn / totalWeight;
      return { investor: inv, performance: Math.round(perf * 100) / 100, priceCount, totalHoldings: h.length };
    }).filter(Boolean).sort((a, b) => b.performance - a.performance);
  }, [INVESTORS, HOLDINGS, stockPrices]);

  // 시세 데이터 날짜 (표시용)
  const priceDate = useMemo(() => {
    const dates = Object.values(stockPrices).map(p => p.date).filter(Boolean);
    return dates.length > 0 ? dates[0] : null;
  }, [stockPrices]);

  // Aggregate all latest quarterly activities by action type
  const { newPositions, buyActions, sellActions, exitActions } = useMemo(() => {
    const all = INVESTORS.flatMap(inv => {
      // 캐시우드(ARK)는 일별 데이터라 분기 변동이 부정확 → 대시보드에서 제외
      if (inv.id === 'cathie') return [];
      const acts = QUARTERLY_ACTIVITY[inv.id] || [];
      if (acts.length === 0 || !acts[0]?.actions) return [];
      return acts[0].actions.filter(a => a.type !== 'hold').map(a => ({ ...a, investor: inv, quarter: acts[0].q }));
    });
    return {
      newPositions: all.filter(a => a.type === 'new'),
      buyActions: all.filter(a => a.type === 'buy').sort((a,b) => b.pctChange - a.pctChange),
      sellActions: all.filter(a => a.type === 'sell').sort((a,b) => a.pctChange - b.pctChange),
      exitActions: all.filter(a => a.type === 'exit'),
    };
  }, [INVESTORS, QUARTERLY_ACTIVITY]);

  // ===== 종목별 집계: 가장 많이 산/판 종목 TOP 5 =====
  const { topBoughtStocks, topSoldStocks } = useMemo(() => {
    // 같은 기업의 다른 share class를 통합 (GOOG/GOOGL, BRK.A/BRK.B 등)
    const TICKER_GROUPS = { 'GOOGL': 'GOOG', 'BRK.B': 'BRK.A', 'BRK/B': 'BRK/A' };
    const normalize = (ticker) => TICKER_GROUPS[ticker] || ticker;

    const aggregate = (actions) => {
      const map = {};
      actions.forEach(act => {
        const key = normalize(act.ticker);
        if (!map[key]) map[key] = { ticker: key, name: act.name, investors: [], types: [], tickers: [key] };
        // 원래 티커도 기록 (표시용)
        if (!map[key].tickers.includes(act.ticker)) map[key].tickers.push(act.ticker);
        // 같은 투자자 중복 방지
        if (!map[key].investors.find(i => i.id === act.investor.id)) {
          map[key].investors.push(act.investor);
          map[key].types.push(act.type);
        }
      });
      return Object.values(map).sort((a, b) => b.investors.length - a.investors.length).slice(0, 5);
    };

    return {
      topBoughtStocks: aggregate([...newPositions, ...buyActions]),
      topSoldStocks: aggregate([...sellActions, ...exitActions]),
    };
  }, [newPositions, buyActions, sellActions, exitActions]);

  // Hero highlights: 가장 많이 산 종목 #1, 가장 많이 판 종목 #1, 신규 매수 #1
  const heroHighlights = useMemo(() => {
    const picks = [];
    if (topBoughtStocks.length > 0) {
      const s = topBoughtStocks[0];
      const label = L.locale === 'ko' ? `${s.investors.length}명 매수` : `${s.investors.length} bought`;
      picks.push({ ticker: s.ticker, label, color: t.green, investors: s.investors, type: 'buy' });
    }
    if (topSoldStocks.length > 0) {
      const s = topSoldStocks[0];
      const label = L.locale === 'ko' ? `${s.investors.length}명 매도` : `${s.investors.length} sold`;
      picks.push({ ticker: s.ticker, label, color: t.red, investors: s.investors, type: 'sell' });
    }
    if (newPositions.length > 0) {
      // 신규 매수 중 가장 많은 투자자가 매수한 종목
      const newMap = {};
      newPositions.forEach(act => {
        if (!newMap[act.ticker]) newMap[act.ticker] = { ticker: act.ticker, investors: [] };
        if (!newMap[act.ticker].investors.find(i => i.id === act.investor.id)) {
          newMap[act.ticker].investors.push(act.investor);
        }
      });
      const topNew = Object.values(newMap).sort((a, b) => b.investors.length - a.investors.length)[0];
      if (topNew) {
        const label = L.locale === 'ko' ? `신규 ${topNew.investors.length}명` : `New ${topNew.investors.length}`;
        picks.push({ ticker: topNew.ticker, label, color: t.accent, investors: topNew.investors, type: 'new' });
      }
    }
    return picks.slice(0, 3);
  }, [topBoughtStocks, topSoldStocks, newPositions, t, L]);

  // ===== Task 4: 투자자 랭킹 보드 (다차원 순위) =====
  const investorRankings = useMemo(() => {
    if (!INVESTORS.length) return [];
    const rankings = [];

    // 각 투자자의 섹터 비중 계산
    const getSectorPct = (invId, sectorName) => {
      const h = HOLDINGS[invId] || [];
      const total = h.reduce((s, x) => s + x.value, 0);
      if (total === 0) return 0;
      const sectorVal = h.filter(x => x.sector === sectorName).reduce((s, x) => s + x.value, 0);
      return (sectorVal / total) * 100;
    };

    // Helper: top N from sorted array
    const topN = (arr, n = 3) => arr.slice(0, n);

    // 1. AUM 최대
    const byAum = topN([...INVESTORS].sort((a, b) => b.aum - a.aum));
    if (byAum[0]) rankings.push({ label: L.t('dashboard.rkAum'), icon: DollarSign, color: t.blue, investor: byAum[0], value: formatUSD(byAum[0].aum), runners: byAum.slice(1).map(r => ({ investor: r, value: formatUSD(r.aum) })) });

    // 2. 기술주 비중 TOP
    const byTech = topN([...INVESTORS].map(inv => ({ ...inv, techPct: getSectorPct(inv.id, '기술') })).sort((a, b) => b.techPct - a.techPct).filter(x => x.techPct > 0));
    if (byTech[0]) rankings.push({ label: L.t('dashboard.rkTech'), icon: Layers, color: t.accent, investor: byTech[0], value: `${byTech[0].techPct.toFixed(1)}%`, runners: byTech.slice(1).map(r => ({ investor: r, value: `${r.techPct.toFixed(1)}%` })) });

    // 3. 집중도 TOP (최대 비중)
    const byConc = topN([...INVESTORS].sort((a, b) => b.metrics.topHoldingPct - a.metrics.topHoldingPct));
    if (byConc[0]) rankings.push({ label: L.t('dashboard.rkConcentration'), icon: Target, color: t.amber, investor: byConc[0], value: `${byConc[0].metrics.topHoldingPct.toFixed(1)}%`, runners: byConc.slice(1).map(r => ({ investor: r, value: `${r.metrics.topHoldingPct.toFixed(1)}%` })) });

    // 4. 분산도 TOP (종목 수 최다)
    const byDiv = topN([...INVESTORS].sort((a, b) => b.metrics.holdingCount - a.metrics.holdingCount));
    if (byDiv[0]) rankings.push({ label: L.t('dashboard.rkDiversified'), icon: Briefcase, color: t.green, investor: byDiv[0], value: `${byDiv[0].metrics.holdingCount}${L.t('common.stocks_count')}`, runners: byDiv.slice(1).map(r => ({ investor: r, value: `${r.metrics.holdingCount}${L.t('common.stocks_count')}` })) });

    // 5. QoQ 최대 상승
    const byQoq = topN([...INVESTORS].sort((a, b) => b.metrics.qoqChange - a.metrics.qoqChange).filter(x => x.metrics.qoqChange > 0));
    if (byQoq[0]) rankings.push({ label: L.t('dashboard.rkTopGainer'), icon: TrendingUp, color: t.green, investor: byQoq[0], value: `+${byQoq[0].metrics.qoqChange}%`, runners: byQoq.slice(1).map(r => ({ investor: r, value: `+${r.metrics.qoqChange}%` })) });

    // 6. 가장 활발 (변동 종목 수)
    const activeList = topN([...INVESTORS].map(inv => {
      const acts = QUARTERLY_ACTIVITY[inv.id] || [];
      const cnt = acts.length > 0 && acts[0]?.actions ? acts[0].actions.filter(a => a.type !== 'hold').length : 0;
      return { ...inv, moveCount: cnt };
    }).sort((a, b) => b.moveCount - a.moveCount).filter(x => x.moveCount > 0));
    if (activeList[0]) rankings.push({ label: L.t('dashboard.rkMostActive'), icon: Activity, color: t.purple, investor: activeList[0], value: `${activeList[0].moveCount}${L.t('common.stocks_count')}`, runners: activeList.slice(1).map(r => ({ investor: r, value: `${r.moveCount}${L.t('common.stocks_count')}` })) });

    return rankings;
  }, [INVESTORS, HOLDINGS, QUARTERLY_ACTIVITY, t, L]);

  const handleActivityClick = (investorId) => onNavigate("investor", investorId);
  const ActivityItem = ({ act, label, color }) => {
    const defaultBg = t.name==='dark'?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)';
    const defaultBorder = t.name==='dark'?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.04)';
    return (
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
        style={{background:defaultBg, border:`1px solid ${defaultBorder}`}}
        onClick={()=>onNavigate("stock", act.ticker)}
        onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onNavigate("stock", act.ticker);}}}
        onMouseEnter={e=>{e.currentTarget.style.background=t.cardRowHover;e.currentTarget.style.borderColor=t.glassBorderHover;}}
        onMouseLeave={e=>{e.currentTarget.style.background=defaultBg;e.currentTarget.style.borderColor=defaultBorder;}}
        role="button" tabIndex={0} aria-label={`${L.investorName(act.investor)} - ${act.ticker} ${label}`}>
        <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0 hover:opacity-80"
          style={{background:act.investor.gradient}}
          onClick={(e)=>{e.stopPropagation();handleActivityClick(act.investor.id);}}>{act.investor.avatar}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold" style={{color:t.accent}}>{act.ticker}</div>
          <div className="text-xs" style={{color:t.textMuted}}>{act.name}</div>
        </div>
        <span className="text-xs font-medium" style={{color}}>{label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Hero — 데이터 강조형: 호기심 헤드라인 + 신뢰 배지 + 하이라이트 카드 */}
      <div className="hero-enter hero-enter-1 text-center py-6 sm:py-10" role="banner">
        <p className="text-sm sm:text-base font-semibold mb-3 tracking-wide" style={{color:t.accent}}>{L.t('dashboard.subtitle')}</p>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3" style={{color:t.text, letterSpacing:'-0.025em'}}>
          {L.t('dashboard.title')}
        </h1>

        {/* 신뢰 배지 */}
        <div className="hero-enter hero-enter-2 flex items-center justify-center gap-2 flex-wrap mb-5">
          {(L.t('dashboard.heroTagline') || '').split(' · ').map((tag, i) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{background: t.name==='dark'?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.05)', color: t.textMuted}}>{tag}</span>
          ))}
          {latestQuarter && <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{background:`${t.accent}15`, color:t.accent}}>13F: {L.quarter(latestQuarter)}</span>}
        </div>

        {/* 핵심 수치 — 한줄 */}
        <div className="hero-enter hero-enter-3 flex items-center justify-center gap-4 sm:gap-6 mb-6 flex-wrap">
          <span className="text-sm" style={{color:t.textMuted}}>{L.t('dashboard.totalAum')} <span className="font-bold" style={{color:t.text}}>{formatUSD(totalAUM)}</span></span>
          <span style={{color:t.textMuted}}>·</span>
          <span className="text-sm" style={{color:t.textMuted}}>{L.t('dashboard.trackedStocks')} <span className="font-bold" style={{color:t.text}}>{totalStocks}{L.t('common.stocks_count')}</span></span>
          <span style={{color:t.textMuted}}>·</span>
          <span className="text-sm" style={{color:t.textMuted}}>{L.t('dashboard.trackedInvestors')} <span className="font-bold" style={{color:t.text}}>{INVESTORS.length}{L.t('common.people')}</span></span>
        </div>

        {/* Trade Highlights — 이번 분기 핫 종목 (종목 중심 집계) */}
        {heroHighlights.length > 0 && (
          <div className="hero-enter hero-enter-4 w-full" style={{maxWidth:'680px', margin:'0 auto 2.5rem'}}>
            <p className="text-xs font-medium mb-3 text-center" style={{color:t.textMuted}}>{L.t('dashboard.hotStocks')}</p>
            {/* 데스크톱: 가로 flex 나란히 / 모바일: 1번 풀너비 + 2,3번 반반 grid */}
            <div className="hot-stocks-grid">
              {heroHighlights.map((h, i) => {
                const isGreen = h.type === 'buy';
                const isRed = h.type === 'sell';
                const accentColor = h.color;
                const glowBg = isGreen
                  ? 'rgba(34,197,94,0.06)'
                  : isRed
                    ? 'rgba(239,68,68,0.06)'
                    : `${t.accent}08`;
                const glowBorder = isGreen
                  ? 'rgba(34,197,94,0.15)'
                  : isRed
                    ? 'rgba(239,68,68,0.15)'
                    : `${t.accent}20`;
                return (
                  <div key={i}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all hover:scale-[1.02] cursor-pointer"
                    style={{background:glowBg, border:`1px solid ${glowBorder}`}}
                    onClick={() => onNavigate("stock", h.ticker)}>
                    {/* 투자자 아바타 스택 */}
                    <div className="flex -space-x-2 flex-shrink-0">
                      {h.investors.slice(0, 3).map((inv, j) => (
                        <div key={inv.id} className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[9px] font-bold ring-2"
                          style={{background:inv.gradient, zIndex: 3 - j, '--tw-ring-color': t.name==='dark'?'rgb(17,17,17)':'rgb(255,255,255)'}}>{inv.avatar}</div>
                      ))}
                      {h.investors.length > 3 && <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold ring-2"
                        style={{background:t.name==='dark'?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.08)', color:t.textMuted, '--tw-ring-color': t.name==='dark'?'rgb(17,17,17)':'rgb(255,255,255)'}}>+{h.investors.length - 3}</div>}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-extrabold tracking-tight" style={{color:t.text}}>{h.ticker}</span>
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{background:`${accentColor}18`, color:accentColor}}>{h.label}</span>
                      </div>
                      <div className="text-xs mt-0.5 truncate" style={{color:t.textMuted}}>{h.investors.slice(0,2).map(inv => L.investorName(inv)).join(', ')}{h.investors.length > 2 ? ` 외 ${h.investors.length - 2}명` : ''}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ARK Today Preview — 캐시 우드 일별 매매 */}
        {arkDailyTrades.length > 0 && (() => {
          const latest = arkDailyTrades[0];
          const buys = latest.trades.filter(tr => tr.direction?.toLowerCase() === 'buy').slice(0, 3);
          const sells = latest.trades.filter(tr => tr.direction?.toLowerCase() === 'sell').slice(0, 3);
          if (buys.length === 0 && sells.length === 0) return null;
          const cathie = INVESTORS.find(i => i.id === 'cathie');
          const latestDate = latest.date;
          const dateObj = new Date(latestDate + 'T00:00:00');
          const dateLabel = L.locale === 'en'
            ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : `${dateObj.getMonth()+1}월 ${dateObj.getDate()}일`;
          return (
            <div className="hero-enter hero-enter-5 mb-4 w-full max-w-lg mx-auto">
              <button className="w-full rounded-2xl p-4 transition-all hover:scale-[1.01] cursor-pointer text-left"
                style={{background:t.name==='dark'?'rgba(245,158,11,0.08)':'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.2)'}}
                onClick={()=>{trackCtaClick('ark_today_preview','hero');onNavigate("investor","cathie/daily");}}>
                <div className="flex items-center gap-2 mb-3">
                  {cathie && <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold" style={{background:cathie.gradient}}>{cathie.avatar}</div>}
                  <span className="text-sm font-bold" style={{color:'#f59e0b'}}>{L.t('dashboard.arkTodayLabel')}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{background:'rgba(245,158,11,0.15)',color:'#f59e0b'}}>{L.t('dashboard.arkDailyBadge')}</span>
                  <span className="text-xs font-medium" style={{color:t.textMuted}}>{dateLabel}</span>
                </div>
                <div className="flex items-center gap-4 justify-center flex-wrap">
                  {buys.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{background:`${t.green}20`,color:t.green}}>{L.t('common.buy')}</span>
                      {buys.map(tr => <span key={tr.ticker} className="text-sm font-semibold" style={{color:t.text}}>{tr.ticker}</span>)}
                    </div>
                  )}
                  {buys.length > 0 && sells.length > 0 && <span style={{color:t.textMuted}}>·</span>}
                  {sells.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{background:`${t.red}20`,color:t.red}}>{L.t('common.sell')}</span>
                      {sells.map(tr => <span key={tr.ticker} className="text-sm font-semibold" style={{color:t.text}}>{tr.ticker}</span>)}
                    </div>
                  )}
                </div>
              </button>
            </div>
          );
        })()}

        {/* CTA Button */}
        <div className="hero-enter hero-enter-5">
          <button
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:shadow-lg active:scale-95"
            style={{background:t.accent}}
            onClick={()=>{trackCtaClick('portfolio_view','hero');investorGridRef.current?.scrollIntoView({behavior:'smooth',block:'start'});}}>
            {L.t('dashboard.ctaButton')}
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* ===== TOP 5 매수/매도 랭킹 (히어로 바로 아래) ===== */}
      {!ready ? null : (topBoughtStocks.length > 0 || topSoldStocks.length > 0) && (
        <section className="hero-enter hero-enter-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} style={{ color: t.accent }} />
            <h2 className="text-lg font-bold" style={{ color: t.text }}>{L.t('dashboard.hotStocksTitle')}</h2>
            {latestQuarter && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${t.accent}15`, color: t.accent }}>{L.quarter(latestQuarter)}</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* TOP 5 매수 */}
            <GlassCard hover={false}>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{background:`${t.green}15`}}>
                    <ArrowUpRight size={14} style={{color:t.green}} />
                  </div>
                  <span className="text-sm font-bold" style={{color:t.text}}>{L.t('dashboard.topBought')}</span>
                </div>
                <div className="space-y-2.5">
                  {topBoughtStocks.map((stock, i) => (
                    <div key={stock.ticker} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onNavigate("stock", stock.ticker)}>
                      <span className="text-sm font-bold w-5 text-center" style={{color: i < 3 ? t.green : t.textMuted}}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold hover:underline" style={{color:t.text}}>{stock.ticker}</span>
                          <span className="text-xs truncate" style={{color:t.textMuted}}>{stock.name?.slice(0, 15)}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="flex -space-x-1">
                            {stock.investors.slice(0, 4).map((inv, j) => (
                              <div key={inv.id} className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[8px] font-bold ring-1 ring-white dark:ring-gray-900 cursor-pointer"
                                style={{background:inv.gradient, zIndex: 4 - j}}
                                title={L.investorName(inv)}
                                onClick={()=>onNavigate("investor",inv.id)}>
                                {inv.avatar}
                              </div>
                            ))}
                          </div>
                          <span className="text-[11px] font-medium" style={{color:t.green}}>{stock.investors.length}{L.t('common.people')} {L.t('common.buy')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {topBoughtStocks.length === 0 && <div className="text-xs text-center py-3" style={{color:t.textMuted}}>{L.t('common.none')}</div>}
                </div>
              </div>
            </GlassCard>

            {/* TOP 5 매도 */}
            <GlassCard hover={false}>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{background:`${t.red}15`}}>
                    <ArrowDownRight size={14} style={{color:t.red}} />
                  </div>
                  <span className="text-sm font-bold" style={{color:t.text}}>{L.t('dashboard.topSold')}</span>
                </div>
                <div className="space-y-2.5">
                  {topSoldStocks.map((stock, i) => (
                    <div key={stock.ticker} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onNavigate("stock", stock.ticker)}>
                      <span className="text-sm font-bold w-5 text-center" style={{color: i < 3 ? t.red : t.textMuted}}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold hover:underline" style={{color:t.text}}>{stock.ticker}</span>
                          <span className="text-xs truncate" style={{color:t.textMuted}}>{stock.name?.slice(0, 15)}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="flex -space-x-1">
                            {stock.investors.slice(0, 4).map((inv, j) => (
                              <div key={inv.id} className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[8px] font-bold ring-1 ring-white dark:ring-gray-900 cursor-pointer"
                                style={{background:inv.gradient, zIndex: 4 - j}}
                                title={L.investorName(inv)}
                                onClick={()=>onNavigate("investor",inv.id)}>
                                {inv.avatar}
                              </div>
                            ))}
                          </div>
                          <span className="text-[11px] font-medium" style={{color:t.red}}>{stock.investors.length}{L.t('common.people')} {L.t('common.sell')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {topSoldStocks.length === 0 && <div className="text-xs text-center py-3" style={{color:t.textMuted}}>{L.t('common.none')}</div>}
                </div>
              </div>
            </GlassCard>
          </div>
        </section>
      )}

      {/* Investor Grid */}
      <section ref={investorGridRef} aria-label={L.t('dashboard.investorStatus')}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: t.text }}>{L.t('dashboard.investorStatus')}</h2>
          <span className="text-xs" style={{ color: t.textMuted }}>{L.t('dashboard.sec13fBased')}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {!ready || dataLoading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : INVESTORS.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Briefcase size={36} style={{ color: t.textMuted, opacity: 0.3 }} className="mx-auto mb-3" />
              <p className="text-sm" style={{ color: t.textMuted }}>{L.t('dashboard.noInvestorData')}</p>
              <p className="text-xs mt-1" style={{ color: t.textMuted }}>{L.t('dashboard.runPipeline')}</p>
            </div>
          ) : INVESTORS.map(inv => {
            const SI = STYLE_ICONS[inv.style]||Briefcase;
            const h = HOLDINGS[inv.id]||[];
            const hist = QUARTERLY_HISTORY[inv.id]||[];
            return (
              <GlassCard key={inv.id} onClick={()=>onNavigate("investor",inv.id)} glow={inv.gradient}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{background:inv.gradient}}>{inv.avatar}</div>
                      <div><div className="font-bold" style={{color:t.text}}>{L.investorName(inv)}</div><div className="text-xs" style={{color:t.textMuted}}>{L.fundName(inv)}</div></div>
                    </div>
                    <WatchButton active={isWatchedInv(inv.id)} onClick={() => toggleInvestor(inv.id)} size={14} />
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge color={inv.color}><SI size={11}/> {L.style(inv.style)}</Badge>
                    <span title={L.locale==='ko'?'전분기 대비 AUM 변동':'QoQ AUM Change'}><Badge color={inv.metrics.qoqChange>=0?t.green:t.red}>{inv.metrics.qoqChange>=0?<ArrowUpRight size={11}/>:<ArrowDownRight size={11}/>}{inv.metrics.qoqChange>=0?'+':''}{inv.metrics.qoqChange}%</Badge></span>
                    {inv.id === 'cathie' && <Badge color="#f59e0b">{L.t('dashboard.arkDailyBadge')}</Badge>}
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="grid grid-cols-3 gap-3 flex-1">
                      {[{l:"AUM",v:formatUSD(inv.aum)},{l:L.t('investor.holdingCount'),v:`${inv.metrics.holdingCount}`},{l:"TOP",v:h[0]?.ticker,c:inv.color}].map((x,j)=>(
                        <div key={j}><div className="text-xs mb-0.5" style={{color:t.textMuted}}>{x.l}</div><div className="text-sm font-bold" style={{color:x.c||t.text}}>{x.v}</div></div>
                      ))}
                    </div>
                    {hist.length>0 && <MiniChart data={hist} color={inv.color}/>}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* ===== 공시 후 포트폴리오 성과 ===== */}
      {!ready ? null : portfolioPerformance.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} style={{ color: t.accent }} />
              <h2 className="text-lg font-bold" style={{ color: t.text }}>{L.t('dashboard.postFilingPerf')}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${t.accent}15`, color: t.accent }}>{L.quarter(latestQuarter)}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', color: t.textMuted }}>{L.t('dashboard.returnLabel') || '수익률'}</span>
            </div>
            {priceDate && <span className="text-xs" style={{ color: t.textMuted }}>{priceDate} {L.t('dashboard.priceAsOf')}</span>}
          </div>
          <GlassCard>
            <div className="p-4 space-y-3">
              {portfolioPerformance.map((pp, i) => {
                const isPositive = pp.performance >= 0;
                const color = isPositive ? t.green : t.red;
                const maxAbs = Math.max(...portfolioPerformance.map(p => Math.abs(p.performance)), 1);
                const barWidth = Math.min(Math.abs(pp.performance) / maxAbs * 100, 100);
                return (
                  <div key={pp.investor.id} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => onNavigate("investor", pp.investor.id)}>
                    <span className="text-xs font-bold w-5 text-center" style={{ color: t.textMuted }}>{i + 1}</span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: pp.investor.gradient }}>{pp.investor.avatar}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold truncate" style={{ color: t.text }}>{L.investorName(pp.investor)}</span>
                        <span className="text-sm font-bold ml-2" style={{ color }}>{isPositive ? '+' : ''}{pp.performance}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${barWidth}%`, background: color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* 캐시 우드 안내 */}
              <div className="flex items-center gap-2 pt-2 mt-1" style={{ borderTop: `1px solid ${t.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                {(() => { const cathie = INVESTORS.find(i => i.id === 'cathie'); return cathie ? (
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: cathie.gradient }}>{cathie.avatar}</div>
                ) : null; })()}
                <span className="text-xs" style={{ color: t.textMuted }}>{L.t('dashboard.cathieExcluded')}</span>
              </div>
            </div>
          </GlassCard>
        </section>
      )}

      {/* ===== 이번 분기 투자자 변동 랭킹 ===== */}
      {!ready ? null : INVESTORS.length > 0 && (() => {
        const ranked = [...INVESTORS]
          .map(inv => {
            const acts = QUARTERLY_ACTIVITY[inv.id] || [];
            const latestActs = acts.length > 0 && acts[0]?.actions ? acts[0].actions : [];
            const newCount = latestActs.filter(a => a.type === 'new').length;
            const exitCount = latestActs.filter(a => a.type === 'exit').length;
            const buyCount = latestActs.filter(a => a.type === 'buy').length;
            const sellCount = latestActs.filter(a => a.type === 'sell').length;
            const totalMoves = newCount + exitCount + buyCount + sellCount;
            return { ...inv, qoq: inv.metrics.qoqChange, absQoq: Math.abs(inv.metrics.qoqChange), newCount, exitCount, buyCount, sellCount, totalMoves };
          })
          .sort((a, b) => b.absQoq - a.absQoq);

        const maxAbs = ranked[0]?.absQoq || 1;

        return (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Activity size={18} style={{ color: t.amber }} />
              <h2 className="text-lg font-bold" style={{ color: t.text }}>{L.t('dashboard.changeRanking')}</h2>
              {latestQuarter && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${t.accent}15`, color: t.accent }}>{L.quarter(latestQuarter)}</span>}
              <span className="text-[10px] ml-1" style={{ color: t.textMuted }}>{L.t('dashboard.qoqBasis')}</span>
            </div>
            <GlassCard hover={false}>
              <div className="p-4 sm:p-5 space-y-2">
                {ranked.map((inv, i) => {
                  const barWidth = maxAbs > 0 ? (inv.absQoq / maxAbs) * 100 : 0;
                  const isPositive = inv.qoq >= 0;
                  const barColor = isPositive ? t.green : t.red;
                  return (
                    <div key={inv.id} className="flex items-center gap-3 py-2 px-2 rounded-xl cursor-pointer transition-colors"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = t.cardRowHover}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => onNavigate("investor", inv.id)}>
                      {/* 순위 */}
                      <span className="text-xs font-bold w-5 text-center" style={{ color: i < 3 ? t.amber : t.textMuted }}>{i + 1}</span>
                      {/* 아바타 */}
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: inv.gradient }}>{inv.avatar}</div>
                      {/* 이름 */}
                      <div className="w-24 sm:w-32 flex-shrink-0">
                        <div className="text-sm font-semibold truncate" style={{ color: t.text }}>{L.investorName(inv)}</div>
                      </div>
                      {inv.id === 'cathie' ? (
                        <>
                          {/* 캐시 우드: 바 없이 "일일매매 별도" 표시 */}
                          <div className="flex-1" />
                          <span className="text-xs px-3 py-1 rounded-full font-bold" style={{ background: `${t.cyan || '#06b6d4'}25`, color: t.cyan || '#06b6d4', border: `1px solid ${t.cyan || '#06b6d4'}40` }}>{L.t('dashboard.dailyTradeNote')}</span>
                        </>
                      ) : (
                        <>
                          {/* 바 차트 */}
                          <div className="flex-1 h-5 rounded-full overflow-hidden relative" style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(barWidth, 3)}%`, background: `${barColor}30` }} />
                          </div>
                          {/* QoQ 값 */}
                          <span className="text-sm font-bold w-16 text-right flex items-center justify-end gap-0.5" style={{ color: barColor }}>
                            {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {isPositive ? '+' : ''}{inv.qoq}%
                          </span>
                          {/* 활동 요약 (데스크톱) */}
                          <div className="hidden sm:flex items-center gap-1 w-28 justify-end">
                            {inv.newCount > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${t.accent}15`, color: t.accent }}>{L.t('common.new')} {inv.newCount}</span>}
                            {inv.buyCount > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${t.green}15`, color: t.green }}>+{inv.buyCount}</span>}
                            {inv.sellCount > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${t.red}15`, color: t.red }}>-{inv.sellCount}</span>}
                            {inv.totalMoves === 0 && <span className="text-[10px]" style={{ color: t.textMuted }}>—</span>}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </section>
        );
      })()}

      {/* ===== 투자자 랭킹 보드 (Task 4) ===== */}
      {!ready ? null : investorRankings.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={18} style={{ color: t.amber }} />
            <h2 className="text-lg font-bold" style={{ color: t.text }}>{L.t('dashboard.investorRanking')}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {investorRankings.map((rk, i) => {
              const I = rk.icon;
              return (
                <GlassCard key={i} onClick={() => onNavigate("investor", rk.investor.id)}>
                  <div className="p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <I size={13} style={{ color: rk.color }} />
                      <span className="text-xs font-medium" style={{ color: t.textMuted }}>{rk.label}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: rk.investor.gradient }}>{rk.investor.avatar}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold truncate" style={{ color: t.text }}>{L.investorName(rk.investor)}</div>
                        <div className="text-lg font-bold" style={{ color: rk.color }}>{rk.value}</div>
                      </div>
                    </div>
                    {/* 2-3위 */}
                    {rk.runners && rk.runners.length > 0 && (
                      <div className="mt-2.5 pt-2 space-y-1" style={{ borderTop: `1px solid ${t.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                        {rk.runners.map((ru, ri) => (
                          <div key={ri} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); onNavigate("investor", ru.investor.id); }}>
                            <span className="text-[10px] font-bold w-4 text-center" style={{ color: t.textMuted }}>{ri + 2}</span>
                            <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                              style={{ background: ru.investor.gradient }}>{ru.investor.avatar}</div>
                            <span className="text-xs truncate flex-1" style={{ color: t.textSecondary }}>{L.investorName(ru.investor)}</span>
                            <span className="text-xs font-semibold" style={{ color: rk.color }}>{ru.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </section>
      )}

      {/* ARK Daily Trades — Cathie Wood 실시간 매매 */}
      {!ready ? null : arkDailyTrades.length > 0 && (() => {
        const latestDay = arkDailyTrades[0];
        const dateStr = (() => {
          const d = new Date(latestDay.date + 'T00:00:00');
          return L.locale === 'ko'
            ? `${d.getMonth()+1}월 ${d.getDate()}일`
            : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        })();
        const buys = latestDay.trades.filter(tr => tr.direction?.toLowerCase() === 'buy');
        const sells = latestDay.trades.filter(tr => tr.direction?.toLowerCase() === 'sell');
        const cathieInv = INVESTORS.find(i => i.id === 'cathie');
        return (
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold" style={{color:t.text}}>{L.t('dashboard.arkDailyTitle')}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{background:'rgba(245,158,11,0.15)',color:'#f59e0b'}}>{L.t('dashboard.arkDailyBadge')}</span>
              </div>
              <span className="text-xs" style={{color:t.textMuted}}>{L.t('dashboard.arkDateContext')} · {dateStr}</span>
            </div>
            <GlassCard hover={false}>
              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Buy */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{background:`${t.green}15`}}>
                        <ArrowUpRight size={12} style={{color:t.green}} />
                      </div>
                      <span className="text-sm font-semibold" style={{color:t.text}}>{L.t('common.buy')}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{background:`${t.green}15`,color:t.green}}>{buys.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {buys.slice(0, 5).map((tr, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors"
                          style={{background:t.name==='dark'?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)'}}
                          onClick={()=>cathieInv && onNavigate("investor","cathie")}>
                          <div>
                            <span className="text-sm font-semibold" style={{color:t.text}}>{tr.ticker}</span>
                            <span className="text-xs ml-1.5" style={{color:t.textMuted}}>{tr.company?.slice(0,20)}</span>
                          </div>
                          <div className="text-right">
                            {tr.isNew && <span className="text-xs font-medium mr-1" style={{color:t.accent}}>{L.t('common.new')}</span>}
                            <span className="text-xs" style={{color:t.textMuted}}>{tr.funds}</span>
                          </div>
                        </div>
                      ))}
                      {buys.length > 5 && <div className="text-xs text-center py-1" style={{color:t.textMuted}}>+{buys.length - 5} {L.t('dashboard.arkMore')}</div>}
                      {buys.length === 0 && <div className="text-xs text-center py-3" style={{color:t.textMuted}}>{L.t('common.none')}</div>}
                    </div>
                  </div>
                  {/* Sell */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{background:`${t.red}15`}}>
                        <ArrowDownRight size={12} style={{color:t.red}} />
                      </div>
                      <span className="text-sm font-semibold" style={{color:t.text}}>{L.t('common.sell')}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{background:`${t.red}15`,color:t.red}}>{sells.length}</span>
                    </div>
                    <div className="space-y-1.5">
                      {sells.slice(0, 5).map((tr, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors"
                          style={{background:t.name==='dark'?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)'}}
                          onClick={()=>cathieInv && onNavigate("investor","cathie")}>
                          <div>
                            <span className="text-sm font-semibold" style={{color:t.text}}>{tr.ticker}</span>
                            <span className="text-xs ml-1.5" style={{color:t.textMuted}}>{tr.company?.slice(0,20)}</span>
                          </div>
                          <div className="text-right">
                            {tr.isExit && <span className="text-xs font-medium mr-1" style={{color:t.red}}>{L.t('common.exit')}</span>}
                            <span className="text-xs" style={{color:t.textMuted}}>{tr.funds}</span>
                          </div>
                        </div>
                      ))}
                      {sells.length > 5 && <div className="text-xs text-center py-1" style={{color:t.textMuted}}>+{sells.length - 5} {L.t('dashboard.arkMore')}</div>}
                      {sells.length === 0 && <div className="text-xs text-center py-3" style={{color:t.textMuted}}>{L.t('common.none')}</div>}
                    </div>
                  </div>
                </div>
                {/* View all link */}
                <div className="mt-4 text-center">
                  <button className="text-xs font-medium px-4 py-1.5 rounded-full transition-colors hover:opacity-80"
                    style={{color:t.accent, background:`${t.accent}12`, border:`1px solid ${t.accent}25`}}
                    onClick={()=>{trackCtaClick('ark_view_all','ark_section');onNavigate("investor","cathie/daily");}}>
                    {L.t('dashboard.arkViewAll')}
                  </button>
                </div>
              </div>
            </GlassCard>
          </section>
        );
      })()}

      {!ready ? null : <>
      {/* Visualization: Portfolio Overlap (Full Width) */}
      <GlassCard hover={false}>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} style={{color:t.accent}} />
            <h3 className="font-bold" style={{color:t.text}}>{L.t('dashboard.portfolioOverlap')}</h3>
          </div>
          <div role="img" aria-label={L.t('dashboard.portfolioOverlap')}>
            <OverlapHeatmap onNavigate={onNavigate} />
          </div>
        </div>
      </GlassCard>

      {/* Recent Activity — 3-Column by Action Type */}
      <section aria-label={L.t('dashboard.recentQuarterChanges')}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{color:t.text}}>{L.t('dashboard.recentQuarterChanges')}</h2>
          <span className="text-xs" style={{color:t.textMuted}}>{L.quarter(latestQuarter)}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* New Positions */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{background:`${t.accent}15`}}>
                <Plus size={12} style={{color:t.accent}} />
              </div>
              <span className="text-sm font-semibold" style={{color:t.text}}>{L.t('dashboard.newBuy')}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{background:`${t.accent}15`,color:t.accent}}>{newPositions.length}</span>
            </div>
            <div className="space-y-1.5">
              {(showAllNew ? newPositions : newPositions.slice(0, COLLAPSE_LIMIT)).map((act, i) => <ActivityItem key={i} act={act} label={L.t('common.new')} color={t.accent} />)}
              {newPositions.length === 0 && <div className="text-xs text-center py-4" style={{color:t.textMuted}}>{L.t('common.none')}</div>}
              {newPositions.length > COLLAPSE_LIMIT && (
                <button onClick={() => setShowAllNew(!showAllNew)} className="w-full text-xs font-medium py-1.5 rounded-lg transition-colors hover:opacity-80" style={{color:t.accent}}>
                  {showAllNew ? L.t('common.collapse') : `+${newPositions.length - COLLAPSE_LIMIT} ${L.t('common.showMore')}`}
                </button>
              )}
            </div>
          </div>

          {/* Buy / Increase */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{background:`${t.green}15`}}>
                <ArrowUpRight size={12} style={{color:t.green}} />
              </div>
              <span className="text-sm font-semibold" style={{color:t.text}}>{L.t('dashboard.increaseWeight')}</span>
              <span className="text-xs" style={{color:t.textMuted}}>{L.t('dashboard.sharesChange')}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{background:`${t.green}15`,color:t.green}}>{buyActions.length}</span>
            </div>
            <div className="space-y-1.5">
              {(showAllBuy ? buyActions : buyActions.slice(0, COLLAPSE_LIMIT)).map((act, i) => <ActivityItem key={i} act={act} label={Math.round(act.pctChange) > 999 ? L.t('common.significantIncrease') : `+${Math.round(act.pctChange)}%`} color={t.green} />)}
              {buyActions.length === 0 && <div className="text-xs text-center py-4" style={{color:t.textMuted}}>{L.t('common.none')}</div>}
              {buyActions.length > COLLAPSE_LIMIT && (
                <button onClick={() => setShowAllBuy(!showAllBuy)} className="w-full text-xs font-medium py-1.5 rounded-lg transition-colors hover:opacity-80" style={{color:t.accent}}>
                  {showAllBuy ? L.t('common.collapse') : `+${buyActions.length - COLLAPSE_LIMIT} ${L.t('common.showMore')}`}
                </button>
              )}
            </div>
          </div>

          {/* Sell / Decrease */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{background:`${t.red}15`}}>
                <ArrowDownRight size={12} style={{color:t.red}} />
              </div>
              <span className="text-sm font-semibold" style={{color:t.text}}>{L.t('dashboard.decreaseWeight')}</span>
              <span className="text-xs" style={{color:t.textMuted}}>{L.t('dashboard.sharesChange')}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{background:`${t.red}15`,color:t.red}}>{sellActions.length}</span>
            </div>
            <div className="space-y-1.5">
              {(showAllSell ? sellActions : sellActions.slice(0, COLLAPSE_LIMIT)).map((act, i) => <ActivityItem key={i} act={act} label={`${Math.round(act.pctChange)}%`} color={t.red} />)}
              {sellActions.length === 0 && <div className="text-xs text-center py-4" style={{color:t.textMuted}}>{L.t('common.none')}</div>}
              {sellActions.length > COLLAPSE_LIMIT && (
                <button onClick={() => setShowAllSell(!showAllSell)} className="w-full text-xs font-medium py-1.5 rounded-lg transition-colors hover:opacity-80" style={{color:t.accent}}>
                  {showAllSell ? L.t('common.collapse') : `+${sellActions.length - COLLAPSE_LIMIT} ${L.t('common.showMore')}`}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
      </>}
    </div>
  );
});

DashboardPage.displayName = "DashboardPage";
export default DashboardPage;
