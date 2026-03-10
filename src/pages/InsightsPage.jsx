import { useState, useMemo } from "react";
import { ArrowLeft, Lightbulb, Filter, ChevronRight, Brain, AlertTriangle, TrendingUp, TrendingDown, Star, Activity, DollarSign, PieChart as PieIcon, Sparkles, ChevronDown, ChevronUp, LayoutGrid, List, Calendar } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useLocale } from "../hooks/useLocale";
import { useData } from "../hooks/useDataProvider";
import { SECTOR_COLORS, TAG_COLORS_MAP } from "../data";
import { GlassCard, Badge, ChartTooltip } from "../components/shared";
import { getSectorData, generateInsights } from "../utils/insights";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell } from "recharts";

// AI 태그 → 아이콘 매핑
const AI_TAG_ICONS = {
  '전략': Brain, '리스크': AlertTriangle, '섹터': PieIcon,
  '트렌드': TrendingUp, '신규매수': Star, '비중확대': TrendingUp,
  '비중축소': TrendingDown, '매크로': Activity, '밸류에이션': DollarSign,
  '스타일': Sparkles,
};

// 신뢰도 바 컬러
const getConfColor = (conf, t) => {
  if (conf >= 90) return t.green;
  if (conf >= 80) return t.accent;
  if (conf >= 70) return t.amber;
  return t.textMuted;
};

const InsightsPage = ({ onBack, onNavigate }) => {
  const t = useTheme();
  const L = useLocale();
  const { investors: INVESTORS, holdings: HOLDINGS, aiInsights } = useData();
  const [filterInv, setFilterInv] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("investor");
  const [viewMode, setViewMode] = useState("grouped");
  const [expandedInv, setExpandedInv] = useState(null); // null = 모두 열림
  const [selectedPeriod, setSelectedPeriod] = useState({}); // { investorId: quarterKey }
  const tagColors = TAG_COLORS_MAP(t);

  // 투자자별 사용 가능한 날짜/분기 목록
  const periodsByInvestor = useMemo(() => {
    const result = {};
    INVESTORS.forEach(inv => {
      const invInsights = aiInsights?.[inv.id];
      if (!invInsights) return;
      const periods = Object.keys(invInsights)
        .filter(k => k !== '_latest')
        .sort((a, b) => b.localeCompare(a)); // 최신순
      if (periods.length > 0) result[inv.id] = periods;
    });
    return result;
  }, [INVESTORS, aiInsights]);

  // 선택된 기간의 인사이트 가져오기
  const getSelectedAiData = (invId) => {
    const invInsights = aiInsights?.[invId];
    if (!invInsights) return null;
    const selKey = selectedPeriod[invId];
    if (selKey && invInsights[selKey]) return invInsights[selKey];
    return invInsights._latest || null;
  };

  const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];
  const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // quarter key → 표시용 라벨 변환
  const formatPeriodLabel = (qKey, locale, full = false) => {
    // "2026Q1-0309" → 일별
    if (qKey.includes('-')) {
      const yearQ = qKey.split('-')[0]; // "2026Q1"
      const mmdd = qKey.split('-')[1]; // "0309"
      const year = parseInt(yearQ.slice(0, 4));
      const mm = parseInt(mmdd.slice(0, 2));
      const dd = parseInt(mmdd.slice(2));
      const d = new Date(year, mm - 1, dd);
      const wd = locale === 'ko' ? WEEKDAYS_KO[d.getDay()] : WEEKDAYS_EN[d.getDay()];
      if (full) {
        return locale === 'ko' ? `${mm}월 ${dd}일 (${wd})` : `${WEEKDAYS_EN[d.getDay()]}, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      }
      return locale === 'ko' ? `${mm}/${dd} ${wd}` : `${mm}/${dd} ${wd}`;
    }
    // "2025Q4" → 분기
    const y = qKey.slice(0, 4);
    const q = qKey.slice(4);
    return locale === 'ko' ? `${y}년 ${q}` : `${q} ${y}`;
  };

  // 일별인지 분기별인지
  const isDaily = (qKey) => qKey && qKey.includes('-');

  // 모든 인사이트 수집 — AI 우선, 없으면 룰 기반 fallback
  const allInsights = useMemo(() => {
    const result = [];
    INVESTORS.forEach(inv => {
      const aiData = getSelectedAiData(inv.id);
      const hasAI = aiData && aiData.insights && aiData.insights.length > 0;

      if (hasAI) {
        aiData.insights.forEach(ins => {
          const isEn = L.locale === 'en';
          result.push({
            ...ins,
            title: (isEn && ins.title_en) ? ins.title_en : ins.title,
            desc: (isEn && ins.desc_en) ? ins.desc_en : ins.desc,
            tag: ins.tag,
            icon: AI_TAG_ICONS[ins.tag] || Lightbulb,
            investor: inv,
            isAI: true,
            quarter: aiData.quarter || null,
            quarterRaw: aiData.quarterRaw || null,
            generatedAt: aiData.generatedAt || null,
          });
        });
      } else {
        generateInsights(inv, HOLDINGS[inv.id] || [], L).forEach(ins => {
          result.push({ ...ins, investor: inv, isAI: false, quarter: null, confidence: null });
        });
      }
    });
    return result;
  }, [INVESTORS, HOLDINGS, aiInsights, L, selectedPeriod]);

  // 필터 & 정렬
  const filtered = useMemo(() => {
    let items = allInsights.filter(i =>
      (filterInv === "all" || i.investor.id === filterInv) &&
      (filterType === "all" || i.tag === filterType)
    );
    if (sortBy === "confidence") items = [...items].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    else if (sortBy === "tag") items = [...items].sort((a, b) => (a.tag || '').localeCompare(b.tag || ''));
    return items;
  }, [allInsights, filterInv, filterType, sortBy]);

  // 투자자별 그룹핑
  const groupedByInvestor = useMemo(() => {
    const groups = new Map();
    filtered.forEach(ins => {
      const key = ins.investor.id;
      if (!groups.has(key)) groups.set(key, { investor: ins.investor, insights: [], isAI: ins.isAI, quarter: ins.quarter });
      groups.get(key).insights.push(ins);
    });
    return [...groups.values()];
  }, [filtered]);

  const tags = [...new Set(allInsights.map(i => i.tag))];
  const aiCount = allInsights.filter(i => i.isAI).length;
  const ruleCount = allInsights.filter(i => !i.isAI).length;

  // 섹터 트렌드
  const sectorTrends = useMemo(() => {
    const s = {};
    INVESTORS.forEach(inv => getSectorData(HOLDINGS[inv.id] || []).forEach(x => {
      if (!s[x.name]) s[x.name] = { name: x.name, total: 0, count: 0 };
      s[x.name].total += x.value; s[x.name].count++;
    }));
    return Object.values(s).map(x => ({ ...x, displayName: L.sector ? L.sector(x.name) : x.name, avg: x.total / (x.count || 1) })).sort((a, b) => b.avg - a.avg).slice(0, 8);
  }, [INVESTORS, HOLDINGS, L]);

  const toggleInvestor = (id) => {
    setExpandedInv(prev => {
      if (prev === null) return new Set(INVESTORS.map(i => i.id).filter(x => x !== id));
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const isExpanded = (id) => expandedInv === null || expandedInv.has(id);

  // =========== 인사이트 카드 ===========
  const InsightCard = ({ ins, showInvestor = false }) => {
    const I = ins.icon || AI_TAG_ICONS[ins.tag] || Lightbulb;
    const c = tagColors[ins.tag] || t.textMuted;
    const confColor = ins.confidence ? getConfColor(ins.confidence, t) : null;

    return (
      <GlassCard onClick={() => onNavigate("investor", ins.investor.id)}
        className="min-w-0 overflow-hidden"
        glow={`radial-gradient(circle at top left, ${c}08, transparent)`}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl mt-0.5 flex-shrink-0" style={{ background: `${c}15`, border: `1px solid ${c}20` }}>
              <I size={16} style={{ color: c }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                {showInvestor && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ background: ins.investor.gradient }}>{ins.investor.avatar}</div>
                    <span className="text-xs font-medium" style={{ color: t.textMuted }}>{L.investorName(ins.investor)}</span>
                  </div>
                )}
                <Badge color={c}>{L.tag ? L.tag(ins.tag) : ins.tag}</Badge>
                {ins.isAI && <Badge color={t.accent}>AI</Badge>}
                {confColor && (
                  <div className="flex items-center gap-1">
                    <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: `${confColor}20` }}>
                      <div className="h-full rounded-full" style={{ width: `${ins.confidence}%`, background: confColor }} />
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: confColor }}>{ins.confidence}%</span>
                  </div>
                )}
              </div>
              <h4 className="font-bold text-sm mb-1 break-words" style={{ color: t.text }}>{ins.title}</h4>
              <p className="text-xs leading-relaxed break-words" style={{ color: t.textSecondary }}>{ins.desc}</p>
            </div>
            <ChevronRight size={16} style={{ color: t.textMuted }} className="mt-1 flex-shrink-0 opacity-40" />
          </div>
        </div>
      </GlassCard>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity" style={{ color: t.textMuted }}>
        <ArrowLeft size={16} /> {L.t('common.back')}
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ background: `${t.purple}20` }}>
            <Lightbulb size={22} style={{ color: t.purple }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: t.text }}>{L.t('insightsPage.title')}</h1>
          <Badge color={t.purple}>{filtered.length}{L.t('common.items')}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {aiCount > 0 && (
            <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg" style={{ background: `${t.accent}12`, color: t.accent }}>
              <Sparkles size={12} /> {L.t('insightsPage.aiCount').replace('{count}', aiCount)}
            </div>
          )}
          {ruleCount > 0 && (
            <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg" style={{ background: `${t.textMuted}12`, color: t.textMuted }}>
              <Activity size={12} /> {L.t('insightsPage.ruleCount').replace('{count}', ruleCount)}
            </div>
          )}
        </div>
      </div>

      {/* 섹터 트렌드 차트 */}
      <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: t.insightBg }}>
        <h3 className="font-bold mb-3" style={{ color: t.text }}>{L.t('insightsPage.marketPulse')}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={sectorTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
            <XAxis dataKey="displayName" tick={{ fontSize: 11, fill: t.textSecondary }} stroke="transparent" />
            <YAxis tick={{ fontSize: 11, fill: t.textMuted }} stroke="transparent" />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="avg" radius={[6, 6, 0, 0]} name={L.t('insightsPage.avgWeight')}>
              {sectorTrends.map((s, i) => <Cell key={i} fill={SECTOR_COLORS[s.name] || "#64748B"} fillOpacity={0.8} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 필터 + 정렬 + 뷰모드 */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter size={14} style={{ color: t.textMuted }} />
          <select value={filterInv} onChange={e => setFilterInv(e.target.value)}
            className="text-sm rounded-xl px-3 py-1.5 outline-none"
            style={{ background: t.selectBg, border: `1px solid ${t.glassBorder}`, color: t.text }}>
            <option value="all">{L.t('insightsPage.allInvestors')}</option>
            {INVESTORS.map(inv => <option key={inv.id} value={inv.id}>{L.investorName(inv)}</option>)}
          </select>
          <div className="flex flex-wrap gap-1.5">
            {["all", ...tags].map(tag => (
              <button key={tag} onClick={() => setFilterType(tag)}
                className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: filterType === tag ? (tagColors[tag] || t.accent) : t.inactiveBtnBg,
                  color: filterType === tag ? '#fff' : t.textSecondary,
                  border: `1px solid ${filterType === tag ? 'transparent' : t.glassBorder}`,
                }}>
                {tag === "all" ? L.t('common.all') : (L.tag ? L.tag(tag) : tag)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="text-xs rounded-lg px-2 py-1.5 outline-none"
            style={{ background: t.selectBg, border: `1px solid ${t.glassBorder}`, color: t.textSecondary }}>
            <option value="investor">{L.t('insightsPage.sortByInvestor')}</option>
            <option value="confidence">{L.t('insightsPage.sortByConfidence')}</option>
            <option value="tag">{L.t('insightsPage.sortByTag')}</option>
          </select>
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${t.glassBorder}` }}>
            <button onClick={() => setViewMode("grouped")} className="p-1.5 transition-colors"
              style={{ background: viewMode === "grouped" ? `${t.accent}20` : 'transparent' }}>
              <LayoutGrid size={14} style={{ color: viewMode === "grouped" ? t.accent : t.textMuted }} />
            </button>
            <button onClick={() => setViewMode("flat")} className="p-1.5 transition-colors"
              style={{ background: viewMode === "flat" ? `${t.accent}20` : 'transparent' }}>
              <List size={14} style={{ color: viewMode === "flat" ? t.accent : t.textMuted }} />
            </button>
          </div>
        </div>
      </div>

      {/* ===== 인사이트 목록 ===== */}
      {viewMode === "grouped" ? (
        <div className="space-y-4">
          {groupedByInvestor.map(group => {
            const inv = group.investor;
            const expanded = isExpanded(inv.id);
            const avgConf = group.insights.filter(i => i.confidence).length > 0
              ? Math.round(group.insights.filter(i => i.confidence).reduce((s, i) => s + i.confidence, 0) / group.insights.filter(i => i.confidence).length)
              : 0;

            const periods = periodsByInvestor[inv.id] || [];
            const currentPeriod = selectedPeriod[inv.id] || periods[0] || null;
            const currentIsDaily = currentPeriod ? isDaily(currentPeriod) : false;
            const periodLabel = currentPeriod ? formatPeriodLabel(currentPeriod, L.locale, true) : null;
            const isLatestSelected = currentPeriod === periods[0];

            return (
              <div key={inv.id}>
                <button onClick={() => toggleInvestor(inv.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:opacity-90"
                  style={{ background: `${t.surface}90`, border: `1px solid ${t.glassBorder}` }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: inv.gradient }}>{inv.avatar}</div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm truncate" style={{ color: t.text }}>{L.investorName(inv)}</span>
                      {/* 일별/분기 업데이트 구분 배지 */}
                      {group.isAI && currentIsDaily && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                          style={{ background: '#f59e0b15', color: '#f59e0b' }}>
                          {L.locale === 'ko' ? '일별' : 'Daily'}
                        </span>
                      )}
                      {group.isAI && !currentIsDaily && currentPeriod && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                          style={{ background: `${t.accent}15`, color: t.accent }}>
                          {L.locale === 'ko' ? '분기' : 'Quarterly'}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] flex items-center gap-2 mt-0.5" style={{ color: t.textMuted }}>
                      {/* 항상 현재 날짜/분기 표시 */}
                      {periodLabel && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {periodLabel}
                        </span>
                      )}
                      {group.isAI && <span style={{ color: t.accent }}>{L.t('insightsPage.aiAnalysis')}</span>}
                      {avgConf > 0 && <span>{L.t('insightsPage.avgConfidence').replace('{value}', avgConf)}</span>}
                    </div>
                  </div>
                  <Badge color={t.purple}>{group.insights.length}{L.t('common.items')}</Badge>
                  {expanded ? <ChevronUp size={16} style={{ color: t.textMuted }} /> : <ChevronDown size={16} style={{ color: t.textMuted }} />}
                </button>
                {expanded && (
                  <div className="mt-3">
                    {/* 날짜/분기 선택 탭 — 1개여도 표시 */}
                    {periods.length >= 1 && (
                      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                        <Calendar size={12} style={{ color: t.textMuted }} />
                        {periods.map((pKey, idx) => {
                          const isActive = pKey === currentPeriod;
                          const label = formatPeriodLabel(pKey, L.locale);
                          const isFirst = idx === 0; // 최신
                          return (
                            <button key={pKey}
                              onClick={(e) => { e.stopPropagation(); setSelectedPeriod(prev => ({ ...prev, [inv.id]: pKey })); }}
                              className="text-xs px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
                              style={{
                                background: isActive ? `${t.accent}20` : t.name === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                border: isActive ? `1.5px solid ${t.accent}` : `1px solid ${t.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                                color: isActive ? t.accent : t.textMuted,
                              }}>
                              {label}
                              {isFirst && (
                                <span className="text-[9px] px-1 py-px rounded font-medium"
                                  style={{ background: isActive ? `${t.green}20` : `${t.green}10`, color: t.green }}>
                                  {L.locale === 'ko' ? '최신' : 'Latest'}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {group.insights.map((ins, i) => <InsightCard key={`${inv.id}-${i}`} ins={ins} />)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ins, i) => <InsightCard key={i} ins={ins} showInvestor />)}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Lightbulb size={32} style={{ color: t.textMuted }} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm" style={{ color: t.textMuted }}>필터 조건에 맞는 인사이트가 없습니다</p>
        </div>
      )}
    </div>
  );
};

export default InsightsPage;
