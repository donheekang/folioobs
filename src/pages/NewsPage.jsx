import { useState, useMemo } from "react";
import { Newspaper, Clock, ChevronRight, ArrowLeft, TrendingUp, TrendingDown, Zap, Users, AlertCircle } from "lucide-react";
import { useLocale } from "../hooks/useLocale";

// ========== FolioObs 뉴스 기사 데이터 ==========
const NEWS_ARTICLES = [
  {
    id: "buffett-q4-2025-new-buys",
    date: "2026-03-20",
    category: "속보",
    categoryEn: "Breaking",
    categoryColor: "red",
    title: "워렌 버핏, 2025 Q4 신규 매수 4종목 공개 — 리버티 미디어·뉴욕타임즈 포함",
    titleEn: "Warren Buffett Reveals 4 New Buys in Q4 2025 — Liberty Media & NYT Included",
    summary: "버크셔 해서웨이의 2025년 4분기 13F 공시에서 LLYVK, FWONK, LLYVA, NYT 4개 종목을 신규 매수한 것으로 확인되었습니다. 동시에 FWONKUSD, LLYVA*, LLYVK* 3개 종목을 완전 매도했습니다.",
    summaryEn: "Berkshire Hathaway's Q4 2025 13F filing reveals 4 new positions: LLYVK, FWONK, LLYVA, and NYT. Three positions were completely sold.",
    content: `워렌 버핏이 이끄는 버크셔 해서웨이가 2025년 4분기 SEC 13F 공시를 통해 포트폴리오 변화를 공개했습니다.

신규 매수 4종목:
• LLYVK (리버티 라이브 홀딩스) — 포트폴리오 비중 0.3%
• FWONK (리버티 미디어) — 비중 0.1%
• LLYVA (리버티 라이브 홀딩스) — 비중 0.1%
• NYT (뉴욕타임즈) — 비중 0.1%

완전 매도 3종목:
• FWONKUSD (LIBERTY MEDIA CORP DEL)
• LLYVA* (LIBERTY MEDIA CORP DEL)
• LLYVK* (LIBERTY MEDIA CORP DEL)

리버티 미디어 관련 종목의 재편이 눈에 띕니다. 기존 포지션을 정리하고 새로운 구조의 종목으로 교체한 것으로 보입니다. NYT 신규 매수는 버핏의 미디어 섹터에 대한 관심을 보여줍니다.

운용자산은 $274.2B, 총 보유 종목 41개로, 여전히 집중 투자 전략을 유지하고 있습니다. 최대 보유 종목은 AAPL(22.6%)입니다.

※ 본 기사는 SEC 13F 공시 데이터 기반이며, 투자 권유가 아닙니다.`,
    contentEn: `Warren Buffett's Berkshire Hathaway revealed its Q4 2025 portfolio changes through the SEC 13F filing.

4 New Positions:
• LLYVK (Liberty Live Holdings) — 0.3% of portfolio
• FWONK (Liberty Media) — 0.1%
• LLYVA (Liberty Live Holdings) — 0.1%
• NYT (New York Times) — 0.1%

3 Complete Exits:
• FWONKUSD (Liberty Media Corp Del)
• LLYVA* (Liberty Media Corp Del)
• LLYVK* (Liberty Media Corp Del)

The Liberty Media restructuring stands out. Buffett appears to have swapped old structures for new ones. The NYT purchase signals continued interest in the media sector.

AUM stands at $274.2B with 41 total holdings, maintaining a concentrated strategy. Top holding remains AAPL at 22.6%.

※ This article is based on SEC 13F filing data and is not investment advice.`,
  },
  {
    id: "cathie-wood-march-19-trades",
    date: "2026-03-19",
    category: "일별 매매",
    categoryEn: "Daily Trades",
    categoryColor: "green",
    title: "캐시 우드 3월 19일 매매 — TXG, ARCT 매수",
    titleEn: "Cathie Wood March 19 Trades — Bought TXG & ARCT",
    summary: "ARK Invest가 3월 19일 장 마감 후 공개한 매매 내역입니다. 10x Genomics(TXG)와 Arcturus Therapeutics(ARCT)를 매수했습니다.",
    summaryEn: "ARK Invest's trades disclosed after market close on March 19. Bought 10x Genomics (TXG) and Arcturus Therapeutics (ARCT).",
    content: `캐시 우드의 ARK Invest가 3월 19일 매매 내역을 공개했습니다.

매수 종목:
• TXG (10x Genomics) — 유전체학 분석 기업. ARKG 펀드에서 매수.
• ARCT (Arcturus Therapeutics) — mRNA 치료제 개발사. ARKG 펀드에서 매수.

두 종목 모두 유전체학/바이오 섹터로, ARK가 헬스케어 혁신 분야에 지속적으로 베팅하고 있음을 보여줍니다.

ARK Invest 운용자산은 현재 $11.7B이며, 114개 종목을 보유 중입니다.

FolioObs 대시보드에서 캐시 우드의 일별 매매를 실시간으로 확인할 수 있습니다.

※ 본 기사는 ARK Invest 공개 데이터 기반이며, 투자 권유가 아닙니다.`,
    contentEn: `Cathie Wood's ARK Invest disclosed trading activity for March 19.

Buys:
• TXG (10x Genomics) — Genomics analysis company. Bought in ARKG fund.
• ARCT (Arcturus Therapeutics) — mRNA therapeutics developer. Bought in ARKG fund.

Both stocks are in the genomics/biotech sector, showing ARK's continued bet on healthcare innovation.

ARK Invest AUM is currently $11.7B with 114 holdings.

Track Cathie Wood's daily trades in real-time on the FolioObs dashboard.

※ This article is based on ARK Invest public data and is not investment advice.`,
  },
  {
    id: "top5-most-bought-q4-2025",
    date: "2026-03-17",
    category: "데이터 분석",
    categoryEn: "Data Analysis",
    categoryColor: "blue",
    title: "2025 Q4 월가 전설들이 가장 많이 매수한 종목 TOP 5",
    titleEn: "Top 5 Most Bought Stocks by Legendary Investors in Q4 2025",
    summary: "11명의 전설 투자자 13F 데이터를 분석한 결과, CRH, AMZN, SPOT이 가장 많은 투자자에게 신규 매수되었습니다.",
    summaryEn: "Analysis of 11 legendary investors' 13F data shows CRH, AMZN, and SPOT were the most widely bought stocks.",
    content: `FolioObs가 추적하는 11명의 월가 전설 투자자들의 2025 Q4 13F 공시를 분석했습니다.

가장 많이 산 종목 TOP 5:

1. CRH (CRH) — 5명 매수
   국민연금, 레이 달리오 외 3명이 동시 매수. 건설/인프라 섹터 주목.

2. AMZN (아마존) — 5명 매수
   조지 소로스, 빌 애크먼, 댄 로엡, 세스 클라만, 빌 애크먼 등 5명이 매수.

3. SPOT (스포티파이) — 3명 신규 매수
   레이 달리오, 국민연금 외 1명이 새롭게 포트폴리오에 편입.

4. GOOG (알파벳/구글) — 4명 매도 vs 매수 혼재
   빌 애크먼, 세스 클라만 등이 매도하면서 의견 분열.

5. CPNG (쿠팡) — 4명 매수
   조지 소로스, 빌 애크먼 등이 한국 이커머스에 주목.

여러 전설 투자자가 동시에 같은 종목을 매수할 때, 이는 강력한 컨센서스 시그널로 볼 수 있습니다. FolioObs 스크리너에서 "2인 이상 보유" 필터로 직접 확인해보세요.

※ 본 기사는 SEC 13F 공시 데이터 기반이며, 투자 권유가 아닙니다.`,
    contentEn: `FolioObs analyzed Q4 2025 13F filings from 11 legendary Wall Street investors.

Top 5 Most Bought Stocks:

1. CRH (CRH) — Bought by 5 investors
   NPS, Ray Dalio and 3 others. Construction/infrastructure sector in focus.

2. AMZN (Amazon) — Bought by 5 investors
   George Soros, Bill Ackman, Dan Loeb, Seth Klarman among buyers.

3. SPOT (Spotify) — 3 new positions
   Ray Dalio, NPS and 1 more added to their portfolios.

4. GOOG (Alphabet/Google) — Mixed: 4 sold
   Bill Ackman, Seth Klarman sold, showing divergent opinions.

5. CPNG (Coupang) — Bought by 4 investors
   George Soros, Bill Ackman among those betting on Korean e-commerce.

When multiple legendary investors buy the same stock, it's a strong consensus signal. Check the FolioObs Screener with the "2+ Holders" filter.

※ This article is based on SEC 13F filing data and is not investment advice.`,
  },
  {
    id: "druckenmiller-q4-major-changes",
    date: "2026-03-15",
    category: "속보",
    categoryEn: "Breaking",
    categoryColor: "red",
    title: "드러켄밀러, Q4에 79종목 대규모 리밸런싱 — 신규 26개, 완전 매도 28개",
    titleEn: "Druckenmiller's Massive Q4 Rebalancing — 26 New Buys, 28 Complete Exits",
    summary: "스탠리 드러켄밀러의 듀케인 패밀리 오피스가 2025 Q4에 79종목을 변동시키며 대규모 포트폴리오 리밸런싱을 단행했습니다.",
    summaryEn: "Stanley Druckenmiller's Duquesne Family Office made massive changes in Q4 2025, touching 79 positions with 26 new buys and 28 complete exits.",
    content: `스탠리 드러켄밀러의 듀케인 패밀리 오피스가 2025 Q4 13F 공시를 통해 대규모 포트폴리오 변화를 공개했습니다. 총 79종목이 변동되었습니다.

주요 신규 매수 (26개 중):
• XLF (금융 섹터 ETF) — 비중 6.7%로 최대 신규 포지션
• RSP (인베스코 ETF) — 비중 5.0%
• EZU (iShares MSCI 유로존 ETF) — 비중 5.5%
• AA (알코아) — 비중 1.6%
• ENTG (엔테그리스) — 비중 1.6%

주요 완전 매도 (28개 중):
• VST (비스트라 에너지)
• VRNA (베로나 파마)

드러켄밀러의 이번 리밸런싱은 금융, 유럽, 원자재 섹터로의 대규모 전환을 시사합니다. XLF(금융 ETF)와 EZU(유로존 ETF)를 대량 매수한 것은 글로벌 매크로 관점에서 주목할 만합니다.

운용자산 $4.5B, 보유 종목 60개. 분기 수익률 +10.6%.

※ 본 기사는 SEC 13F 공시 데이터 기반이며, 투자 권유가 아닙니다.`,
    contentEn: `Stanley Druckenmiller's Duquesne Family Office revealed massive portfolio changes in Q4 2025. A total of 79 positions were modified.

Key New Buys (out of 26):
• XLF (Financial Select Sector ETF) — 6.7%, largest new position
• RSP (Invesco ETF) — 5.0%
• EZU (iShares MSCI Eurozone ETF) — 5.5%
• AA (Alcoa) — 1.6%
• ENTG (Entegris) — 1.6%

Key Complete Exits (out of 28):
• VST (Vistra Energy)
• VRNA (Verona Pharma)

This rebalancing signals a major rotation into financials, Europe, and commodities. The large XLF and EZU purchases are notable from a global macro perspective.

AUM: $4.5B, 60 holdings. Quarterly return: +10.6%.

※ This article is based on SEC 13F filing data and is not investment advice.`,
  },
  {
    id: "what-is-13f-guide",
    date: "2026-03-10",
    category: "가이드",
    categoryEn: "Guide",
    categoryColor: "purple",
    title: "SEC 13F란? — 월가 전설 투자자 포트폴리오를 추적하는 법",
    titleEn: "What is SEC 13F? — How to Track Legendary Investors",
    summary: "SEC 13F 공시의 개념, 누가 제출하는지, 언제 나오는지, 그리고 개인 투자자가 이를 활용하는 방법을 알아봅니다.",
    summaryEn: "Learn about SEC 13F filings — who files them, when they're due, and how individual investors can use them.",
    content: `SEC 13F란 미국 증권거래위원회(SEC)에 제출하는 분기별 보유 주식 보고서입니다.

누가 제출하나요?
운용자산(AUM) 1억 달러 이상의 기관투자자가 의무적으로 제출합니다. 헤지펀드, 뮤추얼펀드, 연기금, 보험사 등이 해당됩니다.

공시 일정:
• Q1 (1~3월) → 5월 15일까지
• Q2 (4~6월) → 8월 14일까지
• Q3 (7~9월) → 11월 14일까지
• Q4 (10~12월) → 2월 14일까지

무엇을 알 수 있나요?
보유 종목과 수량, 포지션 변화(신규 매수, 비중 확대/축소, 완전 매도), 포트폴리오 집중도를 확인할 수 있습니다.

한계점:
• 45일 지연 — 분기 말 기준이므로 실제 매매 시점과 차이
• 롱 포지션만 — 숏, 옵션 등 미포함
• 미국 주식만 — 해외 주식, 채권 미포함

FolioObs에서 활용하기:
FolioObs는 워렌 버핏, 캐시 우드, 레이 달리오 등 11명의 전설 투자자 13F 데이터를 자동으로 추적하여 쉽게 확인할 수 있습니다.`,
    contentEn: `SEC 13F is a quarterly holdings report filed with the U.S. Securities and Exchange Commission.

Who Files?
Institutional investment managers with $100M+ AUM are required to file. This includes hedge funds, mutual funds, pension funds, and insurance companies.

Filing Schedule:
• Q1 (Jan-Mar) → Due May 15
• Q2 (Apr-Jun) → Due Aug 14
• Q3 (Jul-Sep) → Due Nov 14
• Q4 (Oct-Dec) → Due Feb 14

What Can You Learn?
Holdings and share counts, position changes (new buys, increases/decreases, complete sells), and portfolio concentration.

Limitations:
• 45-day delay from quarter-end
• Long positions only — no shorts or options
• US equities only — no foreign stocks or bonds

FolioObs tracks 13F filings from 11 legendary investors including Warren Buffett, Cathie Wood, and Ray Dalio.`,
  },
];

// 카테고리 색상 매핑
const CATEGORY_COLORS = {
  red: "bg-red-500/20 text-red-400",
  green: "bg-emerald-500/20 text-emerald-400",
  blue: "bg-blue-500/20 text-blue-400",
  purple: "bg-purple-500/20 text-purple-400",
  yellow: "bg-yellow-500/20 text-yellow-400",
};

// ========== 뉴스 기사 상세 뷰 ==========
function NewsArticleView({ article, onBack, L }) {
  const isEn = L.locale === 'en';
  const title = isEn ? article.titleEn : article.title;
  const content = isEn ? article.contentEn : article.content;
  const category = isEn ? article.categoryEn : article.category;
  const colorClass = CATEGORY_COLORS[article.categoryColor] || CATEGORY_COLORS.blue;

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> {isEn ? 'Back to news' : '뉴스 목록'}
      </button>

      <div className="flex items-center gap-3 mb-4">
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${colorClass}`}>{category}</span>
        <span className="text-gray-500 text-sm flex items-center gap-1">
          <Clock size={14} /> {article.date}
        </span>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold mb-8 leading-tight text-white">{title}</h1>

      <article className="space-y-4">
        {content.split('\n').map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return null;

          // 티커 강조 (대문자 + 괄호 안 한국어명)
          if (trimmed.startsWith('•') || trimmed.startsWith('·')) {
            const text = trimmed.slice(1).trim();
            return (
              <div key={i} className="flex items-start gap-2 pl-2">
                <span className="text-emerald-400 mt-1">•</span>
                <span className="text-gray-300">{formatLine(text)}</span>
              </div>
            );
          }
          if (/^\d+\./.test(trimmed)) {
            return (
              <div key={i} className="flex items-start gap-2 pl-2">
                <span className="text-blue-400 font-bold min-w-[20px]">{trimmed.match(/^\d+/)[0]}.</span>
                <span className="text-gray-300">{formatLine(trimmed.replace(/^\d+\.\s*/, ''))}</span>
              </div>
            );
          }
          if (trimmed.startsWith('※')) {
            return <p key={i} className="text-gray-600 text-sm mt-6 pt-4 border-t border-gray-800">{trimmed}</p>;
          }
          if (trimmed.endsWith(':')) {
            return <h3 key={i} className="text-white font-semibold mt-6 mb-2">{trimmed}</h3>;
          }
          return <p key={i} className="text-gray-300 leading-relaxed">{formatLine(trimmed)}</p>;
        })}
      </article>
    </div>
  );
}

// 텍스트에서 티커 심볼 강조
function formatLine(text) {
  // 티커 패턴: 대문자 2-5글자 (괄호 안이거나 단독)
  const parts = text.split(/(\b[A-Z]{2,5}\b)/g);
  return parts.map((part, i) => {
    if (/^[A-Z]{2,5}$/.test(part) && !['ETF', 'AUM', 'SEC', 'ARK', 'TOP', 'NEW', 'DEL', 'CORP', 'INC', 'MSCI', 'NPS', 'LIBERTY', 'MEDIA'].includes(part)) {
      return <span key={i} className="text-blue-400 font-medium">{part}</span>;
    }
    return part;
  });
}

// ========== 뉴스 메인 ==========
export default function NewsPage() {
  const L = useLocale();
  const isEn = L.locale === 'en';
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = useMemo(() => {
    const cats = [...new Set(NEWS_ARTICLES.map(p => isEn ? p.categoryEn : p.category))];
    return ['all', ...cats];
  }, [isEn]);

  const filteredArticles = useMemo(() => {
    if (selectedCategory === 'all') return NEWS_ARTICLES;
    return NEWS_ARTICLES.filter(p =>
      (isEn ? p.categoryEn : p.category) === selectedCategory
    );
  }, [selectedCategory, isEn]);

  if (selectedArticle) {
    return <NewsArticleView article={selectedArticle} onBack={() => setSelectedArticle(null)} L={L} />;
  }

  // 첫 번째 기사 = 헤드라인
  const headline = filteredArticles[0];
  const rest = filteredArticles.slice(1);

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Newspaper className="text-red-400" size={28} />
          <h1 className="text-2xl font-bold">
            FolioObs {isEn ? 'News' : '뉴스'}
          </h1>
        </div>
        <p className="text-gray-400 text-sm">
          {isEn
            ? 'Data-driven investment news from SEC 13F filings & ARK daily trades.'
            : 'SEC 13F 공시 · ARK 일별 매매 — 데이터 기반 투자 뉴스'}
        </p>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map(cat => {
          const article = NEWS_ARTICLES.find(a => (isEn ? a.categoryEn : a.category) === cat);
          const colorActive = article ? CATEGORY_COLORS[article.categoryColor] : '';
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? (cat === 'all' ? 'bg-white text-black' : colorActive)
                  : 'bg-gray-800/80 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {cat === 'all' ? (isEn ? 'All' : '전체') : cat}
            </button>
          );
        })}
      </div>

      {/* 헤드라인 기사 (첫 번째) */}
      {headline && (
        <article
          onClick={() => setSelectedArticle(headline)}
          className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 mb-4 cursor-pointer
            hover:border-gray-500 transition-all group"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${CATEGORY_COLORS[headline.categoryColor]}`}>
              {isEn ? headline.categoryEn : headline.category}
            </span>
            <span className="text-gray-500 text-sm flex items-center gap-1">
              <Clock size={13} /> {headline.date}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold mb-3 group-hover:text-blue-400 transition-colors leading-snug">
            {isEn ? headline.titleEn : headline.title}
          </h2>
          <p className="text-gray-400 leading-relaxed">
            {isEn ? headline.summaryEn : headline.summary}
          </p>
          <div className="mt-4 text-blue-400 text-sm flex items-center gap-1">
            {isEn ? 'Read full article' : '기사 전문 보기'} <ChevronRight size={14} />
          </div>
        </article>
      )}

      {/* 나머지 기사 목록 */}
      <div className="space-y-3">
        {rest.map(article => (
          <article
            key={article.id}
            onClick={() => setSelectedArticle(article)}
            className="bg-gray-900/40 border border-gray-800 rounded-lg p-4 cursor-pointer
              hover:border-gray-600 hover:bg-gray-900/70 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${CATEGORY_COLORS[article.categoryColor]}`}>
                    {isEn ? article.categoryEn : article.category}
                  </span>
                  <span className="text-gray-600 text-xs">{article.date}</span>
                </div>
                <h3 className="text-base font-semibold mb-1 group-hover:text-blue-400 transition-colors leading-snug">
                  {isEn ? article.titleEn : article.title}
                </h3>
                <p className="text-gray-500 text-sm line-clamp-2">
                  {isEn ? article.summaryEn : article.summary}
                </p>
              </div>
              <ChevronRight size={16} className="text-gray-600 group-hover:text-blue-400 mt-6 flex-shrink-0 transition-colors" />
            </div>
          </article>
        ))}
      </div>

      {/* 면책 */}
      <div className="mt-10 p-4 bg-gray-900/30 border border-gray-800 rounded-lg flex items-start gap-3">
        <AlertCircle size={16} className="text-gray-600 mt-0.5 flex-shrink-0" />
        <p className="text-gray-600 text-xs leading-relaxed">
          {isEn
            ? 'FolioObs News is based on publicly available SEC 13F filings and ARK Invest daily trade disclosures. All content is for informational purposes only and does not constitute investment advice.'
            : 'FolioObs 뉴스는 SEC 13F 공시 및 ARK Invest 일별 매매 공개 데이터를 기반으로 합니다. 모든 기사는 정보 제공 목적이며, 투자 권유가 아닙니다.'}
        </p>
      </div>
    </div>
  );
}
