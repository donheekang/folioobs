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
  if (allTrades.length === 0) return insights;

  // ── 데이터 준비 ──
  const buys = allTrades.filter(tr => tr.direction === 'buy');
  const sells = allTrades.filter(tr => tr.direction === 'sell');

  // 섹터별 매수/매도 집계 (종목 리스트 포함)
  const sectorBuys = {};
  const sectorSells = {};
  allTrades.forEach(tr => {
    const sec = tr.sector || '';
    if (!sec || sec === '기타' || sec === 'Other') return; // 기타 제외
    const map = tr.direction === 'buy' ? sectorBuys : sectorSells;
    if (!map[sec]) map[sec] = { count: 0, tickers: new Set(), shares: 0 };
    map[sec].count++;
    map[sec].tickers.add(tr.ticker);
    map[sec].shares += Math.abs(tr.sharesChange);
  });

  // 종목별 매매 방향 & 반복 횟수
  const tickerInfo = {};
  allTrades.forEach(tr => {
    if (!tickerInfo[tr.ticker]) tickerInfo[tr.ticker] = { ticker: tr.ticker, company: tr.company, sector: tr.sector, buyCount: 0, sellCount: 0, buyShares: 0, sellShares: 0 };
    const info = tickerInfo[tr.ticker];
    if (tr.direction === 'buy') { info.buyCount++; info.buyShares += Math.abs(tr.sharesChange); }
    else { info.sellCount++; info.sellShares += Math.abs(tr.sharesChange); }
  });

  const topBuySectors = Object.entries(sectorBuys).sort((a, b) => b[1].count - a[1].count);
  const topSellSectors = Object.entries(sectorSells).sort((a, b) => b[1].count - a[1].count);
  const ratio = stats.buyCount / Math.max(stats.sellCount, 1);

  // ── 1) 핵심 전략 인사이트: 전체 매매의 "왜" ──
  // 섹터 로테이션 감지 (한 섹터 팔고 다른 섹터 사기)
  const mainBuySec = topBuySectors[0];
  const mainSellSec = topSellSectors[0];
  const hasRotation = mainBuySec && mainSellSec && mainBuySec[0] !== mainSellSec[0] && mainBuySec[1].count >= 2 && mainSellSec[1].count >= 2;

  if (hasRotation) {
    const buyNames = [...mainBuySec[1].tickers].slice(0, 3).join(', ');
    const sellNames = [...mainSellSec[1].tickers].slice(0, 3).join(', ');
    insights.push({
      icon: Brain,
      title: isKo ? '섹터 로테이션 진행 중' : 'Sector Rotation Underway',
      desc: isKo
        ? `${mainSellSec[0]}(${sellNames}) 비중을 줄이면서 ${mainBuySec[0]}(${buyNames})으로 자금을 이동하고 있습니다. 캐시 우드가 ${mainBuySec[0]} 섹터의 성장성을 더 높게 평가하고 있다는 신호입니다.`
        : `Rotating out of ${mainSellSec[0]} (${sellNames}) into ${mainBuySec[0]} (${buyNames}), signaling higher growth conviction in ${mainBuySec[0]}.`,
      tag: isKo ? '전략' : 'Strategy',
      color: '#8b5cf6',
    });
  } else if (ratio >= 1.5) {
    // 매수 우위 → 왜?
    const buyTickers = buys.slice(0, 3).map(b => b.ticker);
    const uniqueBuyTickers = [...new Set(buyTickers)].join(', ');
    insights.push({
      icon: TrendingUp,
      title: isKo ? '적극적 포지션 확대' : 'Aggressive Position Building',
      desc: isKo
        ? `매수가 매도의 ${ratio.toFixed(1)}배로, 시장 하락을 매수 기회로 활용하거나 확신이 높은 종목에 베팅을 늘리고 있습니다. ${uniqueBuyTickers} 등을 중심으로 포지션을 키우는 중입니다.`
        : `Buys outpace sells ${ratio.toFixed(1)}x — using market dips as buying opportunities or increasing bets on high-conviction picks like ${uniqueBuyTickers}.`,
      tag: isKo ? '전략' : 'Strategy',
      color: '#22c55e',
    });
  } else if (ratio <= 0.67) {
    const sellTickers = [...new Set(sells.slice(0, 3).map(s => s.ticker))].join(', ');
    insights.push({
      icon: TrendingDown,
      title: isKo ? '리스크 관리 모드' : 'Risk Management Mode',
      desc: isKo
        ? `매도가 매수의 ${(1/ratio).toFixed(1)}배로, 포트폴리오 리스크를 줄이고 현금 비중을 높이는 방어적 전략입니다. ${sellTickers} 등의 비중을 줄이며 변동성에 대비하고 있습니다.`
        : `Sells outpace buys ${(1/ratio).toFixed(1)}x — defensive strategy to reduce risk and raise cash. Trimming ${sellTickers} to prepare for volatility.`,
      tag: isKo ? '전략' : 'Strategy',
      color: '#ef4444',
    });
  }

  // ── 2) 확신 종목 인사이트: 반복 매매의 "왜" ──
  // 같은 종목을 여러 날에 걸쳐 같은 방향으로 거래 → 확신
  const convictionBuys = Object.values(tickerInfo).filter(t => t.buyCount >= 2).sort((a, b) => b.buyShares - a.buyShares);
  const convictionSells = Object.values(tickerInfo).filter(t => t.sellCount >= 3).sort((a, b) => b.sellShares - a.sellShares);

  if (convictionBuys.length > 0) {
    const top = convictionBuys[0];
    const sharesFmt = top.buyShares.toLocaleString();
    const daysCount = top.buyCount;
    const others = convictionBuys.slice(1, 3).map(t => t.ticker);
    const otherStr = others.length > 0 ? (isKo ? ` ${others.join(', ')}도 꾸준히 매수 중.` : ` Also steadily buying ${others.join(', ')}.`) : '';
    insights.push({
      icon: Star,
      title: isKo ? `${top.ticker}에 대한 강한 확신` : `High Conviction: ${top.ticker}`,
      desc: isKo
        ? `${top.company}를 ${daysCount}일에 걸쳐 총 ${sharesFmt}주 매수했습니다. 하루가 아닌 여러 날에 나눠 산다는 건 단기 트레이딩이 아니라 장기적 확신에 기반한 매수입니다.${otherStr}`
        : `Bought ${sharesFmt} shares of ${top.company} over ${daysCount} days. Spreading buys across days signals long-term conviction, not a short-term trade.${otherStr}`,
      tag: isKo ? '확신매수' : 'Conviction',
      color: '#22c55e',
    });
  }

  if (convictionSells.length > 0) {
    const top = convictionSells[0];
    const sharesFmt = top.sellShares.toLocaleString();
    const daysCount = top.sellCount;
    insights.push({
      icon: AlertTriangle,
      title: isKo ? `${top.ticker} 지속적 비중 축소` : `Steady Exit: ${top.ticker}`,
      desc: isKo
        ? `${top.company}를 ${daysCount}일 연속 매도하며 총 ${sharesFmt}주를 처분했습니다. 점진적 매도는 투자 전망이 바뀌었거나 펀드 리밸런싱 필요성을 시사합니다.`
        : `Sold ${sharesFmt} shares of ${top.company} over ${daysCount} days. Gradual selling suggests a changed thesis or fund rebalancing needs.`,
      tag: isKo ? '비중축소' : 'Reduction',
      color: '#f59e0b',
    });
  }

  // ── 3) 대규모 단일 거래 → 이유 추론 ──
  const bigBuy = buys.sort((a, b) => Math.abs(b.sharesChange) - Math.abs(a.sharesChange))[0];
  const bigSell = sells.sort((a, b) => Math.abs(b.sharesChange) - Math.abs(a.sharesChange))[0];

  if (bigSell && Math.abs(bigSell.sharesChange) >= 200000 && insights.length < 4) {
    const shares = Math.abs(bigSell.sharesChange).toLocaleString();
    // 같은 주에 다른 종목 매수도 했다면 → 자금 재배치
    const hasBuys = buys.length > 0;
    insights.push({
      icon: Lightbulb,
      title: isKo ? `${bigSell.ticker} 대량 매도의 의미` : `Why Sell ${bigSell.ticker}?`,
      desc: isKo
        ? `${bigSell.company} ${shares}주를 한 번에 매도했습니다. ${hasBuys ? '같은 기간 다른 종목 매수가 있어, 이 매도 자금을 확신이 더 높은 종목으로 재배치한 것으로 보입니다.' : '대규모 포지션 정리는 해당 종목의 투자 논리에 변화가 생겼음을 의미합니다.'}`
        : `Sold ${shares} shares of ${bigSell.company} in one move. ${hasBuys ? 'With buys happening in the same period, this capital is likely being redeployed to higher-conviction picks.' : 'A large position exit suggests a changed investment thesis.'}`,
      tag: isKo ? '분석' : 'Analysis',
      color: '#ef4444',
    });
  } else if (bigBuy && Math.abs(bigBuy.sharesChange) >= 100000 && insights.length < 4) {
    const shares = Math.abs(bigBuy.sharesChange).toLocaleString();
    insights.push({
      icon: Lightbulb,
      title: isKo ? `${bigBuy.ticker} 대량 매수의 의미` : `Why Buy ${bigBuy.ticker}?`,
      desc: isKo
        ? `${bigBuy.company} ${shares}주를 대량 매수했습니다. 이 규모의 매수는 단순 리밸런싱이 아니라, 해당 종목이 저평가되어 있다는 캐시 우드의 강한 판단을 반영합니다.`
        : `Bought ${shares} shares of ${bigBuy.company} — this scale of buying isn't simple rebalancing, it reflects Cathie Wood's conviction that it's undervalued.`,
      tag: isKo ? '분석' : 'Analysis',
      color: '#22c55e',
    });
  }

  // 최대 4개로 제한 (너무 많으면 산만)
  return insights.slice(0, 4);
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
