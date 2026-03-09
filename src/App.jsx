import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Eye, Search, X, Clock, TrendingUp, Users, Globe } from "lucide-react";

// Theme & Hooks
import { THEMES, ThemeContext } from "./hooks/useTheme";
import { safeGetItem, safeGetJSON, safeSetItem, safeRemoveItem } from "./utils/storage";
import { useWatchlist } from "./hooks/useWatchlist";
import { DataProvider, useData } from "./hooks/useDataProvider";
import { LocaleContext, createLocaleValue } from "./hooks/useLocale";

// Data
import { formatUSD } from "./utils/format";
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

// ========== MAIN APP ==========
export default function FolioObs() {
  return (
    <DataProvider>
      <FolioObsInner />
    </DataProvider>
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
  const { investors: INVESTORS, holdings: HOLDINGS, loading: dataLoading, error: dataError } = useData();
  const [page, setPage] = useState("dashboard");
  const [selectedInvestor, setSelectedInvestor] = useState(null);
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

  // 브라우저 탭 제목 locale에 따라 변경
  useEffect(() => {
    document.title = locale === 'en'
      ? "FolioObs — Wall Street's Eye"
      : "FolioObs — 월가의 눈";
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
  const [transitioning, setTransitioning] = useState(false);

  const doNavigate = useCallback((target, param, pushState) => {
    setTransitioning(true);
    setTimeout(() => {
      if (target === "investor") {
        setSelectedInvestor(param); setPage("investor");
        trackInvestorClick(param, pushState === false ? 'deeplink' : 'click');
        trackDetailView(param);
      }
      else if (target === "screener") { setScreenerSector(param || null); setPage("screener"); }
      else { setSelectedInvestor(null); setPage(target); }
      trackPageView(target, param);
      if (pushState !== false) {
        window.history.pushState({ page: target, param }, "", `#${target}${param ? '/' + param : ''}`);
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
    // Parse initial hash for deep linking (e.g. #investor/druckenmiller)
    const initHash = window.location.hash.replace('#', '');
    if (initHash && initHash !== 'dashboard') {
      const [initPage, ...rest] = initHash.split('/');
      const initParam = rest.join('/') || null;
      doNavigate(initPage, initParam, false);
      window.history.replaceState({ page: initPage, param: initParam }, "", `#${initHash}`);
    } else {
      window.history.replaceState({ page: "dashboard", param: null }, "", "#dashboard");
    }
    return () => window.removeEventListener("popstate", onPop);
  }, [doNavigate]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { investors: [], tickers: [] };
    const q = searchQuery.toLowerCase();
    const investors = INVESTORS.filter(inv =>
      inv.nameKo.toLowerCase().includes(q) || inv.name.toLowerCase().includes(q) ||
      inv.fundKo.toLowerCase().includes(q) || inv.id.includes(q)
    );
    const allTickers = new Map();
    INVESTORS.forEach(inv => {
      (HOLDINGS[inv.id] || []).forEach(h => {
        if (h.ticker.toLowerCase().includes(q) || h.name.toLowerCase().includes(q)) {
          if (!allTickers.has(h.ticker)) allTickers.set(h.ticker, { ...h, investors: [] });
          const entry = allTickers.get(h.ticker);
          if (!entry.investors.some(i => i.id === inv.id)) entry.investors.push(inv);
        }
      });
    });
    return { investors, tickers: [...allTickers.values()].slice(0, 6) };
  }, [searchQuery]);

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
      else { addRecent(item.tk.ticker, "ticker"); navigate("investor", item.tk.investors[0].id); }
      setSearchOpen(false);
    }
  }, [flatResults, searchIdx, navigate, addRecent, L]);

  const watchCount = watchlist.watchInvestors.length + watchlist.watchTickers.length;

  const navItems = [
    { id: "dashboard", label: L.t('common.dashboard'), short: L.t('common.home') },
    { id: "screener", label: L.t('common.screener'), short: L.t('common.stocks') },
    { id: "watchlist", label: L.t('common.watchlist'), short: L.t('common.watch') },
    { id: "compare", label: L.t('common.compare'), short: L.t('common.compare') },
    { id: "insights", label: L.t('common.insights'), short: L.t('common.analysis') },
  ];

  return (
    <LocaleContext.Provider value={L}>
    <ThemeContext.Provider value={T}>
      <div className="min-h-screen transition-colors duration-500" style={{ background: T.bg }}>
        {/* Nav */}
        <nav className="sticky top-0 z-50 transition-colors duration-300" role="navigation" aria-label="Main Navigation" style={{ background: T.navBg, backdropFilter: T.glassBlur, WebkitBackdropFilter: T.glassBlur, borderBottom: `1px solid ${T.glassBorder}` }}>
          <div className="max-w-5xl mx-auto px-4 h-11 flex items-center justify-between">
            <button onClick={goHome} className="flex items-center gap-2 hover:opacity-70 transition" aria-label="Home">
              <Eye size={18} style={{ color: T.text }} />
              <span className="font-semibold text-sm hidden sm:inline" style={{ color: T.text }}>FolioObs</span>
            </button>
            <div className="flex items-center gap-0.5 sm:gap-1" role="tablist">
              {navItems.map(item => {
                const active = page === item.id || (item.id === "dashboard" && page === "investor");
                return (
                  <button key={item.id} onClick={() => item.id === "dashboard" ? goHome() : navigate(item.id)}
                    className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-all"
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
              <div className="w-px h-4 mx-0.5 sm:mx-1" style={{background:T.glassBorder}} />
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

        {/* Search Overlay */}
        {searchOpen && (
          <div className="fixed inset-0 z-[60]" onClick={() => setSearchOpen(false)} role="dialog" aria-modal="true">
            <div className="absolute inset-0" style={{ background: T.name === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)' }} />
            <div className="relative max-w-lg mx-auto mt-16 px-4" onClick={e => e.stopPropagation()}>
              <div className="rounded-xl overflow-hidden" style={{ background: T.name === 'dark' ? '#1c1c1e' : '#ffffff', border: `1px solid ${T.glassBorder}`, boxShadow: T.name === 'dark' ? '0 16px 48px rgba(0,0,0,0.5)' : '0 16px 48px rgba(0,0,0,0.12)' }}>
                <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${T.glassBorder}` }}>
                  <Search size={16} style={{ color: T.textMuted }} />
                  <input ref={searchInputRef} autoFocus value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setSearchIdx(-1); }}
                    placeholder={L.t('nav.searchPlaceholder')}
                    className="flex-1 bg-transparent outline-none text-sm" style={{ color: T.text }}
                    onKeyDown={handleSearchKeyDown} />
                  {searchQuery && <button onClick={() => setSearchQuery("")} className="p-1" style={{color:T.textMuted}}><X size={14}/></button>}
                  <kbd className="hidden sm:inline text-xs px-1.5 py-0.5 rounded" style={{ background: T.name==='dark'?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.04)', color: T.textMuted }}>ESC</kbd>
                </div>
                {searchQuery.trim() && (
                  <div className="max-h-80 overflow-y-auto" role="listbox">
                    {flatResults.length === 0 && (
                      <div className="px-4 py-8 text-center">
                        <Search size={28} style={{ color: T.textMuted, opacity: 0.3 }} className="mx-auto mb-2" />
                        <p className="text-sm" style={{ color: T.textMuted }}>{L.t('nav.noResults')(searchQuery)}</p>
                      </div>
                    )}
                    {searchResults.investors.length > 0 && (
                      <div className="px-3 pt-2 pb-1 flex items-center gap-1.5"><Users size={12} style={{color:T.textMuted}}/><span className="text-xs font-medium" style={{color:T.textMuted}}>{L.t('nav.investor')}</span></div>
                    )}
                    {searchResults.investors.map((inv, idx) => {
                      const isActive = searchIdx === idx;
                      return (
                        <button key={inv.id} className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                          style={{ color: T.text, background: isActive ? T.cardRowHover : 'transparent' }}
                          onMouseEnter={() => setSearchIdx(idx)}
                          onClick={() => { addRecent(L.investorName(inv), "investor"); navigate("investor", inv.id); setSearchOpen(false); }}
                          role="option" aria-selected={isActive}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{background:inv.gradient}}>{inv.avatar}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{L.investorName(inv)}</div>
                            <div className="text-xs" style={{color:T.textMuted}}>{L.fundName(inv)} · {formatUSD(inv.aum)}</div>
                          </div>
                          {isActive && <span className="text-xs" style={{color:T.textMuted}}>↵</span>}
                        </button>
                      );
                    })}
                    {searchResults.tickers.length > 0 && (
                      <div className="px-3 pt-2 pb-1 flex items-center gap-1.5" style={{borderTop: searchResults.investors.length > 0 ? `1px solid ${T.glassBorder}` : 'none'}}>
                        <TrendingUp size={12} style={{color:T.textMuted}}/><span className="text-xs font-medium" style={{color:T.textMuted}}>{L.t('nav.ticker')}</span>
                      </div>
                    )}
                    {searchResults.tickers.map((tk, i) => {
                      const idx = searchResults.investors.length + i;
                      const isActive = searchIdx === idx;
                      return (
                        <button key={tk.ticker} className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                          style={{ color: T.text, background: isActive ? T.cardRowHover : 'transparent' }}
                          onMouseEnter={() => setSearchIdx(idx)}
                          onClick={() => { addRecent(tk.ticker, "ticker"); navigate("investor", tk.investors[0].id); setSearchOpen(false); }}
                          role="option" aria-selected={isActive}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{background: T.name==='dark'?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.04)', color: T.textSecondary}}>{tk.ticker.slice(0,2)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{tk.ticker} <span className="font-normal text-xs" style={{color:T.textMuted}}>{tk.name}</span></div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {tk.investors.slice(0,3).map(inv => (
                                <span key={inv.id} className="text-xs px-1.5 py-0.5 rounded" style={{background: T.name==='dark'?'rgba(255,255,255,0.04)':'rgba(0,0,0,0.03)', color: T.textMuted}}>{L.investorName(inv)}</span>
                              ))}
                            </div>
                          </div>
                          {isActive && <span className="text-xs" style={{color:T.textMuted}}>↵</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
                {!searchQuery.trim() && (
                  <div className="px-3 py-3">
                    {recentSearches.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between mb-2 px-1">
                          <div className="flex items-center gap-1.5"><Clock size={12} style={{color:T.textMuted}}/><span className="text-xs font-medium" style={{color:T.textMuted}}>{L.t('nav.recentSearches')}</span></div>
                          <button onClick={clearRecent} className="text-xs" style={{color:T.textMuted}}>{L.t('nav.clear')}</button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {recentSearches.map((r, i) => (
                            <button key={i} onClick={() => setSearchQuery(r.term)}
                              className="text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                              style={{ background: T.name==='dark'?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.04)', color: T.textSecondary }}>
                              {r.type === "investor" ? "👤" : "📈"} {r.term}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-xs" style={{ color: T.textMuted }}>{L.t('nav.searchEmpty')}</p>
                      </div>
                    )}
                    <div className="mt-3 pt-2 flex items-center justify-center gap-3 text-xs" style={{ borderTop: `1px solid ${T.glassBorder}`, color: T.textMuted }}>
                      <span><kbd className="px-1 py-0.5 rounded" style={{background:T.name==='dark'?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.04)'}}>↑↓</kbd> {L.t('common.move')}</span>
                      <span><kbd className="px-1 py-0.5 rounded" style={{background:T.name==='dark'?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.04)'}}>↵</kbd> {L.t('common.select')}</span>
                      <span><kbd className="px-1 py-0.5 rounded" style={{background:T.name==='dark'?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.04)'}}>ESC</kbd> {L.t('common.close')}</span>
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
              <div key={page + (selectedInvestor || '')} className={transitioning ? "page-exit" : "page-enter"}>
                {page === "dashboard" && <DashboardPage onNavigate={navigate} watchlist={watchlist} />}
                {page === "investor" && <InvestorDetailPage investorId={selectedInvestor} onBack={goHome} watchlist={watchlist} />}
                {page === "screener" && <ScreenerPage onBack={goHome} onNavigate={navigate} watchlist={watchlist} initialSector={screenerSector} />}
                {page === "watchlist" && <WatchlistPage onBack={goHome} onNavigate={navigate} watchlist={watchlist} />}
                {page === "compare" && <ComparePage onBack={goHome} />}
                {page === "insights" && <InsightsPage onBack={goHome} onNavigate={navigate} />}
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
