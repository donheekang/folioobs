import {
  TrendingUp, TrendingDown, PieChart as PieIcon,
  Star, AlertTriangle, Brain, Lightbulb
} from "lucide-react";

export const getSectorData = (holdings) => {
  const s = {};
  holdings.forEach(h => {
    if (!s[h.sector]) s[h.sector] = { name: h.sector, value: 0, count: 0 };
    s[h.sector].value += h.pct;
    s[h.sector].count++;
  });
  return Object.values(s).sort((a, b) => b.value - a.value);
};

// L = locale helper from useLocale() — optional for backward compat
export const generateInsights = (investor, holdings, L) => {
  const insights = [];
  const sd = getSectorData(holdings);
  const top = sd[0];
  const newP = holdings.filter(h => (h.change ?? 0) === 100);
  const bigUp = holdings.filter(h => (h.change ?? 0) > 10 && (h.change ?? 0) !== 100);
  const bigDown = holdings.filter(h => (h.change ?? 0) < -10);
  const hhi = holdings.reduce((s, h) => s + (h.pct/100)**2, 0);

  // Translation texts — use L.t('insightTexts.*') if locale helper provided, else Korean fallback
  const txt = L ? L.strings.insightTexts : null;

  if (hhi > 0.15) {
    const top3 = holdings.slice(0,3).reduce((s,h)=>s+h.pct,0).toFixed(1);
    const hhiVal = (hhi*10000).toFixed(0);
    insights.push({
      icon: AlertTriangle,
      title: txt ? txt.highConcentration : "높은 포트폴리오 집중도 감지",
      desc: txt ? txt.highConcentrationDesc(top3, hhiVal) : `상위 3개 종목이 ${top3}% 차지. HHI ${hhiVal}.`,
      confidence: 92, tag: "리스크"
    });
  }
  if (top && top.value > 40) {
    const sectorName = L ? L.sector(top.name) : top.name;
    insights.push({
      icon: PieIcon,
      title: txt ? txt.sectorOverexposure(sectorName) : `${top.name} 섹터 과다 노출`,
      desc: txt ? txt.sectorOverexposureDesc(sectorName, top.value.toFixed(1)) : `${top.name} 비중 ${top.value.toFixed(1)}%. 섹터 리스크 분산 필요.`,
      confidence: 88, tag: "섹터"
    });
  }
  if (newP.length > 0) {
    const names = newP.map(p=>p.name).join(', ');
    insights.push({
      icon: Star,
      title: txt ? txt.newPositions(newP.length) : `${newP.length}개 신규 포지션`,
      desc: txt ? txt.newPositionsDesc(names) : `${names} 신규 진입.`,
      confidence: 95, tag: "신규매수"
    });
  }
  if (bigUp.length > 0) insights.push({
    icon: TrendingUp,
    title: txt ? txt.majorIncrease : "주요 비중 확대",
    desc: `${bigUp.map(h=>`${h.name}(+${(h.change ?? 0).toFixed(1)}%)`).join(', ')}`,
    confidence: 90, tag: "비중확대"
  });
  if (bigDown.length > 0) insights.push({
    icon: TrendingDown,
    title: txt ? txt.majorDecrease : "주요 비중 축소",
    desc: `${bigDown.map(h=>`${h.name}(${(h.change ?? 0).toFixed(1)}%)`).join(', ')}`,
    confidence: 85, tag: "비중축소"
  });

  const styleName = L ? L.style(investor.style) : investor.style;
  const styleDesc = txt ? (txt.styleDescs[investor.style] || '') : ({ "가치투자": "장기 보유 중심, 현금흐름 안정 기업 위주.", "성장주투자": "혁신 기업 중심, 높은 변동성 감수.", "매크로투자": "거시경제 트렌드 반영, 다양한 자산군.", "분산투자": "ETF와 다양한 섹터 활용, 안정적 수익.", "행동주의투자": "소수 종목 집중, 경영 참여 가치 극대화." })[investor.style];
  insights.push({
    icon: Brain,
    title: txt ? txt.styleTitle(styleName) : `투자 스타일: ${investor.style}`,
    desc: styleDesc,
    confidence: 94, tag: "스타일"
  });

  if (Math.abs(investor.metrics.qoqChange) > 3) {
    const isUp = investor.metrics.qoqChange > 0;
    const qoq = `${isUp?'+':''}${investor.metrics.qoqChange}`;
    insights.push({
      icon: Lightbulb,
      title: txt ? (isUp ? txt.expansionTrend : txt.defensiveTrend) : (isUp ? "적극적 확장 추세" : "방어적 조정 추세"),
      desc: txt ? (isUp ? txt.expansionDesc(qoq) : txt.defensiveDesc(qoq)) : `QoQ ${qoq}%. ${isUp ? '시장 긍정 전망.' : '리스크 관리 강화.'}`,
      confidence: 78, tag: "트렌드"
    });
  }
  return insights;
};

export const generateComparisonInsight = (inv1, inv2, HOLDINGS = {}) => {
  const h1 = HOLDINGS[inv1.id]||[], h2 = HOLDINGS[inv2.id]||[];
  const t1 = new Set(h1.map(h=>h.ticker)), t2 = new Set(h2.map(h=>h.ticker));
  const common = [...t1].filter(t => t2.has(t));
  const names = common.map(t => h1.find(h=>h.ticker===t)?.name || t);
  const s1 = getSectorData(h1), s2 = getSectorData(h2);
  const allS = new Set([...s1.map(s=>s.name),...s2.map(s=>s.name)]);
  let ov = 0; allS.forEach(s => { ov += Math.min(s1.find(x=>x.name===s)?.value||0, s2.find(x=>x.name===s)?.value||0); });
  return { commonCount: common.length, commonNames: names, overlapPct: ((common.length/Math.max(h1.length,h2.length))*100).toFixed(1), sectorOverlap: ov.toFixed(1), styleMatch: inv1.style === inv2.style };
};
