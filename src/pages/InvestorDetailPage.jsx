import React, { useState, useMemo, useRef, useEffect } from "react";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, DollarSign, Briefcase, Target, Activity, Clock, Lightbulb, ChevronDown, ChevronUp, Calendar, TrendingUp, TrendingDown, Plus, Minus, LogOut, PieChart as PieIcon, Star, AlertTriangle, Brain, Zap, FolderOpen } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useLocale } from "../hooks/useLocale";
import { useData } from "../hooks/useDataProvider";
import { SECTOR_COLORS, STYLE_ICONS, TAG_COLORS_MAP } from "../data";
import { formatUSD, formatShares, formatChange } from "../utils/format";
import { GlassCard, Badge, ChartTooltip, WatchButton, QuarterlyTimeline } from "../components/shared";
import { getSectorData, generateInsights } from "../utils/insights";
import { ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

// ============================================================
// 분기 변동 카테고리 (더보기 토글 포함)
// ============================================================
const ChangeCategoryList = ({ cat, onNavigate, theme: t }) => {
  const L = useLocale();
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 5;
  const shown = expanded ? cat.items : cat.items.slice(0, LIMIT);
  const remaining = cat.items.length - LIMIT;
  const CatIcon = cat.icon;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 pb-2" style={{borderBottom:`1px solid ${cat.color}20`}}>
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{background:`${cat.color}15`}}>
          <CatIcon size={13} style={{color: cat.color}} />
        </div>
        <span className="text-sm font-semibold" style={{color: cat.color}}>{cat.label}</span>
        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{background:`${cat.color}12`, color: cat.color}}>{cat.items.length}</span>
      </div>
      <div className="space-y-0.5">
        {shown.map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors"
            style={{background:'transparent'}}
            onClick={()=>onNavigate("stock",item.ticker)}
            onMouseEnter={e=>e.currentTarget.style.background=t.cardRowHover}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <div className="flex items-center gap-2 min-w-0" style={{flex:'1 1 0'}}>
              <span className="text-sm font-bold" style={{color: t.accent}}>{item.ticker}</span>
              <span className="text-xs truncate" style={{color: t.textMuted}}>{L.stockName(item)}</span>
            </div>
            {item.pct != null && (
              <div className="flex items-center gap-1.5 shrink-0" style={{minWidth:70}}>
                <div className="w-10 h-1.5 rounded-full overflow-hidden" style={{background:t.name==='dark'?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)'}}>
                  <div className="h-full rounded-full" style={{width:`${Math.min(item.pct*4,100)}%`,background:cat.color,opacity:0.6}}/>
                </div>
                <span className="text-xs font-medium" style={{color: t.textSecondary}}>{item.pct.toFixed(1)}%</span>
              </div>
            )}
            <div className="shrink-0 text-right" style={{minWidth:56}}>
              {item.change != null && item.change !== 100 ? (
                <span className="text-xs font-bold" style={{color: cat.color}}>
                  {item.change > 0 ? '+' : ''}{Math.round(item.change)}%
                </span>
              ) : cat.key === 'new' ? (
                <span className="text-xs font-bold" style={{color: cat.color}}>NEW</span>
              ) : null}
            </div>
          </div>
        ))}
        {remaining > 0 && (
          <button className="w-full text-center py-2 mt-1 rounded-lg text-xs font-medium cursor-pointer transition-colors"
            style={{color: cat.color, background:'transparent'}}
            onMouseEnter={e=>e.currentTarget.style.background=t.cardRowHover}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}
            onClick={()=>setExpanded(!expanded)}>
            {expanded ? '접기' : `+${remaining} 더보기`}
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================
// ARK 일별 매매 — 월별 섹션 (날짜 탭 + 매매 리스트)
// ============================================================
const ArkMonthSection = ({ group, theme: t, onDateSelect, onNavigate }) => {
  const L = useLocale();
  const [selectedDate, setSelectedDate] = useState(() => {
    const initDate = group.days[0]?.date || null;
    // 초기 날짜를 부모에게 전달
    if (initDate) setTimeout(() => onDateSelect?.(initDate), 0);
    return initDate;
  });
  const weekdays = L.t('investor.weekdays');

  const selectedDay = group.days.find(d => d.date === selectedDate);
  const trades = (selectedDay?.trades || []).filter(tr => tr.ticker !== 'NO_TRADES');
  const isNoTradeDay = trades.length === 0 && (selectedDay?.trades || []).some(tr => tr.ticker === 'NO_TRADES');
  const buys = trades.filter(tr => tr.direction === 'buy');
  const sells = trades.filter(tr => tr.direction === 'sell');

  return (
    <div>
      {/* 날짜 버튼들 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {group.days.map(day => {
          const d = new Date(day.date + 'T00:00:00');
          const dayNum = d.getDate();
          const weekday = weekdays[d.getDay()];
          const isSelected = day.date === selectedDate;
          const dayTrades = (day.trades || []).filter(tr => tr.ticker !== 'NO_TRADES');
          const dayIsNoTrade = dayTrades.length === 0 && (day.trades || []).some(tr => tr.ticker === 'NO_TRADES');
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
                {dayIsNoTrade && <span className="w-1.5 h-1.5 rounded-full" style={{background:t.textMuted, opacity:0.5}} />}
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
                  <ArkTradeRow key={i} trade={trade} theme={t} onNavigate={onNavigate} />
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
                  <ArkTradeRow key={i} trade={trade} theme={t} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          )}

          {trades.length === 0 && (
            <div className="text-xs text-center py-4" style={{color:t.textMuted}}>
              {isNoTradeDay ? (L.locale === 'ko' ? '거래 없음' : 'No trades') : L.t('investor.noChange')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 월별 폴더 탭 네비게이션
const ArkMonthTabs = ({ months, theme: t, onDateSelect, onNavigate }) => {
  const L = useLocale();
  const [activeMonthKey, setActiveMonthKey] = useState(months[0]?.[0] || null);

  const activeGroup = months.find(([key]) => key === activeMonthKey)?.[1] || null;

  return (
    <div>
      {/* 월 탭 바 */}
      <div className="flex gap-1 mb-4" style={{
        borderBottom: `1px solid ${t.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        paddingBottom: '0',
      }}>
        {months.map(([monthKey, group]) => {
          const isActive = monthKey === activeMonthKey;
          const totalTrades = group.days.reduce((sum, day) => {
            const real = (day.trades || []).filter(tr => tr.ticker !== 'NO_TRADES');
            return sum + real.length;
          }, 0);

          return (
            <button
              key={monthKey}
              onClick={() => setActiveMonthKey(monthKey)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all relative"
              style={{
                color: isActive ? t.accent : t.textMuted,
                background: 'transparent',
              }}
            >
              <FolderOpen size={13} style={{ opacity: isActive ? 1 : 0.5 }} />
              <span>{group.label}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                background: isActive ? `${t.accent}15` : (t.name === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                color: isActive ? t.accent : t.textMuted,
              }}>{totalTrades}</span>
              {/* 활성 탭 하단 라인 */}
              {isActive && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full" style={{ background: t.accent }} />
              )}
            </button>
          );
        })}
      </div>

      {/* 선택된 월의 콘텐츠 */}
      {activeGroup && (
        <ArkMonthSection
          key={activeMonthKey}
          group={activeGroup}
          theme={t}
          onDateSelect={onDateSelect}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
};

// ARK 개별 매매 행
const ArkTradeRow = ({ trade, theme: t, onNavigate }) => {
  const L = useLocale();
  const isBuy = trade.direction === 'buy';
  const color = isBuy ? t.green : t.red;
  const sharesFmt = Math.abs(trade.sharesChange).toLocaleString();
  const hasWeight = trade.weightToday != null && trade.weightPrev != null;
  const weightDiff = hasWeight ? (trade.weightToday - trade.weightPrev) : null;
  const diffStr = hasWeight ? (weightDiff >= 0 ? `+${weightDiff.toFixed(2)}` : weightDiff.toFixed(2)) : null;

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{background:`${color}06`}}>
      <div className="flex items-center gap-2 min-w-0">
        {trade.isNew && <span className="text-[10px] font-bold px-1 py-0.5 rounded" style={{background:`${t.accent}15`,color:t.accent}}>{L.t('common.new')}</span>}
        {trade.isExit && <span className="text-[10px] font-bold px-1 py-0.5 rounded" style={{background:`${t.red}15`,color:t.red}}>EXIT</span>}
        <span className="text-sm font-bold cursor-pointer hover:underline" style={{color:t.accent}} onClick={(e)=>{e.stopPropagation();onNavigate?.("stock",trade.ticker);}}>{trade.ticker}</span>
        <span className="text-xs truncate hidden sm:inline" style={{color:t.textMuted}}>{trade.company}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs" style={{color:t.textSecondary}}>{sharesFmt}{L.t('investor.shares_unit')}</span>
        {diffStr != null ? (
          <span className="text-xs font-medium w-16 text-right" style={{color}}>
            {diffStr}%p
          </span>
        ) : (
          <span className="text-xs w-16 text-right" style={{color:t.textMuted}}>—</span>
        )}
      </div>
    </div>
  );
};

const InvestorDetailPage = ({ investorId, onBack, onNavigate, watchlist, scrollTarget, onScrollTargetClear }) => {
  const t = useTheme();
  const L = useLocale();
  const { investors: INVESTORS, holdings: HOLDINGS, quarterlyHistory: QUARTERLY_HISTORY, quarterlyActivity: QUARTERLY_ACTIVITY, arkDailyTrades, aiInsights, stockPrices, latestQuarter } = useData();
  const [sortKey, setSortKey] = useState("pct");
  const [sortDir, setSortDir] = useState("desc");
  const [showAllHoldings, setShowAllHoldings] = useState(false);
  const [selectedArkDate, setSelectedArkDate] = useState(null); // ARK 날짜 선택 추적
  // expandedTicker removed — rows now navigate directly to stock detail
  const dailyTradesRef = useRef(null);

  // scrollTarget이 'daily'면 일별 매매 섹션으로 자동 스크롤
  useEffect(() => {
    if (scrollTarget === 'daily' && dailyTradesRef.current) {
      setTimeout(() => {
        dailyTradesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        onScrollTargetClear?.();
      }, 300);
    }
  }, [scrollTarget, onScrollTargetClear]);
  const investor = INVESTORS.find(i=>i.id===investorId);
  const rawHoldings = HOLDINGS[investorId]||[];
  // 같은 티커 합산 (SEC 13F에서 share class 별로 분리된 항목 통합)
  // + 캐시우드: ARK 일별 매매에서 순매수한 신규 종목 추가
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

    // 캐시우드: ARK 일별 매매에서 holdings에 없는 신규 종목 추가
    if (investorId === 'cathie' && arkDailyTrades?.length > 0) {
      // 기존 holdings 티커의 base 형태도 수집 (SOLQ/U → SOLQ, ETHQ/U → ETHQ)
      const existingBases = new Set();
      for (const key of map.keys()) {
        existingBases.add(key);
        existingBases.add(key.split('/')[0]); // SOLQ/U → SOLQ
        existingBases.add(key.split('.')[0]); // BRK.B → BRK
      }

      const tradesByTicker = {};
      arkDailyTrades.forEach(day => {
        (day.trades || []).forEach(trade => {
          if (!tradesByTicker[trade.ticker]) tradesByTicker[trade.ticker] = { buys: 0, sells: 0, company: trade.company, sector: trade.sector || '' };
          if (trade.direction === 'buy') tradesByTicker[trade.ticker].buys += (trade.sharesChange || 0);
          else tradesByTicker[trade.ticker].sells += (trade.sharesChange || 0);
        });
      });
      Object.entries(tradesByTicker).forEach(([ticker, data]) => {
        const netShares = data.buys - data.sells;
        // 중복 체크: 정확한 매치 + base ticker 매치 (SOLQ/U ↔ SOLQ)
        if (netShares > 0 && !existingBases.has(ticker)) {
          map.set(ticker, {
            ticker,
            name: data.company || ticker,
            nameKo: data.company || ticker,
            value: 0,
            shares: netShares,
            pct: 0,
            change: 100, // formatChange(100) → '신규'
            sector: data.sector || '기타',
            fromTrades: true,
          });
        }
      });
    }

    return [...map.values()];
  }, [rawHoldings, investorId, arkDailyTrades]);
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
  const HOLDINGS_LIMIT = 50;
  const hasMoreHoldings = sorted.length > HOLDINGS_LIMIT;
  const displayHoldings = showAllHoldings ? sorted : sorted.slice(0, HOLDINGS_LIMIT);
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
              <div className="flex items-center gap-2 mt-2 flex-wrap"><Badge color={investor.color}><SI size={12}/> {L.style(investor.style)}</Badge><Badge color={t.accent}>AUM {formatUSD(investor.aum)}</Badge>{investorId === 'cathie' && <><button className="text-xs font-medium px-3 py-1 rounded-full transition-colors cursor-pointer" style={{color:'#f59e0b', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.15)'}} onClick={()=>onNavigate("ark-report")}>{L.locale === 'ko' ? '주간·월간 리포트 →' : 'Weekly/Monthly Report →'}</button><button className="text-xs font-medium px-3 py-1 rounded-full transition-colors cursor-pointer" style={{color:'#22d3ee', background:'rgba(34,211,238,0.08)', border:'1px solid rgba(34,211,238,0.15)'}} onClick={()=>dailyTradesRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}>{L.locale === 'ko' ? '일별 매매 내역 →' : 'Daily Trades →'}</button></>}</div>
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{color:t.textSecondary}}>{L.bio(investor)}</p>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[{icon:DollarSign,l:L.t('investor.aum'),v:formatUSD(investor.aum),c:t.blue},{icon:Briefcase,l:L.t('investor.holdingCount'),v:`${holdings.length}`,c:t.green},{icon:Target,l:L.t('investor.maxWeight'),v:`${investor.metrics.topHoldingPct.toFixed(1)}%`,sub:[...holdings].sort((a,b)=>b.pct-a.pct)[0]?.ticker,c:t.amber},{icon:Activity,l:L.t('investor.qoqChange'),v:`${investor.metrics.qoqChange>=0?'+':''}${investor.metrics.qoqChange}%`,c:investor.metrics.qoqChange>=0?t.green:t.red}].map((s,i)=>{
          const I=s.icon;
          return(<GlassCard key={i} hover={false}><div className="p-4"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 rounded-lg" style={{background:`${s.c}15`}}><I size={14} style={{color:s.c}}/></div><span className="text-xs" style={{color:t.textMuted}}>{s.l}</span></div><div className="text-xl font-bold" style={{color:t.text}}>{s.v}</div>{s.sub&&<div className="text-xs mt-0.5" style={{color:s.c}}>{s.sub}</div>}</div></GlassCard>);
        })}
      </div>

      {/* ===== 이번 분기 변동 요약 (캐시우드는 일별 매매라 분기 요약 불필요) ===== */}
      {(() => {
        if (investorId === 'cathie') return null;
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
          { key: 'new', label: L.t('investor.newPositions'), icon: Plus, color: t.accent || '#8B5CF6', items: newBuys.map(h => ({ ticker: h.ticker, name: h.name, nameEn: h.nameEn, pct: h.pct, change: null })) },
          { key: 'exit', label: L.t('investor.exits'), icon: LogOut, color: t.red, items: exits.map(a => ({ ticker: a.ticker, name: a.name, nameEn: a.nameEn, pct: null, change: a.pctChange })) },
          { key: 'up', label: L.t('investor.increased'), icon: TrendingUp, color: t.green, items: increased.sort((a,b) => b.change - a.change).map(h => ({ ticker: h.ticker, name: h.name, nameEn: h.nameEn, pct: h.pct, change: h.change })) },
          { key: 'down', label: L.t('investor.decreased'), icon: TrendingDown, color: t.red, items: decreased.sort((a,b) => a.change - b.change).map(h => ({ ticker: h.ticker, name: h.name, nameEn: h.nameEn, pct: h.pct, change: h.change })) },
        ].filter(c => c.items.length > 0);

        return (
          <GlassCard hover={false}>
            <div className="p-5">
              {/* 헤더 */}
              <div className="flex items-center gap-2 mb-5">
                <div className="p-1.5 rounded-lg" style={{background:`${t.amber}20`}}>
                  <Zap size={16} style={{color:t.amber}} />
                </div>
                <h3 className="font-bold" style={{color:t.text}}>{L.t('investor.quarterlyChangeSummary')}</h3>
                {latestQ && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{background:`${t.accent}15`, color:t.accent}}>{latestQ.q}</span>}
                <Badge color={t.amber}>{totalChanges}{L.t('common.stocks_count')}</Badge>
              </div>

              {/* 카테고리별 테이블 */}
              <div className="space-y-5">
                {categories.map(cat => (
                  <ChangeCategoryList key={cat.key} cat={cat} onNavigate={onNavigate} theme={t} />
                ))}
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
            {displayHoldings.map((h,i)=>{
              return (
              <div key={i} className="rounded-xl cursor-pointer" style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', border: `1px solid ${t.cardRowBorder}` }}
                onClick={()=>onNavigate("stock",h.ticker)}>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <WatchButton active={watchlist.isWatchedTkr(h.ticker)} onClick={(e) => { e.stopPropagation(); watchlist.toggleTicker(h.ticker); }} size={12} />
                      <div>
                        <span className="font-semibold text-sm" style={{color:t.accent}}>{h.ticker}</span>
                        <span className="text-xs ml-1.5" style={{color:t.textMuted}}>{L.stockName(h)}</span>
                      </div>
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
              <tbody>{displayHoldings.map((h,i)=>{
                return (<React.Fragment key={h.ticker}>
                <tr style={{borderBottom: `1px solid ${t.cardRowBorder}`, cursor: 'pointer'}}
                  onClick={()=>onNavigate("stock",h.ticker)}
                  onMouseEnter={e=>e.currentTarget.style.background=t.cardRowHover}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td className="py-3 px-1 w-8" onClick={e=>e.stopPropagation()}><WatchButton active={watchlist.isWatchedTkr(h.ticker)} onClick={() => watchlist.toggleTicker(h.ticker)} size={12} /></td>
                  <td className="py-3 px-3"><div className="flex items-center gap-1.5"><div className="font-semibold" style={{color:t.accent}}>{h.ticker}</div></div><div className="text-xs" style={{color:t.textMuted}}>{L.stockName(h)}</div></td>
                  <td className="py-3 px-3"><div className="flex items-center gap-2"><div className="w-16 h-1.5 rounded-full overflow-hidden" style={{background:`${t.name==='dark'?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.08)'}`}}><div className="h-full rounded-full" style={{width:`${Math.min(h.pct*3,100)}%`,background:investor.gradient}}/></div><span className="font-medium" style={{color:t.text}}>{h.pct.toFixed(1)}%</span></div></td>
                  <td className="py-3 px-3 font-medium" style={{color:t.text}}>{formatUSD(h.value)}</td>
                  <td className="py-3 px-3" style={{color:t.textSecondary}}>{formatShares(h.shares)}</td>
                  <td className="py-3 px-3"><Badge color={SECTOR_COLORS[h.sector]||"#64748B"}>{L.sector(h.sector)}</Badge></td>
                  <td className="py-3 px-3">
                    {(() => { const ch = formatChange(h.change); const displayCh = ch === '신규' ? L.t('common.new') : ch === '대폭 확대' ? L.t('common.significantIncrease') : ch; return ch === '신규' ? <Badge color={t.green}><ArrowUpRight size={10}/> {displayCh}</Badge> : ch === null ? <span style={{color:t.textMuted}}>—</span> : <span className="flex items-center gap-0.5 font-medium text-sm" style={{color:h.change>0?t.green:t.red}}>{h.change>0?<ArrowUpRight size={14}/>:<ArrowDownRight size={14}/>}{displayCh}</span>; })()}
                  </td>
                </tr>
                </React.Fragment>);
              })}</tbody>
            </table>
          </div>
          {/* 더보기 / 접기 버튼 */}
          {hasMoreHoldings && (
            <div className="mt-4 text-center">
              <button
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                style={{
                  color: investor.color,
                  background: `${investor.color}10`,
                  border: `1.5px solid ${investor.color}25`,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${investor.color}20`; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${investor.color}10`; }}
                onClick={() => setShowAllHoldings(!showAllHoldings)}
              >
                {showAllHoldings
                  ? (L.locale === 'ko' ? '접기' : 'Show Less')
                  : (L.locale === 'ko'
                      ? `+${sorted.length - HOLDINGS_LIMIT}개 더보기`
                      : `Show ${sorted.length - HOLDINGS_LIMIT} More`)
                }
                {showAllHoldings ? <ChevronUp size={14} className="inline ml-1" /> : <ChevronDown size={14} className="inline ml-1" />}
              </button>
              {!showAllHoldings && (
                <p className="text-xs mt-2" style={{ color: t.textMuted }}>
                  {L.locale === 'ko'
                    ? `상위 ${HOLDINGS_LIMIT}개 종목 표시 중 (전체 ${sorted.length}개)`
                    : `Showing top ${HOLDINGS_LIMIT} of ${sorted.length} holdings`}
                </p>
              )}
            </div>
          )}
        </div>
      </GlassCard>

      {/* ARK 일별 매매 내역 (캐시 우드 전용) */}
      <div ref={dailyTradesRef} />
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar size={18} style={{color:t.accent}} />
                  <h3 className="font-bold" style={{color:t.text}}>{L.t('investor.dailyTrades')}</h3>
                </div>
                <button className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                  style={{color:t.accent, background:`${t.accent}10`, border:`1px solid ${t.accent}20`}}
                  onClick={()=>onNavigate("ark-report")}>
                  {L.locale === 'ko' ? '주간·월간 리포트 →' : 'Weekly/Monthly Report →'}
                </button>
              </div>

              {/* 월별 폴더 탭 */}
              <ArkMonthTabs months={months} theme={t} onDateSelect={setSelectedArkDate} onNavigate={onNavigate} />
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
            <QuarterlyTimeline investorId={investorId} onNavigate={onNavigate} />
          </div>
        </GlassCard>
      )}

      {/* Insights — AI 인사이트 우선, 없으면 규칙 기반 fallback */}
      {(() => {
        const invInsights = aiInsights[investorId] || {};
        // 캐시 우드: 선택된 ARK 날짜에 맞는 인사이트 로드
        // 다른 투자자: 최신 인사이트 사용
        let aiData = null;
        // 캐시 우드: 선택된 날짜가 NO_TRADES인지 확인
        const isSelectedNoTradeDay = investorId === 'cathie' && selectedArkDate && arkDailyTrades.some(day =>
          day.date === selectedArkDate && day.trades.some(tr => tr.ticker === 'NO_TRADES') && day.trades.filter(tr => tr.ticker !== 'NO_TRADES').length === 0
        );
        if (investorId === 'cathie' && selectedArkDate && !isSelectedNoTradeDay) {
          // 날짜를 quarter key로 변환: "2026-03-09" → "2026Q1-0309"
          const d = new Date(selectedArkDate + 'T00:00:00');
          const q = Math.ceil((d.getMonth() + 1) / 3);
          const mm = String(d.getMonth()+1).padStart(2,'0');
          const dd = String(d.getDate()).padStart(2,'0');
          const qKey = `${d.getFullYear()}Q${q}-${mm}${dd}`;
          const qKeyAlt = `${d.getFullYear()}${String(q).padStart(2,'0')}-${mm}${dd}`;
          aiData = invInsights[qKey] || invInsights[qKeyAlt] || null;
        }
        if (!aiData && !isSelectedNoTradeDay) aiData = invInsights._latest || null;
        // 거래 없음 날짜에는 인사이트 섹션 전체 숨김
        if (isSelectedNoTradeDay) return null;
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
