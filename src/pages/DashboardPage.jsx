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
  const { investors: INVESTORS, holdings: HOLDINGS, quarterlyHistory: QUARTERLY_HISTORY, quarterlyActivity: QUARTERLY_ACTIVITY, arkDailyTrades, latestQuarter, lastUpdatedAt, loading: dataLoading } = useData();
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

  // Aggregate all latest quarterly activities by action type
  const { newPositions, buyActions, sellActions } = useMemo(() => {
    const all = INVESTORS.flatMap(inv => {
      // 캐시우드(ARK)는 일별 데이터라 분기 변동이 부정확 → 대시보드에서 제외
      if (inv.id === 'cathie') return [];
      const acts = QUARTERLY_ACTIVITY[inv.id] || [];
      if (acts.length === 0 || !acts[0]?.actions) return [];
      return acts[0].actions.filter(a => a.type !== 'hold' && a.type !== 'exit').map(a => ({ ...a, investor: inv, quarter: acts[0].q }));
    });
    return {
      newPositions: all.filter(a => a.type === 'new'),
      buyActions: all.filter(a => a.type === 'buy').sort((a,b) => b.pctChange - a.pctChange),
      sellActions: all.filter(a => a.type === 'sell').sort((a,b) => a.pctChange - b.pctChange),
    };
  }, [INVESTORS, QUARTERLY_ACTIVITY]);

  // Hero trade highlights: pick top buy + top sell for the marquee
  const heroHighlights = useMemo(() => {
    const picks = [];
    if (buyActions.length > 0) {
      const a = buyActions[0];
      picks.push({ investor: a.investor, ticker: a.ticker, pct: Math.round(a.pctChange) > 999 ? L.t('common.significantIncrease') : `+${Math.round(a.pctChange)}%`, color: t.green, type: 'buy' });
    }
    if (sellActions.length > 0) {
      const a = sellActions[0];
      picks.push({ investor: a.investor, ticker: a.ticker, pct: `${Math.round(a.pctChange)}%`, color: t.red, type: 'sell' });
    }
    if (newPositions.length > 0) {
      const a = newPositions[0];
      picks.push({ investor: a.investor, ticker: a.ticker, pct: L.t('common.new'), color: t.accent, type: 'new' });
    }
    return picks.slice(0, 3);
  }, [buyActions, sellActions, newPositions, t, L]);

  // ===== Task 5: 이번 분기 하이라이트 (한줄 요약) =====
  const quarterHighlights = useMemo(() => {
    if (!INVESTORS.length) return [];
    const highlights = [];

    // 1. 가장 큰 QoQ 상승 투자자
    const topRiser = [...INVESTORS].sort((a, b) => b.metrics.qoqChange - a.metrics.qoqChange)[0];
    if (topRiser && topRiser.metrics.qoqChange > 0) {
      highlights.push({ icon: TrendingUp, color: '#22c55e', text: L.t('dashboard.hlRiser').replace('{name}', L.investorName(topRiser)).replace('{pct}', `+${topRiser.metrics.qoqChange}%`) });
    }

    // 2. 가장 큰 QoQ 하락 투자자
    const topFaller = [...INVESTORS].sort((a, b) => a.metrics.qoqChange - b.metrics.qoqChange)[0];
    if (topFaller && topFaller.metrics.qoqChange < 0) {
      highlights.push({ icon: ArrowDownRight, color: '#ef4444', text: L.t('dashboard.hlFaller').replace('{name}', L.investorName(topFaller)).replace('{pct}', `${topFaller.metrics.qoqChange}%`) });
    }

    // 3. 가장 큰 비중 축소 종목 (히어로에 확대가 있으므로 축소로 차별화)
    if (sellActions.length > 0) {
      const top = sellActions[0];
      const pctStr = `${Math.round(top.pctChange)}%`;
      highlights.push({ icon: ArrowDownRight, color: '#f59e0b', text: L.t('dashboard.hlTopSell').replace('{name}', L.investorName(top.investor)).replace('{ticker}', top.ticker).replace('{pct}', pctStr) });
    }

    // 4. 신규 매수 총 수
    if (newPositions.length > 0) {
      highlights.push({ icon: Plus, color: '#8b5cf6', text: L.t('dashboard.hlNewCount').replace('{count}', newPositions.length) });
    }

    return highlights.slice(0, 4);
  }, [INVESTORS, sellActions, newPositions, L]);

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
        onClick={()=>handleActivityClick(act.investor.id)}
        onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleActivityClick(act.investor.id);}}}
        onMouseEnter={e=>{e.currentTarget.style.background=t.cardRowHover;e.currentTarget.style.borderColor=t.glassBorderHover;}}
        onMouseLeave={e=>{e.currentTarget.style.background=defaultBg;e.currentTarget.style.borderColor=defaultBorder;}}
        role="button" tabIndex={0} aria-label={`${L.investorName(act.investor)} - ${act.ticker} ${label}`}>
        <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{background:act.investor.gradient}}>{act.investor.avatar}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold" style={{color:t.text}}>{act.ticker}</div>
          <div className="text-xs" style={{color:t.textMuted}}>{act.name}</div>
        </div>
        <span className="text-xs font-medium" style={{color}}>{label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="hero-enter hero-enter-1 text-center py-8 sm:py-12" role="banner">
        <p className="text-sm sm:text-base font-semibold mb-3 tracking-wide" style={{color:t.accent}}>{L.t('dashboard.subtitle')}</p>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3" style={{color:t.text, letterSpacing:'-0.025em'}}>
          {L.t('dashboard.title')}
        </h1>
        <p className="text-base sm:text-lg mb-4" style={{color:t.textSecondary}}>
          {L.t('dashboard.description')}
        </p>
        {latestQuarter && (
          <p className="text-xs mb-6" style={{color:t.textMuted}}>
            {L.t('dashboard.dataSourceLabel').replace('{quarter}', L.quarter(latestQuarter))}
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto mb-6">
          {[
            { l: L.t('dashboard.totalAum'), v: formatUSD(totalAUM), unit: "" },
            { l: L.t('dashboard.trackedStocks'), v: `${totalStocks}`, unit: L.t('common.stocks_count') },
            { l: L.t('dashboard.trackedInvestors'), v: `${INVESTORS.length}`, unit: L.t('common.people') },
            { l: L.t('dashboard.latestData'), v: latestQuarter ? L.quarter(latestQuarter) : "-", unit: "" },
          ].map((s, i) => (
            <div key={i} className={`hero-enter hero-enter-${i+2}`}>
              <div className="stat-value text-3xl sm:text-4xl font-bold mb-1 whitespace-nowrap" style={{color:t.text}}>{s.v}<span className="text-base font-medium" style={{color:t.textSecondary}}>{s.unit}</span></div>
              <div className="text-xs" style={{color:t.textMuted}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Trade Highlights — Card Style */}
        {heroHighlights.length > 0 && (
          <div className="hero-enter hero-enter-6 mb-6">
            <p className="text-xs font-medium mb-3" style={{color:t.textMuted}}>{L.t('dashboard.recentMoves')}</p>
            <div className="flex flex-wrap items-stretch justify-center gap-3">
              {heroHighlights.map((h, i) => {
                const cardBg = t.name==='dark'?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.02)';
                const cardBorder = t.name==='dark'?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)';
                const typeLabel = h.type==='buy'? (L.locale==='ko'?'비중 확대':'Increased') : h.type==='sell'? (L.locale==='ko'?'비중 축소':'Decreased') : (L.locale==='ko'?'신규 매수':'New Position');
                return (
                  <button key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{background:cardBg, border:`1px solid ${cardBorder}`}}
                    onClick={()=>onNavigate("investor",h.investor.id)}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{background:h.investor.gradient}}>{h.investor.avatar}</div>
                    <div className="text-left">
                      <div className="text-sm font-bold" style={{color:t.text}}>{h.ticker} <span className="font-semibold" style={{color:h.color}}>{h.pct}</span></div>
                      <div className="text-xs" style={{color:t.textMuted}}>{L.investorName(h.investor)} · {typeLabel}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ARK Today Preview — 히어로에서 살아있는 데이터 체감 */}
        {arkDailyTrades.length > 0 && (() => {
          const latest = arkDailyTrades[0];
          const topBuys = latest.trades.filter(tr => tr.direction?.toLowerCase() === 'buy').slice(0, 2).map(tr => tr.ticker);
          const topSells = latest.trades.filter(tr => tr.direction?.toLowerCase() === 'sell').slice(0, 2).map(tr => tr.ticker);
          const parts = [];
          if (topBuys.length > 0) parts.push(`${L.t('common.buy')} ${topBuys.join(', ')}`);
          if (topSells.length > 0) parts.push(`${L.t('common.sell')} ${topSells.join(', ')}`);
          if (parts.length === 0) return null;
          return (
            <div className="hero-enter hero-enter-7 mb-4">
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all hover:scale-[1.02] cursor-pointer"
                style={{background:t.name==='dark'?'rgba(245,158,11,0.1)':'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', color:'#f59e0b'}}
                onClick={()=>{trackCtaClick('ark_today_preview','hero');onNavigate("investor","cathie");}}>
                <span style={{color:t.textSecondary}}>{L.t('dashboard.arkTodayLabel')}</span>
                <span>{parts.join(' · ')}</span>
              </button>
            </div>
          );
        })()}

        {/* CTA Button */}
        <div className="hero-enter hero-enter-8">
          <button
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:shadow-lg active:scale-95"
            style={{background:t.accent}}
            onClick={()=>{trackCtaClick('portfolio_view','hero');investorGridRef.current?.scrollIntoView({behavior:'smooth',block:'start'});}}>
            {L.t('dashboard.ctaButton')}
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* ===== 이번 분기 하이라이트 (Task 5) ===== */}
      {quarterHighlights.length > 0 && (
        <div className="hero-enter hero-enter-9 -mt-3">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} style={{ color: t.amber }} />
            <span className="text-sm font-bold" style={{ color: t.text }}>{L.t('dashboard.quarterHighlights')}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {quarterHighlights.map((hl, i) => {
              const I = hl.icon;
              return (
                <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
                  style={{ background: `${hl.color}08`, border: `1px solid ${hl.color}15` }}>
                  <I size={14} style={{ color: hl.color }} />
                  <span className="text-xs font-medium" style={{ color: t.text }}>{hl.text}</span>
                </div>
              );
            })}
          </div>
        </div>
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
                    onClick={()=>{trackCtaClick('ark_view_all','ark_section');onNavigate("investor","cathie");}}>
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
