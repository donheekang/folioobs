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

// ── ARK 종목 테마 매핑 (인사이트 스토리텔링용) ──
const TICKER_THEME = {
  CRSP: { ko: '유전자 편집 선두주자', en: 'gene editing leader' },
  EDIT: { ko: '유전자 편집', en: 'gene editing' },
  NTLA: { ko: '유전자 치료', en: 'gene therapy' },
  TXG:  { ko: '단일세포 유전체 분석', en: 'single-cell genomics' },
  BEAM: { ko: '염기 편집 바이오텍', en: 'base editing biotech' },
  EXAS: { ko: '암 조기진단', en: 'cancer early detection' },
  TSLA: { ko: '전기차·자율주행', en: 'EV & autonomous driving' },
  COIN: { ko: '암호화폐 거래소', en: 'crypto exchange' },
  SQ:   { ko: '핀테크·디지털결제', en: 'fintech & digital payments' },
  ROKU: { ko: '스트리밍 플랫폼', en: 'streaming platform' },
  PATH: { ko: 'AI 자동화(RPA)', en: 'AI automation (RPA)' },
  PLTR: { ko: 'AI 데이터 분석', en: 'AI data analytics' },
  RKLB: { ko: '우주 발사체', en: 'space launch' },
  DKNG: { ko: '온라인 스포츠 베팅', en: 'online sports betting' },
  U:    { ko: '3D 엔진·메타버스', en: '3D engine & metaverse' },
  HOOD: { ko: '개인투자자 거래 플랫폼', en: 'retail trading platform' },
  DNA:  { ko: '합성생물학', en: 'synthetic biology' },
  TWLO: { ko: '클라우드 커뮤니케이션', en: 'cloud communications' },
  ZM:   { ko: '화상회의·원격근무', en: 'video conferencing' },
  SHOP: { ko: '이커머스 플랫폼', en: 'e-commerce platform' },
  SPOT: { ko: '음악 스트리밍', en: 'music streaming' },
  IONQ: { ko: '양자컴퓨팅', en: 'quantum computing' },
  TEM:  { ko: 'AI 기반 정밀의료', en: 'AI-powered precision medicine' },
  JOBY: { ko: '도심항공모빌리티(UAM)', en: 'urban air mobility' },
  WGS:  { ko: '유전체 진단', en: 'genomic diagnostics' },
  VERV: { ko: '유전자 편집 심혈관 치료', en: 'gene editing cardiovascular' },
  ARCT: { ko: 'mRNA 치료제', en: 'mRNA therapeutics' },
  PSTG: { ko: '차세대 데이터 스토리지', en: 'next-gen data storage' },
  ACHR: { ko: 'eVTOL 항공기', en: 'eVTOL aircraft' },
  RXRX: { ko: 'AI 신약개발', en: 'AI drug discovery' },
  LAB:  { ko: '바이오툴(표준)', en: 'biotools (standards)' },
  LY:   { ko: '온라인 여행 플랫폼', en: 'online travel platform' },
  IONS: { ko: 'RNA 표적 치료제', en: 'RNA-targeted therapeutics' },
  PSNL: { ko: '개인맞춤 암 백신', en: 'personalized cancer vaccines' },
};

const getTheme = (ticker, isKo) => {
  const t = TICKER_THEME[ticker];
  return t ? (isKo ? t.ko : t.en) : null;
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

  // 가장 큰 매수 종목 (주식 수 기준)
  const bigBuyTicker = Object.values(tickerInfo).filter(t => t.buyShares > 0).sort((a, b) => b.buyShares - a.buyShares)[0];

  // ── 가장 임팩트 있는 인사이트 1개만 선택 ──

  // 1) 섹터 로테이션 (가장 강한 신호) + 테마 스토리
  const hasRotation = topBuySec && topSellSec && topBuySec[0] !== topSellSec[0] && topBuySec[1].count >= 3 && topSellSec[1].count >= 3;
  if (hasRotation) {
    // 매수 쪽에서 테마가 있는 핵심 종목 찾기
    const buyTickerList = [...topBuySec[1].tickers];
    const keyBuy = buyTickerList.find(tk => getTheme(tk, isKo)) || buyTickerList[0];
    const keyBuyTheme = getTheme(keyBuy, isKo);
    const sellTickerList = [...topSellSec[1].tickers];
    const keySell = sellTickerList.find(tk => getTheme(tk, isKo)) || sellTickerList[0];
    const keySellTheme = getTheme(keySell, isKo);

    const desc = isKo
      ? `${keyBuy}${keyBuyTheme ? `(${keyBuyTheme})` : ''} 중심으로 ${topBuySec[0]} 비중을 늘리는 반면, ${keySell}${keySellTheme ? `(${keySellTheme})` : ''} 등 ${topSellSec[0]}주는 정리 중. ${keyBuyTheme ? `${keyBuyTheme} 분야의 성장에 베팅하는 흐름.` : `자금이 ${topBuySec[0]} 쪽으로 이동 중.`}`
      : `Building ${topBuySec[0]} around ${keyBuy}${keyBuyTheme ? ` (${keyBuyTheme})` : ''} while trimming ${topSellSec[0]} names like ${keySell}. ${keyBuyTheme ? `Betting on ${keyBuyTheme} growth.` : `Capital rotating into ${topBuySec[0]}.`}`;

    return [{
      icon: Brain,
      title: isKo ? `${topSellSec[0]} → ${topBuySec[0]} 자금 이동` : `${topSellSec[0]} → ${topBuySec[0]} Shift`,
      desc,
      tag: isKo ? '섹터전환' : 'Rotation',
      color: '#8b5cf6',
    }];
  }

  // 2) 같은 종목 3일+ 연속 매수 → 확신 신호 + 테마
  if (convictionBuy) {
    const theme = getTheme(convictionBuy.ticker, isKo);
    const desc = isKo
      ? `${convictionBuy.ticker}${theme ? `(${theme})` : ''}를 ${convictionBuy.buyCount}일에 걸쳐 ${convictionBuy.buyShares.toLocaleString()}주 매수. ${theme ? `${theme} 분야에 대한 강한 확신으로, ` : ''}나눠서 사는 건 단기 트레이딩이 아닌 장기 베팅.`
      : `${convictionBuy.buyShares.toLocaleString()} shares of ${convictionBuy.ticker}${theme ? ` (${theme})` : ''} over ${convictionBuy.buyCount} days. ${theme ? `Strong conviction in ${theme} — ` : ''}spreading buys = long-term bet, not a quick trade.`
    return [{
      icon: Star,
      title: isKo ? `${convictionBuy.ticker} ${convictionBuy.buyCount}일 연속 매수` : `${convictionBuy.ticker}: ${convictionBuy.buyCount}-Day Buying`,
      desc,
      tag: isKo ? '확신매수' : 'Conviction',
      color: '#22c55e',
    }];
  }

  // 3) 같은 종목 3일+ 연속 매도 → 정리 신호 + 테마
  if (convictionSell) {
    const theme = getTheme(convictionSell.ticker, isKo);
    const desc = isKo
      ? `${convictionSell.ticker}${theme ? `(${theme})` : ''}를 ${convictionSell.sellCount}일 연속 매도, 총 ${convictionSell.sellShares.toLocaleString()}주 처분. ${theme ? `${theme} 분야 전망이 바뀌었거나 ` : ''}포지션 정리 신호.`
      : `${convictionSell.sellShares.toLocaleString()} shares of ${convictionSell.ticker}${theme ? ` (${theme})` : ''} sold over ${convictionSell.sellCount} days. ${theme ? `Outlook on ${theme} may have changed — ` : ''}position unwinding signal.`;
    return [{
      icon: AlertTriangle,
      title: isKo ? `${convictionSell.ticker} ${convictionSell.sellCount}일 연속 매도` : `${convictionSell.ticker}: ${convictionSell.sellCount}-Day Selling`,
      desc,
      tag: isKo ? '포지션정리' : 'Unwinding',
      color: '#f59e0b',
    }];
  }

  // 4) 매수/매도 비율이 극단적 + 핵심 종목 테마
  if (ratio >= 2.0 && bigBuyTicker) {
    const theme = getTheme(bigBuyTicker.ticker, isKo);
    return [{
      icon: TrendingUp,
      title: isKo ? `${bigBuyTicker.ticker} 중심 매수 집중` : `Buying Led by ${bigBuyTicker.ticker}`,
      desc: isKo
        ? `매수 ${stats.buyCount}건 vs 매도 ${stats.sellCount}건으로 매수 우위. ${bigBuyTicker.ticker}${theme ? `(${theme})` : ''} ${bigBuyTicker.buyShares.toLocaleString()}주를 중심으로 적극적 포지션 확대.`
        : `${stats.buyCount} buys vs ${stats.sellCount} sells. ${bigBuyTicker.ticker}${theme ? ` (${theme})` : ''} leads with ${bigBuyTicker.buyShares.toLocaleString()} shares.`,
      tag: isKo ? '매수우위' : 'Bullish',
      color: '#22c55e',
    }];
  }
  if (ratio <= 0.5) {
    const topSell = sells.sort((a, b) => Math.abs(b.sharesChange) - Math.abs(a.sharesChange))[0];
    const theme = topSell ? getTheme(topSell.ticker, isKo) : null;
    return [{
      icon: TrendingDown,
      title: isKo ? `${topSell ? topSell.ticker + ' ' : ''}중심 매도 집중` : `Selling${topSell ? ' Led by ' + topSell.ticker : ''}`,
      desc: isKo
        ? `매도 ${stats.sellCount}건 vs 매수 ${stats.buyCount}건. ${topSell ? `${topSell.ticker}${theme ? `(${theme})` : ''} 중심으로 ` : ''}비중을 줄이며 현금 확보.`
        : `${stats.sellCount} sells vs ${stats.buyCount} buys.${topSell ? ` ${topSell.ticker}${theme ? ` (${theme})` : ''} leads.` : ''} Reducing exposure.`,
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
