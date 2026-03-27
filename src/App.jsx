import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Eye, Search, X, Clock, TrendingUp, Users, Globe, ArrowUpRight, ArrowDownRight, Flame, Star, ChevronRight } from "lucide-react";
import { HelmetProvider } from "react-helmet-async";

// Theme & Hooks
import { THEMES, ThemeContext } from "./hooks/useTheme";
import { safeGetItem, safeGetJSON, safeSetItem, safeRemoveItem } from "./utils/storage";
import { useWatchlist } from "./hooks/useWatchlist";
import { DataProvider, useData } from "./hooks/useDataProvider";
import { LocaleContext, createLocaleValue } from "./hooks/useLocale";
import SEOHead from "./components/SEOHead";

// Data
import { formatUSD } from "./utils/format";
import polygon from "./services/polygon";
import { trackInvestorClick, trackDetailView, trackPageView } from "./utils/analytics";

// Shared Components
import { ThemeToggle } from "./components/shared";
import ErrorBoundary from "./components/ErrorBoundary";

// Pages
import DashboardPage from "./pages/DashboardPage";
import InvestorDetailPage from "./pages/InvestorDetailPage";
import ScreenerPage from "./pages/ScreenerPage";
import WatchlistPage from "./pages/WatchlistPage";
import ComparePage from "./pages/ComparePage";
import InsightsPage from "./pages/InsightsPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import StockDetailPage from "./pages/StockDetailPage";
import ArkReportPage from "./pages/ArkReportPage";
import InsiderTradingPage from "./pages/InsiderTradingPage";
import FolioMatchPage from "./pages/FolioMatchPage";
import NewsPage from "./pages/NewsPage";

// ========== MAIN APP ==========
export default function FolioObs() {
  return (
    <HelmetProvider>
      <DataProvider>
        <FolioObsInner />
      </DataProvider>
    </HelmetProvider>
  );
}

// Ticker Logo for search results (loads Polygon branding, 24h cached)
function TickerLogo({ ticker, theme }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!ticker) return;
    polygon.getTickerDetails(ticker).then(d => {
      const url = d?.branding?.icon_url || d?.branding?.logo_url;
      if (url) setSrc(polygon.getLogoUrl(url));
    }).catch(() => {});
  }, [ticker]);

  if (!src || failed) {
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#06b6d4'];
    const c = colors[ticker.charCodeAt(0) % colors.length];
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
        style={{ background: `${c}18`, color: c }}>
        {ticker.slice(0, 2)}
      </div>
    );
  }

  return (
    <img src={src} alt={ticker} className="w-8 h-8 rounded-lg object-contain"
      style={{ background: theme.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
      onError={() => setFailed(true)} />
  );
}

// Language Toggle Button
const LangToggle = ({ locale, onToggle, theme }) => (
  <button onClick={onToggle}
    className="flex items-center gap-1 px-1.5 py-1 rounded-lg text-xs font-medium transition hover:opacity-70"
    style={{ color: theme === 'dark' ? '#f5f5f7' : '#1d1d1f' }}
    aria-label={locale === 'ko' ? 'Switch to English' : '한국어로 전환'}
    title={locale === 'ko' ? 'English' : '한국어'}>
    <Globe size={13} />
    <span className="hidden sm:inline">{locale === 'ko' ? 'EN' : 'KO'}</span>
  </button>
);

function FolioObsInner() {
  const { investors: INVESTORS, holdings: HOLDINGS, quarterlyActivity: QUARTERLY_ACTIVITY, latestQuarter, loading: dataLoading, error: dataError } = useData();
  const [page, setPage] = useState("dashboard");
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [locale, setLocale] = useState(() => {
    const saved = safeGetItem("folioobs_lang", null);
    if (saved) return saved;
    const browserLang = navigator.language || navigator.userLanguage || "ko";
    return browserLang.startsWith("ko") ? "ko" : "en";
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const watchlist = useWatchlist();

  const T = THEMES[theme];
  const L = useMemo(() => createLocaleValue(locale), [locale]);

  // 브라우저 탭 제목 + html lang 속성을 locale에 따라 변경
  useEffect(() => {
    document.title = locale === 'en'
      ? "FolioObs — Wall Street's Eye"
      : "FolioObs — 월가의 눈";
    document.documentElement.lang = locale;
  }, [locale]);

  const toggleTheme = useCallback(() => setTheme(p => p === "dark" ? "light" : "dark"), []);
  const toggleLocale = useCallback(() => {
    setLocale(p => {
      const next = p === "ko" ? "en" : "ko";
      safeSetItem("folioobs_lang", next);
      return next;
    });
  }, []);

  const [screenerSector, setScreenerSector] = useState(null);
  const [scrollTarget, setScrollTarget] = useState(null);
  const [transitioning, setTransitioning] = useState(false);

  const doNavigate = useCallback((target, param, pushState) => {
    setTransitioning(true);
    setTimeout(() => {
      if (target === "investor") {
        // param이 "cathie/daily" 같은 형태면 scrollTarget 분리
        let investorParam = param;
        let section = null;
        if (param && param.includes('/')) {
          const parts = param.split('/');
          investorParam = parts[0];
          section = parts.slice(1).join('/');
        }
        setSelectedInvestor(investorParam); setPage("investor");
        setScrollTarget(section);
        trackInvestorClick(investorParam, pushState === false ? 'deeplink' : 'click');
        trackDetailView(investorParam);
      }
      else if (target === "stock") { setSelectedTicker(param); setPage("stock"); setScrollTarget(null); }
      else if (target === "screener") { setScreenerSector(param || null); setPage("screener"); setScrollTarget(null); }
      else { setSelectedInvestor(null); setSelectedTicker(null); setPage(target); setScrollTarget(null); }
      trackPageView(target, param);
      if (pushState !== false) {
        const url = target === 'dashboard' ? '/' : `/${target}${param ? '/' + param : ''}`;
        window.history.pushState({ page: target, param }, "", url);
      }
      window.scrollTo(0, 0);
      setTransitioning(false);
    }, 120);
  }, []);

  const navigate = useCallback((target, param) => doNavigate(target, param, true), [doNavigate]);
  const goHome = useCallback(() => doNavigate("dashboard", null, true), [doNavigate]);

  // Browser back/forward support
  useEffect(() => {
    const onPop = (e) => {
      const state = e.state;
      if (state && state.page) {
        doNavigate(state.page, state.param, false);
        if (state.page === "investor") setSelectedInvestor(state.param);
        else setSelectedInvestor(null);
      } else {
        setPage("dashboard"); setSelectedInvestor(null);
      }
    };
    window.addEventListener("popstate", onPop);

    // 하위호환: 기존 해시 URL(/#investor/buffett) → 경로 URL(/investor/buffett)로 리다이렉트
    const hash = window.location.hash.replace('#', '');
    if (hash && hash !== '/' && hash !== 'dashboard') {
      const [hp, ...hr] = hash.split('/');
      const hParam = hr.join('/') || null;
      window.history.replaceState({ page: hp, param: hParam }, "", `/${hp}${hParam ? '/' + hParam : ''}`);
      doNavigate(hp, hParam, false);
      return () => window.removeEventListener("popstate", onPop);
    }

    // Parse path for deep linking (e.g. /investor/druckenmiller)
    const initPath = window.location.pathname.replace(/^\//, '');
    if (initPath && initPath !== 'dashboard' && initPath !== '') {
      const [initPage, ...rest] = initPath.split('/');
      const initParam = rest.join('/') || null;
      doNavigate(initPage, initParam, false);
      window.history.replaceState({ page: initPage, param: initParam }, "", `/${initPath}`);
    } else {
      window.history.replaceState({ page: "dashboard", param: null }, "", "/");
    }
    return () => window.removeEventListener("popstate", onPop);
  }, [doNavigate]);

  // 주요 종목 한글명 매핑 (DB name_ko 누락 시 fallback)
  const KO_NAMES = useMemo(() => ({
    AAPL:'애플', MSFT:'마이크로소프트', GOOGL:'알파벳(구글)', GOOG:'알파벳(구글)', AMZN:'아마존', META:'메타(페이스북)',
    NVDA:'엔비디아', TSLA:'테슬라', TSM:'TSMC', AVGO:'브로드컴', BRK:'버크셔해서웨이',
    JPM:'JP모건', V:'비자', MA:'마스터카드', UNH:'유나이티드헬스', JNJ:'존슨앤드존슨',
    WMT:'월마트', PG:'P&G', HD:'홈디포', KO:'코카콜라', PEP:'펩시코',
    COST:'코스트코', ABBV:'애브비', MRK:'머크', PFE:'화이자', TMO:'써모피셔',
    NFLX:'넷플릭스', DIS:'디즈니', CRM:'세일즈포스', AMD:'AMD', INTC:'인텔',
    QCOM:'퀄컴', ADBE:'어도비', ORCL:'오라클', NOW:'서비스나우', SHOP:'쇼피파이',
    SQ:'블록(스퀘어)', COIN:'코인베이스', PLTR:'팔란티어', SNOW:'스노우플레이크', UBER:'우버',
    NKE:'나이키', SBUX:'스타벅스', MCD:'맥도날드', BA:'보잉', CAT:'캐터필러',
    GS:'골드만삭스', MS:'모건스탠리', BAC:'뱅크오브아메리카', C:'씨티그룹', WFC:'웰스파고',
    XOM:'엑슨모빌', CVX:'셰브론', COP:'코노코필립스', OXY:'옥시덴탈페트롤리엄',
    LLY:'일라이릴리', ISRG:'인튜이티브서지컬', ABT:'애보트', AMGN:'암젠', BMY:'브리스톨마이어스',
    SPOT:'스포티파이', DASH:'도어대시', ROKU:'로쿠', HOOD:'로빈후드', NET:'클라우드플레어',
    DDOG:'데이터독', ZS:'지스케일러', CRWD:'크라우드스트라이크', PANW:'팔로알토네트웍스',
    MU:'마이크론', ARCT:'아크투루스', CRH:'CRH', SCHD:'SCHD', XLF:'금융섹터ETF',
    SPY:'S&P500 ETF', QQQ:'나스닥100 ETF', VOO:'뱅가드S&P500', VTI:'뱅가드토탈마켓',
    SOFI:'소파이', ABNB:'에어비앤비', RBLX:'로블록스', U:'유니티', PATH:'유아이패스',
    ARM:'ARM홀딩스', SMCI:'슈퍼마이크로', MRVL:'마벨테크놀로지', ON:'온세미컨덕터',
    GE:'GE에어로스페이스', LMT:'록히드마틴', RTX:'RTX', HON:'하니웰',
    TGT:'타겟', LOW:'로우스', TJX:'TJX', BKNG:'부킹홀딩스', CMG:'치폴레',
    BLK:'블랙록', SCHW:'찰스슈왑', AXP:'아메리칸익스프레스', COF:'캐피탈원',
  }), []);

  // Search results (한글 검색 지원)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { investors: [], tickers: [] };
    const q = searchQuery.toLowerCase();
    const isKoreanQ = /[가-힣]/.test(searchQuery);
    const investors = INVESTORS.filter(inv =>
      inv.nameKo.toLowerCase().includes(q) || inv.name.toLowerCase().includes(q) ||
      inv.fundKo.toLowerCase().includes(q) || inv.id.includes(q)
    );
    const allTickers = new Map();
    INVESTORS.forEach(inv => {
      (HOLDINGS[inv.id] || []).forEach(h => {
        const koFallback = KO_NAMES[h.ticker] || '';
        const matchesTicker = h.ticker.toLowerCase().includes(q);
        const matchesName = h.name.toLowerCase().includes(q);
        const matchesNameEn = h.nameEn && h.nameEn.toLowerCase().includes(q);
        const matchesKoFallback = isKoreanQ && koFallback && koFallback.includes(searchQuery);
        if (matchesTicker || matchesName || matchesNameEn || matchesKoFallback) {
          if (!allTickers.has(h.ticker)) {
            allTickers.set(h.ticker, { ...h, investors: [] });
          }
          const entry = allTickers.get(h.ticker);
          if (!entry.investors.some(i => i.id === inv.id)) entry.investors.push(inv);
        }
      });
    });
    return { investors, tickers: [...allTickers.values()].slice(0, 6) };
  }, [searchQuery, KO_NAMES]);

  // ===== 핫 종목 TOP 5 (검색 홈에서 표시) =====
  const hotStocks = useMemo(() => {
    const TICKER_GROUPS = { 'GOOGL': 'GOOG', 'BRK.B': 'BRK.A', 'BRK/B': 'BRK/A' };
    const normalize = (ticker) => TICKER_GROUPS[ticker] || ticker;
    const map = {};
    INVESTORS.forEach(inv => {
      if (inv.id === 'cathie') return;
      const acts = QUARTERLY_ACTIVITY[inv.id] || [];
      if (!acts.length || !acts[0]?.actions) return;
      acts[0].actions.filter(a => a.type !== 'hold').forEach(a => {
        const key = normalize(a.ticker);
        if (!map[key]) map[key] = { ticker: key, name: a.name, nameEn: a.nameEn, buyInvestors: [], sellInvestors: [] };
        const list = (a.type === 'buy' || a.type === 'new') ? map[key].buyInvestors : map[key].sellInvestors;
        if (!list.find(i => i.id === inv.id)) list.push(inv);
      });
    });
    return Object.values(map)
      .map(s => ({ ...s, totalInvestors: s.buyInvestors.length + s.sellInvestors.length, isBuy: s.buyInvestors.length >= s.sellInvestors.length }))
      .sort((a, b) => b.totalInvestors - a.totalInvestors)
      .slice(0, 5);
  }, [INVESTORS, QUARTERLY_ACTIVITY]);

  // ===== 인기 투자자 (AUM 순) =====
  const popularInvestors = useMemo(() => {
    return [...INVESTORS].sort((a, b) => (b.aum || 0) - (a.aum || 0)).slice(0, 5);
  }, [INVESTORS]);

  const [recentSearches, setRecentSearches] = useState(() => safeGetJSON("folioobs_recent", []));
  const [searchIdx, setSearchIdx] = useState(-1);
  const searchInputRef = useRef(null);

  const addRecent = useCallback((term, type) => {
    setRecentSearches(prev => {
      const next = [{ term, type, ts: Date.now() }, ...prev.filter(r => r.term !== term)].slice(0, 8);
      safeSetItem("folioobs_recent", next);
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecentSearches([]); safeRemoveItem("folioobs_recent");
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault(); setSearchOpen(true); setSearchQuery(""); setSearchIdx(-1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const flatResults = useMemo(() => {
    const items = [];
    searchResults.investors.forEach(inv => items.push({ type: "investor", id: inv.id, inv }));
    searchResults.tickers.forEach(tk => items.push({ type: "ticker", id: tk.ticker, tk }));
    return items;
  }, [searchResults]);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === "Escape") { setSearchOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setSearchIdx(i => Math.min(i + 1, flatResults.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setSearchIdx(i => Math.max(i - 1, -1)); return; }
    if (e.key === "Enter" && searchIdx >= 0 && flatResults[searchIdx]) {
      e.preventDefault();
      const item = flatResults[searchIdx];
      if (item.type === "investor") { addRecent(L.investorName(item.inv), "investor"); navigate("investor", item.id); }
      else { addRecent(item.tk.ticker, "ticker"); navigate("stock", item.tk.ticker); }
      setSearchOpen(false);
    }
  }, [flatResults, searchIdx, navigate, addRecent, L]);

  const watchCount = watchlist.watchInvestors.length + watchlist.watchTickers.length;

  const navItems = [
    { id: "dashboard", label: L.t('common.dashboard'), short: L.t('common.home') },
    { id: "screener", label: L.t('common.screener'), short: L.t('common.stocks') },
    { id: "insider", label: L.t('common.insider'), short: L.t('common.insiderShort') },
    { id: "watchlist", label: L.t('common.watchlist'), short: L.t('common.watch') },
    { id: "compare", label: L.t('common.compare'), short: L.t('common.compare') },
    { id: "insights", label: L.t('common.insights'), short: L.t('common.analysis') },
    { id: "news", label: L.t('common.news'), short: L.t('common.news') },
  ];

  return (
    <LocaleContext.Provider value={L}>
    <ThemeContext.Provider value={T}>
      <SEOHead page={page} investorId={selectedInvestor} ticker={selectedTicker} locale={locale} />
      <div className="min-h-screen transition-colors duration-500" style={{ background: T.bg }}>
        {/* Nav */}
        <nav className="sticky top-0 z-50 transition-colors duration-300" role="navigation" aria-label="Main Navigation" style={{ background: T.navBg, backdropFilter: T.glassBlur, WebkitBackdropFilter: T.glassBlur, borderBottom: `1px solid ${T.glassBorder}` }}>
          <div className="max-w-5xl mx-auto px-4 h-11 flex items-center gap-2">
            {/* Brand - fixed left */}
            <button onClick={goHome} className="flex items-center gap-1.5 shrink-0 hover:opacity-70 transition" aria-label="Home">
              <Eye size={18} style={{ color: T.text }} />
              <span className="font-semibold text-sm" style={{ color: T.text }}>Folio<span style={{ color: '#10B981' }}>Obs</span></span>
            </button>
            {/* Nav items - scrollable on mobile */}
            <div className="flex-1 overflow-x-auto scrollbar-hide min-w-0" role="tablist" style={{ WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              <div className="flex items-center gap-0.5 sm:gap-1 w-max">
                {navItems.map(item => {
                  const active = page === item.id || (item.id === "dashboard" && page === "investor") || (item.id === "screener" && page === "stock");
                  return (
                    <button key={item.id} onClick={() => item.id === "dashboard" ? goHome() : navigate(item.id)}
                      className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap"
                      style={{ color: active ? T.text : T.textMuted }}
                      role="tab" aria-selected={active}>
                      <span className="hidden sm:inline">{item.label}</span>
                      <span className="sm:hidden">{item.short}</span>
                      {item.id === "watchlist" && watchCount > 0 && (
                        <span className="ml-0.5 text-xs" style={{color:T.red}}>{watchCount}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Right actions - fixed right */}
            <div className="flex items-center shrink-0">
              <button onClick={() => { setSearchOpen(true); setSearchQuery(""); setSearchIdx(-1); }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition hover:opacity-70"
                style={{ color: T.textMuted }}>
                <Search size={14} />
                <kbd className="hidden sm:inline text-xs px-1 py-0.5 rounded" style={{background:T.name==='dark'?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.04)', fontSize:'10px'}}>⌘K</kbd>
              </button>
              <LangToggle locale={locale} onToggle={toggleLocale} theme={T.name} />
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>
          </div>
        </nav>

        {/* Fullscreen Search */}
        {searchOpen && (
          <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: T.bg }} role="dialog" aria-modal="true">
            {/* Search Header */}
            <div className="flex-shrink-0" style={{ borderBottom: `1px solid ${T.glassBorder}` }}>
              <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                <button onClick={() => setSearchOpen(false)} className="p-1 rounded-lg transition hover:opacity-70" style={{ color: T.textMuted }}>
                  <X size={20} />
                </button>
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: T.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                  <Search size={16} style={{ color: T.textMuted }} />
                  <input ref={searchInputRef} autoFocus value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setSearchIdx(-1); }}
                    placeholder={L.t('nav.searchPlaceholder')}
                    className="flex-1 bg-transparent outline-none text-sm" style={{ color: T.text }}
                    onKeyDown={handleSearchKeyDown} />
                  {searchQuery && <button onClick={() => setSearchQuery("")} className="p-0.5" style={{ color: T.textMuted }}><X size={14} /></button>}
                </div>
                <kbd className="hidden sm:inline text-xs px-1.5 py-0.5 rounded" style={{ background: T.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: T.textMuted }}>ESC</kbd>
              </div>
            </div>

            {/* Search Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-4 py-4">
                {/* === Search Results (when typing) === */}
                {searchQuery.trim() ? (
                  <div role="listbox">
                    {flatResults.length === 0 && (
                      <div className="py-16 text-center">
                        <Search size={32} style={{ color: T.textMuted, opacity: 0.2 }} className="mx-auto mb-3" />
                        <p className="text-sm" style={{ color: T.textMuted }}>{L.t('nav.noResults')(searchQuery)}</p>
                      </div>
                    )}
                    {searchResults.investors.length > 0 && (
                      <div className="px-1 pt-1 pb-2 flex items-center gap-1.5">
                        <Users size={12} style={{ color: T.textMuted }} />
                        <span className="text-xs font-medium" style={{ color: T.textMuted }}>{L.t('nav.investor')}</span>
                      </div>
                    )}
                    {searchResults.investors.map((inv, idx) => {
                      const isActive = searchIdx === idx;
                      return (
                        <button key={inv.id} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors"
                          style={{ color: T.text, background: isActive ? T.cardRowHover : 'transparent' }}
                          onMouseEnter={() => setSearchIdx(idx)}
                          onClick={() => { addRecent(L.investorName(inv), "investor"); navigate("investor", inv.id); setSearchOpen(false); }}
                          role="option" aria-selected={isActive}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: inv.gradient }}>{inv.avatar}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{L.investorName(inv)}</div>
                            <div className="text-xs mt-0.5" style={{ color: T.textMuted }}>{L.fundName(inv)} · {formatUSD(inv.aum)}</div>
                          </div>
                          <ChevronRight size={14} style={{ color: T.textMuted, opacity: 0.5 }} />
                        </button>
                      );
                    })}
                    {searchResults.tickers.length > 0 && (
                      <div className="px-1 pt-4 pb-2 flex items-center gap-1.5" style={{ borderTop: searchResults.investors.length > 0 ? `1px solid ${T.glassBorder}` : 'none', marginTop: searchResults.investors.length > 0 ? '8px' : 0 }}>
                        <TrendingUp size={12} style={{ color: T.textMuted }} />
                        <span className="text-xs font-medium" style={{ color: T.textMuted }}>{L.t('nav.ticker')}</span>
                      </div>
                    )}
                    {searchResults.tickers.map((tk, i) => {
                      const idx = searchResults.investors.length + i;
                      const isActive = searchIdx === idx;
                      return (
                        <button key={tk.ticker} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors"
                          style={{ color: T.text, background: isActive ? T.cardRowHover : 'transparent' }}
                          onMouseEnter={() => setSearchIdx(idx)}
                          onClick={() => { addRecent(tk.ticker, "ticker"); navigate("stock", tk.ticker); setSearchOpen(false); }}
                          role="option" aria-selected={isActive}>
                          <TickerLogo ticker={tk.ticker} theme={T} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{tk.ticker} <span className="font-normal text-xs" style={{ color: T.textMuted }}>{L.stockName(tk)}</span></div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {tk.investors.slice(0, 3).map(inv => (
                                <span key={inv.id} className="text-xs px-1.5 py-0.5 rounded" style={{ background: T.name === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', color: T.textMuted }}>{L.investorName(inv)}</span>
                              ))}
                            </div>
                          </div>
                          <ChevronRight size={14} style={{ color: T.textMuted, opacity: 0.5 }} />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* === Search Home (no query) === */
                  <div className="space-y-6">
                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} style={{ color: T.textMuted }} />
                            <span className="text-xs font-semibold" style={{ color: T.textMuted }}>{L.t('nav.recentSearches')}</span>
                          </div>
                          <button onClick={clearRecent} className="text-xs hover:opacity-70 transition" style={{ color: T.textMuted }}>{L.t('nav.clear')}</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recentSearches.map((r, i) => (
                            <button key={i} onClick={() => setSearchQuery(r.term)}
                              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-full transition-colors hover:opacity-80"
                              style={{ background: T.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: T.textSecondary }}>
                              {r.type === "investor" ? <Users size={10} /> : <TrendingUp size={10} />}
                              <span>{r.term}</span>
                              <button onClick={(e) => { e.stopPropagation(); setRecentSearches(prev => { const next = prev.filter((_, j) => j !== i); safeSetItem("folioobs_recent", next); return next; }); }}
                                className="ml-0.5 opacity-40 hover:opacity-100 transition"><X size={10} /></button>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Hot Stocks */}
                    {hotStocks.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-3">
                          <Flame size={13} style={{ color: T.accent }} />
                          <span className="text-xs font-semibold" style={{ color: T.textMuted }}>
                            {L.locale === 'ko' ? '핫 종목' : 'Hot Stocks'}
                          </span>
                          {latestQuarter && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: `${T.accent}15`, color: T.accent }}>{latestQuarter}</span>}
                        </div>
                        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.glassBorder}` }}>
                          {hotStocks.map((s, i) => (
                            <button key={s.ticker}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:opacity-80"
                              style={{ background: 'transparent', borderBottom: i < hotStocks.length - 1 ? `1px solid ${T.glassBorder}` : 'none' }}
                              onClick={() => { addRecent(s.ticker, "ticker"); navigate("stock", s.ticker); setSearchOpen(false); }}>
                              <span className="w-5 text-center text-xs font-bold" style={{ color: i < 3 ? T.accent : T.textMuted }}>{i + 1}</span>
                              <TickerLogo ticker={s.ticker} theme={T} />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium" style={{ color: T.text }}>{s.ticker} <span className="font-normal text-xs" style={{ color: T.textMuted }}>{L.stockName(s)}</span></div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {s.buyInvestors.slice(0, 2).map(inv => (
                                    <span key={inv.id} className="text-xs" style={{ color: T.green }}>{inv.avatar}</span>
                                  ))}
                                  {s.sellInvestors.slice(0, 2).map(inv => (
                                    <span key={inv.id} className="text-xs" style={{ color: T.red }}>{inv.avatar}</span>
                                  ))}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-0.5 text-xs font-medium" style={{ color: s.isBuy ? T.green : T.red }}>
                                  {s.isBuy ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                  {L.locale === 'ko'
                                    ? `${s.totalInvestors}명 거래`
                                    : `${s.totalInvestors} traded`}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Popular Investors */}
                    {popularInvestors.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-3">
                          <Star size={13} style={{ color: T.amber || '#f59e0b' }} />
                          <span className="text-xs font-semibold" style={{ color: T.textMuted }}>
                            {L.locale === 'ko' ? '인기 투자자' : 'Popular Investors'}
                          </span>
                        </div>
                        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.glassBorder}` }}>
                          {popularInvestors.map((inv, i) => (
                            <button key={inv.id}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:opacity-80"
                              style={{ background: 'transparent', borderBottom: i < popularInvestors.length - 1 ? `1px solid ${T.glassBorder}` : 'none' }}
                              onClick={() => { addRecent(L.investorName(inv), "investor"); navigate("investor", inv.id); setSearchOpen(false); }}>
                              <span className="w-5 text-center text-xs font-bold" style={{ color: i < 3 ? (T.amber || '#f59e0b') : T.textMuted }}>{i + 1}</span>
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: inv.gradient }}>{inv.avatar}</div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium" style={{ color: T.text }}>{L.investorName(inv)}</div>
                                <div className="text-xs mt-0.5" style={{ color: T.textMuted }}>{L.fundName(inv)}</div>
                              </div>
                              <div className="text-xs font-medium" style={{ color: T.textSecondary }}>{formatUSD(inv.aum)}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Keyboard shortcuts hint */}
                    <div className="flex items-center justify-center gap-4 pt-2 pb-4 text-xs" style={{ color: T.textMuted }}>
                      <span><kbd className="px-1.5 py-0.5 rounded" style={{ background: T.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>↑↓</kbd> {L.t('common.move')}</span>
                      <span><kbd className="px-1.5 py-0.5 rounded" style={{ background: T.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>↵</kbd> {L.t('common.select')}</span>
                      <span><kbd className="px-1.5 py-0.5 rounded" style={{ background: T.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>ESC</kbd> {L.t('common.close')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="max-w-5xl mx-auto px-4 py-6" role="main">
          {dataLoading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${T.accent}40`, borderTopColor: 'transparent' }} />
              <p className="text-sm" style={{ color: T.textMuted }}>{L.t('common.loading')}</p>
              <p className="text-xs" style={{ color: T.textMuted }}>{L.t('common.loadingSub')}</p>
            </div>
          )}
          {!dataLoading && dataError && INVESTORS.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: `${T.red}15` }}>⚠️</div>
              <p className="text-lg font-bold" style={{ color: T.text }}>{L.t('error.loadFailed')}</p>
              <p className="text-sm text-center max-w-md" style={{ color: T.textMuted }}>{L.t('error.connectionFailed')}</p>
              <p className="text-xs font-mono px-3 py-1.5 rounded-lg" style={{ background: `${T.red}10`, color: T.red }}>{dataError}</p>
              <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-80" style={{ background: T.accent }}>
                {L.t('common.retry')}
              </button>
            </div>
          )}
          {!dataLoading && (dataError ? INVESTORS.length > 0 : true) && (
            <ErrorBoundary onReset={goHome} showDetail={true}>
              {dataError && INVESTORS.length > 0 && (
                <div className="mb-4 px-4 py-3 rounded-xl flex items-center gap-3" style={{ background: `${T.amber}10`, border: `1px solid ${T.amber}30` }}>
                  <span className="text-sm">⚠️</span>
                  <p className="text-xs flex-1" style={{ color: T.amber }}>{L.t('error.partialError')}</p>
                </div>
              )}
              <div key={page + (selectedInvestor || '') + (selectedTicker || '')} className={transitioning ? "page-exit" : "page-enter"}>
                {page === "dashboard" && <DashboardPage onNavigate={navigate} watchlist={watchlist} />}
                {page === "investor" && <InvestorDetailPage investorId={selectedInvestor} onBack={goHome} onNavigate={navigate} watchlist={watchlist} scrollTarget={scrollTarget} onScrollTargetClear={() => setScrollTarget(null)} />}
                {page === "stock" && <StockDetailPage ticker={selectedTicker} onBack={goHome} onNavigate={navigate} />}
                {page === "screener" && <ScreenerPage onBack={goHome} onNavigate={navigate} watchlist={watchlist} initialSector={screenerSector} />}
                {page === "watchlist" && <WatchlistPage onBack={goHome} onNavigate={navigate} watchlist={watchlist} />}
                {page === "compare" && <ComparePage onBack={goHome} onNavigate={navigate} />}
                {page === "insights" && <InsightsPage onBack={goHome} onNavigate={navigate} />}
                {page === "insider" && <InsiderTradingPage onBack={goHome} onNavigate={navigate} />}
                {page === "ark-report" && <ArkReportPage onBack={goHome} onNavigate={navigate} />}
                {page === "foliomatch" && <FolioMatchPage onBack={goHome} onNavigate={navigate} watchlist={watchlist} />}
                {page === "news" && <NewsPage onBack={goHome} />}
                {page === "privacy" && <PrivacyPage onBack={goHome} />}
                {page === "terms" && <TermsPage onBack={goHome} />}
              </div>
            </ErrorBoundary>
          )}
        </main>

        <footer className="mt-16 py-8 text-center" style={{ borderTop: `1px solid ${T.glassBorder}` }}>
          <div className="flex items-center justify-center gap-4 mb-3">
            <button
              onClick={() => navigate("privacy")}
              className="text-sm font-semibold hover:underline transition-opacity opacity-80 hover:opacity-100"
              style={{ color: T.textSecondary }}
            >
              {L.t('legal.privacy')}
            </button>
            <span className="text-sm opacity-30" style={{ color: T.textMuted }}>|</span>
            <button
              onClick={() => navigate("terms")}
              className="text-sm font-semibold hover:underline transition-opacity opacity-80 hover:opacity-100"
              style={{ color: T.textSecondary }}
            >
              {L.t('legal.terms')}
            </button>
          </div>
          <p className="text-xs" style={{ color: T.textMuted }}>{L.t('footer')}</p>
          <p className="text-xs mt-1 opacity-50" style={{ color: T.textMuted }}>
            © 2026 PLUSLAB KOREA Co., Ltd.
          </p>
          <p className="text-xs mt-3 opacity-40 leading-relaxed" style={{ color: T.textMuted }}>
            {L.locale === 'ko'
              ? '주식회사 플러스랩코리아 | 대표이사: 강돈희 | 사업자등록번호: 143-87-03402 | 이메일: support@pluslabkorea.com'
              : 'PLUSLAB KOREA Co., Ltd. | CEO: Donhee Kang | Business Reg. No.: 143-87-03402 | Email: support@pluslabkorea.com'}
          </p>
        </footer>
      </div>
    </ThemeContext.Provider>
    </LocaleContext.Provider>
  );
}
