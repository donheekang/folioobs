/**
 * 빌드 후 프리렌더링 스크립트
 *
 * 각 라우트별 정적 HTML을 생성하여 크롤러가 JS 실행 없이도
 * 올바른 title, description, OG 태그를 읽을 수 있게 합니다.
 *
 * 사용법: node scripts/prerender.js (vite build 후 실행)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const BASE_URL = 'https://folioobs.com';

// ========== SEO 데이터 (SEOHead.jsx와 동기화) ==========
const INVESTOR_SEO = {
  buffett: {
    ko: { title: "워렌 버핏 포트폴리오 | 버크셔 해서웨이 13F 실시간", desc: "워렌 버핏의 버크셔 해서웨이 포트폴리오를 실시간으로 추적하세요. SEC 13F 공시 기반 보유 종목, 매매 내역, 섹터 비중을 한눈에." },
    en: { title: "Warren Buffett Portfolio | Berkshire Hathaway 13F Live", desc: "Track Warren Buffett's Berkshire Hathaway portfolio in real-time. SEC 13F filings, holdings, trades." },
  },
  cathie: {
    ko: { title: "캐시 우드 매매내역 | ARK Invest 일별 매매 실시간", desc: "캐시 우드의 ARK Invest 일별 매수·매도 내역을 실시간 추적. ARK 펀드 포트폴리오 변화와 주요 종목 분석." },
    en: { title: "Cathie Wood Trades | ARK Invest Daily Trades Live", desc: "Track Cathie Wood's ARK Invest daily buys and sells in real-time." },
  },
  druckenmiller: {
    ko: { title: "스탠리 드러켄밀러 포트폴리오 | 듀케인 13F 실시간", desc: "스탠리 드러켄밀러의 듀케인 패밀리 오피스 포트폴리오. SEC 13F 공시 기반 매매 내역과 보유 종목." },
    en: { title: "Stanley Druckenmiller Portfolio | Duquesne 13F Live", desc: "Track Druckenmiller's Duquesne Family Office portfolio." },
  },
  dalio: {
    ko: { title: "레이 달리오 포트폴리오 | 브리지워터 13F 실시간", desc: "레이 달리오의 브리지워터 어소시에이츠 포트폴리오를 실시간 추적. SEC 13F 공시 보유 종목과 비중 변화." },
    en: { title: "Ray Dalio Portfolio | Bridgewater 13F Live", desc: "Track Ray Dalio's Bridgewater Associates portfolio." },
  },
  soros: {
    ko: { title: "조지 소로스 포트폴리오 | 소로스 펀드 13F 실시간", desc: "조지 소로스의 소로스 펀드 매니지먼트 포트폴리오. SEC 13F 공시 기반 매매 내역." },
    en: { title: "George Soros Portfolio | Soros Fund 13F Live", desc: "Track George Soros Fund Management portfolio." },
  },
  ackman: {
    ko: { title: "빌 애크먼 포트폴리오 | 퍼싱 스퀘어 13F 실시간", desc: "빌 애크먼의 퍼싱 스퀘어 캐피탈 포트폴리오. SEC 13F 공시 보유 종목과 집중 투자 분석." },
    en: { title: "Bill Ackman Portfolio | Pershing Square 13F Live", desc: "Track Bill Ackman's Pershing Square portfolio." },
  },
  tepper: {
    ko: { title: "데이비드 테퍼 포트폴리오 | 아팔루사 13F 실시간", desc: "데이비드 테퍼의 아팔루사 매니지먼트 포트폴리오. SEC 13F 공시 기반 보유 종목." },
    en: { title: "David Tepper Portfolio | Appaloosa 13F Live", desc: "Track David Tepper's Appaloosa Management portfolio." },
  },
  coleman: {
    ko: { title: "체이스 콜먼 포트폴리오 | 타이거 글로벌 13F 실시간", desc: "체이스 콜먼의 타이거 글로벌 매니지먼트 포트폴리오. SEC 13F 공시 기반 테크 종목 투자 분석." },
    en: { title: "Chase Coleman Portfolio | Tiger Global 13F Live", desc: "Track Chase Coleman's Tiger Global portfolio." },
  },
  loeb: {
    ko: { title: "댄 로엡 포트폴리오 | 서드 포인트 13F 실시간", desc: "댄 로엡의 서드 포인트 포트폴리오. SEC 13F 공시 기반 액티비스트 투자 내역." },
    en: { title: "Dan Loeb Portfolio | Third Point 13F Live", desc: "Track Dan Loeb's Third Point portfolio." },
  },
  klarman: {
    ko: { title: "세스 클라만 포트폴리오 | 바우포스트 13F 실시간", desc: "세스 클라만의 바우포스트 그룹 포트폴리오. SEC 13F 공시 가치투자 종목." },
    en: { title: "Seth Klarman Portfolio | Baupost 13F Live", desc: "Track Seth Klarman's Baupost Group portfolio." },
  },
  nps: {
    ko: { title: "국민연금 포트폴리오 | NPS 해외 주식 13F 실시간", desc: "국민연금(NPS)의 미국 주식 포트폴리오. SEC 13F 공시 기반 해외 보유 종목과 비중 변화." },
    en: { title: "National Pension Service Portfolio | NPS 13F Live", desc: "Track Korea's National Pension Service US stock portfolio." },
  },
};

const PAGE_SEO = {
  dashboard: {
    ko: { title: "FolioObs — 월가 전설 투자자 포트폴리오 실시간 추적", desc: "워렌 버핏, 캐시 우드, 레이 달리오 등 월가 전설 11명의 SEC 13F 포트폴리오를 실시간 추적. 무료 한국어 서비스." },
  },
  screener: {
    ko: { title: "종목 스크리너 | 월가 전설들이 보유한 종목 검색 — FolioObs", desc: "월가 전설 투자자 11명이 보유한 1,300+ 종목을 검색하세요. 섹터별, 투자자별 필터링." },
  },
  compare: {
    ko: { title: "투자자 비교 | 포트폴리오 겹침 분석 — FolioObs", desc: "월가 전설 투자자들의 포트폴리오를 비교하세요. 공통 보유 종목, 매매 방향 일치·충돌 분석." },
  },
  insights: {
    ko: { title: "AI 인사이트 | 투자자 포트폴리오 분석 — FolioObs", desc: "AI가 분석한 월가 전설 투자자들의 포트폴리오 인사이트. 주요 변동, 트렌드, 시그널." },
  },
  insider: {
    ko: { title: "내부자 거래 | 미국 주식 인사이더 매매 — FolioObs", desc: "미국 주식 내부자(임원, 이사) 매매 내역 실시간 추적. SEC Form 4 기반." },
  },
  watchlist: {
    ko: { title: "관심 종목 | 내 워치리스트 — FolioObs", desc: "관심 종목을 추적하고 월가 전설 투자자들의 보유 현황을 확인하세요." },
  },
  foliomatch: {
    ko: { title: "FolioMatch | 내 포트폴리오 vs 전설 투자자 — FolioObs", desc: "내 보유 종목이 월가 전설 투자자들과 얼마나 겹치는지 확인하세요." },
  },
  "ark-report": {
    ko: { title: "ARK Invest 리포트 | 캐시 우드 주간·월간 매매 — FolioObs", desc: "캐시 우드 ARK Invest의 주간·월간 매매 리포트. 펀드별 매수·매도 종목 분석." },
  },
  blog: {
    ko: { title: "블로그 | 투자 인사이트 & 13F 분석 — FolioObs", desc: "SEC 13F 분석, 투자 전략, 월가 전설 투자자 이야기. FolioObs 블로그에서 투자 인사이트를 만나보세요." },
  },
  privacy: {
    ko: { title: "개인정보처리방침 — FolioObs", desc: "FolioObs 개인정보처리방침" },
  },
  terms: {
    ko: { title: "이용약관 — FolioObs", desc: "FolioObs 이용약관" },
  },
};

// 프리렌더링할 라우트 목록
const ROUTES = [
  { path: '/', page: 'dashboard' },
  { path: '/screener', page: 'screener' },
  { path: '/compare', page: 'compare' },
  { path: '/insights', page: 'insights' },
  { path: '/insider', page: 'insider' },
  { path: '/watchlist', page: 'watchlist' },
  { path: '/foliomatch', page: 'foliomatch' },
  { path: '/ark-report', page: 'ark-report' },
  { path: '/blog', page: 'blog' },
  { path: '/privacy', page: 'privacy' },
  { path: '/terms', page: 'terms' },
  // 투자자 페이지
  ...Object.keys(INVESTOR_SEO).map(id => ({
    path: `/investor/${id}`,
    page: 'investor',
    investorId: id,
  })),
];

function generateHTML(templateHTML, route) {
  let html = templateHTML;
  let seo;
  let canonicalUrl;
  let ogType = 'website';

  if (route.page === 'investor' && route.investorId) {
    seo = INVESTOR_SEO[route.investorId]?.ko;
    canonicalUrl = `${BASE_URL}/investor/${route.investorId}`;
    ogType = 'profile';
  } else {
    seo = PAGE_SEO[route.page]?.ko || PAGE_SEO.dashboard.ko;
    canonicalUrl = route.path === '/' ? BASE_URL : `${BASE_URL}${route.path}`;
  }

  if (!seo) return html;

  // title 치환
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${seo.title}</title>`
  );

  // meta description 치환
  html = html.replace(
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${seo.desc}"`
  );

  // canonical URL 치환
  html = html.replace(
    /<link rel="canonical" href="[^"]*"/,
    `<link rel="canonical" href="${canonicalUrl}"`
  );

  // OG tags 치환
  html = html.replace(
    /<meta property="og:title" content="[^"]*"/,
    `<meta property="og:title" content="${seo.title}"`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*"/,
    `<meta property="og:description" content="${seo.desc}"`
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*"/,
    `<meta property="og:url" content="${canonicalUrl}"`
  );
  html = html.replace(
    /<meta property="og:type" content="[^"]*"/,
    `<meta property="og:type" content="${ogType}"`
  );

  // Twitter tags 치환
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*"/,
    `<meta name="twitter:title" content="${seo.title}"`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"/,
    `<meta name="twitter:description" content="${seo.desc}"`
  );

  return html;
}

// 메인 실행
function main() {
  const templatePath = join(DIST, 'index.html');
  if (!existsSync(templatePath)) {
    console.error('❌ dist/index.html 없음. 먼저 vite build를 실행하세요.');
    process.exit(1);
  }

  const templateHTML = readFileSync(templatePath, 'utf-8');
  let count = 0;

  for (const route of ROUTES) {
    const html = generateHTML(templateHTML, route);

    // 경로에 맞는 디렉터리 생성 후 index.html 저장
    // / → dist/index.html (이미 존재, 덮어쓰기)
    // /screener → dist/screener/index.html
    // /investor/buffett → dist/investor/buffett/index.html
    let outDir, outFile;
    if (route.path === '/') {
      outDir = DIST;
      outFile = join(DIST, 'index.html');
    } else {
      outDir = join(DIST, route.path.slice(1));
      outFile = join(outDir, 'index.html');
    }

    mkdirSync(outDir, { recursive: true });
    writeFileSync(outFile, html, 'utf-8');
    count++;
  }

  console.log(`✅ ${count}개 라우트 프리렌더링 완료!`);
  ROUTES.forEach(r => console.log(`  → ${r.path}`));
}

main();
