import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ArrowLeft, Search, X, Plus, ArrowUpRight, TrendingUp, Users, Trash2, Check, Bell, BellOff, Share2, Bookmark, AlertTriangle, MinusCircle } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useData } from "../hooks/useDataProvider";
import { useLocale } from "../hooks/useLocale";
import { GlassCard } from "../components/shared";
import polygon from "../services/polygon";

// ========== 주요 종목 한글명 매핑 (DB name_ko 누락 시 fallback) ==========
const KO_NAME_MAP = {
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
  NEE:'넥스트에라에너지', SO:'서던컴퍼니', D:'도미니언에너지',
  BLK:'블랙록', SCHW:'찰스슈왑', AXP:'아메리칸익스프레스', COF:'캐피탈원',
};

// ========== FolioMatch 페이지 ==========
// 와이어프레임 v2 기반: 온보딩 → 대시보드 → 알림 피드

export default function FolioMatchPage({ onBack, onNavigate, watchlist }) {
  const t = useTheme();
  const L = useLocale();
  const { investors, holdings, loading: dataLoading, latestQuarter, arkDailyTrades } = useData();
  const isKo = L.locale === 'ko';

  // === 상태 ===
  const [step, setStep] = useState(1); // 1: 온보딩, 2: 대시보드, 3: 알림
  const [myTickers, setMyTickers] = useState([]);
  const [selectedInvestors, setSelectedInvestors] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [inputMethod, setInputMethod] = useState("search"); // "search" | "watchlist"
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // 알림 토글 상태
  const [alerts, setAlerts] = useState({
    myStock: true, newEntry: true, exit: true, weeklyDigest: true, commonSignal: false,
  });
  const [showComingSoon, setShowComingSoon] = useState(false);

  // 초기 투자자 전체 선택
  useEffect(() => {
    if (investors.length > 0 && selectedInvestors.size === 0) {
      setSelectedInvestors(new Set(investors.map(i => i.id)));
    }
  }, [investors]);

  // 모든 투자자 보유 종목 (자동완성용 — 한글명 fallback 포함)
  const allTickers = useMemo(() => {
    const tickerMap = new Map();
    Object.values(holdings).forEach(invHoldings => {
      (invHoldings || []).forEach(h => {
        if (h.ticker && !tickerMap.has(h.ticker)) {
          // DB name_ko가 영문이거나 비어있으면 KO_NAME_MAP에서 가져오기
          const dbNameKo = h.name;
          const isKorean = dbNameKo && /[가-힣]/.test(dbNameKo);
          const koName = isKorean ? dbNameKo : (KO_NAME_MAP[h.ticker] || dbNameKo);
          tickerMap.set(h.ticker, { ticker: h.ticker, name: koName, nameEn: h.nameEn, sector: h.sector });
        }
      });
    });
    return [...tickerMap.values()].sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [holdings]);

  // 종목 검색
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); setShowResults(false); return; }
    setShowResults(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      const q = query.toUpperCase().trim();
      const qLower = query.toLowerCase();
      const isKoreanQuery = /[가-힣]/.test(query);

      // 1. 로컬 holdings 데이터에서 매칭 (티커 + 한글명 + 영문명)
      let local = allTickers.filter(tk =>
        tk.ticker.includes(q) ||
        (tk.name && tk.name.includes(query)) ||
        (tk.nameEn && tk.nameEn.toLowerCase().includes(qLower))
      );

      // 2. 한글 검색일 때 KO_NAME_MAP에서 추가 매칭 (holdings에 없는 종목도)
      if (isKoreanQuery) {
        const mapMatches = Object.entries(KO_NAME_MAP)
          .filter(([ticker, koName]) => koName.includes(query) && !local.find(t => t.ticker === ticker))
          .map(([ticker, koName]) => {
            const existing = allTickers.find(t => t.ticker === ticker);
            return { ticker, name: koName, nameEn: existing?.nameEn || ticker, sector: existing?.sector || '', source: 'local' };
          });
        local = [...local, ...mapMatches];
      }

      if (local.length > 0) {
        setSearchResults(local.slice(0, 8).map(tk => ({ ...tk, source: tk.source || 'local' })));
      } else {
        // 3. Polygon API fallback (영문 검색 시)
        if (!isKoreanQuery) {
          setSearching(true);
          polygon.getTickerDetails(q).then(details => {
            if (details) {
              const koName = KO_NAME_MAP[details.ticker] || details.name;
              setSearchResults([{ ticker: details.ticker, name: koName, nameEn: details.name, sector: details.sic_description || '', source: 'polygon' }]);
            } else setSearchResults([]);
          }).catch(() => setSearchResults([])).finally(() => setSearching(false));
        } else {
          setSearchResults([]);
        }
      }
    }, 200);
  }, [allTickers]);

  const addTicker = useCallback((ticker, name, nameEn) => {
    if (!myTickers.find(t => t.ticker === ticker)) {
      setMyTickers(prev => [...prev, { ticker, name: name || ticker, nameEn: nameEn || name || ticker }]);
    }
    setSearchQuery(""); setSearchResults([]); setShowResults(false);
    inputRef.current?.focus();
  }, [myTickers]);

  const removeTicker = useCallback((ticker) => setMyTickers(prev => prev.filter(t => t.ticker !== ticker)), []);
  const clearAll = useCallback(() => setMyTickers([]), []);

  // Watchlist 연동: 기존 워치리스트에서 종목 불러오기
  const loadWatchlist = useCallback(() => {
    const wTickers = watchlist?.watchTickers || [];
    if (wTickers.length === 0) return;
    const newTickers = [];
    wTickers.forEach(ticker => {
      if (!myTickers.find(t => t.ticker === ticker)) {
        const info = allTickers.find(t => t.ticker === ticker);
        newTickers.push({ ticker, name: info?.name || ticker, nameEn: info?.nameEn || ticker });
      }
    });
    if (newTickers.length > 0) setMyTickers(prev => [...prev, ...newTickers]);
  }, [watchlist, myTickers, allTickers]);

  const toggleInvestor = useCallback((id) => {
    setSelectedInvestors(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // 검색창 외부 클릭
  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // === 겹침 분석 ===
  const matchAnalysis = useMemo(() => {
    if (myTickers.length === 0 || investors.length === 0) return null;
    const myTickerSet = new Set(myTickers.map(t => t.ticker));
    const activeInvestors = investors.filter(inv => selectedInvestors.has(inv.id));
    const results = [];
    const investorMatches = {};
    activeInvestors.forEach(inv => { investorMatches[inv.id] = { investor: inv, tickers: [], totalPct: 0 }; });

    myTickers.forEach(({ ticker, name, nameEn }) => {
      const matched = [];
      activeInvestors.forEach(inv => {
        const found = (holdings[inv.id] || []).find(h => h.ticker === ticker);
        if (found) {
          matched.push({ investor: inv, pct: found.pct, value: found.value, shares: found.shares });
          investorMatches[inv.id].tickers.push(ticker);
          investorMatches[inv.id].totalPct += found.pct;
        }
      });
      const recentArk = (arkDailyTrades || []).filter(t => t.ticker === ticker).sort((a, b) => new Date(b.trade_date) - new Date(a.trade_date))[0];
      results.push({ ticker, name, nameEn, matchedInvestors: matched.sort((a, b) => b.pct - a.pct), matchCount: matched.length, recentArk });
    });

    const investorRanking = Object.values(investorMatches).filter(m => m.tickers.length > 0).sort((a, b) => b.tickers.length - a.tickers.length || b.totalPct - a.totalPct);
    const matchedCount = results.filter(r => r.matchCount > 0).length;
    const overlapRate = myTickers.length > 0 ? Math.round((matchedCount / myTickers.length) * 100) : 0;

    // 레전드만 보유한 종목 (내가 없는데 여러 레전드가 보유)
    const legendOnly = [];
    const legendTickerCount = {};
    activeInvestors.forEach(inv => {
      (holdings[inv.id] || []).forEach(h => {
        if (!myTickerSet.has(h.ticker)) {
          if (!legendTickerCount[h.ticker]) legendTickerCount[h.ticker] = { ticker: h.ticker, name: h.name, nameEn: h.nameEn, investors: [], maxPct: 0 };
          legendTickerCount[h.ticker].investors.push({ investor: inv, pct: h.pct });
          if (h.pct > legendTickerCount[h.ticker].maxPct) legendTickerCount[h.ticker].maxPct = h.pct;
        }
      });
    });
    Object.values(legendTickerCount)
      .filter(x => x.investors.length >= 2)
      .sort((a, b) => b.investors.length - a.investors.length || b.maxPct - a.maxPct)
      .slice(0, 5)
      .forEach(x => legendOnly.push(x));

    return { results: results.sort((a, b) => b.matchCount - a.matchCount), investorRanking, overlapRate, matchedCount, totalInvestors: investorRanking.length, legendOnly };
  }, [myTickers, investors, holdings, arkDailyTrades, selectedInvestors]);

  // 인기 종목
  const popularTickers = useMemo(() => {
    const countMap = {};
    Object.values(holdings).forEach(invH => (invH || []).forEach(h => { if (h.ticker) countMap[h.ticker] = (countMap[h.ticker] || 0) + 1; }));
    return Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([ticker, count]) => {
      const info = allTickers.find(t => t.ticker === ticker);
      return { ticker, name: info?.name || ticker, nameEn: info?.nameEn || ticker, count };
    });
  }, [holdings, allTickers]);

  // 분석 실행
  const runAnalysis = () => { if (myTickers.length > 0 && selectedInvestors.size > 0) setStep(2); };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24">
      {/* 헤더 */}
      <div className="flex items-center gap-3 pt-6 pb-2">
        <button onClick={step === 1 ? onBack : () => setStep(s => s - 1)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
          <ArrowLeft size={16} style={{ color: t.textSecondary }} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(129,140,248,0.15)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="12" r="6" stroke="#818cf8" strokeWidth="1.8" fill="rgba(129,140,248,0.1)"/>
              <circle cx="15" cy="12" r="6" stroke="#a78bfa" strokeWidth="1.8" fill="rgba(167,139,250,0.1)"/>
            </svg>
          </div>
          <span className="text-lg font-bold" style={{ color: t.text }}>FolioMatch</span>
        </div>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-2 mb-5 mt-2 px-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{
                background: step >= s ? (step > s ? 'rgba(48,209,88,0.12)' : 'rgba(129,140,248,0.12)') : 'transparent',
                border: `2px solid ${step >= s ? (step > s ? t.green : '#a78bfa') : t.glassBorder}`,
                color: step >= s ? (step > s ? t.green : '#a78bfa') : t.textMuted,
              }}>
              {step > s ? <Check size={12} /> : s}
            </div>
            {s < 3 && <div className="flex-1 h-0.5 rounded" style={{ background: step > s ? t.green : t.glassBorder }} />}
          </div>
        ))}
      </div>

      {/* ===== STEP 1: 온보딩 ===== */}
      {step === 1 && (
        <div>
          <div className="text-center mb-6">
            <p className="text-xs font-semibold mb-1.5" style={{ color: '#a78bfa', letterSpacing: '0.05em' }}>FOLIOMATCH</p>
            <h1 className="text-xl font-bold mb-1.5" style={{ color: t.text, letterSpacing: '-0.02em' }}>
              {isKo ? '내 보유 종목, 월가 레전드가 같이 들고 있을까?' : 'Do Wall Street legends hold the same stocks?'}
            </h1>
            <p className="text-xs" style={{ color: t.textMuted }}>
              {isKo ? '종목을 입력하면 버핏·캐시우드·달리오 등과의 겹침을 분석합니다' : 'Enter stocks to analyze overlap with legendary investors'}
            </p>
          </div>

          {/* 입력 방식 */}
          <GlassCard className="p-4 mb-3">
            <div className="text-sm font-semibold mb-1" style={{ color: t.text }}>{isKo ? '입력 방식' : 'Input method'}</div>
            <div className="text-[11px] mb-3" style={{ color: t.textMuted }}>{isKo ? '편한 방법을 선택하세요' : 'Choose your preferred method'}</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'search', icon: <Search size={16} />, color: '#a78bfa', label: isKo ? '종목 검색' : 'Search stocks', desc: isKo ? '직접 검색해서 추가' : 'Search and add manually' },
                { id: 'watchlist', icon: <Bookmark size={16} />, color: '#fbbf24', label: isKo ? 'Watchlist 연동' : 'Watchlist sync', desc: (watchlist?.watchTickers?.length > 0) ? (isKo ? `${watchlist.watchTickers.length}개 종목 불러오기` : `Import ${watchlist.watchTickers.length} stocks`) : (isKo ? '워치리스트가 비어있어요' : 'Watchlist is empty') },
              ].map(m => (
                <button key={m.id}
                  className="flex flex-col items-center gap-1.5 p-4 rounded-xl text-center transition-all"
                  style={{
                    background: inputMethod === m.id ? `rgba(129,140,248,0.06)` : 'transparent',
                    border: `1px solid ${inputMethod === m.id ? '#a78bfa' : t.glassBorder}`,
                  }}
                  onClick={() => {
                    setInputMethod(m.id);
                    if (m.id === 'watchlist') loadWatchlist();
                  }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: `${m.color}15`, color: m.color }}>{m.icon}</div>
                  <div className="text-xs font-semibold" style={{ color: t.text }}>{m.label}</div>
                  <div className="text-[10px]" style={{ color: t.textMuted }}>{m.desc}</div>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* 종목 검색 */}
          <GlassCard className="p-4 mb-3">
            <div className="text-sm font-semibold mb-2.5" style={{ color: t.text }}>{isKo ? '종목 추가' : 'Add stocks'}</div>
            <div ref={searchRef} className="relative mb-2">
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${t.glassBorder}` }}>
                <Search size={14} style={{ color: t.textMuted }} />
                <input ref={inputRef} type="text" value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  onFocus={() => { if (searchQuery.trim()) setShowResults(true); }}
                  placeholder={isKo ? "종목명 또는 티커 검색 (예: AAPL, 테슬라)" : "Search ticker or name (e.g. AAPL, Tesla)"}
                  className="flex-1 bg-transparent outline-none text-sm" style={{ color: t.text }}
                  onKeyDown={e => { if (e.key === 'Enter' && searchResults.length > 0) addTicker(searchResults[0].ticker, searchResults[0].name, searchResults[0].nameEn); }} />
                {searchQuery && <button onClick={() => { setSearchQuery(""); setSearchResults([]); setShowResults(false); }}><X size={14} style={{ color: t.textMuted }} /></button>}
              </div>

              {/* 검색 드롭다운 */}
              {showResults && (searchResults.length > 0 || searching) && (
                <div className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-50 shadow-xl"
                  style={{ background: t.name === 'dark' ? '#1c1c1e' : '#fff', border: `1px solid ${t.glassBorder}` }}>
                  {searching && <div className="px-3 py-2 text-xs" style={{ color: t.textMuted }}>{isKo ? '검색 중...' : 'Searching...'}</div>}
                  {searchResults.map(result => {
                    const added = myTickers.some(tk => tk.ticker === result.ticker);
                    return (
                      <button key={result.ticker} className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                        style={{ borderBottom: `1px solid ${t.name === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}
                        onMouseEnter={e => e.currentTarget.style.background = t.name === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        disabled={added} onClick={() => !added && addTicker(result.ticker, result.name, result.nameEn)}>
                        <span className="text-xs font-bold w-14 shrink-0" style={{ color: '#a78bfa' }}>{result.ticker}</span>
                        <span className="text-xs truncate flex-1" style={{ color: t.textSecondary }}>{isKo ? result.name : result.nameEn}</span>
                        {added ? <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: t.textMuted, background: 'rgba(129,140,248,0.08)' }}>{isKo ? '추가됨' : 'Added'}</span> : <Plus size={14} style={{ color: '#a78bfa' }} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 추가된 종목 칩 */}
            {myTickers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {myTickers.map(({ ticker }) => (
                  <span key={ticker} className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                    style={{ background: 'rgba(129,140,248,0.1)', color: '#a78bfa', border: '1px solid rgba(129,140,248,0.15)' }}>
                    {ticker}
                    <button onClick={() => removeTicker(ticker)} className="hover:opacity-70"><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: t.textMuted }}>{myTickers.length}{isKo ? '개 종목' : ' stocks'}</span>
              {myTickers.length > 0 && <button onClick={clearAll} className="text-xs" style={{ color: '#a78bfa' }}>{isKo ? '전체 삭제' : 'Clear all'}</button>}
            </div>

            {/* 인기 종목 */}
            {myTickers.length === 0 && !dataLoading && (
              <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${t.glassBorder}` }}>
                <p className="text-[10px] font-medium mb-2" style={{ color: t.textMuted }}>{isKo ? '레전드들이 많이 보유한 종목' : 'Popular among legends'}</p>
                <div className="flex flex-wrap gap-1.5">
                  {popularTickers.slice(0, 8).map(({ ticker, name, nameEn, count }) => (
                    <button key={ticker} className="text-[11px] px-2.5 py-1.5 rounded-lg transition-all"
                      style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${t.glassBorder}`, color: t.text }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(129,140,248,0.3)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = t.glassBorder; }}
                      onClick={() => addTicker(ticker, name, nameEn)}>
                      <span className="font-semibold" style={{ color: '#a78bfa' }}>{ticker}</span>
                      <span className="ml-1" style={{ color: t.textMuted }}>{count}{isKo ? '명' : ''}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>

          {/* 비교할 투자자 선택 */}
          <GlassCard className="p-4 mb-4">
            <div className="text-sm font-semibold mb-1" style={{ color: t.text }}>{isKo ? '비교할 투자자' : 'Compare with'}</div>
            <div className="text-[11px] mb-3" style={{ color: t.textMuted }}>{isKo ? '겹침을 분석할 레전드를 선택하세요 (복수 선택)' : 'Select legends to analyze overlap'}</div>
            <div className="grid grid-cols-2 gap-2">
              {investors.map(inv => {
                const selected = selectedInvestors.has(inv.id);
                return (
                  <button key={inv.id}
                    className="flex items-center gap-2 p-2.5 rounded-xl text-left transition-all"
                    style={{
                      border: `1px solid ${selected ? '#a78bfa' : t.glassBorder}`,
                      background: selected ? 'rgba(129,140,248,0.05)' : 'transparent',
                    }}
                    onClick={() => toggleInvestor(inv.id)}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ background: inv.gradient }}>{inv.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color: t.text }}>{isKo ? inv.nameKo : inv.name}</div>
                      <div className="text-[10px] truncate" style={{ color: t.textMuted }}>{isKo ? inv.fundKo : inv.fund}</div>
                    </div>
                    {selected && <Check size={14} style={{ color: '#a78bfa' }} />}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-center mt-2.5" style={{ color: t.textMuted }}>
              {selectedInvestors.size}{isKo ? '명 선택됨' : ' selected'}
            </p>
          </GlassCard>

          {/* 분석 시작 버튼 */}
          <div className="flex gap-2.5 justify-center">
            <button className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: myTickers.length > 0 ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : t.glassBorder,
                color: myTickers.length > 0 ? 'white' : t.textMuted,
                opacity: myTickers.length > 0 ? 1 : 0.5,
              }}
              disabled={myTickers.length === 0}
              onClick={runAnalysis}>
              {isKo ? '겹침 분석 시작' : 'Start analysis'} <ArrowUpRight size={14} className="inline ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* ===== STEP 2: 대시보드 ===== */}
      {step === 2 && matchAnalysis && (
        <div className="space-y-3">
          {/* 전체 겹침률 링 */}
          <GlassCard className="p-5 text-center" hover={false}>
            <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full mb-4"
              style={{ background: 'rgba(129,140,248,0.12)', color: '#a78bfa' }}>
              {isKo ? '분석 완료' : 'Analysis complete'}
            </span>
            <div className="mx-auto mb-3" style={{
              width: 110, height: 110, borderRadius: '50%', padding: 4,
              background: `conic-gradient(#a78bfa 0deg, #a78bfa ${matchAnalysis.overlapRate * 3.6}deg, ${t.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} ${matchAnalysis.overlapRate * 3.6}deg)`,
            }}>
              <div className="w-full h-full rounded-full flex flex-col items-center justify-center" style={{ background: t.name === 'dark' ? '#000' : '#fff' }}>
                <div className="text-3xl font-extrabold" style={{ color: '#a78bfa' }}>{matchAnalysis.overlapRate}%</div>
                <div className="text-[10px]" style={{ color: t.textMuted }}>{isKo ? '전체 겹침률' : 'Overlap rate'}</div>
              </div>
            </div>
            <p className="text-[13px]" style={{ color: t.textSecondary, lineHeight: 1.6 }}>
              {isKo
                ? <>{isKo ? '내' : 'My'} <strong style={{ color: t.text }}>{myTickers.length}개 종목</strong> 중 <strong style={{ color: '#a78bfa' }}>{matchAnalysis.matchedCount}개</strong>가 레전드 투자자와 겹칩니다</>
                : <><strong style={{ color: '#a78bfa' }}>{matchAnalysis.matchedCount}</strong> of your <strong style={{ color: t.text }}>{myTickers.length} stocks</strong> overlap with legends</>}
            </p>
          </GlassCard>

          {/* 투자자별 매칭률 */}
          <GlassCard className="p-4" hover={false}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-bold" style={{ color: t.text }}>{isKo ? '투자자별 매칭률' : 'Investor match rate'}</div>
                <div className="text-[11px]" style={{ color: t.textMuted }}>{isKo ? '내 포트폴리오와 겹치는 비율' : 'Overlap with your portfolio'}</div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(129,140,248,0.12)', color: '#a78bfa' }}>
                {matchAnalysis.totalInvestors}{isKo ? '명 매칭' : ' matched'}
              </span>
            </div>
            {matchAnalysis.investorRanking.map(({ investor, tickers }) => {
              const matchRate = Math.round((tickers.length / myTickers.length) * 100);
              return (
                <button key={investor.id}
                  className="w-full flex items-center gap-3 py-2.5 transition-colors"
                  style={{ borderBottom: `1px solid ${t.name === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}
                  onClick={() => onNavigate("investor", investor.id)}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: investor.gradient }}>{investor.avatar}</div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-[13px] font-semibold" style={{ color: t.text }}>{isKo ? investor.nameKo : investor.name}</div>
                    <div className="text-[11px]" style={{ color: t.textMuted }}>
                      {tickers.join(', ')} {isKo ? '겹침' : 'overlap'}
                    </div>
                  </div>
                  <div className="w-20 h-1.5 rounded-full overflow-hidden shrink-0" style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: `${matchRate}%`, background: matchRate > 40 ? t.green : matchRate > 20 ? '#a78bfa' : t.accent }} />
                  </div>
                  <div className="text-sm font-bold w-10 text-right shrink-0" style={{ color: matchRate > 40 ? t.green : matchRate > 20 ? '#a78bfa' : t.accent }}>
                    {matchRate}%
                  </div>
                </button>
              );
            })}
            {matchAnalysis.investorRanking.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: t.textMuted }}>{isKo ? '겹치는 투자자가 없습니다' : 'No matching investors'}</p>
            )}
          </GlassCard>

          {/* 겹치는 종목 */}
          {matchAnalysis.results.filter(r => r.matchCount > 0).length > 0 && (
            <GlassCard className="p-4" hover={false}>
              <div className="text-sm font-bold mb-3" style={{ color: t.text }}>{isKo ? '겹치는 종목' : 'Overlapping stocks'}</div>
              {matchAnalysis.results.filter(r => r.matchCount > 0).map(({ ticker, name, nameEn, matchedInvestors, recentArk }) => (
                <button key={ticker}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-2 transition-all text-left"
                  style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${t.name === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}
                  onClick={() => onNavigate("stock", ticker)}>
                  <div className="text-[13px] font-bold w-12 shrink-0" style={{ color: t.text }}>{ticker}</div>
                  <div className="text-[11px] flex-1 truncate" style={{ color: t.textSecondary }}>{isKo ? name : nameEn}</div>
                  <div className="flex shrink-0">
                    {matchedInvestors.slice(0, 4).map(({ investor }) => (
                      <div key={investor.id} className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[7px] font-bold -ml-0.5 first:ml-0"
                        style={{ background: investor.gradient, border: `2px solid ${t.name === 'dark' ? '#000' : '#fff'}` }}>{investor.avatar}</div>
                    ))}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: 'rgba(48,209,88,0.12)', color: t.green }}>
                    {matchedInvestors.length}{isKo ? '명' : ''}
                  </span>
                </button>
              ))}
            </GlassCard>
          )}

          {/* 레전드만 보유한 종목 */}
          {matchAnalysis.legendOnly.length > 0 && (
            <GlassCard className="p-4" hover={false}>
              <div className="text-sm font-bold mb-0.5" style={{ color: t.text }}>{isKo ? '레전드만 보유한 종목' : 'Legend-only stocks'}</div>
              <div className="text-[11px] mb-3" style={{ color: t.textMuted }}>{isKo ? '당신은 없지만 레전드가 주목하는 종목' : 'Stocks legends hold but you don\'t'}</div>
              {matchAnalysis.legendOnly.map(({ ticker, name, nameEn, investors: invs, maxPct }) => (
                <button key={ticker}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-2 transition-all text-left"
                  style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderLeft: `3px solid #a78bfa`, border: `1px solid ${t.name === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`, borderLeftWidth: 3, borderLeftColor: '#a78bfa' }}
                  onClick={() => onNavigate("stock", ticker)}>
                  <div className="text-[13px] font-bold w-12 shrink-0" style={{ color: t.text }}>{ticker}</div>
                  <div className="text-[11px] flex-1 truncate" style={{ color: t.textSecondary }}>{isKo ? name : nameEn}</div>
                  <div className="flex shrink-0">
                    {invs.slice(0, 3).map(({ investor }) => (
                      <div key={investor.id} className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[7px] font-bold -ml-0.5 first:ml-0"
                        style={{ background: investor.gradient, border: `2px solid ${t.name === 'dark' ? '#000' : '#fff'}` }}>{investor.avatar}</div>
                    ))}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: 'rgba(129,140,248,0.12)', color: '#a78bfa' }}>
                    {invs.length}{isKo ? '명 보유' : ' hold'}
                  </span>
                </button>
              ))}
            </GlassCard>
          )}

          {/* 겹치지 않는 내 종목 */}
          {matchAnalysis.results.filter(r => r.matchCount === 0).length > 0 && (
            <GlassCard className="p-4" hover={false}>
              <div className="text-sm font-bold mb-2" style={{ color: t.text }}>{isKo ? '레전드가 보유하지 않는 내 종목' : 'Stocks no legend holds'}</div>
              <div className="flex flex-wrap gap-1.5">
                {matchAnalysis.results.filter(r => r.matchCount === 0).map(({ ticker }) => (
                  <span key={ticker} className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg"
                    style={{ background: `rgba(255,69,58,0.06)`, color: t.red, border: `1px solid rgba(255,69,58,0.1)` }}>{ticker}</span>
                ))}
              </div>
            </GlassCard>
          )}

          <div className="flex justify-center pt-2">
            <button className="px-6 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}
              onClick={() => setShowComingSoon(true)}>
              {isKo ? '알림 설정' : 'Alert settings'} <ArrowUpRight size={14} className="inline ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* ===== STEP 3: 알림 피드 ===== */}
      {step === 3 && (
        <div className="space-y-3">
          <div>
            <div className="text-base font-bold" style={{ color: t.text }}>{isKo ? 'FolioMatch 알림' : 'FolioMatch Alerts'}</div>
            <div className="text-xs mb-4" style={{ color: t.textMuted }}>{isKo ? '내 포트폴리오 x 레전드 투자자 변화 추적' : 'Track legend investor changes vs your portfolio'}</div>
          </div>

          {/* 주간 다이제스트 미리보기 */}
          <div className="rounded-2xl p-4" style={{ background: t.surface, border: '1px solid rgba(129,140,248,0.15)' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-bold" style={{ color: t.text }}>{isKo ? '주간 다이제스트' : 'Weekly Digest'}</div>
                <div className="text-[11px]" style={{ color: t.textMuted }}>3/14 ~ 3/20</div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(129,140,248,0.12)', color: '#a78bfa' }}>
                {isKo ? '미리보기' : 'Preview'}
              </span>
            </div>
            {[
              { num: '3', color: '#a78bfa', title: isKo ? '겹치는 종목 변동' : 'Overlap changes', desc: isKo ? 'AAPL 축소, AMZN 추가매수, MSFT 유지' : 'AAPL reduced, AMZN added, MSFT held' },
              { num: '2', color: t.green, title: isKo ? '신규 주목 종목' : 'New notable stocks', desc: isKo ? 'Cathie Wood ARCT 매수, NPS CRH 신규' : 'Cathie Wood bought ARCT, NPS new CRH' },
              { num: '1', color: t.red, title: isKo ? '위험 신호' : 'Risk signals', desc: isKo ? 'META: 4명 레전드 동시 전량 매도' : 'META: 4 legends sold all positions' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1.5">
                <div className="text-lg font-bold w-6 text-center" style={{ color: item.color }}>{item.num}</div>
                <div>
                  <div className="text-xs font-medium" style={{ color: t.text }}>{item.title}</div>
                  <div className="text-[10px]" style={{ color: t.textMuted }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 알림 피드 샘플 */}
          {[
            {
              icon: <X size={14} />, iconBg: 'rgba(255,69,58,0.12)', iconColor: t.red,
              title: isKo ? 'META — 4명 전량 매도' : 'META — 4 legends sold all', badge: 'EXIT', badgeColor: t.red,
              desc: isKo ? '4명 동시 청산은 최근 2년간 3번째' : '4 simultaneous exits, 3rd time in 2 years',
              tag: 'META -100%', tagColor: t.red, time: isKo ? '3시간 전 · 13F' : '3h ago · 13F',
              avatars: matchAnalysis?.investorRanking?.slice(0, 4).map(r => r.investor) || investors.slice(0, 4),
            },
            {
              icon: <MinusCircle size={14} />, iconBg: 'rgba(251,191,36,0.12)', iconColor: '#fbbf24',
              title: isKo ? 'AAPL — 버핏 비중 축소' : 'AAPL — Buffett reduced', badge: 'REDUCE', badgeColor: '#fbbf24',
              desc: isKo ? '비중 71.5% → 68.2%. 3분기 연속 축소이나 여전히 포트 #1' : 'Weight 71.5% → 68.2%, 3 quarters declining but still #1',
              tag: 'AAPL -3.3%p', tagColor: '#fbbf24', time: isKo ? '1일 전 · 13F' : '1d ago · 13F',
              avatars: investors.filter(i => i.id === 'buffett').slice(0, 1),
            },
            {
              icon: <Plus size={14} />, iconBg: 'rgba(48,209,88,0.12)', iconColor: t.green,
              title: isKo ? 'CRH — 5명 신규 매수' : 'CRH — 5 new buys', badge: 'NEW', badgeColor: t.green,
              desc: isKo ? '인프라 투자 테마 관련 공통 신호' : 'Infrastructure investment common signal',
              tag: isKo ? 'CRH 신규' : 'CRH new', tagColor: t.green, time: isKo ? '2일 전 · 13F' : '2d ago · 13F',
              avatars: investors.slice(0, 3),
            },
          ].map((alert, i) => (
            <div key={i} className="rounded-2xl p-4 transition-all" style={{ background: t.surface, border: `1px solid ${t.glassBorder}` }}>
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: alert.iconBg, color: alert.iconColor }}>{alert.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold" style={{ color: t.text }}>{alert.title}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${alert.badgeColor}20`, color: alert.badgeColor }}>{alert.badge}</span>
                  </div>
                  <div className="text-[10px]" style={{ color: t.textMuted }}>{alert.time}</div>
                </div>
              </div>
              <div className="text-xs rounded-lg px-3 py-2.5 mb-2" style={{ color: t.textSecondary, background: t.name === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', lineHeight: 1.6 }}>
                {alert.desc}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ background: `${alert.tagColor}18`, color: alert.tagColor }}>{alert.tag}</span>
                <div className="flex ml-auto">
                  {alert.avatars.map(inv => (
                    <div key={inv.id} className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[7px] font-bold -ml-0.5 first:ml-0"
                      style={{ background: inv.gradient, border: `2px solid ${t.name === 'dark' ? t.surface : '#fff'}` }}>{inv.avatar}</div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* 알림 설정 */}
          <GlassCard className="p-4" hover={false}>
            <div className="text-sm font-semibold mb-1" style={{ color: t.text }}>{isKo ? '알림 설정' : 'Notification settings'}</div>
            <div className="text-[11px] mb-3" style={{ color: t.textMuted }}>{isKo ? '어떤 변화를 받아볼지 선택' : 'Choose what changes to track'}</div>
            {[
              { key: 'myStock', label: isKo ? '내 종목 변동' : 'My stock changes', desc: isKo ? '레전드가 내 보유종목 매수/매도 시' : 'When legends buy/sell your stocks' },
              { key: 'newEntry', label: isKo ? '신규 진입 (NEW)' : 'New entries', desc: isKo ? '추적 투자자가 새 종목 매수 시' : 'When tracked investors buy new stocks' },
              { key: 'exit', label: isKo ? '전량 매도 (EXIT)' : 'Full exits', desc: isKo ? '추적 투자자가 종목 완전 청산 시' : 'When tracked investors fully exit' },
              { key: 'weeklyDigest', label: isKo ? '주간 다이제스트' : 'Weekly digest', desc: isKo ? '매주 월요일 아침 이메일' : 'Weekly email every Monday' },
              { key: 'commonSignal', label: isKo ? '공통 신호' : 'Common signals', desc: isKo ? '3명 이상 동시 매수/매도 시' : 'When 3+ buy/sell simultaneously' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-2.5"
                style={{ borderBottom: `1px solid ${t.name === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                <div>
                  <div className="text-xs font-medium" style={{ color: t.text }}>{label}</div>
                  <div className="text-[10px]" style={{ color: t.textMuted }}>{desc}</div>
                </div>
                <button className="w-9 h-5 rounded-full relative transition-colors shrink-0"
                  style={{ background: alerts[key] ? '#a78bfa' : (t.name === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') }}
                  onClick={() => setAlerts(prev => ({ ...prev, [key]: !prev[key] }))}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ left: alerts[key] ? 18 : 2 }} />
                </button>
              </div>
            ))}
          </GlassCard>

          {/* 회원가입 안내 배너 */}
          <div className="rounded-2xl p-4 text-center"
            style={{ background: t.name === 'dark' ? 'rgba(129,140,248,0.06)' : 'rgba(99,102,241,0.04)', border: '1px dashed rgba(129,140,248,0.2)' }}>
            <Bell size={20} className="mx-auto mb-2" style={{ color: '#a78bfa' }} />
            <p className="text-sm font-semibold mb-1" style={{ color: t.text }}>
              {isKo ? '알림 기능은 추후 서비스 예정입니다' : 'Alert features coming soon'}
            </p>
            <p className="text-[11px] mb-3" style={{ color: t.textMuted }}>
              {isKo ? '회원가입 후 실시간 알림과 주간 다이제스트를 받아보실 수 있습니다' : 'Sign up to receive real-time alerts and weekly digests'}
            </p>
            <button className="px-5 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: 'rgba(129,140,248,0.12)', color: '#a78bfa', border: '1px solid rgba(129,140,248,0.2)' }}>
              {isKo ? '출시 알림 받기' : 'Notify me at launch'}
            </button>
          </div>
        </div>
      )}

      {/* 데이터 로딩 */}
      {dataLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#a78bfa', borderTopColor: 'transparent' }} />
          <span className="ml-2 text-sm" style={{ color: t.textSecondary }}>{isKo ? '투자자 데이터 로딩 중...' : 'Loading investor data...'}</span>
        </div>
      )}

      {/* 하단 데이터 기준 */}
      {latestQuarter && step > 1 && (
        <div className="mt-6 text-center">
          <p className="text-[10px]" style={{ color: t.textMuted }}>
            {isKo ? `${latestQuarter} 13F SEC 공시 기준 · ARK 일일 매매 포함` : `Based on ${latestQuarter} 13F SEC filings · Includes ARK daily trades`}
          </p>
        </div>
      )}
      {/* 추후 서비스 모달 */}
      {showComingSoon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.6)'}} onClick={() => setShowComingSoon(false)}>
          <div className="rounded-2xl p-6 max-w-sm w-full text-center" style={{background:t.name==='dark'?'#1c1c1e':'#fff', border:`1px solid ${t.name==='dark'?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)'}`}} onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{background:'rgba(139,92,246,0.12)'}}>
              <Bell size={22} style={{color:'#a78bfa'}} />
            </div>
            <div className="text-base font-bold mb-1.5" style={{color:t.text}}>
              {isKo ? '추후 서비스 예정' : 'Coming Soon'}
            </div>
            <p className="text-sm mb-4" style={{color:t.textSecondary}}>
              {isKo ? '알림 기능은 현재 준비 중입니다. 빠르게 찾아뵙겠습니다!' : 'Alert feature is currently being prepared. Stay tuned!'}
            </p>
            <button className="px-5 py-2 rounded-xl text-sm font-semibold"
              style={{background:'rgba(139,92,246,0.15)', color:'#a78bfa'}}
              onClick={() => setShowComingSoon(false)}>
              {isKo ? '확인' : 'OK'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
