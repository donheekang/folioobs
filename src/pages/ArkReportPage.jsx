import React, { useState, useMemo } from "react";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Calendar, TrendingUp, TrendingDown, Plus, LogOut, FileText, ChevronDown, BarChart3 } from "lucide-react";
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

  const [mode, setMode] = useState('weekly'); // 'weekly' | 'monthly'

  // ── 주간/월간 그룹핑 ──
  const reports = useMemo(() => {
    if (!arkDailyTrades?.length) return [];

    if (mode === 'weekly') {
      // 주별 그룹 (월요일 기준)
      const weekMap = {};
      arkDailyTrades.forEach(day => {
        const d = new Date(day.date + 'T00:00:00');
        // 해당 주의 월요일 구하기
        const dow = d.getDay();
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((dow + 6) % 7));
        const weekKey = monday.toISOString().split('T')[0];
        if (!weekMap[weekKey]) weekMap[weekKey] = { start: weekKey, days: [] };
        weekMap[weekKey].days.push(day);
      });
      return Object.values(weekMap)
        .sort((a, b) => b.start.localeCompare(a.start));
    } else {
      // 월별 그룹
      const monthMap = {};
      arkDailyTrades.forEach(day => {
        const d = new Date(day.date + 'T00:00:00');
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap[monthKey]) monthMap[monthKey] = { key: monthKey, days: [] };
        monthMap[monthKey].days.push(day);
      });
      return Object.values(monthMap)
        .sort((a, b) => b.key.localeCompare(a.key));
    }
  }, [arkDailyTrades, mode]);

  // ── 리포트 통계 계산 ──
  const computeStats = (days) => {
    const allTrades = days.flatMap(d => d.trades);
    const buys = allTrades.filter(t => t.direction === 'buy');
    const sells = allTrades.filter(t => t.direction === 'sell');
    const newPositions = allTrades.filter(t => t.isNew);
    const exits = allTrades.filter(t => t.isExit);

    // 종목별 순매매 집계
    const tickerMap = {};
    allTrades.forEach(tr => {
      if (!tickerMap[tr.ticker]) tickerMap[tr.ticker] = { ticker: tr.ticker, company: tr.company, buyShares: 0, sellShares: 0, buyCount: 0, sellCount: 0, isNew: false, isExit: false, latestWeight: 0 };
      const entry = tickerMap[tr.ticker];
      if (tr.direction === 'buy') {
        entry.buyShares += Math.abs(tr.sharesChange);
        entry.buyCount++;
      } else {
        entry.sellShares += Math.abs(tr.sharesChange);
        entry.sellCount++;
      }
      if (tr.isNew) entry.isNew = true;
      if (tr.isExit) entry.isExit = true;
      entry.latestWeight = Math.max(entry.latestWeight, tr.weightToday || 0);
    });

    const tickers = Object.values(tickerMap);
    const topBuys = tickers.filter(t => t.buyShares > 0).sort((a, b) => b.buyShares - a.buyShares);
    const topSells = tickers.filter(t => t.sellShares > 0).sort((a, b) => b.sellShares - a.sellShares);

    return {
      totalTrades: allTrades.length,
      buyCount: buys.length,
      sellCount: sells.length,
      newCount: newPositions.length,
      exitCount: exits.length,
      tradingDays: days.length,
      uniqueTickers: Object.keys(tickerMap).length,
      topBuys: topBuys.slice(0, 10),
      topSells: topSells.slice(0, 10),
      newPositions: [...new Map(newPositions.map(t => [t.ticker, t])).values()],
      exits: [...new Map(exits.map(t => [t.ticker, t])).values()],
    };
  };

  // ── 기간 라벨 ──
  const getPeriodLabel = (report) => {
    if (mode === 'weekly') {
      const start = new Date(report.start + 'T00:00:00');
      const end = new Date(start);
      end.setDate(start.getDate() + 4);
      const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
      return `${fmt(start)} ~ ${fmt(end)}`;
    } else {
      const [y, m] = report.key.split('-');
      return isKo ? `${y}년 ${parseInt(m)}월` : `${new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    }
  };

  // ── 접기 상태 ──
  const [expandedIdx, setExpandedIdx] = useState(0); // 첫 번째 리포트만 펼침

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

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm mb-4" style={{ color: t.textMuted }}>
          <ArrowLeft size={16} /> {L.t('common.back')}
        </button>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>CW</div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: t.text }}>
                {isKo ? '캐시 우드 매매 리포트' : 'Cathie Wood Trade Report'}
              </h1>
              <p className="text-xs" style={{ color: t.textMuted }}>
                {isKo ? 'ARK Invest 일별 매매 데이터 기반' : 'Based on ARK Invest daily trade data'}
              </p>
            </div>
          </div>

          {/* 주간/월간 토글 */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${t.cardRowBorder}` }}>
            {['weekly', 'monthly'].map(m => (
              <button key={m} className="px-4 py-2 text-xs font-medium transition-colors"
                style={{
                  background: mode === m ? t.accent : 'transparent',
                  color: mode === m ? '#fff' : t.textSecondary,
                }}
                onClick={() => { setMode(m); setExpandedIdx(0); }}>
                {m === 'weekly' ? (isKo ? '주간' : 'Weekly') : (isKo ? '월간' : 'Monthly')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 리포트 목록 */}
      {reports.map((report, idx) => {
        const stats = computeStats(report.days);
        const isOpen = expandedIdx === idx;
        const label = getPeriodLabel(report);

        return (
          <GlassCard key={idx} hover={false}>
            <div className="p-5">
              {/* 리포트 헤더 (클릭으로 접기/펼치기) */}
              <button className="w-full flex items-center justify-between"
                onClick={() => setExpandedIdx(isOpen ? -1 : idx)}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: `${t.accent}15` }}>
                    {mode === 'weekly' ? <Calendar size={18} style={{ color: t.accent }} /> : <FileText size={18} style={{ color: t.accent }} />}
                  </div>
                  <div className="text-left">
                    <div className="font-bold" style={{ color: t.text }}>{label}</div>
                    <div className="text-xs" style={{ color: t.textMuted }}>
                      {isKo
                        ? `${stats.tradingDays}거래일 · ${stats.totalTrades}건 · ${stats.uniqueTickers}종목`
                        : `${stats.tradingDays} days · ${stats.totalTrades} trades · ${stats.uniqueTickers} tickers`}
                    </div>
                  </div>
                  {idx === 0 && <Badge color={t.accent}>{isKo ? '최신' : 'Latest'}</Badge>}
                </div>
                <ChevronDown size={18} style={{ color: t.textMuted, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {isOpen && (
                <div className="mt-5 space-y-5">
                  {/* 요약 카드 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: isKo ? '매수' : 'Buys', value: stats.buyCount, color: t.green, icon: TrendingUp },
                      { label: isKo ? '매도' : 'Sells', value: stats.sellCount, color: t.red, icon: TrendingDown },
                      { label: isKo ? '신규 편입' : 'New', value: stats.newCount, color: t.accent, icon: Plus },
                      { label: isKo ? '완전 매도' : 'Exits', value: stats.exitCount, color: '#f59e0b', icon: LogOut },
                    ].map((s, i) => {
                      const I = s.icon;
                      return (
                        <div key={i} className="rounded-xl px-3 py-3" style={{ background: `${s.color}08`, border: `1px solid ${s.color}15` }}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <I size={13} style={{ color: s.color }} />
                            <span className="text-xs" style={{ color: t.textSecondary }}>{s.label}</span>
                          </div>
                          <div className="text-lg font-bold" style={{ color: s.value > 0 ? s.color : t.textMuted }}>{s.value}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 2열: Top 매수 / Top 매도 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Top 매수 */}
                    <div>
                      <div className="flex items-center gap-2 mb-2.5 pb-2" style={{ borderBottom: `1px solid ${t.green}20` }}>
                        <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: `${t.green}15` }}>
                          <TrendingUp size={12} style={{ color: t.green }} />
                        </div>
                        <span className="text-sm font-semibold" style={{ color: t.green }}>
                          {isKo ? 'Top 매수' : 'Top Buys'}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {stats.topBuys.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors"
                            style={{ background: 'transparent' }}
                            onClick={() => onNavigate("stock", item.ticker)}
                            onMouseEnter={e => e.currentTarget.style.background = t.cardRowHover}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <span className="text-xs font-bold w-5 text-center" style={{ color: t.textMuted }}>{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-bold" style={{ color: t.accent }}>{item.ticker}</span>
                              <span className="text-xs ml-1.5 truncate" style={{ color: t.textMuted }}>{item.company}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-bold" style={{ color: t.green }}>+{item.buyShares.toLocaleString()}</div>
                              <div className="text-[10px]" style={{ color: t.textMuted }}>{item.buyCount}{isKo ? '회' : 'x'}</div>
                            </div>
                          </div>
                        ))}
                        {stats.topBuys.length === 0 && (
                          <div className="text-xs text-center py-4" style={{ color: t.textMuted }}>{isKo ? '없음' : 'None'}</div>
                        )}
                      </div>
                    </div>

                    {/* Top 매도 */}
                    <div>
                      <div className="flex items-center gap-2 mb-2.5 pb-2" style={{ borderBottom: `1px solid ${t.red}20` }}>
                        <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: `${t.red}15` }}>
                          <TrendingDown size={12} style={{ color: t.red }} />
                        </div>
                        <span className="text-sm font-semibold" style={{ color: t.red }}>
                          {isKo ? 'Top 매도' : 'Top Sells'}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {stats.topSells.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors"
                            style={{ background: 'transparent' }}
                            onClick={() => onNavigate("stock", item.ticker)}
                            onMouseEnter={e => e.currentTarget.style.background = t.cardRowHover}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <span className="text-xs font-bold w-5 text-center" style={{ color: t.textMuted }}>{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-bold" style={{ color: t.accent }}>{item.ticker}</span>
                              <span className="text-xs ml-1.5 truncate" style={{ color: t.textMuted }}>{item.company}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-bold" style={{ color: t.red }}>-{item.sellShares.toLocaleString()}</div>
                              <div className="text-[10px]" style={{ color: t.textMuted }}>{item.sellCount}{isKo ? '회' : 'x'}</div>
                            </div>
                          </div>
                        ))}
                        {stats.topSells.length === 0 && (
                          <div className="text-xs text-center py-4" style={{ color: t.textMuted }}>{isKo ? '없음' : 'None'}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 신규 편입 & 완전 매도 */}
                  {(stats.newPositions.length > 0 || stats.exits.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {stats.newPositions.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2 pb-2" style={{ borderBottom: `1px solid ${t.accent}20` }}>
                            <Plus size={13} style={{ color: t.accent }} />
                            <span className="text-sm font-semibold" style={{ color: t.accent }}>
                              {isKo ? '신규 편입' : 'New Positions'}
                            </span>
                            <Badge color={t.accent}>{stats.newPositions.length}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {stats.newPositions.map((tr, i) => (
                              <span key={i} className="text-xs font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                                style={{ background: `${t.accent}10`, color: t.accent, border: `1px solid ${t.accent}20` }}
                                onClick={() => onNavigate("stock", tr.ticker)}>
                                {tr.ticker}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {stats.exits.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2 pb-2" style={{ borderBottom: `1px solid ${t.red}20` }}>
                            <LogOut size={13} style={{ color: t.red }} />
                            <span className="text-sm font-semibold" style={{ color: t.red }}>
                              {isKo ? '완전 매도' : 'Full Exits'}
                            </span>
                            <Badge color={t.red}>{stats.exits.length}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {stats.exits.map((tr, i) => (
                              <span key={i} className="text-xs font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                                style={{ background: `${t.red}10`, color: t.red, border: `1px solid ${t.red}20` }}
                                onClick={() => onNavigate("stock", tr.ticker)}>
                                {tr.ticker}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 일별 상세 */}
                  <div>
                    <div className="flex items-center gap-2 mb-2.5 pb-2" style={{ borderBottom: `1px solid ${t.cardRowBorder}` }}>
                      <BarChart3 size={13} style={{ color: t.textSecondary }} />
                      <span className="text-sm font-semibold" style={{ color: t.textSecondary }}>
                        {isKo ? '일별 거래 내역' : 'Daily Breakdown'}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {report.days.map((day, di) => {
                        const d = new Date(day.date + 'T00:00:00');
                        const weekday = isKo
                          ? ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
                          : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
                        const dateStr = `${d.getMonth() + 1}/${d.getDate()} (${weekday})`;
                        const dayBuys = day.trades.filter(t => t.direction === 'buy');
                        const daySells = day.trades.filter(t => t.direction === 'sell');

                        return (
                          <div key={di}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs font-semibold" style={{ color: t.text }}>{dateStr}</span>
                              <span className="text-[10px]" style={{ color: t.textMuted }}>
                                {day.trades.length}{isKo ? '건' : ' trades'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {day.trades.slice(0, 12).map((tr, ti) => (
                                <span key={ti} className="text-[11px] font-medium px-2 py-1 rounded-md cursor-pointer transition-colors"
                                  style={{
                                    background: tr.direction === 'buy' ? `${t.green}10` : `${t.red}10`,
                                    color: tr.direction === 'buy' ? t.green : t.red,
                                    border: `1px solid ${tr.direction === 'buy' ? t.green : t.red}15`,
                                  }}
                                  onClick={() => onNavigate("stock", tr.ticker)}>
                                  {tr.direction === 'buy' ? '▲' : '▼'} {tr.ticker}
                                </span>
                              ))}
                              {day.trades.length > 12 && (
                                <span className="text-[10px] self-center px-1" style={{ color: t.textMuted }}>
                                  +{day.trades.length - 12}
                                </span>
                              )}
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
