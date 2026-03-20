import { useState, useMemo } from "react";
import { BookOpen, Clock, ChevronRight, ArrowLeft, Tag } from "lucide-react";
import { useLocale } from "../hooks/useLocale";

// ========== 블로그 포스트 데이터 ==========
const BLOG_POSTS = [
  {
    id: "what-is-13f",
    date: "2025-03-20",
    category: "기초 가이드",
    categoryEn: "Guide",
    title: "SEC 13F란? 월가 전설 투자자 포트폴리오를 추적하는 법",
    titleEn: "What is SEC 13F? How to Track Legendary Investors' Portfolios",
    summary: "SEC 13F 공시의 개념, 제출 의무자, 공시 일정, 그리고 개인 투자자가 이를 활용하는 방법을 알아봅니다.",
    summaryEn: "Learn about SEC 13F filings — who files them, when they're due, and how individual investors can use them.",
    content: `
## SEC 13F란?

SEC 13F는 미국 증권거래위원회(SEC)에 제출하는 **분기별 보유 주식 보고서**입니다.

### 누가 제출하나요?

운용자산(AUM) **1억 달러 이상**의 기관투자자가 의무적으로 제출합니다. 여기에는 헤지펀드, 뮤추얼펀드, 연기금, 보험사 등이 포함됩니다.

### 언제 공시되나요?

매 **분기 종료 후 45일 이내**에 제출해야 합니다:

- Q1 (1\u20133월) → 5월 15일까지
- Q2 (4\u20136월) → 8월 14일까지
- Q3 (7\u20139월) → 11월 14일까지
- Q4 (10\u201312월) → 2월 14일까지

### 무엇을 알 수 있나요?

- 보유 종목 & 수량
- 포지션 변화 (신규 매수, 비중 확대/축소, 완전 매도)
- 포트폴리오 집중도

### 한계점

- **45일 지연**: 분기 말 기준이므로 실제 매매 시점과 차이가 있습니다
- **롱 포지션만**: 숏 포지션, 옵션 등은 포함되지 않습니다
- **미국 주식만**: 해외 주식, 채권 등은 보고 대상이 아닙니다

### FolioObs에서 13F 활용하기

FolioObs는 워렌 버핏, 캐시 우드, 레이 달리오 등 11명의 전설 투자자 13F 데이터를 자동으로 추적하여 쉽게 확인할 수 있습니다.
    `,
    contentEn: `
## What is SEC 13F?

SEC 13F is a **quarterly holdings report** filed with the U.S. Securities and Exchange Commission (SEC).

### Who Files?

Institutional investment managers with **$100M+ in assets under management (AUM)** are required to file. This includes hedge funds, mutual funds, pension funds, and insurance companies.

### Filing Schedule

Filed within **45 days after each quarter ends**:

- Q1 (Jan–Mar) → Due May 15
- Q2 (Apr–Jun) → Due Aug 14
- Q3 (Jul–Sep) → Due Nov 14
- Q4 (Oct–Dec) → Due Feb 14

### What Can You Learn?

- Holdings & share counts
- Position changes (new buys, increases/decreases, complete sells)
- Portfolio concentration

### Limitations

- **45-day delay**: Data is from quarter-end, not real-time
- **Long positions only**: No shorts, options, etc.
- **US equities only**: Foreign stocks, bonds are excluded

### Using 13F on FolioObs

FolioObs automatically tracks 13F filings from 11 legendary investors including Warren Buffett, Cathie Wood, and Ray Dalio.
    `,
  },
  {
    id: "how-to-read-portfolio",
    date: "2025-03-18",
    category: "투자 전략",
    categoryEn: "Strategy",
    title: "포트폴리오 비중 변화 읽는 법 — 매수·매도 신호 해석",
    titleEn: "How to Read Portfolio Changes — Interpreting Buy & Sell Signals",
    summary: "13F 공시에서 투자자의 매수·매도 신호를 해석하고, 실제 투자에 활용하는 방법을 배워봅니다.",
    summaryEn: "Learn how to interpret buy and sell signals from 13F filings and apply them to your investment decisions.",
    content: `
## 포트폴리오 변화 해석하기

13F 공시에서 가장 중요한 것은 **변화**입니다. 단순한 보유 현황보다 어떤 종목을 새로 샀고, 어떤 종목을 팔았는지가 더 많은 것을 알려줍니다.

### 주요 변동 유형

**🆕 신규 매수 (New Position)**
포트폴리오에 새롭게 등장한 종목. 투자자가 새로운 기회를 발견했다는 의미입니다.

**📈 비중 확대 (Increased)**
기존 보유 종목의 수량을 늘린 것. 해당 종목에 대한 확신이 높아졌음을 의미합니다.

**📉 비중 축소 (Decreased)**
기존 보유 종목의 수량을 줄인 것. 차익 실현이나 전망 변화일 수 있습니다.

**🚪 완전 매도 (Sold Out)**
포지션을 완전히 정리한 것. 가장 강한 매도 신호입니다.

### 여러 투자자가 동시에 같은 종목을?

FolioObs의 스크리너에서 **2인 이상 보유** 필터를 사용하면, 여러 전설 투자자가 동시에 매수하는 종목을 발견할 수 있습니다. 이것은 강력한 컨센서스 시그널입니다.

### 주의사항

- 13F는 45일 이전 데이터입니다. 이미 가격에 반영되었을 수 있습니다.
- 전설 투자자도 틀릴 수 있습니다. 맹목적 추종은 위험합니다.
- 자신만의 분석과 함께 참고 자료로 활용하세요.
    `,
    contentEn: `
## Interpreting Portfolio Changes

The most important thing in 13F filings is **change**. What was bought or sold tells you more than just current holdings.

### Types of Changes

**🆕 New Position**
A stock newly appearing in the portfolio — the investor found a new opportunity.

**📈 Increased**
More shares bought — growing conviction in the stock.

**📉 Decreased**
Shares reduced — could be profit-taking or changing outlook.

**🚪 Sold Out**
Position fully exited — the strongest sell signal.

### Multiple Investors Buying the Same Stock?

Use the **"2+ Holders"** filter in FolioObs Screener to find stocks being bought by multiple legendary investors simultaneously. This is a powerful consensus signal.

### Cautions

- 13F data is 45 days old. Prices may have already moved.
- Even legends can be wrong. Don't follow blindly.
- Use as a reference alongside your own analysis.
    `,
  },
  {
    id: "cathie-wood-daily-trades",
    date: "2025-03-15",
    category: "투자자 분석",
    categoryEn: "Analysis",
    title: "캐시 우드 ARK Invest 일별 매매 — 왜 다른 투자자와 다를까?",
    titleEn: "Cathie Wood ARK Daily Trades — What Makes Her Different?",
    summary: "캐시 우드의 ARK Invest가 일별 매매를 공개하는 이유와, 이 데이터를 활용하는 방법을 분석합니다.",
    summaryEn: "Why ARK Invest publishes daily trades and how to use this data for your investment research.",
    content: `
## 캐시 우드는 왜 특별한가?

대부분의 기관투자자는 분기별 13F 공시로만 포트폴리오를 공개합니다. 하지만 캐시 우드의 **ARK Invest는 매일 매매 내역을 공개**합니다.

### ARK 일별 매매란?

ARK Invest는 매 거래일 장 마감 후, 그날의 매수·매도 종목과 수량을 이메일과 웹사이트를 통해 공개합니다.

### ARK 펀드 종류

- **ARKK**: ARK Innovation ETF (대표 펀드)
- **ARKW**: Next Generation Internet ETF
- **ARKG**: Genomic Revolution ETF
- **ARKF**: Fintech Innovation ETF
- **ARKQ**: Autonomous Tech & Robotics ETF
- **ARKX**: Space Exploration & Innovation ETF

### 투자에 활용하는 법

1. **트렌드 파악**: ARK가 연속으로 매수하는 종목은 강한 확신을 의미
2. **섹터 방향성**: 어떤 섹터에 집중 매수하는지 관찰
3. **역발상**: ARK가 매도할 때 매수 기회가 될 수도 있음

### FolioObs에서 확인하기

FolioObs 대시보드에서 캐시 우드의 일별 매매를 실시간으로 확인할 수 있으며, ARK 리포트 페이지에서 주간·월간 매매 요약을 볼 수 있습니다.
    `,
    contentEn: `
## What Makes Cathie Wood Special?

Most institutional investors only disclose portfolios through quarterly 13F filings. But Cathie Wood's **ARK Invest publishes daily trade data**.

### What Are ARK Daily Trades?

After each trading day, ARK Invest publishes their buys and sells via email and their website.

### ARK Fund Types

- **ARKK**: ARK Innovation ETF (flagship)
- **ARKW**: Next Generation Internet ETF
- **ARKG**: Genomic Revolution ETF
- **ARKF**: Fintech Innovation ETF
- **ARKQ**: Autonomous Tech & Robotics ETF
- **ARKX**: Space Exploration & Innovation ETF

### How to Use This Data

1. **Spot trends**: Consecutive buys signal strong conviction
2. **Sector direction**: Observe which sectors ARK is focusing on
3. **Contrarian plays**: When ARK sells, it might be a buying opportunity

### Check on FolioObs

View Cathie Wood's daily trades in real-time on the FolioObs dashboard, and see weekly/monthly summaries on the ARK Report page.
    `,
  },
];

// ========== 블로그 글 상세 뷰 ==========
function BlogPostView({ post, onBack, L }) {
  const isEn = L.locale === 'en';
  const title = isEn ? post.titleEn : post.title;
  const content = isEn ? post.contentEn : post.content;
  const category = isEn ? post.categoryEn : post.category;

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> {isEn ? 'Back to blog' : '블로그로 돌아가기'}
      </button>

      <div className="flex items-center gap-3 mb-4">
        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">{category}</span>
        <span className="text-gray-500 text-sm flex items-center gap-1">
          <Clock size={14} /> {post.date}
        </span>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold mb-8 leading-tight">{title}</h1>

      <article className="prose prose-invert prose-sm md:prose-base max-w-none
        prose-headings:text-gray-100 prose-p:text-gray-300 prose-li:text-gray-300
        prose-strong:text-white prose-a:text-blue-400
        prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
        prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
        prose-ul:my-3 prose-li:my-1"
      >
        {content.split('\n').map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return null;
          if (trimmed.startsWith('## ')) return <h2 key={i}>{trimmed.slice(3)}</h2>;
          if (trimmed.startsWith('### ')) return <h3 key={i}>{trimmed.slice(4)}</h3>;
          if (trimmed.startsWith('- **')) {
            const match = trimmed.match(/^- \*\*(.+?)\*\*:?\s*(.*)/);
            if (match) return <div key={i} className="flex gap-2 my-2"><span className="font-bold text-white">{match[1]}</span><span className="text-gray-300">{match[2]}</span></div>;
          }
          if (trimmed.startsWith('- ')) return <li key={i} className="ml-4 list-disc">{trimmed.slice(2)}</li>;
          if (trimmed.startsWith('1. ') || trimmed.startsWith('2. ') || trimmed.startsWith('3. ')) {
            return <li key={i} className="ml-4 list-decimal">{trimmed.slice(3)}</li>;
          }
          if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
            return <p key={i} className="font-bold text-white my-2">{trimmed.slice(2, -2)}</p>;
          }
          // Bold 내부 처리
          const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
          return (
            <p key={i} className="my-2">
              {parts.map((part, j) =>
                part.startsWith('**') && part.endsWith('**')
                  ? <strong key={j} className="text-white">{part.slice(2, -2)}</strong>
                  : part
              )}
            </p>
          );
        })}
      </article>
    </div>
  );
}

// ========== 블로그 메인 ==========
export default function BlogPage() {
  const L = useLocale();
  const isEn = L.locale === 'en';
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = useMemo(() => {
    const cats = [...new Set(BLOG_POSTS.map(p => isEn ? p.categoryEn : p.category))];
    return ['all', ...cats];
  }, [isEn]);

  const filteredPosts = useMemo(() => {
    if (selectedCategory === 'all') return BLOG_POSTS;
    return BLOG_POSTS.filter(p =>
      (isEn ? p.categoryEn : p.category) === selectedCategory
    );
  }, [selectedCategory, isEn]);

  if (selectedPost) {
    return <BlogPostView post={selectedPost} onBack={() => setSelectedPost(null)} L={L} />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen className="text-blue-400" size={28} />
          <h1 className="text-2xl font-bold">
            {isEn ? 'FolioObs Blog' : 'FolioObs 블로그'}
          </h1>
        </div>
        <p className="text-gray-400">
          {isEn
            ? 'Investment insights, 13F analysis, and strategies from legendary investors.'
            : '투자 인사이트, 13F 분석, 그리고 월가 전설 투자자들의 전략 이야기.'}
        </p>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              selectedCategory === cat
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {cat === 'all' ? (isEn ? 'All' : '전체') : cat}
          </button>
        ))}
      </div>

      {/* 포스트 목록 */}
      <div className="space-y-4">
        {filteredPosts.map(post => (
          <article
            key={post.id}
            onClick={() => setSelectedPost(post)}
            className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 cursor-pointer
              hover:border-gray-600 hover:bg-gray-900/80 transition-all group"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full flex items-center gap-1">
                <Tag size={10} /> {isEn ? post.categoryEn : post.category}
              </span>
              <span className="text-gray-500 text-xs flex items-center gap-1">
                <Clock size={12} /> {post.date}
              </span>
            </div>
            <h2 className="text-lg font-semibold mb-2 group-hover:text-blue-400 transition-colors">
              {isEn ? post.titleEn : post.title}
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              {isEn ? post.summaryEn : post.summary}
            </p>
            <div className="mt-3 text-blue-400 text-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isEn ? 'Read more' : '더 읽기'} <ChevronRight size={14} />
            </div>
          </article>
        ))}
      </div>

      {/* 기여 CTA */}
      <div className="mt-12 text-center py-8 border-t border-gray-800">
        <p className="text-gray-500 text-sm">
          {isEn
            ? 'New articles are published regularly. Stay tuned for more investment insights!'
            : '새로운 글이 정기적으로 업데이트됩니다. 투자 인사이트를 놓치지 마세요!'}
        </p>
      </div>
    </div>
  );
}
