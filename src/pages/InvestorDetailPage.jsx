import React, { useState, useMemo } from "react";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, DollarSign, Briefcase, Target, Activity, Clock, Lightbulb, ChevronDown, ChevronUp, Calendar, TrendingUp, TrendingDown, Plus, Minus, LogOut, PieChart as PieIcon, Star, AlertTriangle, Brain, Zap } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useLocale } from "../hooks/useLocale";
import { useData } from "../hooks/useDataProvider";
import { SECTOR_COLORS, STYLE_ICONS, TAG_COLORS_MAP } from "../data";
import { formatUSD, formatShares, formatChange } from "../utils/format";
import { GlassCard, Badge, ChartTooltip, WatchButton, QuarterlyTimeline } from "../components/shared";
import { getSectorData, generateInsights } from "../utils/insights";
import { ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

// ============================================================
// ARK 일별 매매 — 월별 섹션 (날짜 탭 + 매매 리스트)
// ============================================================
const ArkMonthSection = ({ group, theme: t, onDateSelect }) => {
  const L = useLocale();
  const [selectedDate, setSelectedDate] = useState(() => {
    const initDate = group.days[0]?.date || null;
    // 초기 날짜를 부모에게 전달
    if (initDate) setTimeout(() => onDateSelect?.(initDate), 0);
    return initDate;
  });
  const weekdays = L.t('investor.weekdays');

  const selectedDay = group.days.find(d => d.date === selectedDate);
  const trades = selectedDay?.trades || [];
  const buys = trades.filter(tr => tr.direction === 'buy');
  const sells = trades.filter(tr => tr.direction === 'sell');

  return (
    <div>
      {/* 월 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-bold" style={{color:t.text}}>{group.label}</span>
        <span className="text-xs" style={{color:t.textMuted}}>{group.days.length}{L.t('investor.dayRecord')}</span>
      </div>

      {/* 날짜 버튼들 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {group.days.map(day => {
          const d = new Date(day.date + 'T00:00:00');
          const dayNum = d.getDate();
          const weekday = weekdays[d.getDay()];
          const isSelected = day.date === selectedDate;
          const dayTrades = day.trades || [];
          const dayBuys = dayTrades.filter(tr => tr.direction === 'buy').length;
          const daySells = dayTrades.filter(tr => tr.direction === 'sell').length;

          return (
            <button
              key={day.date}
              onClick={() => { setSelectedDate(day.date); onDateSelect?.(day.date); }}
              className="flex flex-col items-center px-2.5 py-1.5 rounded-lg text-xs transition-all"
              style={{
                background: isSelected ? `${t.accent}20` : t.name === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                border: isSelected ? `1.5px solid ${t.accent}` : `1px solid ${t.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                color: isSelected ? t.accent : t.textSecondary,
              }}
            >
              <span className="font-bold text-sm">{dayNum}</span>
              <span className="text-[10px]" style={{color: isSelected ? t.accent : t.textMuted}}>{weekday}</span>
              <div className="flex gap-1 mt-0.5">
                {dayBuys > 0 && <span className="w-1.5 h-1.5 rounded-full" style={{background:t.green}} />}
                {daySells > 0 && <span className="w-1.5 h-1.5 rounded-full" style={{background:t.red}} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* 선택된 날짜의 매매 내역 */}
      {selectedDay && (
        <div className="rounded-xl p-3" style={{background: t.name === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)', border: `1px solid ${t.name === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`}}>
          {/* 날짜 + 요약 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{color:t.text}}>
                {(() => { const dd = new Date(selectedDay.date + 'T00:00:00'); return L.locale === 'en' ? dd.toLocaleDateString('en-US', {month:'short',day:'numeric'}) : `${dd.getMonth()+1}월 ${dd.getDate()}일`; })()}
              </span>
              <span className="text-xs" style={{color:t.textMuted}}>
                ({weekdays[new Date(selectedDay.date + 'T00:00:00').getDay()]}{L.locale === 'ko' ? '요일' : ''})
              </span>
            </div>
            <div className="flex items-center gap-2">
              {buys.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{background:`${t.green}15`,color:t.green}}>{L.t('common.buy')} {buys.length}</span>}
              {sells.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{background:`${t.red}15`,color:t.red}}>{L.t('common.sell')} {sells.length}</span>}
            </div>
          </div>

          {/* 매수 목록 */}
          {buys.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-1" style={{color:t.green}}>{L.t('investor.buySell.buy')}</div>
              <div className="space-y-1">
                {buys.map((trade, i) => (
                  <ArkTradeRow key={i} trade={trade} theme={t} />
                ))}
              </div>
            </div>
          )}

          {/* 매도 목록 */}
          {sells.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-1" style={{color:t.red}}>{L.t('investor.buySell.sell')}</div>
              <div className="space-y-1">
                {sells.map((trade, i) => (
                  <ArkTradeRow key={i} trade={trade} theme={t} />
                ))}
              </div>
            </div>
          )}

          {trades.length === 0 && (
            <div className="text-xs text-center py-4" style={{color:t.textMuted}}>{L.t('investor.noChange')}</div>
          )}
        </div>
      )}
    </div>
  );
};

// ARK 개별 매매 행
const ArkTradeRow = ({ trade, theme: t }) => {
  const L = useLocale();
  const isBuy = trade.direction === 'buy';
  const color = isBuy ? t.green : t.red;
  const sharesFmt = Math.abs(trade.sharesChange).toLocaleString();
  const weightDiff = (trade.weightToday - (trade.weightPrev || 0));
  const diffStr = weightDiff >= 0 ? `+${weightDiff.toFixed(2)}` : weightDiff.toFixed(2);

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{background:`${color}06`}}>
      <div className="flex items-center gap-2 min-w-0">
        {trade.isNew && <span className="text-[10px] font-bold px-1 py-0.5 rounded" style={{background:`${t.accent}15`,color:t.accent}}>{L.t('common.new')}</span>}
        {trade.isExit && <span className="text-[10px] font-bold px-1 py-0.5 rounded" style={{background:`${t.red}15`,color:t.red}}>EXIT</span>}
        <span className="text-sm font-bold" style={{color:t.text}}>{trade.ticker}</span>
        <span className="text-xs truncate hidden sm:inline" style={{color:t.textMuted}}>{trade.company}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs" style={{color:t.textSecondary}}>{sharesFmt}{L.t('investor.shares_unit')}</span>
        <span className="text-xs font-medium w-16 text-right" style={{color}}>
          {diffStr}%p
        </span>
      </div>
    </div>
  );
};

const InvestorDetailPage = ({ investorId, onBack, watchlist }) => {
  const t = useTheme();
  const L = useLocale();
  const { investors: INVESTORS, holdings: HOLDINGS, quarterlyHistory: QUARTERLY_HISTORY, quarterlyActivity: QUARTERLY_ACTIVITY, arkDailyTrades, aiInsights, stockPrices, latestQuarter } = useData();
  const [sortKey, setSortKey] = useState("pct");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedArkDate, setSelectedArkDate] = useState(null); // ARK 날짜 선택 추적
  const [expandedTicker, setExpandedTicker] = useState(null); // 시세 확장 행
  const investor = INVESTORS.find(i=>i.id===investorId);
  const rawHoldings = HOLDINGS[investorId]||[];
  // 같은 티커 합산 (SEC 13F에서 share class 별로 분리된 항목 통합)
  const holdings = useMemo(() => {
    const map = new Map();
    rawHoldings.forEach(h => {
      const key = h.ticker;
      if (map.has(key)) {
        const ex = map.get(key);
        ex.value += h.value;
        ex.shares += h.shares;
        ex.pct = Math.round((ex.pct + h.pct) * 100) / 100; // 부동소수점 정밀도 보정
        if (h.change && h.change !== 0) ex.change = h.change;
      } else {
        map.set(key, { ...h });
      }
    });
    return [...map.values()];
  }, [rawHoldings]);
  const history = QUARTERLY_HISTORY[investorId]||[];
  const insights = useMemo(()=> investor ? generateInsights(investor,holdings,L) : [],[investorId, investor, holdings, L]);
  if(!investor) return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm hover:opacity-80" style={{color:t.textMuted}}><ArrowLeft size={16}/> {L.t('common.back')}</button>
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Briefcase size={36} style={{ color: t.textMuted, opacity: 0.3 }} />
        <p className="text-sm" style={{ color: t.textMuted }}>{L.t('investor.notFound')}</p>
        <button onClick={onBack} className="px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: t.accent }}>{L.t('investor.goBack')}</button>
      </div>
    </div>
  );

  const sorted = [...holdings].sort((a,b)=>(sortDir==="desc"?-1:1)*(a[sortKey]-b[sortKey]));
  const sectorData = getSectorData(holdings);
  const SI = STYLE_ICONS[investor.style]||Briefcase;
  const handleSort = (k)=>{ if(sortKey===k)setSortDir(d=>d==="desc"?"asc":"desc"); else{setSortKey(k);setSortDir("desc");} };
  const tagColors = TAG_COLORS_MAP(t);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm hover:opacity-80" style={{color:t.textMuted}}><ArrowLeft size={16}/> {L.t('common.back')}</button>

      <GlassCard glow={investor.gradient} hover={false}>
        <div className="p-6">
          <div className="flex items-start gap-3 sm:gap-4 mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white font-bold text-lg sm:text-xl flex-shrink-0" style={{background:investor.gradient}}>{investor.avatar}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold truncate" style={{color:t.text}}>{L.investorName(investor)}</h1>
                  <div className="text-xs sm:text-sm" style={{color:t.textMuted}}>{L.fundName(investor)} · {L.t('investor.founded')} {investor.founded}{L.t('investor.year')}</div>
                </div>
                <WatchButton active={watchlist.isWatchedInv(investorId)} onClick={() => watchlist.toggleInvestor(investorId)} size={18} />
              </div>
              <div className="flex items-center gap-2 mt-2"><Badge color={investor.color}><SI size={12}/> {L.style(investor.style)}</Badge><Badge color={t.accent}>AUM {formatUSD(investor.aum)}</Badge></div>
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{color:t.textSecondary}}>{L.bio(investor)}</p>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[{icon:DollarSign,l:L.t('investor.aum'),v:formatUSD(investor.aum),c:t.blue},{icon:Briefcase,l:L.t('investor.holdingCount'),v:`${holdings.length}`,c:t.green},{icon:Target,l:L.t('investor.maxWeight'),v:`${investor.metrics.topHoldingPct.toFixed(1)}%`,sub:sorted[0]?.ticker,c:t.amber},{icon:Activity,l:L.t('investor.qoqChange'),v:`${investor.metrics.qoqChange>=0?'+':''}${investor.metrics.qoqChange}%`,c:investor.metrics.qoqChange>=0?t.green:t.red}].map((s,i)=>{
          const I=s.icon;
          return(<GlassCard key={i} hover={false}><div className="p-4"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 rounded-lg" style={{background:`${s.c}15`}}><I size={14} style={{color:s.c}}/></div><span className="text-xs" style={{color:t.textMuted}}>{s.l}</span></div><div className="text-xl font-bold" style={{color:t.text}}>{s.v}</div>{s.sub&&<div className="text-xs mt-0.5" style={{color:s.c}}>{s.sub}</div>}</div></GlassCard>);
        })}
      </div>

      {/* ===== 이번 분기 변동 요약 ===== */}
      {(() => {
        const activity = (QUARTERLY_ACTIVITY[investorId] || []);
        const latestQ = activity.length > 0 ? activity[0] : null;
        const latestActions = latestQ?.actions || [];

        // holdings에서 분류
        const newBuys = holdings.filter(h => h.change === 100);
        const increased = holdings.filter(h => h.change > 0 && h.change !== 100);
        const decreased = holdings.filter(h => h.change < 0);

        // quarterlyActivity에서 exit 데이터
        const exits = latestActions.filter(a => a.type === 'exit');

        const totalChanges = newBuys.length + exits.length + increased.length + decreased.length;
        if (totalChanges === 0) return null;

        const categories = [
          { key: 'new', label: L.t('investor.newPositions'), icon: Plus, color: t.accent || '#8B5CF6', items: newBuys.map(h => ({ ticker: h.ticker, name: h.name, pct: h.pct, change: null })) },
          { key: 'exit', label: L.t('investor.exits'), icon: LogOut, color: t.red, items: exits.map(a => ({ ticker: a.ticker, name: a.name, pct: null, change: a.pctChange })) },
          { key: 'up', label: L.t('investor.increased'), icon: TrendingUp, color: t.green, items: increased.sort((a,b) => b.change - a.change).map(h => ({ ticker: h.ticker, name: h.name, pct: h.pct, change: h.change })) },
          { key: 'down', label: L.t('investor.decreased'), icon: TrendingDown, color: t.red, items: decreased.sort((a,b) => a.change - b.change).map(h => ({ ticker: h.ticker, name: h.name, pct: h.pct, change: h.change })) },
        ].filter(c => c.items.length > 0);

        return (
          <GlassCard hover={false}>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg" style={{background:`${t.amber}20`}}>
                  <Zap size={16} style={{color:t.amber}} />
                </div>
                <h3 className="font-bold" style={{color:t.text}}>{L.t('investor.quarterlyChangeSummary')}</h3>
                {latestQ && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{background:`${t.accent}15`, color:t.accent}}>{latestQ.q}</span>}
                <Badge color={t.amber}>{totalChanges}{L.t('common.stocks_count')}</Badge>
              </div>

              {/* 카테고리별 요약 카운트 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {[
                  { label: L.t('investor.newPositions'), count: newBuys.length, color: t.accent || '#8B5CF6', icon: Plus },
                  { label: L.t('investor.exits'), count: exits.length, color: t.red, icon: LogOut },
                  { label: L.t('investor.increased'), count: increased.length, color: t.green, icon: TrendingUp },
                  { label: L.t('investor.decreased'), count: decreased.length, color: t.red, icon: TrendingDown },
                ].map((s, i) => {
                  const I = s.icon;
                  return (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{background: s.count > 0 ? `${s.color}08` : 'transparent', border: `1px solid ${s.count > 0 ? `${s.color}20` : t.cardRowBorder}`}}>
                      <I size={14} style={{color: s.count > 0 ? s.color : t.textMuted}} />
                      <span className="text-xs" style={{color: t.textSecondary}}>{s.label}</span>
                      <span className="text-sm font-bold ml-auto" style={{color: s.count > 0 ? s.color : t.textMuted}}>{s.count}</span>
                    </div>
                  );
                })}
              </div>

              {/* 카테고리별 종목 리스트 */}
              <div className="space-y-3">
                {categories.map(cat => {
                  const CatIcon = cat.icon;
                  return (
                    <div key={cat.key}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <CatIcon size={13} style={{color: cat.color}} />
                        <span className="text-xs font-semibold" style={{color: cat.color}}>{cat.label}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.items.slice(0, 10).map((item, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs" style={{background: `${cat.color}08`, border: `1px solid ${cat.color}15`}}>
                            <span className="font-bold" style={{color: t.text}}>{item.ticker}</span>
                            {item.pct != null && <span style={{color: t.textMuted}}>{item.pct.toFixed(1)}%</span>}
                            {item.change != null && item.change !== 100 && (
                              <span className="font-medium" style={{color: cat.color}}>
                                {item.change > 0 ? '+' : ''}{Math.round(item.change)}%
                              </span>
                            )}
                          </div>
                        ))}
                        {cat.items.length > 10 && <span className="text-xs self-center px-1.5" style={{color: t.textMuted}}>+{cat.items.length - 10}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard hover={false}>
          <div className="p-5">
            <h3 className="font-bold mb-4" style={{color:t.text}}>{L.t('investor.sectorAllocation')}</h3>
            <div role="img" aria-label={`${L.investorName(investor)} ${L.t('investor.sectorAllocation')}. ${sectorData.slice(0,3).map(s => `${s.name} ${s.value.toFixed(1)}%`).join(', ')} 등`}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart><Pie data={sectorData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3} stroke="none">{sectorData.map((s,i)=><Cell key={i} fill={SECTOR_COLORS[s.name]||"#64748B"}/>)}</Pie><Tooltip content={<ChartTooltip/>}/></PieChart>
            </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
              {sectorData.map((s,i)=>(<div key={i} className="flex items-center gap-1.5 text-xs"><div className="w-2 h-2 rounded-full" style={{background:SECTOR_COLORS[s.name]||"#64748B"}}/><span style={{color:t.textSecondary}}>{L.sector(s.name)}</span><span className="font-medium" style={{color:t.text}}>{s.value.toFixed(1)}%</span></div>))}
            </div>
          </div>
        </GlassCard>

        <GlassCard hover={false}>
          <div className="p-5">
            <h3 className="font-bold mb-4" style={{color:t.text}}>{L.t('investor.aumTrend')}</h3>
            {history.length >= 2 ? (
            <>
            <div role="img" aria-label={`${L.investorName(investor)} ${L.t('investor.aumTrend')}`}>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={history}>
                <defs><linearGradient id="aG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={investor.color} stopOpacity={0.3}/><stop offset="100%" stopColor={investor.color} stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid}/>
                <XAxis dataKey="q" tick={{fontSize:11,fill:t.textMuted}} stroke="transparent"/>
                <YAxis tick={{fontSize:11,fill:t.textMuted}} stroke="transparent"/>
                <Tooltip content={<ChartTooltip/>}/>
                <Area type="monotone" dataKey="value" stroke={investor.color} strokeWidth={2.5} fill="url(#aG)" dot={{r:4,fill:investor.color,stroke:t.bg,strokeWidth:2}} name="AUM ($B)"/>
              </AreaChart>
            </ResponsiveContainer>
            </div>
            </>
            ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-3 px-4">
              {investorId === 'cathie' ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: t.name === 'dark' ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.08)' }}>
                    <Calendar size={14} style={{ color: '#8B5CF6' }} />
                    <span className="text-xs font-semibold" style={{ color: '#8B5CF6' }}>{L.t('investor.dailyTradeDataBadge')}</span>
                  </div>
                  {history.length === 1 && (
                    <p className="text-sm font-medium" style={{ color: t.text }}>
                      AUM: {formatUSD(history[0].value)} ({history[0].q})
                    </p>
                  )}
                  <p className="text-xs text-center leading-relaxed max-w-xs" style={{ color: t.textMuted }}>
                    {L.t('investor.arkDailyNotice')}
                  </p>
                  <p className="text-xs text-center" style={{ color: t.accent || '#8B5CF6', opacity: 0.8 }}>
                    {L.t('investor.arkDailyNoticeSub')}
                  </p>
                </>
              ) : (
                <>
                  <Activity size={28} style={{ color: t.textMuted, opacity: 0.3 }} />
                  <p className="text-xs text-center" style={{ color: t.textMuted }}>
                    {history.length === 1 ? `AUM: ${formatUSD(history[0].value)} (${history[0].q})` : L.t('investor.noHoldings')}
                  </p>
                  <p className="text-xs text-center" style={{ color: t.textMuted, opacity: 0.6 }}>
                    {L.t('investor.noQuarterlyTrend')}
                  </p>
                </>
              )}
            </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Holdings Table */}
      <GlassCard hover={false}>
        <div className="p-4 sm:p-5">
          <h3 className="font-bold mb-4" style={{color:t.text}}>{L.t('investor.holdings')}</h3>
          {/* 보유 종목 없음 */}
          {sorted.length === 0 && (
            <div className="text-center py-12">
              <Briefcase size={32} style={{ color: t.textMuted, opacity: 0.3 }} className="mx-auto mb-3" />
              <p className="text-sm" style={{ color: t.textMuted }}>{L.t('investor.noHoldings')}</p>
            </div>
          )}
          {/* Mobile: Card layout */}
          <div className="sm:hidden space-y-2">
            {sorted.map((h,i)=>{
              const sp = stockPrices?.[h.ticker];
              const isExpanded = expandedTicker === h.ticker;
              return (
              <div key={i} className="rounded-xl" style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', border: `1px solid ${t.cardRowBorder}` }}>
                <div className="p-3 cursor-pointer" onClick={()=>setExpandedTicker(isExpanded ? null : h.ticker)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <WatchButton active={watchlist.isWatchedTkr(h.ticker)} onClick={(e) => { e.stopPropagation(); watchlist.toggleTicker(h.ticker); }} size={12} />
                      <div>
                        <span className="font-semibold text-sm" style={{color:t.text}}>{h.ticker}</span>
                        <span className="text-xs ml-1.5" style={{color:t.textMuted}}>{h.name}</span>
                      </div>
                      {isExpanded ? <ChevronUp size={12} style={{color:t.textMuted}}/> : <ChevronDown size={12} style={{color:t.textMuted, opacity:0.4}}/>}
                    </div>
                    {(() => { const ch = formatChange(h.change); const displayCh = ch === '신규' ? L.t('common.new') : ch === '대폭 확대' ? L.t('common.significantIncrease') : ch; return ch === '신규' ? <Badge color={t.green}><ArrowUpRight size={10}/> {displayCh}</Badge> : ch === null ? <span className="text-xs" style={{color:t.textMuted}}>—</span> : <span className="flex items-center gap-0.5 font-medium text-xs" style={{color:h.change>0?t.green:t.red}}>{h.change>0?<ArrowUpRight size={12}/>:<ArrowDownRight size={12}/>}{displayCh}</span>; })()}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{background:t.name==='dark'?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'}}>
                        <div className="h-full rounded-full" style={{width:`${Math.min(h.pct*3,100)}%`,background:investor.gradient}}/>
                      </div>
                      <span className="text-xs font-medium" style={{color:t.text}}>{h.pct.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge color={SECTOR_COLORS[h.sector]||"#64748B"}>{L.sector(h.sector)}</Badge>
                      <span className="text-xs font-medium" style={{color:t.text}}>{formatUSD(h.value)}</span>
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1" style={{borderTop:`1px solid ${t.cardRowBorder}`}}>
                    {sp ? (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <div><span style={{color:t.textMuted}}>현재가 </span><span className="font-bold" style={{color:t.text}}>${sp.current?.toFixed(2)}</span></div>
                        {sp.dailyChange !== null && sp.dailyChange !== undefined && (
                          <div><span style={{color:t.textMuted}}>일일 </span><span className="font-medium" style={{color:sp.dailyChange>=0?t.green:t.red}}>{sp.dailyChange>=0?'+':''}{sp.dailyChange.toFixed(2)}%</span></div>
                        )}
                        {sp.sinceFiling !== null && sp.sinceFiling !== undefined && (
                          <div><span style={{color:t.textMuted}}>공시후 </span><span className="font-medium" style={{color:sp.sinceFiling>=0?t.green:t.red}}>{sp.sinceFiling>=0?'+':''}{sp.sinceFiling.toFixed(2)}%</span></div>
                        )}
                        {sp.quarterEnd && <div><span style={{color:t.textMuted}}>분기말 </span><span style={{color:t.textSecondary}}>${sp.quarterEnd.toFixed(2)}</span></div>}
                        <div><span style={{color:t.textMuted}}>기준 </span><span style={{color:t.textSecondary}}>{sp.date}</span></div>
                      </div>
                    ) : (
                      <span className="text-xs" style={{color:t.textMuted}}>시세 데이터 없음</span>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
          {/* Desktop: Table layout */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr style={{borderBottom:`1px solid ${t.tableBorder}`}}>
                {[{k:null,l:""},{k:null,l:L.t('investor.ticker')},{k:"pct",l:L.t('investor.weight')},{k:"value",l:L.t('investor.value')},{k:"shares",l:L.t('investor.shares')},{k:null,l:L.t('investor.sector')},{k:"change",l:L.t('investor.change')}].map((c,i)=>(
                  <th key={i} className={`text-left py-2.5 px-3 text-xs font-medium ${c.k?'cursor-pointer':''}`} style={{color:t.textMuted}} onClick={()=>c.k&&handleSort(c.k)}>
                    <div className="flex items-center gap-1">{c.l}{sortKey===c.k&&(sortDir==="desc"?<ChevronDown size={11}/>:<ChevronUp size={11}/>)}</div>
                  </th>
                ))}
              </tr></thead>
              <tbody>{sorted.map((h,i)=>{
                const sp = stockPrices?.[h.ticker];
                const isExpanded = expandedTicker === h.ticker;
                return (<React.Fragment key={h.ticker}>
                <tr style={{borderBottom: isExpanded ? 'none' : `1px solid ${t.cardRowBorder}`, cursor: 'pointer'}}
                  onClick={()=>setExpandedTicker(isExpanded ? null : h.ticker)}
                  onMouseEnter={e=>e.currentTarget.style.background=t.cardRowHover}
                  onMouseLeave={e=>e.currentTarget.style.background=isExpanded ? (t.name==='dark'?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)') : 'transparent'}>
                  <td className="py-3 px-1 w-8" onClick={e=>e.stopPropagation()}><WatchButton active={watchlist.isWatchedTkr(h.ticker)} onClick={() => watchlist.toggleTicker(h.ticker)} size={12} /></td>
                  <td className="py-3 px-3"><div className="flex items-center gap-1.5"><div className="font-semibold" style={{color:t.text}}>{h.ticker}</div>{isExpanded ? <ChevronUp size={12} style={{color:t.textMuted}}/> : <ChevronDown size={12} style={{color:t.textMuted, opacity:0.4}}/>}</div><div className="text-xs" style={{color:t.textMuted}}>{h.name}</div></td>
                  <td className="py-3 px-3"><div className="flex items-center gap-2"><div className="w-16 h-1.5 rounded-full overflow-hidden" style={{background:`${t.name==='dark'?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'}`}}><div className="h-full rounded-full" style={{width:`${Math.min(h.pct*3,100)}%`,background:investor.gradient}}/></div><span className="font-medium" style={{color:t.text}}>{h.pct.toFixed(1)}%</span></div></td>
                  <td className="py-3 px-3 font-medium" style={{color:t.text}}>{formatUSD(h.value)}</td>
                  <td className="py-3 px-3" style={{color:t.textSecondary}}>{formatShares(h.shares)}</td>
                  <td className="py-3 px-3"><Badge color={SECTOR_COLORS[h.sector]||"#64748B"}>{L.sector(h.sector)}</Badge></td>
                  <td className="py-3 px-3">
                    {(() => { const ch = formatChange(h.change); const displayCh = ch === '신규' ? L.t('common.new') : ch === '대폭 확대' ? L.t('common.significantIncrease') : ch; return ch === '신규' ? <Badge color={t.green}><ArrowUpRight size={10}/> {displayCh}</Badge> : ch === null ? <span style={{color:t.textMuted}}>—</span> : <span className="flex items-center gap-0.5 font-medium text-sm" style={{color:h.change>0?t.green:t.red}}>{h.change>0?<ArrowUpRight size={14}/>:<ArrowDownRight size={14}/>}{displayCh}</span>; })()}
                  </td>
                </tr>
                {isExpanded && (
                  <tr style={{borderBottom:`1px solid ${t.cardRowBorder}`, background: t.name==='dark'?'rgba(255,255,255,0.03)':'rgba(0,0,0,0.02)'}}>
                    <td colSpan={7} className="px-4 py-3">
                      {sp ? ((() => {
                        // 분기 라벨 계산 (예: "Q4'25")
                        const qLabel = latestQuarter ? latestQuarter.replace(/^(\d{4})Q(\d)$/, (_, y, q) => `Q${q}'${y.slice(2)}`) : '';
                        return (
                        <div className="flex items-center gap-6 text-xs">
                          <div className="flex items-center gap-2">
                            <span style={{color:t.textMuted}}>{L.t('investor.currentPrice')}</span>
                            <span className="font-bold text-sm" style={{color:t.text}}>${sp.current?.toFixed(2)}</span>
                          </div>
                          {sp.dailyChange !== null && sp.dailyChange !== undefined && (
                            <div className="flex items-center gap-1">
                              <span style={{color:t.textMuted}}>{L.t('investor.dailyChange')}</span>
                              <span className="font-medium" style={{color: sp.dailyChange >= 0 ? t.green : t.red}}>
                                {sp.dailyChange >= 0 ? '+' : ''}{sp.dailyChange.toFixed(2)}%
                              </span>
                            </div>
                          )}
                          {sp.sinceFiling !== null && sp.sinceFiling !== undefined && (
                            <div className="flex items-center gap-1">
                              <span style={{color:t.textMuted}}>{qLabel} {L.t('investor.sinceFiling')}</span>
                              <span className="font-medium" style={{color: sp.sinceFiling >= 0 ? t.green : t.red}}>
                                {sp.sinceFiling >= 0 ? '+' : ''}{sp.sinceFiling.toFixed(2)}%
                              </span>
                            </div>
                          )}
                          {sp.quarterEnd && (
                            <div className="flex items-center gap-1">
                              <span style={{color:t.textMuted}}>{qLabel} {L.t('investor.quarterEndPrice')}</span>
                              <span style={{color:t.textSecondary}}>${sp.quarterEnd.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <span style={{color:t.textMuted}}>{L.t('investor.priceDate')}</span>
                            <span style={{color:t.textSecondary}}>{sp.date}</span>
                          </div>
                        </div>);
                      })()) : (
                        <span className="text-xs" style={{color:t.textMuted}}>{L.t('investor.noPriceData')}</span>
                      )}
                    </td>
                  </tr>
                )}
                </React.Fragment>);
              })}</tbody>
            </table>
          </div>
        </div>
      </GlassCard>

      {/* ARK 일별 매매 내역 (캐시 우드 전용) */}
      {investorId === 'cathie' && arkDailyTrades.length > 0 && (() => {
        // 월별 그룹핑
        const monthGroups = {};
        arkDailyTrades.forEach(day => {
          const d = new Date(day.date + 'T00:00:00');
          const monthKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
          const monthLabel = L.locale === 'en'
            ? d.toLocaleDateString('en-US', {month:'short', year:'2-digit'}).replace(' ', " '")
            : `${d.getFullYear()-2000}년 ${d.getMonth()+1}월`;
          if (!monthGroups[monthKey]) monthGroups[monthKey] = { label: monthLabel, days: [] };
          monthGroups[monthKey].days.push(day);
        });
        const months = Object.entries(monthGroups).sort((a,b) => b[0].localeCompare(a[0]));

        return (
          <GlassCard hover={false}>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={18} style={{color:t.accent}} />
                <h3 className="font-bold" style={{color:t.text}}>{L.t('investor.dailyTrades')}</h3>
              </div>

              <div className="space-y-5">
                {months.map(([monthKey, group]) => (
                  <ArkMonthSection key={monthKey} group={group} theme={t} onDateSelect={setSelectedArkDate} />
                ))}
              </div>
            </div>
          </GlassCard>
        );
      })()}

      {/* Quarterly Activity Timeline (캐시우드는 일별 매매가 있으므로 숨김) */}
      {investorId !== 'cathie' && (QUARTERLY_ACTIVITY[investorId] || []).length > 0 && (
        <GlassCard hover={false}>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} style={{color:t.accent}} />
              <h3 className="font-bold" style={{color:t.text}}>{L.t('investor.quarterlyTrades')}</h3>
            </div>
            <QuarterlyTimeline investorId={investorId} />
          </div>
        </GlassCard>
      )}

      {/* Insights — AI 인사이트 우선, 없으면 규칙 기반 fallback */}
      {(() => {
        const invInsights = aiInsights[investorId] || {};
        // 캐시 우드: 선택된 ARK 날짜에 맞는 인사이트 로드
        // 다른 투자자: 최신 인사이트 사용
        let aiData = null;
        if (investorId === 'cathie' && selectedArkDate) {
          // 날짜를 quarter key로 변환: "2026-03-09" → "2026Q1-0309"
          const d = new Date(selectedArkDate + 'T00:00:00');
          const q = Math.ceil((d.getMonth() + 1) / 3);
          const mm = String(d.getMonth()+1).padStart(2,'0');
          const dd = String(d.getDate()).padStart(2,'0');
          const qKey = `${d.getFullYear()}Q${q}-${mm}${dd}`;
          aiData = invInsights[qKey] || null;
        }
        if (!aiData) aiData = invInsights._latest || null;
        const hasAI = aiData && aiData.insights && aiData.insights.length > 0;
        const displayInsights = hasAI ? aiData.insights : insights;

        const AI_TAG_ICONS = { '전략': Brain, '리스크': AlertTriangle, '섹터': PieIcon, '트렌드': TrendingUp, '신규매수': Star, '비중확대': TrendingUp, '비중축소': TrendingDown, '매크로': Activity, '밸류에이션': DollarSign };

        return (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg" style={{background:`${t.purple}20`}}><Lightbulb size={18} style={{color:t.purple}}/></div>
              <h3 className="font-bold" style={{color:t.text}}>{L.t('investor.portfolioInsights')}</h3>
              {hasAI && <Badge color={t.accent}>AI</Badge>}
              <Badge color={t.purple}>{displayInsights.length}{L.t('common.items')}</Badge>
              {hasAI && aiData.quarter && <span className="text-xs" style={{color:t.textMuted}}>{L.quarter(aiData.quarter)}</span>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {hasAI ? displayInsights.map((ins, i) => {
                const I = AI_TAG_ICONS[ins.tag] || Lightbulb;
                const c = tagColors[ins.tag] || t.purple;
                const isEn = L.locale === 'en';
                const title = (isEn && ins.title_en) ? ins.title_en : ins.title;
                const desc = (isEn && ins.desc_en) ? ins.desc_en : ins.desc;
                return (
                  <GlassCard key={i} className="min-w-0 overflow-hidden" glow={`radial-gradient(circle at top left, ${c}08, transparent)`}>
                    <div className="p-4"><div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl mt-0.5 flex-shrink-0" style={{background:`${c}15`,border:`1px solid ${c}20`}}><I size={16} style={{color:c}}/></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <Badge color={c}>{L.tag ? L.tag(ins.tag) : ins.tag}</Badge>
                          {ins.confidence && <span className="text-xs" style={{color:t.textMuted}}>{L.t('investor.confidence')} {ins.confidence}%</span>}
                        </div>
                        <h4 className="font-bold text-sm mb-1 break-words" style={{color:t.text}}>{title}</h4>
                        <p className="text-xs leading-relaxed break-words" style={{color:t.textSecondary}}>{desc}</p>
                      </div>
                    </div></div>
                  </GlassCard>
                );
              }) : displayInsights.map((ins, i) => {
                const I = ins.icon;
                const c = tagColors[ins.tag] || t.textMuted;
                return (
                  <GlassCard key={i} className="min-w-0 overflow-hidden" glow={`radial-gradient(circle at top left, ${c}08, transparent)`}>
                    <div className="p-4"><div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl mt-0.5 flex-shrink-0" style={{background:`${c}15`,border:`1px solid ${c}20`}}><I size={16} style={{color:c}}/></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap"><Badge color={c}>{ins.tag}</Badge></div>
                        <h4 className="font-bold text-sm mb-1 break-words" style={{color:t.text}}>{ins.title}</h4>
                        <p className="text-xs leading-relaxed break-words" style={{color:t.textSecondary}}>{ins.desc}</p>
                      </div>
                    </div></div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default InvestorDetailPage;
