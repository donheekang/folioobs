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

// ── ARK 주간/월간 리포트 AI 인사이트 ──
export const generateArkReportInsight = (stats, days, isKo = true) => {
  const insights = [];
  const allTrades = days.flatMap(d => d.trades);

  // 1) 매수/매도 비율 분석 → 공격적 vs 방어적
  const ratio = stats.buyCount / Math.max(stats.sellCount, 1);
  if (ratio >= 1.5) {
    insights.push({
      icon: TrendingUp,
      title: isKo ? '공격적 매수 주간' : 'Aggressive Buying Week',
      desc: isKo
        ? `매수(${stats.buyCount}건)가 매도(${stats.sellCount}건)의 ${ratio.toFixed(1)}배. 시장에 대한 긍정적 전망을 반영합니다.`
        : `Buys (${stats.buyCount}) outpace sells (${stats.sellCount}) by ${ratio.toFixed(1)}x, reflecting bullish conviction.`,
      tag: isKo ? '매매동향' : 'Trend',
      color: '#22c55e',
    });
  } else if (ratio <= 0.67) {
    const sellRatio = (stats.sellCount / Math.max(stats.buyCount, 1)).toFixed(1);
    insights.push({
      icon: TrendingDown,
      title: isKo ? '방어적 매도 주간' : 'Defensive Selling Week',
      desc: isKo
        ? `매도(${stats.sellCount}건)가 매수(${stats.buyCount}건)의 ${sellRatio}배. 리스크 관리 또는 포트폴리오 조정 신호입니다.`
        : `Sells (${stats.sellCount}) outpace buys (${stats.buyCount}) by ${sellRatio}x, signaling portfolio adjustment.`,
      tag: isKo ? '매매동향' : 'Trend',
      color: '#ef4444',
    });
  }

  // 2) 섹터별 집중 분석
  const sectorBuys = {};
  const sectorSells = {};
  allTrades.forEach(tr => {
    const sec = tr.sector || (isKo ? '기타' : 'Other');
    if (tr.direction === 'buy') sectorBuys[sec] = (sectorBuys[sec] || 0) + 1;
    else sectorSells[sec] = (sectorSells[sec] || 0) + 1;
  });

  const topBuySector = Object.entries(sectorBuys).sort((a, b) => b[1] - a[1])[0];
  const topSellSector = Object.entries(sectorSells).sort((a, b) => b[1] - a[1])[0];

  if (topBuySector && topBuySector[1] >= 3) {
    insights.push({
      icon: PieIcon,
      title: isKo ? `${topBuySector[0]} 섹터 집중 매수` : `${topBuySector[0]} Sector Focus`,
      desc: isKo
        ? `${topBuySector[0]} 섹터에서 ${topBuySector[1]}건의 매수가 발생했습니다. 해당 섹터에 대한 강한 확신을 보여줍니다.`
        : `${topBuySector[1]} buy trades in ${topBuySector[0]} sector, showing strong conviction.`,
      tag: isKo ? '섹터' : 'Sector',
      color: '#8b5cf6',
    });
  }

  if (topSellSector && topSellSector[1] >= 3 && (!topBuySector || topSellSector[0] !== topBuySector[0])) {
    insights.push({
      icon: AlertTriangle,
      title: isKo ? `${topSellSector[0]} 섹터 비중 축소` : `${topSellSector[0]} Sector Reduction`,
      desc: isKo
        ? `${topSellSector[0]} 섹터에서 ${topSellSector[1]}건의 매도가 발생했습니다. 해당 섹터 비중을 줄이고 있습니다.`
        : `${topSellSector[1]} sell trades in ${topSellSector[0]} sector, reducing exposure.`,
      tag: isKo ? '섹터' : 'Sector',
      color: '#f59e0b',
    });
  }

  // 3) 집중 매매 종목 (같은 종목을 여러 번 거래)
  const tickerCounts = {};
  allTrades.forEach(tr => { tickerCounts[tr.ticker] = (tickerCounts[tr.ticker] || 0) + 1; });
  const repeats = Object.entries(tickerCounts).filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]);
  if (repeats.length > 0) {
    const top3 = repeats.slice(0, 3).map(([tk, c]) => `${tk}(${c}${isKo ? '회' : 'x'})`).join(', ');
    insights.push({
      icon: Star,
      title: isKo ? '집중 거래 종목 감지' : 'Concentrated Trading Detected',
      desc: isKo
        ? `${top3} — 반복 거래가 감지되었습니다. 포지션을 적극적으로 조정하고 있는 종목입니다.`
        : `${top3} — repeated trades detected, actively adjusting positions.`,
      tag: isKo ? '집중매매' : 'Focus',
      color: '#06b6d4',
    });
  }

  // 4) 최대 단일 매수/매도
  const biggestBuy = allTrades.filter(t => t.direction === 'buy').sort((a, b) => Math.abs(b.sharesChange) - Math.abs(a.sharesChange))[0];
  const biggestSell = allTrades.filter(t => t.direction === 'sell').sort((a, b) => Math.abs(b.sharesChange) - Math.abs(a.sharesChange))[0];

  if (biggestBuy && Math.abs(biggestBuy.sharesChange) >= 50000) {
    const shares = Math.abs(biggestBuy.sharesChange).toLocaleString();
    insights.push({
      icon: Lightbulb,
      title: isKo ? `${biggestBuy.ticker} 대규모 매수` : `Major Buy: ${biggestBuy.ticker}`,
      desc: isKo
        ? `${biggestBuy.company} ${shares}주 매수. 이번 기간 최대 규모 매수입니다.`
        : `${biggestBuy.company} — ${shares} shares bought, the largest buy this period.`,
      tag: isKo ? '주목' : 'Notable',
      color: '#22c55e',
    });
  }

  if (biggestSell && Math.abs(biggestSell.sharesChange) >= 100000) {
    const shares = Math.abs(biggestSell.sharesChange).toLocaleString();
    insights.push({
      icon: Lightbulb,
      title: isKo ? `${biggestSell.ticker} 대규모 매도` : `Major Sell: ${biggestSell.ticker}`,
      desc: isKo
        ? `${biggestSell.company} ${shares}주 매도. 이번 기간 최대 규모 매도입니다.`
        : `${biggestSell.company} — ${shares} shares sold, the largest sell this period.`,
      tag: isKo ? '주목' : 'Notable',
      color: '#ef4444',
    });
  }

  // 5) 거래 다양성 (종목 수 대비 거래 수)
  if (stats.uniqueTickers >= 15) {
    insights.push({
      icon: Brain,
      title: isKo ? '광범위한 포트폴리오 조정' : 'Broad Portfolio Adjustment',
      desc: isKo
        ? `${stats.uniqueTickers}개 종목에서 거래가 발생했습니다. 전반적인 포트폴리오 리밸런싱이 진행 중입니다.`
        : `Trades across ${stats.uniqueTickers} tickers, indicating broad portfolio rebalancing.`,
      tag: isKo ? '리밸런싱' : 'Rebalance',
      color: '#8b5cf6',
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
