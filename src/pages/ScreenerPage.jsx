import { useState, useMemo } from "react";
import { ArrowLeft, Filter, Search, X, ChevronDown, ChevronUp, Globe, Users } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useLocale } from "../hooks/useLocale";
import { useData } from "../hooks/useDataProvider";
import { SECTOR_COLORS } from "../data";
import { formatUSD, formatChange } from "../utils/format";
import { GlassCard, Badge, WatchButton } from "../components/shared";

const ScreenerPage = ({ onBack, onNavigate, watchlist, initialSector }) => {
  const t = useTheme();
  const L = useLocale();
  const { investors: INVESTORS, holdings: HOLDINGS, quarterlyActivity: QUARTERLY_ACTIVITY, stockPrices, latestQuarter } = useData();
  const [sortKey, setSortKey] = useState("holders");
  const [sortDir, setSortDir] = useState("desc");
  const [filterSector, setFilterSector] = useState(initialSector || "all");
  const [filterInvestors, setFilterInvestors] = useState([]); // multi-select: investor IDs
  const [investorMode, setInvestorMode] = useState("any"); // "any" = OR, "all" = AND (교집합)
  const [filterAction, setFilterAction] = useState("all");
  const [query, setQuery] = useState("");

  const toggleInvestorFilter = (id) => {
    setFilterInvestors(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Aggregate all holdings across investors (투자자별 중복 합산)
  const allStocks = useMemo(() => {
    const map = new Map();
    INVESTORS.forEach(inv => {
      // 같은 투자자의 같은 티커를 먼저 합산 (주식 클래스, 옵션 등 중복 방지)
      const invTickerMap = new Map();
      (HOLDINGS[inv.id] || []).forEach(h => {
        if (invTickerMap.has(h.ticker)) {
          const ex = invTickerMap.get(h.ticker);
          ex.value += h.value;
          ex.shares += h.shares;
          ex.pct += h.pct;
        } else {
          invTickerMap.set(h.ticker, { ...h });
        }
      });

      invTickerMap.forEach(h => {
        if (!map.has(h.ticker)) {
          map.set(h.ticker, {
            ticker: h.ticker, name: h.name, sector: h.sector,
            holders: [], totalValue: 0, avgPct: 0, maxPct: 0,
            actions: [],
          });
        }
        const entry = map.get(h.ticker);
        entry.holders.push({ investor: inv, pct: h.pct, value: h.value, change: h.change, shares: h.shares });
        entry.totalValue += h.value;
        entry.maxPct = Math.max(entry.maxPct, h.pct);

        // Check latest quarter actions (투자자당 하나의 액션만 등록 — share class 중복 방지)
        const acts = QUARTERLY_ACTIVITY[inv.id] || [];
        if (acts.length > 0 && acts[0]?.actions) {
          const action = acts[0].actions.find(a => a.ticker === h.ticker);
          if (action && !entry.actions.some(a => a.investor.id === inv.id)) {
            entry.actions.push({ ...action, investor: inv });
          }
        }
      });
    });
    // Compute averages
    map.forEach(entry => {
      entry.avgPct = entry.holders.length > 0 ? entry.holders.reduce((s, h) => s + h.pct, 0) / entry.holders.length : 0;
    });
    return [...map.values()];
  }, [INVESTORS, HOLDINGS, QUARTERLY_ACTIVITY]);

  // Get unique sectors
  const sectors = useMemo(() => [...new Set(allStocks.map(s => s.sector))].sort(), [allStocks]);

  // Filter
  const filtered = useMemo(() => {
    return allStocks.filter(s => {
      if (filterSector !== "all" && s.sector !== filterSector) return false;
      // 투자자 멀티 필터
      if (filterInvestors.length > 0) {
        const holderIds = s.holders.map(h => h.investor.id);
        if (investorMode === "all") {
          // 교집합: 선택된 모든 투자자가 보유해야 함
          if (!filterInvestors.every(id => holderIds.includes(id))) return false;
        } else {
          // 합집합: 선택된 투자자 중 하나라도 보유하면 OK
          if (!filterInvestors.some(id => holderIds.includes(id))) return false;
        }
      }
      if (filterAction !== "all") {
        if (filterAction === "new" && !s.actions.some(a => a.type === "new")) return false;
        if (filterAction === "buy" && !s.actions.some(a => a.type === "buy")) return false;
        if (filterAction === "sell" && !s.actions.some(a => a.type === "sell")) return false;
        if (filterAction === "multi" && s.holders.length < 2) return false;
      }
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!s.ticker.toLowerCase().includes(q) && !s.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allStocks, filterSector, filterInvestors, investorMode, filterAction, query]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dir = sortDir === "desc" ? -1 : 1;
      if (sortKey === "holders") return dir * (a.holders.length - b.holders.length);
      if (sortKey === "totalValue") return dir * (a.totalValue - b.totalValue);
      if (sortKey === "maxPct") return dir * (a.maxPct - b.maxPct);
      if (sortKey === "ticker") return dir * a.ticker.localeCompare(b.ticker);
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (k) => {
    if (sortKey === k) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(k); setSortDir("desc"); }
  };

  const actionFilters = [
    { id: "all", label: L.t('screener.filterAll') },
    { id: "new", label: L.t('screener.filterNew'), color: t.accent },
    { id: "buy", label: L.t('screener.filterBuy'), color: t.green },
    { id: "sell", label: L.t('screener.filterSell'), color: t.red },
    { id: "multi", label: L.t('screener.filterMulti'), color: t.purple },
  ];

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm" style={{ color: t.textMuted }}><ArrowLeft size={16} /> {L.t('common.back')}</button>
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1.5 rounded-lg" style={{ background: `${t.accent}20` }}>
            <Filter size={20} style={{ color: t.accent }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: t.text }}>{L.t('screener.title')}</h1>
          <span className="text-sm" style={{ color: t.textMuted }}>{filtered.length} {L.t('common.stocks_count')}</span>
        </div>
        {latestQuarter && (
          <div className="flex items-center gap-2 mt-1.5 ml-0.5 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${t.accent}15`, color: t.accent }}>{latestQuarter.replace(/^(\d{4})Q(\d)$/, (_, y, q) => `'${y.slice(2)} Q${q}`)}</span>
            <span className="text-xs" style={{ color: t.textMuted }}>{L.t('screener.filingBasisNote')}</span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: L.t('screener.totalStocks'), v: `${allStocks.length}`, c: t.accent },
          { l: L.t('screener.multiHolder'), v: `${allStocks.filter(s => s.holders.length >= 2).length}`, c: t.purple },
          { l: L.t('screener.recentNewBuy'), v: `${allStocks.filter(s => s.actions.some(a => a.type === 'new')).length}`, c: t.green },
          { l: L.t('screener.recentSell'), v: `${allStocks.filter(s => s.actions.some(a => a.type === 'sell')).length}`, c: t.red },
        ].map((s, i) => (
          <GlassCard key={i} hover={false}>
            <div className="p-3 text-center">
              <div className="text-xs mb-1" style={{ color: t.textMuted }}>{s.l}</div>
              <div className="text-2xl font-bold" style={{ color: s.c }}>{s.v}</div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Filters */}
      <GlassCard hover={false}>
        <div className="p-4 space-y-3">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${t.glassBorder}` }}>
            <Search size={14} style={{ color: t.textMuted }} />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder={L.t('screener.searchPlaceholder')}
              className="flex-1 bg-transparent outline-none text-sm" style={{ color: t.text }} />
            {query && <button onClick={() => setQuery("")} style={{ color: t.textMuted }}><X size={14} /></button>}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <Filter size={14} style={{ color: t.textMuted }} />
            {/* Sector filter */}
            <select value={filterSector} onChange={e => setFilterSector(e.target.value)}
              className="text-xs rounded-xl px-3 py-1.5 outline-none"
              style={{ background: t.selectBg, border: `1px solid ${t.glassBorder}`, color: t.text }}>
              <option value="all">{L.t('screener.allSectors')}</option>
              {sectors.map(s => <option key={s} value={s}>{L.sector(s)}</option>)}
            </select>
          </div>

          {/* 투자자 멀티 필터 (아바타 칩) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Users size={14} style={{ color: t.textMuted }} />
              <span className="text-xs" style={{ color: t.textMuted }}>{L.t('screener.investorFilter')}</span>
              {filterInvestors.length > 0 && (
                <>
                  {/* AND/OR 토글 */}
                  <button
                    onClick={() => setInvestorMode(m => m === "any" ? "all" : "any")}
                    className="text-xs px-2 py-0.5 rounded-full font-medium transition-all"
                    style={{
                      background: investorMode === "all" ? `${t.purple}20` : `${t.accent}15`,
                      color: investorMode === "all" ? t.purple : t.accent,
                      border: `1px solid ${investorMode === "all" ? `${t.purple}40` : `${t.accent}30`}`,
                    }}>
                    {investorMode === "all" ? L.t('screener.modeAll') : L.t('screener.modeAny')}
                  </button>
                  <button onClick={() => setFilterInvestors([])} className="text-xs px-1.5 py-0.5 rounded-md" style={{ color: t.textMuted }}>
                    <X size={12} />
                  </button>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {INVESTORS.map(inv => {
                const isActive = filterInvestors.includes(inv.id);
                return (
                  <button key={inv.id} onClick={() => toggleInvestorFilter(inv.id)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all"
                    style={{
                      background: isActive ? `${inv.color}20` : t.name === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      border: `1.5px solid ${isActive ? inv.color : 'transparent'}`,
                      color: isActive ? t.text : t.textSecondary,
                      opacity: isActive ? 1 : 0.75,
                    }}>
                    <div className="w-4 h-4 rounded flex items-center justify-center text-white text-[9px] font-bold"
                      style={{ background: inv.gradient }}>{inv.avatar}</div>
                    <span className="font-medium">{L.investorName(inv)}</span>
                  </button>
                );
              })}
            </div>
            {/* 교집합 모드일 때 공통 보유 안내 */}
            {filterInvestors.length >= 2 && investorMode === "all" && (
              <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg" style={{ background: `${t.purple}08`, border: `1px solid ${t.purple}15` }}>
                <Users size={12} style={{ color: t.purple }} />
                <span style={{ color: t.purple }}>
                  {filterInvestors.map(id => L.investorName(INVESTORS.find(i => i.id === id))).join(' + ')}
                </span>
                <span style={{ color: t.textMuted }}>{L.t('screener.commonHoldings')}</span>
                <span className="font-bold" style={{ color: t.purple }}>{filtered.length}{L.t('common.stocks_count')}</span>
              </div>
            )}
          </div>

          {/* Action filter buttons */}
          <div className="flex flex-wrap gap-1.5">
            {actionFilters.map(af => (
              <button key={af.id} onClick={() => setFilterAction(af.id)}
                className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: filterAction === af.id ? (af.color || t.accent) : t.inactiveBtnBg,
                  color: filterAction === af.id ? '#fff' : t.textSecondary,
                  border: `1px solid ${filterAction === af.id ? 'transparent' : t.glassBorder}`
                }}>
                {af.label}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Results Table */}
      <GlassCard hover={false}>
        <div className="p-4 sm:p-5">
          {/* Mobile: Card layout */}
          <div className="sm:hidden space-y-2">
            {sorted.map((stock) => {
              const latestActions = stock.actions;
              const hasNew = latestActions.some(a => a.type === 'new');
              const hasBuy = latestActions.some(a => a.type === 'buy');
              const hasSell = latestActions.some(a => a.type === 'sell');
              return (
                <div key={stock.ticker} className="p-3 rounded-xl transition-colors"
                  style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', border: `1px solid ${t.cardRowBorder}` }}>
                  {/* Row 1: Ticker + Name + Action Badges */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <WatchButton active={watchlist.isWatchedTkr(stock.ticker)} onClick={() => watchlist.toggleTicker(stock.ticker)} size={12} />
                      <button className="font-semibold text-sm flex-shrink-0 hover:underline" style={{ color: t.text }} onClick={() => onNavigate("stock", stock.ticker)}>{stock.ticker}</button>
                      <span className="text-xs truncate" style={{ color: t.textMuted }}>{stock.name}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {hasNew && <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: `${t.accent}15`, color: t.accent }}>{L.t('common.new')}</span>}
                      {hasBuy && <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: `${t.green}15`, color: t.green }}>{L.t('common.buy')}</span>}
                      {hasSell && <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: `${t.red}15`, color: t.red }}>{L.t('common.sell')}</span>}
                    </div>
                  </div>
                  {/* Row 2: Investor avatars */}
                  <div className="flex items-center gap-1 mb-2 flex-wrap">
                    {stock.holders.map(h => (
                      <button key={h.investor.id} onClick={() => onNavigate("investor", h.investor.id)}
                        className="w-5 h-5 rounded-md flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: h.investor.gradient }}
                        title={h.investor.nameKo}>
                        {h.investor.avatar}
                      </button>
                    ))}
                    <span className="text-xs ml-1" style={{ color: t.textMuted }}>{stock.holders.length}{L.t('common.people')}</span>
                  </div>
                  {/* Row 3: Price + Since Filing + Sector + Value */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const sp = stockPrices?.[stock.ticker];
                        if (!sp) return null;
                        return (
                          <>
                            <span className="text-sm font-bold" style={{ color: t.text }}>${sp.current?.toFixed(2)}</span>
                            {sp.sinceFiling !== null && sp.sinceFiling !== undefined && (
                              <span className="text-xs font-medium px-1.5 py-0.5 rounded-md" style={{ background: sp.sinceFiling >= 0 ? `${t.green}15` : `${t.red}15`, color: sp.sinceFiling >= 0 ? t.green : t.red }}>
                                {sp.sinceFiling >= 0 ? '+' : ''}{sp.sinceFiling.toFixed(1)}%
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={SECTOR_COLORS[stock.sector] || "#64748B"}>{L.sector(stock.sector)}</Badge>
                      <span className="text-xs font-medium" style={{ color: t.text }}>{formatUSD(stock.totalValue)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Desktop: Table layout */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.tableBorder}` }}>
                  {[
                    { k: null, l: "" },
                    { k: "ticker", l: L.t('screener.colTicker') },
                    { k: null, l: `${L.t('screener.colPrice')} / ${L.t('screener.sinceFilingShort')}` },
                    { k: null, l: L.t('screener.colSector') },
                    { k: "holders", l: L.t('screener.colHolders') },
                    { k: "maxPct", l: L.t('screener.colMaxWeight') },
                    { k: "totalValue", l: L.t('screener.colTotalValue') },
                    { k: null, l: L.t('screener.colRecentChange') },
                  ].map((c, i) => (
                    <th key={i} className={`text-left py-2.5 px-3 text-xs font-medium whitespace-nowrap ${c.k ? 'cursor-pointer' : ''}`}
                      style={{ color: t.textMuted }} onClick={() => c.k && handleSort(c.k)}>
                      <div className="flex items-center gap-1">
                        {c.l}
                        {sortKey === c.k && (sortDir === "desc" ? <ChevronDown size={11} /> : <ChevronUp size={11} />)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((stock, i) => {
                  const latestActions = stock.actions;
                  const hasNew = latestActions.some(a => a.type === 'new');
                  const hasBuy = latestActions.some(a => a.type === 'buy');
                  const hasSell = latestActions.some(a => a.type === 'sell');
                  return (
                    <tr key={stock.ticker}
                      style={{ borderBottom: `1px solid ${t.cardRowBorder}` }}
                      onMouseEnter={e => e.currentTarget.style.background = t.cardRowHover}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="py-3 px-1 w-8">
                        <WatchButton active={watchlist.isWatchedTkr(stock.ticker)} onClick={() => watchlist.toggleTicker(stock.ticker)} size={12} />
                      </td>
                      <td className="py-3 px-3 cursor-pointer" onClick={() => onNavigate("stock", stock.ticker)}>
                        <div className="font-semibold hover:underline" style={{ color: t.text }}>{stock.ticker}</div>
                        <div className="text-xs" style={{ color: t.textMuted }}>{stock.name}</div>
                      </td>
                      <td className="py-3 px-3">
                        {(() => {
                          const sp = stockPrices?.[stock.ticker];
                          if (!sp) return <span className="text-xs" style={{ color: t.textMuted }}>—</span>;
                          return (
                            <div>
                              <div className="font-medium" style={{ color: t.text }}>${sp.current?.toFixed(2)}</div>
                              {sp.sinceFiling !== null && sp.sinceFiling !== undefined && (
                                <div className="text-xs font-medium" style={{ color: sp.sinceFiling >= 0 ? t.green : t.red }}>
                                  {sp.sinceFiling >= 0 ? '+' : ''}{sp.sinceFiling.toFixed(1)}%
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-3">
                        <Badge color={SECTOR_COLORS[stock.sector] || "#64748B"}>{L.sector(stock.sector)}</Badge>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {stock.holders.map(h => (
                            <button key={h.investor.id}
                              onClick={() => onNavigate("investor", h.investor.id)}
                              className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold hover:scale-110 transition-transform"
                              style={{ background: h.investor.gradient }}
                              title={`${h.investor.nameKo} (${h.pct}%)`}>
                              {h.investor.avatar}
                            </button>
                          ))}
                          <span className="text-xs ml-1" style={{ color: t.textMuted }}>{stock.holders.length}{L.t('common.people')}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(stock.maxPct * 3, 100)}%`, background: t.accent }} />
                          </div>
                          <span className="font-medium text-xs" style={{ color: t.text }}>{stock.maxPct.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium" style={{ color: t.text }}>
                        {formatUSD(stock.totalValue)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {hasNew && <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: `${t.accent}15`, color: t.accent }}>{L.t('common.new')}</span>}
                          {hasBuy && <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: `${t.green}15`, color: t.green }}>{L.t('common.buy')}</span>}
                          {hasSell && <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: `${t.red}15`, color: t.red }}>{L.t('common.sell')}</span>}
                          {!hasNew && !hasBuy && !hasSell && <span className="text-xs" style={{ color: t.textMuted }}>—</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sorted.length === 0 && (
            <div className="text-center py-12">
              <Search size={36} style={{ color: t.textMuted, opacity: 0.3 }} className="mx-auto mb-3" />
              <p className="text-sm" style={{ color: t.textMuted }}>{L.t('screener.noMatch')}</p>
              <p className="text-xs mt-1" style={{ color: t.textMuted }}>{L.t('screener.changeFilter')}</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Multi-holder stocks highlight */}
      {filterAction === "all" && !query.trim() && filterSector === "all" && filterInvestors.length === 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Globe size={18} style={{ color: t.purple }} />
            <h3 className="font-bold" style={{ color: t.text }}>{L.t('screener.guruPicks')}</h3>
            <span className="text-xs" style={{ color: t.textMuted }}>{L.t('screener.multiHolderStocks')}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allStocks.filter(s => s.holders.length >= 2).sort((a, b) => b.holders.length - a.holders.length).map(stock => (
              <GlassCard key={stock.ticker}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <button className="font-bold text-sm hover:underline" style={{ color: t.text }} onClick={() => onNavigate("stock", stock.ticker)}>{stock.ticker}</button>
                      <span className="text-xs ml-2" style={{ color: t.textMuted }}>{stock.name}</span>
                    </div>
                    <Badge color={SECTOR_COLORS[stock.sector] || "#64748B"}>{L.sector(stock.sector)}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    {stock.holders.sort((a, b) => b.pct - a.pct).map(h => (
                      <div key={h.investor.id} className="flex items-center gap-2 cursor-pointer"
                        onClick={() => onNavigate("investor", h.investor.id)}>
                        <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: h.investor.gradient }}>{h.investor.avatar}</div>
                        <span className="text-xs flex-1" style={{ color: t.textSecondary }}>{L.investorName(h.investor)}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(h.pct * 4, 100)}%`, background: h.investor.color }} />
                          </div>
                          <span className="text-xs font-medium w-10 text-right" style={{ color: t.text }}>{h.pct}%</span>
                        </div>
                        {h.change === 100 ? (
                          <span className="text-xs font-medium" style={{ color: t.accent }}>
                            {L.t('common.new')}
                          </span>
                        ) : formatChange(h.change) && (
                          <span className="text-xs font-medium" style={{ color: h.change > 0 ? t.green : t.red }}>
                            {(() => { const v = formatChange(h.change); return v === '대폭 확대' ? L.t('common.significantIncrease') : v; })()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenerPage;
