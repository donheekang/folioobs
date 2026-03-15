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

// ── ARK 주간/월간 리포트 인사이트 ──
export const generateArkReportInsight = (stats, days, isKo = true) => {
  const allTrades = days.flatMap(d => d.trades);
  if (allTrades.length === 0) return [];

  const buys = allTrades.filter(tr => tr.direction === 'buy');
  const sells = allTrades.filter(tr => tr.direction === 'sell');

  // 섹터별 집계
  const sectorBuys = {}, sectorSells = {};
  allTrades.forEach(tr => {
    const sec = tr.sector || '';
    if (!sec || sec === '기타' || sec === 'Other') return;
    const map = tr.direction === 'buy' ? sectorBuys : sectorSells;
    if (!map[sec]) map[sec] = { count: 0, tickers: new Set() };
    map[sec].count++;
    map[sec].tickers.add(tr.ticker);
  });

  // 종목별 집계
  const tickerInfo = {};
  allTrades.forEach(tr => {
    if (!tickerInfo[tr.ticker]) tickerInfo[tr.ticker] = { ticker: tr.ticker, company: tr.company, buyCount: 0, sellCount: 0, buyShares: 0, sellShares: 0 };
    const info = tickerInfo[tr.ticker];
    if (tr.direction === 'buy') { info.buyCount++; info.buyShares += Math.abs(tr.sharesChange); }
    else { info.sellCount++; info.sellShares += Math.abs(tr.sharesChange); }
  });

  const ratio = stats.buyCount / Math.max(stats.sellCount, 1);
  const topBuySec = Object.entries(sectorBuys).sort((a, b) => b[1].count - a[1].count)[0];
  const topSellSec = Object.entries(sectorSells).sort((a, b) => b[1].count - a[1].count)[0];
  const convictionBuy = Object.values(tickerInfo).filter(t => t.buyCount >= 3).sort((a, b) => b.buyShares - a.buyShares)[0];
  const convictionSell = Object.values(tickerInfo).filter(t => t.sellCount >= 3).sort((a, b) => b.sellShares - a.sellShares)[0];

  // ── 가장 임팩트 있는 인사이트 1개만 선택 ──
  // 우선순위: 섹터 로테이션 > 확신 매수/매도 > 매수/매도 비율

  // 1) 섹터 로테이션 (가장 강한 신호)
  const hasRotation = topBuySec && topSellSec && topBuySec[0] !== topSellSec[0] && topBuySec[1].count >= 3 && topSellSec[1].count >= 3;
  if (hasRotation) {
    const buyTickers = [...topBuySec[1].tickers].slice(0, 2).join(', ');
    const sellTickers = [...topSellSec[1].tickers].slice(0, 2).join(', ');
    return [{
      icon: Brain,
      title: isKo ? `${topSellSec[0]} → ${topBuySec[0]} 전환` : `${topSellSec[0]} → ${topBuySec[0]} Rotation`,
      desc: isKo
        ? `${topSellSec[0]}(${sellTickers}) 비중을 줄이고 ${topBuySec[0]}(${buyTickers})을 늘리고 있습니다. 자금 흐름이 ${topBuySec[0]} 쪽으로 이동 중.`
        : `Trimming ${topSellSec[0]} (${sellTickers}) and building ${topBuySec[0]} (${buyTickers}). Capital flowing toward ${topBuySec[0]}.`,
      tag: isKo ? '섹터전환' : 'Rotation',
      color: '#8b5cf6',
    }];
  }

  // 2) 같은 종목 3일 이상 연속 매수 → 확신 신호
  if (convictionBuy) {
    return [{
      icon: Star,
      title: isKo ? `${convictionBuy.ticker} ${convictionBuy.buyCount}일 연속 매수` : `${convictionBuy.ticker}: ${convictionBuy.buyCount}-Day Buying Streak`,
      desc: isKo
        ? `${convictionBuy.company}를 ${convictionBuy.buyCount}일에 걸쳐 ${convictionBuy.buyShares.toLocaleString()}주 매수. 나눠서 사는 건 단기 트레이딩이 아닌 확신에 기반한 매수.`
        : `${convictionBuy.buyShares.toLocaleString()} shares over ${convictionBuy.buyCount} days. Spreading buys = conviction, not a quick trade.`,
      tag: isKo ? '확신매수' : 'Conviction',
      color: '#22c55e',
    }];
  }

  // 3) 같은 종목 3일 이상 연속 매도 → 정리 신호
  if (convictionSell) {
    return [{
      icon: AlertTriangle,
      title: isKo ? `${convictionSell.ticker} ${convictionSell.sellCount}일 연속 매도` : `${convictionSell.ticker}: ${convictionSell.sellCount}-Day Selling`,
      desc: isKo
        ? `${convictionSell.company}를 ${convictionSell.sellCount}일에 걸쳐 ${convictionSell.sellShares.toLocaleString()}주 처분. 점진적 매도는 포지션 정리 신호.`
        : `${convictionSell.sellShares.toLocaleString()} shares sold over ${convictionSell.sellCount} days. Gradual selling signals position unwinding.`,
      tag: isKo ? '포지션정리' : 'Unwinding',
      color: '#f59e0b',
    }];
  }

  // 4) 매수/매도 비율이 극단적일 때만
  if (ratio >= 2.0) {
    const topBuy = buys.sort((a, b) => Math.abs(b.sharesChange) - Math.abs(a.sharesChange))[0];
    return [{
      icon: TrendingUp,
      title: isKo ? '매수 집중 구간' : 'Heavy Buying Period',
      desc: isKo
        ? `매수 ${stats.buyCount}건 vs 매도 ${stats.sellCount}건. ${topBuy ? `${topBuy.ticker} 중심으로` : ''} 적극적으로 포지션을 늘리는 구간.`
        : `${stats.buyCount} buys vs ${stats.sellCount} sells. ${topBuy ? `Led by ${topBuy.ticker}.` : ''} Actively building positions.`,
      tag: isKo ? '매수우위' : 'Bullish',
      color: '#22c55e',
    }];
  }
  if (ratio <= 0.5) {
    const topSell = sells.sort((a, b) => Math.abs(b.sharesChange) - Math.abs(a.sharesChange))[0];
    return [{
      icon: TrendingDown,
      title: isKo ? '매도 집중 구간' : 'Heavy Selling Period',
      desc: isKo
        ? `매도 ${stats.sellCount}건 vs 매수 ${stats.buyCount}건. ${topSell ? `${topSell.ticker} 중심으로` : ''} 비중을 줄이며 현금 확보 중.`
        : `${stats.sellCount} sells vs ${stats.buyCount} buys. ${topSell ? `Led by ${topSell.ticker}.` : ''} Reducing exposure.`,
      tag: isKo ? '매도우위' : 'Bearish',
      color: '#ef4444',
    }];
  }

  return [];
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
