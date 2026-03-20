import { Helmet } from "react-helmet-async";

const BASE_URL = "https://folioobs.com";

// 투자자별 SEO 데이터
const INVESTOR_SEO = {
  buffett: {
    ko: { title: "워렌 버핏 포트폴리오 | 버크셔 해서웨이 13F 실시간", desc: "워렌 버핏의 버크셔 해서웨이 포트폴리오를 실시간으로 추적하세요. SEC 13F 공시 기반 보유 종목, 매매 내역, 섹터 비중을 한눈에." },
    en: { title: "Warren Buffett Portfolio | Berkshire Hathaway 13F Live", desc: "Track Warren Buffett's Berkshire Hathaway portfolio in real-time. SEC 13F filings, holdings, trades, and sector allocation at a glance." },
  },
  cathie: {
    ko: { title: "캐시 우드 매매내역 | ARK Invest 일별 매매 실시간", desc: "캐시 우드의 ARK Invest 일별 매수·매도 내역을 실시간 추적. ARK 펀드 포트폴리오 변화와 주요 종목 분석." },
    en: { title: "Cathie Wood Trades | ARK Invest Daily Trades Live", desc: "Track Cathie Wood's ARK Invest daily buys and sells in real-time. Portfolio changes and key stock analysis." },
  },
  druckenmiller: {
    ko: { title: "스탠리 드러켄밀러 포트폴리오 | 듀케인 13F 실시간", desc: "스탠리 드러켄밀러의 듀케인 패밀리 오피스 포트폴리오. SEC 13F 공시 기반 매매 내역과 보유 종목." },
    en: { title: "Stanley Druckenmiller Portfolio | Duquesne 13F Live", desc: "Track Druckenmiller's Duquesne Family Office portfolio. SEC 13F holdings and trades." },
  },
  dalio: {
    ko: { title: "레이 달리오 포트폴리오 | 브리지워터 13F 실시간", desc: "레이 달리오의 브리지워터 어소시에이츠 포트폴리오를 실시간 추적. SEC 13F 공시 보유 종목과 비중 변화." },
    en: { title: "Ray Dalio Portfolio | Bridgewater 13F Live", desc: "Track Ray Dalio's Bridgewater Associates portfolio. SEC 13F holdings and allocation changes." },
  },
  soros: {
    ko: { title: "조지 소로스 포트폴리오 | 소로스 펀드 13F 실시간", desc: "조지 소로스의 소로스 펀드 매니지먼트 포트폴리오. SEC 13F 공시 기반 매매 내역." },
    en: { title: "George Soros Portfolio | Soros Fund 13F Live", desc: "Track George Soros Fund Management portfolio. SEC 13F filings and trades." },
  },
  ackman: {
    ko: { title: "빌 애크먼 포트폴리오 | 퍼싱 스퀘어 13F 실시간", desc: "빌 애크먼의 퍼싱 스퀘어 캐피탈 포트폴리오. SEC 13F 공시 보유 종목과 집중 투자 분석." },
    en: { title: "Bill Ackman Portfolio | Pershing Square 13F Live", desc: "Track Bill Ackman's Pershing Square portfolio. SEC 13F concentrated holdings and trades." },
  },
  tepper: {
    ko: { title: "데이비드 테퍼 포트폴리오 | 아팔루사 13F 실시간", desc: "데이비드 테퍼의 아팔루사 매니지먼트 포트폴리오. SEC 13F 공시 기반 보유 종목." },
    en: { title: "David Tepper Portfolio | Appaloosa 13F Live", desc: "Track David Tepper's Appaloosa Management portfolio. SEC 13F holdings." },
  },
  coleman: {
    ko: { title: "체이스 콜먼 포트폴리오 | 타이거 글로벌 13F 실시간", desc: "체이스 콜먼의 타이거 글로벌 매니지먼트 포트폴리오. SEC 13F 공시 기반 테크 종목 투자 분석." },
    en: { title: "Chase Coleman Portfolio | Tiger Global 13F Live", desc: "Track Chase Coleman's Tiger Global portfolio. SEC 13F tech holdings analysis." },
  },
  loeb: {
    ko: { title: "댄 로엡 포트폴리오 | 서드 포인트 13F 실시간", desc: "댄 로엡의 서드 포인트 포트폴리오. SEC 13F 공시 기반 액티비스트 투자 내역." },
    en: { title: "Dan Loeb Portfolio | Third Point 13F Live", desc: "Track Dan Loeb's Third Point portfolio. SEC 13F activist investment holdings." },
  },
  klarman: {
    ko: { title: "세스 클라만 포트폴리오 | 바우포스트 13F 실시간", desc: "세스 클라만의 바우포스트 그룹 포트폴리오. SEC 13F 공시 가치투자 종목." },
    en: { title: "Seth Klarman Portfolio | Baupost 13F Live", desc: "Track Seth Klarman's Baupost Group portfolio. SEC 13F value investing holdings." },
  },
  nps: {
    ko: { title: "국민연금 포트폴리오 | NPS 해외 주식 13F 실시간", desc: "국민연금(NPS)의 미국 주식 포트폴리오. SEC 13F 공시 기반 해외 보유 종목과 비중 변화." },
    en: { title: "National Pension Service Portfolio | NPS 13F Live", desc: "Track Korea's National Pension Service US stock portfolio. SEC 13F holdings." },
  },
};

// 페이지별 기본 SEO 데이터
const PAGE_SEO = {
  dashboard: {
    ko: { title: "FolioObs — 월가 전설 투자자 포트폴리오 실시간 추적", desc: "워렌 버핏, 캐시 우드, 레이 달리오 등 월가 전설 11명의 SEC 13F 포트폴리오를 실시간 추적. 무료 한국어 서비스." },
    en: { title: "FolioObs — Track Legendary Investors' Portfolios Live", desc: "Track 11 legendary Wall Street investors' SEC 13F portfolios in real-time. Free Korean & English service." },
  },
  screener: {
    ko: { title: "종목 스크리너 | 월가 전설들이 보유한 종목 검색 — FolioObs", desc: "월가 전설 투자자 11명이 보유한 1,300+ 종목을 검색하세요. 섹터별, 투자자별 필터링. 공통 보유 종목 발견." },
    en: { title: "Stock Screener | Search Stocks Held by Legends — FolioObs", desc: "Search 1,300+ stocks held by 11 legendary investors. Filter by sector and investor. Find common holdings." },
  },
  compare: {
    ko: { title: "투자자 비교 | 포트폴리오 겹침 분석 — FolioObs", desc: "월가 전설 투자자들의 포트폴리오를 비교하세요. 공통 보유 종목, 매매 방향 일치·충돌 분석." },
    en: { title: "Compare Investors | Portfolio Overlap Analysis — FolioObs", desc: "Compare legendary investors' portfolios. Find common holdings and trade direction agreements." },
  },
  insights: {
    ko: { title: "AI 인사이트 | 투자자 포트폴리오 분석 — FolioObs", desc: "AI가 분석한 월가 전설 투자자들의 포트폴리오 인사이트. 주요 변동, 트렌드, 시그널." },
    en: { title: "AI Insights | Investor Portfolio Analysis — FolioObs", desc: "AI-powered insights on legendary investors' portfolios. Key changes, trends, and signals." },
  },
  insider: {
    ko: { title: "내부자 거래 | 미국 주식 인사이더 매매 — FolioObs", desc: "미국 주식 내부자(임원, 이사) 매매 내역 실시간 추적. SEC Form 4 기반." },
    en: { title: "Insider Trading | US Stock Insider Transactions — FolioObs", desc: "Track US stock insider (officer, director) transactions in real-time. Based on SEC Form 4." },
  },
  watchlist: {
    ko: { title: "관심 종목 | 내 워치리스트 — FolioObs", desc: "관심 종목을 추적하고 월가 전설 투자자들의 보유 현황을 확인하세요." },
    en: { title: "Watchlist | My Tracked Stocks — FolioObs", desc: "Track your watchlist stocks and see which legendary investors hold them." },
  },
  foliomatch: {
    ko: { title: "FolioMatch | 내 포트폴리오 vs 전설 투자자 — FolioObs", desc: "내 보유 종목이 월가 전설 투자자들과 얼마나 겹치는지 확인하세요. 무료 포트폴리오 매칭." },
    en: { title: "FolioMatch | Your Portfolio vs Legends — FolioObs", desc: "See how your holdings overlap with legendary investors. Free portfolio matching." },
  },
  "ark-report": {
    ko: { title: "ARK Invest 리포트 | 캐시 우드 주간·월간 매매 — FolioObs", desc: "캐시 우드 ARK Invest의 주간·월간 매매 리포트. 펀드별 매수·매도 종목 분석." },
    en: { title: "ARK Invest Report | Cathie Wood Weekly/Monthly — FolioObs", desc: "Cathie Wood's ARK Invest weekly and monthly trade reports. Buy/sell analysis by fund." },
  },
};

export default function SEOHead({ page, investorId, ticker, locale }) {
  const lang = locale || 'ko';

  // 투자자 상세 페이지
  if (page === "investor" && investorId) {
    const seo = INVESTOR_SEO[investorId]?.[lang] || INVESTOR_SEO[investorId]?.ko;
    if (seo) {
      const url = `${BASE_URL}/investor/${investorId}`;
      return (
        <Helmet>
          <title>{seo.title}</title>
          <meta name="description" content={seo.desc} />
          <link rel="canonical" href={url} />
          <meta property="og:title" content={seo.title} />
          <meta property="og:description" content={seo.desc} />
          <meta property="og:url" content={url} />
          <meta property="og:type" content="profile" />
          <meta name="twitter:title" content={seo.title} />
          <meta name="twitter:description" content={seo.desc} />
        </Helmet>
      );
    }
  }

  // 종목 상세 페이지
  if (page === "stock" && ticker) {
    const title = lang === 'ko'
      ? `${ticker} 보유 투자자 & 분석 — FolioObs`
      : `${ticker} Holders & Analysis — FolioObs`;
    const desc = lang === 'ko'
      ? `${ticker} 종목을 보유한 월가 전설 투자자들과 상세 분석. SEC 13F 공시 기반 보유 비중, 매매 내역.`
      : `Legendary investors holding ${ticker} and detailed analysis. SEC 13F portfolio weight and trades.`;
    const url = `${BASE_URL}/stock/${ticker}`;
    return (
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={desc} />
      </Helmet>
    );
  }

  // 일반 페이지
  const pageSeo = PAGE_SEO[page]?.[lang] || PAGE_SEO[page]?.ko || PAGE_SEO.dashboard[lang];
  const url = page === 'dashboard' ? BASE_URL : `${BASE_URL}/${page}`;
  return (
    <Helmet>
      <title>{pageSeo.title}</title>
      <meta name="description" content={pageSeo.desc} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={pageSeo.title} />
      <meta property="og:description" content={pageSeo.desc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:title" content={pageSeo.title} />
      <meta name="twitter:description" content={pageSeo.desc} />
    </Helmet>
  );
}
