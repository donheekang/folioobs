import { useMemo, memo, useState, useEffect, useRef } from "react";
import {
  ArrowUpRight, ArrowDownRight, Briefcase, Plus, Layers, BarChart3, ChevronDown
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useLocale } from "../hooks/useLocale";
import { useData } from "../hooks/useDataProvider";
import { STYLE_ICONS } from "../data";
import { formatUSD } from "../utils/format";
import { GlassCard, Badge, MiniChart, WatchButton } from "../components/shared";
import SectorTreemap from "../components/SectorTreemap";
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
  const { investors: INVESTORS, holdings: HOLDINGS, quarterlyHistory: QUARTERLY_HISTORY, quarterlyActivity: QUARTERLY_ACTIVITY, latestQuarter, lastUpdatedAt, loading: dataLoading } = useData();
  const { toggleInvestor, isWatchedInv } = watchlist;
  const totalAUM = useMemo(() => INVESTORS.reduce((s,i) => s+i.aum, 0), [INVESTORS]);
  const avgH = useMemo(() => {
    if (!INVESTORS.length) return 0;
    return Math.round(INVESTORS.reduce((s,i)=>s+i.metrics.holdingCount,0)/INVESTORS.length);
  }, [INVESTORS]);

  const investorGridRef = useRef(null);

  // Brief skeleton on first mount (smooth entry feel)
  const [ready, setReady] = useState(false);
  useEffect(() => { const id = setTimeout(() => setReady(true), 350); return () => clearTimeout(id); }, []);

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
      picks.push({ investor: a.investor, ticker: a.ticker, pct: Math.round(a.pctChange) > 999 ? '+999%' : `+${Math.round(a.pctChange)}%`, color: t.green, type: 'buy' });
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
        {lastUpdatedAt && (
          <p className="text-xs mb-6" style={{color:t.textMuted}}>
            {L.t('dashboard.dataUpdate')}: {new Date(lastUpdatedAt).toLocaleDateString(L.locale === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto mb-6">
          {[
            { l: L.t('dashboard.trackedInvestors'), v: `${INVESTORS.length}`, unit: L.t('common.people') },
            { l: L.t('dashboard.totalAum'), v: formatUSD(totalAUM), unit: "" },
            { l: L.t('dashboard.avgHoldings'), v: `${avgH}`, unit: L.t('common.items') },
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

        {/* CTA Button */}
        <div className="hero-enter hero-enter-7">
          <button
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:shadow-lg active:scale-95"
            style={{background:t.accent}}
            onClick={()=>investorGridRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}>
            {L.t('dashboard.ctaButton')}
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

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
                    <Badge color={inv.metrics.qoqChange>=0?t.green:t.red}>{inv.metrics.qoqChange>=0?<ArrowUpRight size={11}/>:<ArrowDownRight size={11}/>}{inv.metrics.qoqChange>=0?'+':''}{inv.metrics.qoqChange}%</Badge>
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

      {!ready ? null : <>
      {/* Visualization: Sector Treemap + Overlap Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard hover={false}>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Layers size={18} style={{color:t.purple}} />
              <h3 className="font-bold" style={{color:t.text}}>{L.t('dashboard.sectorDistribution')}</h3>
            </div>
            <div role="img" aria-label={L.t('dashboard.sectorDistribution')}>
              <SectorTreemap onNavigate={onNavigate} />
            </div>
          </div>
        </GlassCard>
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
      </div>

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
              {newPositions.map((act, i) => <ActivityItem key={i} act={act} label={L.t('common.new')} color={t.accent} />)}
              {newPositions.length === 0 && <div className="text-xs text-center py-4" style={{color:t.textMuted}}>{L.t('common.none')}</div>}
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
              {buyActions.map((act, i) => <ActivityItem key={i} act={act} label={Math.round(act.pctChange) > 999 ? '+999%↑' : `+${Math.round(act.pctChange)}%`} color={t.green} />)}
              {buyActions.length === 0 && <div className="text-xs text-center py-4" style={{color:t.textMuted}}>{L.t('common.none')}</div>}
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
              {sellActions.map((act, i) => <ActivityItem key={i} act={act} label={`${Math.round(act.pctChange)}%`} color={t.red} />)}
              {sellActions.length === 0 && <div className="text-xs text-center py-4" style={{color:t.textMuted}}>{L.t('common.none')}</div>}
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
