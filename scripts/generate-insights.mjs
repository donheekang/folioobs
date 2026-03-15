#!/usr/bin/env node
/**
 * FolioObs — AI 인사이트 생성 스크립트
 *
 * 각 투자자의 최신 포트폴리오 데이터를 Claude API에 보내서
 * 전문가 수준의 인사이트를 생성하고 Supabase에 저장합니다.
 *
 * 사용법:
 *   SUPABASE_SERVICE_KEY="..." ANTHROPIC_API_KEY="..." node scripts/generate-insights.mjs
 *
 * 옵션:
 *   --investor=buffett   특정 투자자만 생성
 *   --investor=cathie    캐시우드만 생성
 *   --daily              캐시우드 일별 매매 기반 인사이트 (최근 5일 매매 포함)
 *   --weekly             캐시우드 주간 리포트 인사이트 (Polygon 뉴스 포함)
 *   --force              이미 있어도 재생성
 *
 * 예시:
 *   전체 분기별 인사이트:  node scripts/generate-insights.mjs
 *   캐시우드 일별:        node scripts/generate-insights.mjs --investor=cathie --daily
 *   캐시우드 주간:        node scripts/generate-insights.mjs --weekly
 *   강제 재생성:          node scripts/generate-insights.mjs --force
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================
// 설정
// ============================================================
const SUPABASE_URL = 'https://mghfgcjcbpizjmfrtozi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY 필요');
  process.exit(1);
}
if (!ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY 필요');
  console.error('   https://console.anthropic.com 에서 API 키를 발급받으세요.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const MODEL = 'claude-haiku-4-5-20251001';
const POLYGON_API_KEY = process.env.POLYGON_API_KEY || 'B1kOZdIwGvpx0YtiZmrgveaR9lKBoT_7';

const forceFlag = process.argv.includes('--force');
const dailyFlag = process.argv.includes('--daily');
const weeklyFlag = process.argv.includes('--weekly');
const investorArg = process.argv.find(a => a.startsWith('--investor='))?.split('=')[1];

// ============================================================
// 투자자별 컨텍스트 (AI가 더 정확한 분석을 할 수 있도록)
// ============================================================
const INVESTOR_CONTEXT = {
  'Warren Buffett': {
    style: '가치투자',
    known_for: '장기 보유, 경쟁 우위(moat) 있는 기업, 현금흐름 중시, "남들이 두려워할 때 탐욕스럽게"',
    fund: 'Berkshire Hathaway',
    typical_sectors: '금융, 필수소비재, 에너지',
    history: '50년+ 투자 경력, S&P500 장기 아웃퍼폼, 대규모 현금 보유 특징',
  },
  'Cathie Wood': {
    style: '파괴적 혁신 성장주',
    known_for: '5년 투자 기간, 파괴적 혁신(disruptive innovation), 높은 확신 집중 투자, 하락 시 추가 매수',
    fund: 'ARK Invest (ARKK, ARKW, ARKG, ARKF, ARKQ)',
    typical_sectors: 'AI, 로보틱스, 유전체학, 핀테크, 우주',
    history: '2014년 ARK 설립, 2020년 테슬라 베팅으로 유명, 혁신 테마 ETF 운용',
  },
  'Stanley Druckenmiller': {
    style: '매크로 트레이딩',
    known_for: '조지 소로스 퀀텀펀드 운용, 거시경제 기반 대규모 방향성 베팅, 높은 집중도',
    fund: 'Duquesne Family Office',
    typical_sectors: '기술, 금융, 경기민감주',
    history: '30년간 연평균 30%+ 수익률, 매크로 환경 변화에 빠르게 포지션 전환',
  },
  'Ray Dalio': {
    style: '글로벌 매크로, 올웨더(All-Weather)',
    known_for: '리스크 패리티, 분산 투자, 경제 머신 프레임워크, "원칙(Principles)"',
    fund: 'Bridgewater Associates',
    typical_sectors: 'ETF, 이머징마켓, 금, 채권',
    history: '세계 최대 헤지펀드 설립, 올웨더 포트폴리오 전략, 경제 사이클 분석',
  },
  'Bill Ackman': {
    style: '행동주의 투자',
    known_for: '소수 종목 집중 투자(8-12개), 경영 참여, 기업 구조조정 촉구, 높은 확신 베팅',
    fund: 'Pershing Square Capital Management',
    typical_sectors: '경기소비재, 부동산, 금융',
    history: '고집중 포트폴리오, Herbalife 숏, 코로나 헷지로 $2.6B 수익',
  },
  'George Soros': {
    style: '글로벌 매크로',
    known_for: '"영란은행을 무너뜨린 남자", 재귀성 이론, 거시경제 불균형 포착',
    fund: 'Soros Fund Management',
    typical_sectors: '금융, 기술, ETF',
    history: '퀀텀펀드 설립, 1992년 파운드 숏으로 $1B 수익, 재귀성 투자 이론',
  },
};

// ============================================================
// Claude API 호출
// ============================================================
async function callClaude(systemPrompt, userPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: '[' }, // JSON 배열 시작을 미리 넣어서 형식 강제
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API 오류 (${res.status}): ${err}`);
  }

  const data = await res.json();
  return '[' + data.content[0].text; // 미리 넣은 '[' 와 합침
}

// ============================================================
// 포트폴리오 데이터 수집
// ============================================================
async function getPortfolioSummary(investorId, quarter) {
  // 보유종목 (상위 30개)
  const { data: holdings } = await supabase
    .from('holdings')
    .select(`
      shares, value, pct_of_portfolio, option_type,
      securities (ticker, name, sector_ko)
    `)
    .eq('investor_id', investorId)
    .eq('quarter', quarter)
    .order('value', { ascending: false })
    .limit(30);

  // 변동 내역
  const { data: changes } = await supabase
    .from('holding_changes')
    .select(`
      change_type, pct_change, shares_change, value_current, value_prev,
      securities (ticker, name)
    `)
    .eq('investor_id', investorId)
    .eq('quarter', quarter)
    .order('value_current', { ascending: false })
    .limit(30);

  // 메트릭 (최근 4분기)
  const { data: metrics } = await supabase
    .from('investor_metrics')
    .select('*')
    .eq('investor_id', investorId)
    .order('quarter', { ascending: false })
    .limit(4);

  return { holdings: holdings || [], changes: changes || [], metrics: metrics || [] };
}

function formatPortfolioForAI(investor, data, quarter) {
  const { holdings, changes, metrics } = data;
  const ctx = INVESTOR_CONTEXT[investor.name] || {};

  // --- 구조화된 데이터 포맷 (XML 태그로 명확히 구분) ---
  let prompt = `<investor>
<name>${investor.name_ko} (${investor.fund_name || investor.name})</name>
<quarter>${quarter}</quarter>
<style>${ctx.style || investor.style || '알 수 없음'}</style>
<known_for>${ctx.known_for || ''}</known_for>
<fund>${ctx.fund || investor.fund_name || ''}</fund>
<history>${ctx.history || ''}</history>
</investor>

`;

  // 핵심 지표
  const latestM = metrics[0];
  if (latestM) {
    prompt += `<metrics>
AUM: $${(latestM.total_aum / 1000000).toFixed(1)}B
보유종목: ${latestM.holding_count}개
섹터수: ${latestM.sector_count}개
상위10종목_집중도: ${(latestM.concentration * 100).toFixed(1)}%
최대비중: ${latestM.top_holding_pct}%
QoQ_AUM변동: ${latestM.qoq_change > 0 ? '+' : ''}${latestM.qoq_change}%
</metrics>

`;
  }

  // 상위 보유종목
  prompt += `<top_holdings>\n`;
  holdings.slice(0, 20).forEach((h, i) => {
    const sec = h.securities || {};
    prompt += `${i + 1}. ${sec.ticker || '?'} | ${sec.name || '?'} | 비중${h.pct_of_portfolio}% | ${sec.sector_ko || '기타'}`;
    if (h.option_type) prompt += ` | ${h.option_type}옵션`;
    prompt += '\n';
  });
  prompt += `</top_holdings>\n\n`;

  // 섹터 분포
  const sectorMap = {};
  holdings.forEach(h => {
    const sec = h.securities?.sector_ko || '기타';
    sectorMap[sec] = (sectorMap[sec] || 0) + (h.pct_of_portfolio || 0);
  });
  prompt += `<sector_distribution>\n`;
  Object.entries(sectorMap)
    .sort((a, b) => b[1] - a[1])
    .forEach(([s, pct]) => { prompt += `${s}: ${pct.toFixed(1)}%\n`; });
  prompt += `</sector_distribution>\n\n`;

  // 이번 분기 변동
  if (changes.length > 0) {
    prompt += `<quarterly_changes>\n`;
    const newPos = changes.filter(c => c.change_type === 'new');
    const buys = changes.filter(c => c.change_type === 'buy');
    const sells = changes.filter(c => c.change_type === 'sell');
    const exits = changes.filter(c => c.change_type === 'exit');

    if (newPos.length > 0) {
      prompt += `[신규매수] ${newPos.map(c => `${c.securities?.ticker || '?'}($${((c.value_current || 0) / 1000).toFixed(0)}M)`).join(', ')}\n`;
    }
    if (buys.length > 0) {
      prompt += `[비중확대] ${buys.slice(0, 10).map(c => `${c.securities?.ticker || '?'}(+${c.pct_change}%)`).join(', ')}\n`;
    }
    if (sells.length > 0) {
      prompt += `[비중축소] ${sells.slice(0, 10).map(c => `${c.securities?.ticker || '?'}(${c.pct_change}%)`).join(', ')}\n`;
    }
    if (exits.length > 0) {
      prompt += `[완전청산] ${exits.map(c => c.securities?.ticker || '?').join(', ')}\n`;
    }
    prompt += `</quarterly_changes>\n\n`;
  }

  // 분기별 AUM 추이
  if (metrics.length > 1) {
    prompt += `<aum_trend>\n`;
    [...metrics].reverse().forEach(m => {
      prompt += `${m.quarter}: $${(m.total_aum / 1000000).toFixed(1)}B / ${m.holding_count}종목 / 집중도${(m.concentration * 100).toFixed(1)}%\n`;
    });
    prompt += `</aum_trend>\n`;
  }

  return prompt;
}

// ============================================================
// ARK 일별 매매 데이터 수집 (--daily 모드용)
// ============================================================
async function getArkDailyData(investorId, days = 5) {
  // 최근 N일 매매 내역
  const { data: trades } = await supabase
    .from('ark_daily_trades')
    .select('*')
    .order('trade_date', { ascending: false })
    .limit(days * 80); // 하루 최대 ~70건

  if (!trades?.length) return null;

  // 날짜별 그룹핑
  const byDate = {};
  trades.forEach(t => {
    if (!byDate[t.trade_date]) byDate[t.trade_date] = [];
    byDate[t.trade_date].push(t);
  });

  const dates = Object.keys(byDate).sort().reverse().slice(0, days);
  return dates.map(d => ({ date: d, trades: byDate[d] }));
}

function formatDailyTradesForAI(dailyData) {
  let prompt = `<daily_trades>\n`;
  for (const day of dailyData) {
    const buys = day.trades.filter(t => t.direction === 'buy');
    const sells = day.trades.filter(t => t.direction === 'sell');
    const newPos = day.trades.filter(t => t.is_new);
    const exits = day.trades.filter(t => t.is_exit);

    prompt += `[${day.date}] 매수${buys.length} / 매도${sells.length} / 신규${newPos.length} / 청산${exits.length}\n`;

    // 주요 매매만 (절대 주수 상위 10개)
    day.trades
      .sort((a, b) => Math.abs(b.shares_change) - Math.abs(a.shares_change))
      .slice(0, 10)
      .forEach(t => {
        const emoji = t.is_new ? '🆕' : t.is_exit ? '🚪' : t.direction === 'buy' ? '↑' : '↓';
        const diff = (t.weight_today - (t.weight_prev || 0)).toFixed(2);
        prompt += `  ${emoji} ${t.ticker} ${Math.abs(t.shares_change).toLocaleString()}주 (${t.weight_prev || 0}%→${t.weight_today}%, ${diff > 0 ? '+' : ''}${diff}%p)`;
        if (t.is_new) prompt += ' [신규편입]';
        if (t.is_exit) prompt += ' [완전청산]';
        prompt += '\n';
      });
  }
  prompt += `</daily_trades>\n\n`;
  return prompt;
}

// ============================================================
// Polygon 뉴스 API (--weekly 모드용)
// ============================================================
async function fetchTickerNews(tickers, limit = 3) {
  const newsMap = {};
  for (const ticker of tickers.slice(0, 5)) { // 상위 5종목만
    try {
      const url = `https://api.polygon.io/v2/reference/news?ticker=${ticker}&limit=${limit}&apiKey=${POLYGON_API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.results?.length) {
        newsMap[ticker] = data.results.map(n => ({
          title: n.title,
          date: n.published_utc?.slice(0, 10),
          source: n.publisher?.name,
        }));
      }
      await new Promise(r => setTimeout(r, 200)); // rate limit
    } catch (e) {
      console.warn(`  ⚠️  ${ticker} 뉴스 가져오기 실패`);
    }
  }
  return newsMap;
}

// ============================================================
// ARK 주간 매매 데이터 수집 + 뉴스 (--weekly 모드용)
// ============================================================
async function getArkWeeklyData() {
  // 최근 7일 매매
  const { data: trades } = await supabase
    .from('ark_daily_trades')
    .select('*')
    .order('trade_date', { ascending: false })
    .limit(7 * 80);

  if (!trades?.length) return null;

  // 날짜별 그룹핑
  const byDate = {};
  trades.forEach(t => {
    if (!byDate[t.trade_date]) byDate[t.trade_date] = [];
    byDate[t.trade_date].push(t);
  });

  // 최근 1주 (5거래일)
  const dates = Object.keys(byDate).sort().reverse().slice(0, 5);
  const weekTrades = dates.flatMap(d => byDate[d]);

  // 종목별 집계
  const tickerMap = {};
  weekTrades.forEach(t => {
    if (!tickerMap[t.ticker]) tickerMap[t.ticker] = { ticker: t.ticker, company: t.company, buyShares: 0, sellShares: 0, buyCount: 0, sellCount: 0 };
    const m = tickerMap[t.ticker];
    if (t.direction === 'buy') { m.buyShares += Math.abs(t.shares_change); m.buyCount++; }
    else { m.sellShares += Math.abs(t.shares_change); m.sellCount++; }
  });

  // 주요 종목 추출 (거래량 기준 상위)
  const topBuys = Object.values(tickerMap).filter(t => t.buyShares > 0).sort((a, b) => b.buyShares - a.buyShares).slice(0, 5);
  const topSells = Object.values(tickerMap).filter(t => t.sellShares > 0).sort((a, b) => b.sellShares - a.sellShares).slice(0, 5);
  const keyTickers = [...new Set([...topBuys.map(t => t.ticker), ...topSells.map(t => t.ticker)])].slice(0, 5);

  return {
    days: dates.map(d => ({ date: d, trades: byDate[d] })),
    weekTrades,
    topBuys,
    topSells,
    keyTickers,
    dateRange: `${dates[dates.length - 1]} ~ ${dates[0]}`,
  };
}

function formatWeeklyForAI(weeklyData, newsMap) {
  let prompt = `<weekly_summary>
기간: ${weeklyData.dateRange}
거래일: ${weeklyData.days.length}일
총 매수: ${weeklyData.weekTrades.filter(t => t.direction === 'buy').length}건
총 매도: ${weeklyData.weekTrades.filter(t => t.direction === 'sell').length}건
</weekly_summary>

<top_buys>
`;
  weeklyData.topBuys.forEach((t, i) => {
    prompt += `${i + 1}. ${t.ticker} (${t.company}) — ${t.buyShares.toLocaleString()}주, ${t.buyCount}회 매수\n`;
  });
  prompt += `</top_buys>

<top_sells>
`;
  weeklyData.topSells.forEach((t, i) => {
    prompt += `${i + 1}. ${t.ticker} (${t.company}) — ${t.sellShares.toLocaleString()}주, ${t.sellCount}회 매도\n`;
  });
  prompt += `</top_sells>

`;
  // 일별 상세
  prompt += `<daily_detail>\n`;
  for (const day of weeklyData.days) {
    const buys = day.trades.filter(t => t.direction === 'buy');
    const sells = day.trades.filter(t => t.direction === 'sell');
    prompt += `[${day.date}] 매수 ${buys.length} / 매도 ${sells.length}\n`;
    day.trades
      .sort((a, b) => Math.abs(b.shares_change) - Math.abs(a.shares_change))
      .slice(0, 5)
      .forEach(t => {
        const dir = t.direction === 'buy' ? '↑' : '↓';
        prompt += `  ${dir} ${t.ticker} ${Math.abs(t.shares_change).toLocaleString()}주\n`;
      });
  }
  prompt += `</daily_detail>\n\n`;

  // 뉴스 컨텍스트
  const newsEntries = Object.entries(newsMap);
  if (newsEntries.length > 0) {
    prompt += `<recent_news>\n`;
    newsEntries.forEach(([ticker, articles]) => {
      prompt += `[${ticker}]\n`;
      articles.forEach(a => {
        prompt += `  - ${a.date}: ${a.title} (${a.source})\n`;
      });
    });
    prompt += `</recent_news>\n`;
  }

  return prompt;
}

const WEEKLY_SYSTEM_PROMPT = `You are an ARK Invest weekly report analyst. You write in Korean (한국어).

<task>
ARK Invest의 이번 주 매매 데이터와 관련 뉴스를 분석하여, 주간 리포트용 핵심 인사이트 1개를 생성하세요.
뉴스와 매매를 연결하여 "왜 이렇게 매매했는지" 맥락을 설명하는 것이 핵심입니다.
</task>

<output_format>
JSON 배열로 정확히 1개의 인사이트만 출력하세요. 설명이나 마크다운 없이 순수 JSON만.

{
  "title": "제목 (15자 이내, 핵심만)",
  "desc": "1-2문장. 뉴스 맥락 + 매매 데이터를 연결. 구체적 종목명과 수치 포함. '~한 흐름' 같은 마무리.",
  "tag": "태그 (섹터전환/확신매수/포지션정리/매수우위/매도우위 중 택1)"
}
</output_format>

<rules>
1. 반드시 1개만 생성 (가장 임팩트 있는 것)
2. 뉴스가 있으면 반드시 뉴스 맥락을 인사이트에 녹여야 함
3. 뉴스가 없으면 매매 패턴만으로 인사이트 생성
4. 문장이 자연스럽고 전문가 느낌이어야 함
5. "~입니다", "~합니다" 대신 "~한 흐름.", "~으로 풀이됨." 같은 간결한 어미 사용
</rules>

<examples>
GOOD: "FDA가 CRSP의 유전자 편집 치료제 Casgevy 적응증 확대를 검토 중인 가운데, CRSP를 3일 연속 438K주 매수. 유전자 편집 시장 확대에 선제 베팅하는 흐름."
GOOD: "TXG를 5일 연속 47만주 매도하며 포지션 정리. 최근 10X Genomics의 실적 부진과 경쟁 심화 우려가 반영된 것으로 풀이됨."
BAD: "기술주를 팔고 헬스케어를 샀습니다." (맥락 없음, 너무 뻔함)
</examples>`;

const DAILY_SYSTEM_PROMPT = `You are a senior equity strategist specializing in ARK Invest (Cathie Wood) daily trading analysis. You write in Korean (한국어).

<role>
- ARK Invest ETF 일별 매매 전문 분석가
- 캐시 우드의 투자 철학과 파괴적 혁신 테마에 정통
- 한국 개인투자자를 위한 실시간 매매 해석
</role>

<task>
ARK의 최근 일별 매매 데이터와 포트폴리오를 분석하여 JSON 배열로 인사이트를 생성하세요.
일별 매매 패턴(연속 매수/매도, 신규 편입, 청산)에 특히 주목하세요.
</task>

<output_format>
JSON 배열만 출력합니다. 설명이나 마크다운 없이 순수 JSON만 출력하세요.

각 인사이트 객체:
{
  "title": "제목 (12자 이내, 임팩트 있게)",
  "desc": "2-3문장 설명. 구체적 종목명, 매매 방향, 수치 포함. 캐시 우드의 의도 해석 포함.",
  "tag": "태그",
  "confidence": 신뢰도(60-95)
}

사용 가능한 태그: "전략", "리스크", "섹터", "트렌드", "신규매수", "비중확대", "비중축소", "매크로", "밸류에이션"
</output_format>

<rules>
1. 정확히 5개 인사이트를 생성하세요
2. 일별 매매에서 보이는 패턴을 중점 분석하세요:
   - 여러 날 연속 같은 종목 매수/매도 = 확신 있는 포지션 구축/축소
   - 신규 편입 = 새로운 테마 또는 기업 발굴
   - 완전 청산 = 투자 논리 변화
3. 반드시 이 5가지 관점을 각각 1개씩 커버하세요:
   - 오늘/최근 가장 주목할 매매 (전략/트렌드)
   - 적극 매수 중인 종목의 의미 (신규매수/비중확대)
   - 매도/청산의 의미 (리스크/비중축소)
   - 섹터/테마 관점 해석 (섹터/매크로)
   - 향후 방향성 추론 (밸류에이션/트렌드)
</rules>

<quality_criteria>
GOOD: "HOOD 3일 연속 매수로 비중 3.5%→3.9% 확대. 로빈후드의 암호화폐 거래 성장과 세대 교체형 금융플랫폼 비전에 대한 확신이 강화되는 것으로 해석됩니다."
BAD: "매수 종목이 있습니다." (구체성 부족)
</quality_criteria>`;

// ============================================================
// 시스템 프롬프트 (핵심 — 성능의 50%를 좌우)
// ============================================================
const SYSTEM_PROMPT = `You are a senior equity strategist at Goldman Sachs covering institutional 13F filings. You write in Korean (한국어).

<role>
- 20년 경력의 월스트리트 기관투자자 분석 전문가
- SEC 13F 공시 기반 포트폴리오 분석 전문
- 한국 개인투자자를 위한 인사이트 제공
</role>

<task>
주어진 13F 포트폴리오 데이터를 분석하여 JSON 배열로 인사이트를 생성하세요.
</task>

<output_format>
JSON 배열만 출력합니다. 설명이나 마크다운 없이 순수 JSON만 출력하세요.

각 인사이트 객체:
{
  "title": "제목 (12자 이내, 임팩트 있게)",
  "desc": "2-3문장 설명. 반드시 구체적 종목명과 수치를 포함. 왜(WHY) 그런 행동을 했는지 해석 포함.",
  "tag": "태그",
  "confidence": 신뢰도(60-95)
}

사용 가능한 태그: "전략", "리스크", "섹터", "트렌드", "신규매수", "비중확대", "비중축소", "매크로", "밸류에이션"
</output_format>

<rules>
1. 정확히 5개 인사이트를 생성하세요
2. 신뢰도는 데이터 근거 강도에 따라 60-95 사이로 차등 부여 (95 이상은 사용하지 마세요)
3. 반드시 이 5가지 관점을 각각 1개씩 커버하세요:
   - 이번 분기 가장 중요한 전략적 변화 (전략/트렌드)
   - 신규 매수 또는 비중 확대의 의미 (신규매수/비중확대)
   - 리스크 요인 또는 비중 축소의 의미 (리스크/비중축소)
   - 섹터 배분 전략 해석 (섹터/매크로)
   - 투자자의 시장 전망 추론 (밸류에이션/트렌드)
</rules>

<quality_criteria>
GOOD 예시: "AAPL 비중 12%→8% 축소는 AI PC 전환 불확실성 반영. 대신 NVDA를 15% 확대하여 AI 인프라 직접 수혜주로 재배치한 것으로 보입니다."
BAD 예시: "기술주 비중이 높습니다." (너무 뻔함, WHY 없음)

- 데이터의 숫자를 활용하세요 (비중%, 변동%, 금액)
- "~로 보입니다", "~를 시사합니다" 등 해석을 반드시 포함
- 투자자의 알려진 스타일 대비 이례적인 움직임을 감지하면 높은 신뢰도로 강조
- 한국 개인투자자가 "이 정보로 내 투자에 참고할 수 있다"고 느낄 수 있는 실용적 내용
</quality_criteria>`;

// ============================================================
// 메인
// ============================================================
async function main() {
  console.log('═'.repeat(60));
  console.log('FolioObs — AI 인사이트 생성 (Claude Haiku 4.5)');
  console.log('═'.repeat(60));

  // ── --weekly 모드: 캐시우드 주간 인사이트 전용 ──
  if (weeklyFlag) {
    console.log('\n📅 주간 리포트 인사이트 생성 모드');

    // 캐시우드 investor_id 조회
    const { data: cathie } = await supabase
      .from('investors')
      .select('id')
      .eq('cik', '0001599922')
      .single();
    if (!cathie) { console.error('❌ 캐시우드 투자자 데이터 없음'); process.exit(1); }

    // 주간 매매 데이터
    const weeklyData = await getArkWeeklyData();
    if (!weeklyData) { console.error('❌ 주간 매매 데이터 없음'); process.exit(1); }

    console.log(`  📊 기간: ${weeklyData.dateRange}`);
    console.log(`  📊 거래일: ${weeklyData.days.length}일, 총 ${weeklyData.weekTrades.length}건`);

    // 주간 키 생성 (주 시작일 기준): "weekly-2026-0308"
    const weekKey = `weekly-${weeklyData.days[weeklyData.days.length - 1].date.slice(5).replace('-', '')}`;

    // 이미 생성 확인
    if (!forceFlag) {
      const { data: existing } = await supabase
        .from('ai_insights')
        .select('id')
        .eq('investor_id', cathie.id)
        .eq('quarter', weekKey)
        .maybeSingle();
      if (existing) {
        console.log(`  ⏭️  이미 생성됨 (${weekKey}). --force로 재생성 가능.`);
        return;
      }
    }

    // Polygon 뉴스 가져오기
    console.log(`  📰 주요 종목 뉴스 검색 중... (${weeklyData.keyTickers.join(', ')})`);
    const newsMap = await fetchTickerNews(weeklyData.keyTickers);
    const newsCount = Object.values(newsMap).flat().length;
    console.log(`  📰 뉴스 ${newsCount}건 수집`);

    // AI 프롬프트 구성
    const userPrompt = formatWeeklyForAI(weeklyData, newsMap);
    console.log(`  🤖 Claude에 인사이트 요청 중...`);

    try {
      const aiResponse = await callClaude(WEEKLY_SYSTEM_PROMPT, userPrompt);

      let jsonStr = aiResponse.trim();
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      const lastBracket = jsonStr.lastIndexOf(']');
      if (lastBracket !== -1) jsonStr = jsonStr.substring(0, lastBracket + 1);

      const insights = JSON.parse(jsonStr);
      if (!Array.isArray(insights) || insights.length === 0) {
        console.error('  ❌ 유효한 인사이트 없음');
        return;
      }

      const validInsights = insights
        .filter(ins => ins.title && ins.desc && ins.tag)
        .slice(0, 1) // 1개만
        .map(ins => ({
          title: ins.title.slice(0, 20),
          desc: ins.desc,
          tag: ins.tag,
          confidence: 90,
        }));

      // DB 저장
      const { error: saveErr } = await supabase
        .from('ai_insights')
        .upsert({
          investor_id: cathie.id,
          quarter: weekKey,
          insights: validInsights,
          model: MODEL,
          generated_at: new Date().toISOString(),
        }, { onConflict: 'investor_id,quarter' });

      if (saveErr) {
        console.error(`  ❌ 저장 실패: ${saveErr.message}`);
        return;
      }

      console.log(`\n  ✅ 주간 인사이트 생성 완료!`);
      console.log(`  📌 [${validInsights[0].tag}] ${validInsights[0].title}`);
      console.log(`  📝 ${validInsights[0].desc}`);
      console.log(`\n  💾 저장 키: investor_id=${cathie.id}, quarter="${weekKey}"`);
    } catch (err) {
      console.error(`  ❌ AI 생성 실패: ${err.message}`);
    }
    return;
  }

  // 투자자 목록
  const { data: investors, error: invErr } = await supabase
    .from('investors')
    .select('*')
    .eq('is_active', true);
  if (invErr) throw invErr;

  // 최신 분기 확인
  const { data: latestFiling } = await supabase
    .from('filings')
    .select('quarter')
    .order('report_date', { ascending: false })
    .limit(1)
    .single();

  if (!latestFiling) {
    console.error('❌ 파일링 데이터가 없습니다.');
    process.exit(1);
  }

  let generated = 0;
  let skipped = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const investor of investors) {
    const slug = investor.name.toLowerCase().replace(/\s+/g, '_');
    if (investorArg && !slug.includes(investorArg) && investor.name_ko !== investorArg) {
      continue;
    }

    // 이 투자자의 최신 분기
    const { data: invFiling } = await supabase
      .from('filings')
      .select('quarter')
      .eq('investor_id', investor.id)
      .order('report_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!invFiling) {
      console.log(`  ⏭️  ${investor.name_ko}: 파일링 없음`);
      continue;
    }

    const quarter = invFiling.quarter;

    // 이미 생성된 인사이트 확인
    if (!forceFlag) {
      // 일별 모드: 오늘 날짜 기반 키로 체크
      const checkQuarter = (dailyFlag && investor.cik === '0001599922')
        ? `${quarter}-${new Date().toISOString().slice(5, 10).replace('-', '')}`
        : quarter;

      const { data: existing } = await supabase
        .from('ai_insights')
        .select('id')
        .eq('investor_id', investor.id)
        .eq('quarter', checkQuarter)
        .maybeSingle();

      if (existing) {
        console.log(`  ⏭️  ${investor.name_ko} (${checkQuarter}): 이미 생성됨`);
        skipped++;
        continue;
      }
    }

    // --daily 모드: 캐시우드만 일별 매매 기반 인사이트
    const isCathie = investor.cik === '0001599922';
    const isDaily = dailyFlag && isCathie;

    console.log(`\n▶ ${investor.name_ko} (${quarter}${isDaily ? ' 📅일별' : ''}) 인사이트 생성 중...`);

    // 포트폴리오 데이터 수집
    const portfolioData = await getPortfolioSummary(investor.id, quarter);

    if (portfolioData.holdings.length === 0) {
      console.log(`  ⚠️  보유종목 데이터 없음`);
      continue;
    }

    let userPrompt = formatPortfolioForAI(investor, portfolioData, quarter);
    let systemPrompt = SYSTEM_PROMPT;

    // 일별 모드: ARK 매매 데이터 추가 + 전용 시스템 프롬프트
    if (isDaily) {
      const dailyData = await getArkDailyData(investor.id, 5);
      if (dailyData && dailyData.length > 0) {
        userPrompt += formatDailyTradesForAI(dailyData);
        systemPrompt = DAILY_SYSTEM_PROMPT;
        console.log(`  📅 일별 매매: 최근 ${dailyData.length}일 데이터 포함`);
      } else {
        console.log(`  ⚠️  일별 매매 데이터 없음, 분기별 모드로 전환`);
      }
    }

    console.log(`  📊 데이터: ${portfolioData.holdings.length}종목, ${portfolioData.changes.length}건 변동`);

    try {
      const aiResponse = await callClaude(systemPrompt, userPrompt);

      // JSON 파싱 (마크다운 코드블록 제거)
      let jsonStr = aiResponse.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      // 혹시 ] 뒤에 쓸데없는 텍스트가 있으면 제거
      const lastBracket = jsonStr.lastIndexOf(']');
      if (lastBracket !== -1) {
        jsonStr = jsonStr.substring(0, lastBracket + 1);
      }

      const insights = JSON.parse(jsonStr);

      if (!Array.isArray(insights) || insights.length === 0) {
        console.log(`  ⚠️  유효한 인사이트 없음`);
        continue;
      }

      // 유효성 검사 + 정규화
      const validInsights = insights
        .filter(ins => ins.title && ins.desc && ins.tag)
        .map(ins => ({
          title: ins.title.slice(0, 20),
          desc: ins.desc,
          tag: ins.tag,
          confidence: Math.min(Math.max(ins.confidence || 70, 60), 95),
        }));

      // Supabase 저장 (일별 모드: 날짜 포함 키로 매일 갱신)
      const saveQuarter = isDaily
        ? `${quarter}-${new Date().toISOString().slice(5, 10).replace('-', '')}`  // 예: 2026Q1-0306
        : quarter;

      const { error: saveErr } = await supabase
        .from('ai_insights')
        .upsert({
          investor_id: investor.id,
          quarter: saveQuarter,
          insights: validInsights,
          model: MODEL,
          generated_at: new Date().toISOString(),
        }, { onConflict: 'investor_id,quarter' });

      if (saveErr) {
        console.error(`  ❌ 저장 실패: ${saveErr.message}`);
        continue;
      }

      console.log(`  ✅ ${validInsights.length}개 인사이트 생성 완료`);
      validInsights.forEach((ins, i) => {
        console.log(`     ${i + 1}. [${ins.tag}] ${ins.title} (신뢰도 ${ins.confidence}%)`);
        console.log(`        ${ins.desc.substring(0, 60)}...`);
      });

      generated++;

      // API 레이트 리밋 방지 (Haiku는 빠르니까 500ms면 충분)
      await new Promise(r => setTimeout(r, 500));

    } catch (err) {
      console.error(`  ❌ AI 생성 실패: ${err.message}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`✅ 완료: ${generated}명 생성 / ${skipped}명 스킵`);
  console.log(`💰 모델: ${MODEL}`);
  console.log('═'.repeat(60));
}

main().catch(err => { console.error('실패:', err); process.exit(1); });
