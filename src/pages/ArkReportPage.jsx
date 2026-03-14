import React, { useState, useMemo } from "react";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Calendar, TrendingUp, TrendingDown, Plus, LogOut, FileText, ChevronDown, BarChart3, Activity } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useLocale } from "../hooks/useLocale";
import { useData } from "../hooks/useDataProvider";
import { GlassCard, Badge } from "../components/shared";

// ============================================================
// 캐시우드 ARK 주간/월간 리포트
// ============================================================
const ArkReportPage = ({ onBack, onNavigate }) => {
  const t = useTheme();
  const L = useLocale();
  const { arkDailyTrades } = useData();
  const isKo = L.locale === 'ko';

  const [mode, setMode] = useState('weekly');
  const [expandedIdx, setExpandedIdx] = useState(0);

  // ── 주간/월간 그룹핑 ──
  const reports = useMemo(() => {
    if (!arkDailyTrades?.length) return [];
    if (mode === 'weekly') {
      const weekMap = {};
      arkDailyTrades.forEach(day => {
        const d = new Date(day.date + 'T00:00:00');
        const dow = d.getDay();
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((dow + 6) % 7));
        const weekKey = monday.toISOString().split('T')[0];
        if (!weekMap[weekKey]) weekMap[weekKey] = { start: weekKey, days: [] };
        weekMap[weekKey].days.push(day);
      });
      return Object.values(weekMap).sort((a, b) => b.start.localeCompare(a.start));
    } else {
      const monthMap = {};
      arkDailyTrades.forEach(day => {
        const d = new Date(day.date + 'T00:00:00');
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap[monthKey]) monthMap[monthKey] = { key: monthKey, days: [] };
        monthMap[monthKey].days.push(day);
      });
      return Object.values(monthMap).sort((a, b) => b.key.localeCompare(a.key));
    }
  }, [arkDailyTrades, mode]);

  // ── 리포트 통계 ──
  const computeStats = (days) => {
    const allTrades = days.flatMap(d => d.trades);
    const buys = allTrades.filter(t => t.direction === 'buy');
    const sells = allTrades.filter(t => t.direction === 'sell');
    const newPositions = allTrades.filter(t => t.isNew);
    const exits = allTrades.filter(t => t.isExit);

    const tickerMap = {};
    allTrades.forEach(tr => {
      if (!tickerMap[tr.ticker]) tickerMap[tr.ticker] = { ticker: tr.ticker, company: tr.company, buyShares: 0, sellShares: 0, buyCount: 0, sellCount: 0, isNew: false, isExit: false, latestWeight: 0 };
      const entry = tickerMap[tr.ticker];
      if (tr.direction === 'buy') { entry.buyShares += Math.abs(tr.sharesChange); entry.buyCount++; }
      else { entry.sellShares += Math.abs(tr.sharesChange); entry.sellCount++; }
      if (tr.isNew) entry.isNew = true;
      if (tr.isExit) entry.isExit = true;
      entry.latestWeight = Math.max(entry.latestWeight, tr.weightToday || 0);
    });

    const tickers = Object.values(tickerMap);
    return {
      totalTrades: allTrades.length,
      buyCount: buys.length,
      sellCount: sells.length,
      newCount: newPositions.length,
      exitCount: exits.length,
      tradingDays: days.length,
      uniqueTickers: Object.keys(tickerMap).length,
      topBuys: tickers.filter(t => t.buyShares > 0).sort((a, b) => b.buyShares - a.buyShares).slice(0, 10),
      topSells: tickers.filter(t => t.sellShares > 0).sort((a, b) => b.sellShares - a.sellShares).slice(0, 10),
      newPositions: [...new Map(newPositions.map(t => [t.ticker, t])).values()],
      exits: [...new Map(exits.map(t => [t.ticker, t])).values()],
    };
  };

  const getPeriodLabel = (report) => {
    if (mode === 'weekly') {
      const start = new Date(report.start + 'T00:00:00');
      const end = new Date(start);
      end.setDate(start.getDate() + 4);
      const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
      return `${fmt(start)} ~ ${fmt(end)}`;
    } else {
      const [y, m] = report.key.split('-');
      return isKo ? `${y}년 ${parseInt(m)}월` : new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  const fmtShares = (n) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  if (!arkDailyTrades?.length) {
    return (
      <div className="space-y-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm" style={{ color: t.textMuted }}>
          <ArrowLeft size={16} /> {L.t('common.back')}
        </button>
        <div className="text-center py-20" style={{ color: t.textMuted }}>
          {isKo ? 'ARK 매매 데이터가 없습니다.' : 'No ARK trade data available.'}
        </div>
      </div>
    );
  }

  // ── 순위 아이템 렌더링 ──
  const RankItem = ({ item, rank, type }) => {
    const shares = type === 'buy' ? item.buyShares : item.sellShares;
    const count = type === 'buy' ? item.buyCount : item.sellCount;
    const color = type === 'buy' ? t.green : t.red;
    const maxShares = type === 'buy'
      ? (computeStats(reports[expandedIdx]?.days || []).topBuys[0]?.buyShares || 1)
      : (computeStats(reports[expandedIdx]?.days || []).topSells[0]?.sellShares || 1);
    const barWidth = Math.max(8, (shares / maxShares) * 100);

    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all group"
        style={{ background: 'transparent' }}
        onClick={() => onNavigate("stock", item.ticker)}
        onMouseEnter={e => e.currentTarget.style.background = t.cardRowHover}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        {/* 순위 */}
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
          style={{
            background: rank <= 3 ? `${color}15` : 'transparent',
            color: rank <= 3 ? color : t.textMuted,
            border: rank > 3 ? `1px solid ${t.cardRowBorder}` : 'none',
          }}>
          {rank}
        </div>
        {/* 종목 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: t.accent }}>{item.ticker}</span>
            {item.isNew && <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: `${t.accent}15`, color: t.accent }}>NEW</span>}
            {item.isExit && <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: `${t.red}15`, color: t.red }}>EXIT</span>}
          </div>
          <div className="text-[11px] truncate" style={{ color: t.textMuted }}>{item.company}</div>
          {/* 바 그래프 */}
          <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', width: '100%' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${barWidth}%`, background: color, opacity: 0.5 }} />
          </div>
        </div>
        {/* 수량 */}
        <div className="text-right shrink-0 ml-2">
          <div className="text-sm font-bold tabular-nums" style={{ color }}>
            {type === 'buy' ? '+' : '-'}{fmtShares(shares)}
          </div>
          <div className="text-[10px]" style={{ color: t.textMuted }}>
            {count}{isKo ? '회 거래' : ' trades'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── 헤더 ── */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm mb-4" style={{ color: t.textMuted }}>
          <ArrowLeft size={16} /> {L.t('common.back')}
        </button>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>CW</div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: t.text }}>
                {isKo ? '캐시 우드 매매 리포트' : 'Cathie Wood Trade Report'}
              </h1>
              <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                ARK Invest · {isKo ? '일별 매매 데이터 기반' : 'Based on daily trade data'}
              </p>
            </div>
          </div>

          {/* 주간/월간 토글 */}
          <div className="flex rounded-xl overflow-hidden" style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
            {['weekly', 'monthly'].map(m => (
              <button key={m} className="px-5 py-2 text-xs font-semibold transition-all"
                style={{
                  background: mode === m ? t.accent : 'transparent',
                  color: mode === m ? '#fff' : t.textMuted,
                  borderRadius: mode === m ? '0.75rem' : '0',
                }}
                onClick={() => { setMode(m); setExpandedIdx(0); }}>
                {m === 'weekly' ? (isKo ? '주간' : 'Weekly') : (isKo ? '월간' : 'Monthly')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 리포트 목록 ── */}
      {reports.map((report, idx) => {
        const stats = computeStats(report.days);
        const isOpen = expandedIdx === idx;
        const label = getPeriodLabel(report);

        return (
          <GlassCard key={idx} hover={false}>
            <div className={isOpen ? "p-5 sm:p-6" : "p-5"}>
              {/* 리포트 헤더 */}
              <button className="w-full flex items-center justify-between" onClick={() => setExpandedIdx(isOpen ? -1 : idx)}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl" style={{ background: `${t.accent}12` }}>
                    {mode === 'weekly' ? <Calendar size={18} style={{ color: t.accent }} /> : <FileText size={18} style={{ color: t.accent }} />}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base" style={{ color: t.text }}>{label}</span>
                      {idx === 0 && <Badge color={t.accent}>{isKo ? '최신' : 'Latest'}</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs" style={{ color: t.textMuted }}>
                        {stats.tradingDays}{isKo ? '일' : 'd'}
                      </span>
                      <span className="text-xs font-medium" style={{ color: t.green }}>
                        {isKo ? '매수' : 'Buy'} {stats.buyCount}
                      </span>
                      <span className="text-xs font-medium" style={{ color: t.red }}>
                        {isKo ? '매도' : 'Sell'} {stats.sellCount}
                      </span>
                      <span className="text-xs" style={{ color: t.textMuted }}>
                        {stats.uniqueTickers}{isKo ? '종목' : ' tickers'}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronDown size={18} style={{ color: t.textMuted, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {isOpen && (
                <div className="mt-6 space-y-6">
                  {/* ── 요약 카드 ── */}
                  <div className="grid grid-cols-4 gap-2 sm:gap-3">
                    {[
                      { label: isKo ? '총 매수' : 'Buys', value: stats.buyCount, color: t.green, icon: TrendingUp },
                      { label: isKo ? '총 매도' : 'Sells', value: stats.sellCount, color: t.red, icon: TrendingDown },
                      { label: isKo ? '신규 편입' : 'New', value: stats.newCount, color: t.accent, icon: Plus },
                      { label: isKo ? '완전 매도' : 'Exits', value: stats.exitCount, color: '#f59e0b', icon: LogOut },
                    ].map((s, i) => {
                      const I = s.icon;
                      return (
                        <div key={i} className="rounded-xl px-3 py-3 text-center" style={{ background: `${s.color}06`, border: `1px solid ${s.color}12` }}>
                          <I size={16} className="mx-auto mb-1.5" style={{ color: s.value > 0 ? s.color : t.textMuted }} />
                          <div className="text-xl font-bold" style={{ color: s.value > 0 ? s.color : t.textMuted }}>{s.value}</div>
                          <div className="text-[10px] mt-0.5" style={{ color: t.textMuted }}>{s.label}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ── Top 매수 / Top 매도 (2열) ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Top 매수 */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${t.green}15` }}>
                          <TrendingUp size={13} style={{ color: t.green }} />
                        </div>
                        <span className="text-sm font-bold" style={{ color: t.text }}>
                          {isKo ? 'Top 매수 종목' : 'Top Buys'}
                        </span>
                        <span className="text-xs" style={{ color: t.textMuted }}>
                          ({isKo ? '주식 수 기준' : 'by shares'})
                        </span>
                      </div>
                      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${t.cardRowBorder}` }}>
                        {stats.topBuys.length > 0 ? stats.topBuys.map((item, i) => (
                          <RankItem key={i} item={item} rank={i + 1} type="buy" />
                        )) : (
                          <div className="text-xs text-center py-6" style={{ color: t.textMuted }}>{isKo ? '없음' : 'None'}</div>
                        )}
                      </div>
                    </div>

                    {/* Top 매도 */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${t.red}15` }}>
                          <TrendingDown size={13} style={{ color: t.red }} />
                        </div>
                        <span className="text-sm font-bold" style={{ color: t.text }}>
                          {isKo ? 'Top 매도 종목' : 'Top Sells'}
                        </span>
                        <span className="text-xs" style={{ color: t.textMuted }}>
                          ({isKo ? '주식 수 기준' : 'by shares'})
                        </span>
                      </div>
                      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${t.cardRowBorder}` }}>
                        {stats.topSells.length > 0 ? stats.topSells.map((item, i) => (
                          <RankItem key={i} item={item} rank={i + 1} type="sell" />
                        )) : (
                          <div className="text-xs text-center py-6" style={{ color: t.textMuted }}>{isKo ? '없음' : 'None'}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── 신규 편입 & 완전 매도 ── */}
                  {(stats.newPositions.length > 0 || stats.exits.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {stats.newPositions.length > 0 && (
                        <div className="rounded-xl p-4" style={{ background: `${t.accent}05`, border: `1px solid ${t.accent}12` }}>
                          <div className="flex items-center gap-2 mb-3">
                            <Plus size={14} style={{ color: t.accent }} />
                            <span className="text-sm font-bold" style={{ color: t.accent }}>
                              {isKo ? '신규 편입' : 'New Positions'}
                            </span>
                            <Badge color={t.accent}>{stats.newPositions.length}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {stats.newPositions.map((tr, i) => (
                              <span key={i} className="text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all hover:scale-105"
                                style={{ background: `${t.accent}12`, color: t.accent }}
                                onClick={() => onNavigate("stock", tr.ticker)}>
                                {tr.ticker}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {stats.exits.length > 0 && (
                        <div className="rounded-xl p-4" style={{ background: `${t.red}05`, border: `1px solid ${t.red}12` }}>
                          <div className="flex items-center gap-2 mb-3">
                            <LogOut size={14} style={{ color: t.red }} />
                            <span className="text-sm font-bold" style={{ color: t.red }}>
                              {isKo ? '완전 매도' : 'Full Exits'}
                            </span>
                            <Badge color={t.red}>{stats.exits.length}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {stats.exits.map((tr, i) => (
                              <span key={i} className="text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all hover:scale-105"
                                style={{ background: `${t.red}12`, color: t.red }}
                                onClick={() => onNavigate("stock", tr.ticker)}>
                                {tr.ticker}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── 일별 거래 내역 ── */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Activity size={14} style={{ color: t.textSecondary }} />
                      <span className="text-sm font-bold" style={{ color: t.text }}>
                        {isKo ? '일별 거래 내역' : 'Daily Breakdown'}
                      </span>
                    </div>
                    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${t.cardRowBorder}` }}>
                      {report.days.map((day, di) => {
                        const d = new Date(day.date + 'T00:00:00');
                        const weekday = isKo
                          ? ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
                          : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
                        const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
                        const dayBuys = day.trades.filter(t => t.direction === 'buy');
                        const daySells = day.trades.filter(t => t.direction === 'sell');

                        return (
                          <div key={di} className="px-4 py-3" style={{ borderBottom: di < report.days.length - 1 ? `1px solid ${t.cardRowBorder}` : 'none' }}>
                            {/* 날짜 헤더 */}
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold" style={{ color: t.text }}>{dateStr}</span>
                                <span className="text-xs font-medium" style={{ color: t.textMuted }}>({weekday})</span>
                              </div>
                              <div className="flex-1 h-px" style={{ background: t.cardRowBorder }} />
                              <div className="flex items-center gap-2">
                                {dayBuys.length > 0 && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${t.green}15`, color: t.green }}>
                                    {isKo ? '매수' : 'Buy'} {dayBuys.length}
                                  </span>
                                )}
                                {daySells.length > 0 && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${t.red}15`, color: t.red }}>
                                    {isKo ? '매도' : 'Sell'} {daySells.length}
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* 종목 태그 — 매수/매도 분리 */}
                            <div className="flex flex-wrap gap-1.5">
                              {dayBuys.map((tr, ti) => (
                                <span key={`b${ti}`} className="text-[11px] font-semibold px-2 py-1 rounded-md cursor-pointer transition-all hover:scale-105"
                                  style={{ background: `${t.green}10`, color: t.green }}
                                  onClick={() => onNavigate("stock", tr.ticker)}>
                                  {tr.ticker}
                                </span>
                              ))}
                              {dayBuys.length > 0 && daySells.length > 0 && (
                                <span className="self-center text-[10px] px-1" style={{ color: t.textMuted }}>|</span>
                              )}
                              {daySells.map((tr, ti) => (
                                <span key={`s${ti}`} className="text-[11px] font-semibold px-2 py-1 rounded-md cursor-pointer transition-all hover:scale-105"
                                  style={{ background: `${t.red}10`, color: t.red }}
                                  onClick={() => onNavigate("stock", tr.ticker)}>
                                  {tr.ticker}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
};

export default ArkReportPage;
