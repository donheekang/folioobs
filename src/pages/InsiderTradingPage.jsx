import React, { useState, useMemo, useEffect, useCallback } from "react";
import { ArrowLeft, RefreshCw, Search, ChevronDown } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useLocale } from "../hooks/useLocale";
import { useData } from "../hooks/useDataProvider";
import { supabase } from "../lib/supabase";

// ============================================================
// 내부자 거래 — 심플 클린 버전
// ============================================================
const InsiderTradingPage = ({ onBack, onNavigate }) => {
  const t = useTheme();
  const L = useLocale();
  const { INVESTORS, HOLDINGS } = useData();
  const isKo = L.locale === 'ko';

  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [showOnlyBuySell, setShowOnlyBuySell] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCount, setShowCount] = useState(40);
  const [expandedGroups, setExpandedGroups] = useState({});

  // 추적 종목
  const trackedTickers = useMemo(() => {
    if (!HOLDINGS) return new Set();
    const s = new Set();
    Object.values(HOLDINGS).forEach(hs => hs.forEach(h => s.add(h.ticker?.toUpperCase())));
    return s;
  }, [HOLDINGS]);

  // 종목 → 해당 투자자
  const getHoldingInvestors = useCallback((symbol) => {
    if (!INVESTORS || !HOLDINGS || !symbol) return [];
    return INVESTORS.filter(inv => {
      const h = HOLDINGS[inv.id] || [];
      return h.some(holding => holding.ticker?.toUpperCase() === symbol.toUpperCase());
    });
  }, [INVESTORS, HOLDINGS]);

  // DB 로드
  const loadTrades = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      let dateFilter = null;
      if (dateRange === '1d') dateFilter = new Date(now - 86400000).toISOString().split('T')[0];
      else if (dateRange === '7d') dateFilter = new Date(now - 7 * 86400000).toISOString().split('T')[0];
      else if (dateRange === '30d') dateFilter = new Date(now - 30 * 86400000).toISOString().split('T')[0];

      let q = supabase.from('insider_trades').select('*').order('filing_date', { ascending: false }).limit(500);
      if (dateFilter) q = q.gte('filing_date', dateFilter);
      const { data } = await q;
      setTrades(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { loadTrades(); }, [loadTrades]);

  // 유틸
  const classify = (type) => {
    if (!type) return { label: '기타', en: 'Other', isBuy: false, isSell: false };
    if (type.startsWith('P')) return { label: '매수', en: 'Buy', isBuy: true, isSell: false };
    if (type.startsWith('S')) return { label: '매도', en: 'Sell', isBuy: false, isSell: true };
    if (type.startsWith('A')) return { label: '부여', en: 'Award', isBuy: false, isSell: false };
    if (type.startsWith('M')) return { label: '행사', en: 'Exercise', isBuy: false, isSell: false };
    if (type.startsWith('F')) return { label: '세금납부', en: 'Tax', isBuy: false, isSell: false };
    if (type.startsWith('G')) return { label: '증여', en: 'Gift', isBuy: false, isSell: false };
    return { label: type, en: type, isBuy: false, isSell: false };
  };
  const isBuySell = (type) => type?.startsWith('P') || type?.startsWith('S');

  const fmtVal = (v) => {
    if (!v) return '-';
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  };

  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  };

  // ===== 추적 종목 거래 vs 일반 거래 분리 =====
  const { trackedTrades, otherTrades } = useMemo(() => {
    let items = [...trades];
    if (showOnlyBuySell) items = items.filter(t => isBuySell(t.transaction_type));
    if (searchTerm) {
      const q = searchTerm.toUpperCase();
      items = items.filter(t => t.symbol?.toUpperCase().includes(q) || t.reporting_name?.toUpperCase().includes(q));
    }
    const tracked = [];
    const other = [];
    items.forEach(tr => {
      if (tr.is_tracked_stock || trackedTickers.has(tr.symbol?.toUpperCase())) tracked.push(tr);
      else other.push(tr);
    });
    return { trackedTrades: tracked, otherTrades: other };
  }, [trades, showOnlyBuySell, searchTerm, trackedTickers]);

  // 추적 거래를 종목별로 그룹화
  const trackedGroups = useMemo(() => {
    const map = {};
    trackedTrades.forEach(tr => {
      const sym = tr.symbol?.toUpperCase();
      if (!sym) return;
      if (!map[sym]) {
        const dbInvestors = tr.tracked_by_investors ? tr.tracked_by_investors.split(', ') : [];
        const frontInvestors = getHoldingInvestors(sym);
        map[sym] = { symbol: sym, trades: [], investorNames: dbInvestors, investorObjects: frontInvestors };
      }
      map[sym].trades.push(tr);
    });
    return Object.values(map).sort((a, b) => {
      const aVal = a.trades.reduce((s, t) => s + (t.transaction_value || 0), 0);
      const bVal = b.trades.reduce((s, t) => s + (t.transaction_value || 0), 0);
      return bVal - aVal;
    });
  }, [trackedTrades, getHoldingInvestors]);

  // 통계
  const stats = useMemo(() => {
    const buys = trades.filter(t => t.transaction_type?.startsWith('P'));
    const sells = trades.filter(t => t.transaction_type?.startsWith('S'));
    return { total: trades.length, buys: buys.length, sells: sells.length };
  }, [trades]);

  const displayedOther = otherTrades.slice(0, showCount);

  const toggleGroup = (sym) => setExpandedGroups(prev => ({ ...prev, [sym]: !prev[sym] }));

  // 투자자 이름 텍스트
  const investorText = (grp) => {
    if (grp.investorObjects.length > 0) {
      const names = grp.investorObjects.slice(0, 3).map(inv => isKo ? (inv.nameKo || inv.name) : inv.name);
      const extra = grp.investorObjects.length > 3 ? (isKo ? ` 외 ${grp.investorObjects.length - 3}명` : ` +${grp.investorObjects.length - 3}`) : '';
      return names.join(', ') + extra;
    }
    if (grp.investorNames.length > 0) {
      const names = grp.investorNames.slice(0, 3);
      const extra = grp.investorNames.length > 3 ? (isKo ? ` 외 ${grp.investorNames.length - 3}명` : ` +${grp.investorNames.length - 3}`) : '';
      return names.join(', ') + extra;
    }
    return isKo ? '추적 투자자' : 'Tracked';
  };

  // 스타일 헬퍼
  const chip = (active) => ({
    color: active ? t.text : t.textMuted,
    background: active ? `${t.text}0a` : 'transparent',
    borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 500,
    cursor: 'pointer', border: active ? `1px solid ${t.text}18` : '1px solid transparent',
    transition: 'all .15s',
  });

  return (
    <div className="max-w-2xl mx-auto px-4 pb-20">
      {/* 헤더 */}
      <button onClick={onBack} className="flex items-center gap-1 text-xs mb-4 hover:opacity-60 transition"
        style={{ color: t.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}>
        <ArrowLeft size={14} /> {isKo ? '뒤로' : 'Back'}
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-semibold" style={{ color: t.text }}>
            {isKo ? '내부자 거래' : 'Insider Trading'}
          </h1>
          <p className="text-[10px] mt-0.5" style={{ color: t.textMuted }}>SEC Form 4</p>
        </div>
        <button onClick={loadTrades} style={{ color: t.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}
          className="hover:opacity-60 transition">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* 필터 바 */}
      <div className="flex items-center gap-1.5 mb-6 flex-wrap">
        {['1d', '7d', '30d', 'all'].map(v => (
          <button key={v} onClick={() => setDateRange(v)} style={chip(dateRange === v)}>
            {v === 'all' ? (isKo ? '전체' : 'All') : v.toUpperCase()}
          </button>
        ))}
        <div style={{ width: 1, height: 14, background: t.glassBorder, margin: '0 2px' }} />
        <button onClick={() => setShowOnlyBuySell(!showOnlyBuySell)}
          style={{ ...chip(showOnlyBuySell), color: showOnlyBuySell ? '#3b82f6' : t.textMuted, borderColor: showOnlyBuySell ? '#3b82f620' : 'transparent', background: showOnlyBuySell ? '#3b82f608' : 'transparent' }}>
          {isKo ? '매수·매도만' : 'Buy/Sell only'}
        </button>
        <div className="ml-auto flex items-center gap-3 text-[11px]" style={{ color: t.textMuted }}>
          <span>{stats.total}</span>
          <span style={{ color: '#22c55e' }}>↑{stats.buys}</span>
          <span style={{ color: '#ef4444' }}>↓{stats.sells}</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-xs" style={{ color: t.textMuted }}>
          {isKo ? '로딩 중...' : 'Loading...'}
        </div>
      ) : (
        <>
          {/* ============================================ */}
          {/* 추적 투자자 보유종목 내부자 거래 */}
          {/* ============================================ */}
          {trackedGroups.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold" style={{ color: t.text }}>
                  {isKo ? '추적 투자자 보유종목' : 'Tracked Holdings'}
                </span>
                <span className="text-[10px]" style={{ color: t.textMuted }}>
                  {trackedGroups.length}{isKo ? '종목' : ' stocks'}
                </span>
              </div>
              <p className="text-[10px] mb-4" style={{ color: t.textMuted }}>
                {isKo ? '우리가 추적하는 투자자가 보유한 종목의 임원·이사 매매' : 'Officer/director trades in tracked investor holdings'}
              </p>

              <div className="space-y-2">
                {trackedGroups.map(grp => {
                  const totalVal = grp.trades.reduce((s, t) => s + (t.transaction_value || 0), 0);
                  const buys = grp.trades.filter(t => t.transaction_type?.startsWith('P'));
                  const sells = grp.trades.filter(t => t.transaction_type?.startsWith('S'));
                  const isExpanded = expandedGroups[grp.symbol] !== false; // default open
                  const invText = investorText(grp);

                  return (
                    <div key={grp.symbol} className="rounded-xl overflow-hidden"
                      style={{ background: t.glassBg, border: `1px solid ${t.glassBorder}` }}>

                      {/* 종목 요약 헤더 (클릭으로 접기/펴기) */}
                      <button
                        onClick={() => toggleGroup(grp.symbol)}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:opacity-80 transition"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}>

                        {/* 심볼 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold hover:underline"
                              style={{ color: t.text }}
                              onClick={(e) => { e.stopPropagation(); onNavigate('stock', grp.symbol); }}>
                              {grp.symbol}
                            </span>
                            {sells.length > 0 && (
                              <span className="text-[10px] font-medium" style={{ color: '#f87171' }}>
                                {isKo ? `매도 ${sells.length}건` : `${sells.length} sell`}
                              </span>
                            )}
                            {buys.length > 0 && (
                              <span className="text-[10px] font-medium" style={{ color: '#4ade80' }}>
                                {isKo ? `매수 ${buys.length}건` : `${buys.length} buy`}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] mt-0.5" style={{ color: '#d97706' }}>
                            {invText}{isKo ? ' 보유' : ''}
                          </div>
                        </div>

                        {/* 금액 */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold" style={{ color: t.text }}>
                            {fmtVal(totalVal)}
                          </div>
                        </div>

                        <ChevronDown size={14}
                          style={{
                            color: t.textMuted,
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform .2s',
                            flexShrink: 0,
                          }}
                        />
                      </button>

                      {/* 개별 거래 (접기/펴기) */}
                      {isExpanded && (
                        <div className="px-4 pb-3">
                          <div style={{ height: 1, background: t.glassBorder, marginBottom: 8 }} />
                          {grp.trades.map((tr, i) => {
                            const cls = classify(tr.transaction_type);
                            return (
                              <div key={i} className="flex items-center gap-2 py-1.5 text-[11px]">
                                <span className="font-medium truncate flex-1" style={{ color: t.text }}>
                                  {tr.reporting_name}
                                </span>
                                <span className="text-[10px] truncate max-w-[140px]" style={{ color: t.textMuted }}>
                                  {tr.type_of_owner || ''}
                                </span>
                                <span className="font-medium flex-shrink-0" style={{
                                  color: cls.isBuy ? '#4ade80' : cls.isSell ? '#f87171' : t.textMuted,
                                }}>
                                  {cls.isBuy ? '+' : cls.isSell ? '-' : ''}{fmtVal(tr.transaction_value)}
                                </span>
                                <span className="text-[10px] flex-shrink-0 w-8 text-right" style={{ color: t.textMuted }}>
                                  {fmtDate(tr.filing_date)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* 기타 내부자 거래 */}
          {/* ============================================ */}
          {otherTrades.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold" style={{ color: t.text }}>
                  {isKo ? '기타 내부자 거래' : 'Other Insider Trades'}
                </span>
                <span className="text-[10px]" style={{ color: t.textMuted }}>
                  {otherTrades.length}{isKo ? '건' : ''}
                </span>
              </div>

              {/* 검색 */}
              <div className="relative mb-3">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: t.textMuted }} />
                <input type="text" placeholder={isKo ? '종목·이름 검색' : 'Search...'}
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="pl-7 pr-3 py-1.5 rounded-lg text-[11px] outline-none w-full"
                  style={{ background: t.glassBg, color: t.text, border: `1px solid ${t.glassBorder}` }} />
              </div>

              <div className="space-y-[2px]">
                {displayedOther.map((tr, i) => {
                  const cls = classify(tr.transaction_type);
                  return (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                      style={{ background: t.glassBg }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-semibold cursor-pointer hover:underline"
                            style={{ color: t.text }} onClick={() => onNavigate('stock', tr.symbol)}>
                            {tr.symbol}
                          </span>
                          <span className="text-[10px]" style={{ color: cls.isBuy ? '#4ade80' : cls.isSell ? '#f87171' : t.textMuted }}>
                            {isKo ? cls.label : cls.en}
                          </span>
                        </div>
                        <div className="text-[10px] truncate" style={{ color: t.textMuted }}>
                          {tr.reporting_name}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[11px] font-semibold" style={{
                          color: cls.isBuy ? '#4ade80' : cls.isSell ? '#f87171' : t.textMuted,
                        }}>
                          {cls.isBuy ? '+' : cls.isSell ? '-' : ''}{fmtVal(tr.transaction_value)}
                        </div>
                        <div className="text-[9px]" style={{ color: t.textMuted }}>{fmtDate(tr.filing_date)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {otherTrades.length > showCount && (
                <div className="text-center mt-4">
                  <button onClick={() => setShowCount(s => s + 40)}
                    className="px-5 py-2 rounded-full text-[11px] font-medium transition hover:opacity-70"
                    style={{ color: t.textMuted, border: `1px solid ${t.glassBorder}` }}>
                    {isKo ? `더 보기 (${otherTrades.length - showCount}건)` : `More (${otherTrades.length - showCount})`}
                  </button>
                </div>
              )}
            </div>
          )}

          {trackedGroups.length === 0 && otherTrades.length === 0 && (
            <div className="text-center py-20">
              <div className="text-2xl mb-2">📭</div>
              <div className="text-xs" style={{ color: t.textMuted }}>
                {isKo ? '해당 조건의 거래가 없습니다' : 'No matching trades'}
              </div>
            </div>
          )}
        </>
      )}

      <div className="text-center text-[9px] mt-8" style={{ color: t.textMuted }}>
        SEC Form 4 · FMP · Polygon.io · {isKo ? '투자 권유가 아닙니다' : 'Not investment advice'}
      </div>
    </div>
  );
};

export default InsiderTradingPage;
