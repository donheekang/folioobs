import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ArrowLeft, TrendingUp, TrendingDown, Building2, Globe, Users, BarChart3,
  ArrowUpRight, ArrowDownRight, ExternalLink, Minus
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useLocale } from "../hooks/useLocale";
import { useData } from "../hooks/useDataProvider";
import { formatUSD } from "../utils/format";
import { GlassCard } from "../components/shared";
import polygon from "../services/polygon";

// ========== CHART COMPONENT (lightweight inline) ==========
const RANGES = ['1D', '1W', '1M', '3M', '1Y', '5Y'];

function StockChart({ ticker, theme }) {
  const canvasRef = useRef(null);
  const [range, setRange] = useState('1Y');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    polygon.getChartData(ticker, range)
      .then(bars => { if (!cancelled) { setChartData(bars || []); setLoading(false); } })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [ticker, range]);

  // Draw chart on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || chartData.length === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    const closes = chartData.map(b => b.c);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const pad = (max - min) * 0.08 || 1;

    const isUp = closes[closes.length - 1] >= closes[0];
    const lineColor = isUp ? '#22c55e' : '#ef4444';
    const fillColor = isUp ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)';

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (H / 4) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Area fill
    ctx.beginPath();
    chartData.forEach((bar, i) => {
      const x = (i / (chartData.length - 1)) * W;
      const y = H - ((bar.c - min + pad) / (max - min + pad * 2)) * H;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Line
    ctx.beginPath();
    chartData.forEach((bar, i) => {
      const x = (i / (chartData.length - 1)) * W;
      const y = H - ((bar.c - min + pad) / (max - min + pad * 2)) * H;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [chartData, theme]);

  // Hover handler
  const handleCanvasMove = useCallback((e) => {
    if (chartData.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.round((x / rect.width) * (chartData.length - 1));
    if (idx >= 0 && idx < chartData.length) {
      const bar = chartData[idx];
      const d = new Date(bar.t);
      setHoverInfo({
        price: bar.c,
        date: d.toLocaleDateString(),
        volume: bar.v,
        open: bar.o,
        high: bar.h,
        low: bar.l,
      });
    }
  }, [chartData]);

  const isDark = theme === 'dark';

  return (
    <div>
      {/* Hover info */}
      <div className="h-6 mb-2">
        {hoverInfo && (
          <div className="flex items-center gap-3 text-xs" style={{ color: isDark ? '#aaa' : '#666' }}>
            <span>{hoverInfo.date}</span>
            <span>O: ${hoverInfo.open?.toFixed(2)}</span>
            <span>H: ${hoverInfo.high?.toFixed(2)}</span>
            <span>L: ${hoverInfo.low?.toFixed(2)}</span>
            <span className="font-bold" style={{ color: isDark ? '#fff' : '#000' }}>C: ${hoverInfo.price?.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="relative w-full rounded-xl overflow-hidden" style={{ height: '280px', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: 'transparent' }} />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs" style={{ color: isDark ? '#888' : '#999' }}>차트 로딩 실패</p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseMove={handleCanvasMove}
          onMouseLeave={() => setHoverInfo(null)}
        />
      </div>

      {/* Range tabs */}
      <div className="flex items-center justify-center gap-1 mt-3">
        {RANGES.map(r => (
          <button key={r}
            onClick={() => setRange(r)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: range === r ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)') : 'transparent',
              color: range === r ? (isDark ? '#fff' : '#000') : (isDark ? '#888' : '#999'),
            }}>
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

// ========== MAIN PAGE ==========
const StockDetailPage = ({ ticker: initialTicker, onBack, onNavigate }) => {
  const t = useTheme();
  const L = useLocale();
  const { investors: INVESTORS, holdings: HOLDINGS, quarterlyActivity: QUARTERLY_ACTIVITY } = useData();

  const ticker = initialTicker?.toUpperCase();

  // ---- Polygon data ----
  const [details, setDetails] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  useEffect(() => {
    if (!ticker) return;
    setLoadingInfo(true);
    Promise.allSettled([
      polygon.getTickerDetails(ticker),
      polygon.getSnapshot(ticker),
    ]).then(([detailRes, snapRes]) => {
      if (detailRes.status === 'fulfilled') setDetails(detailRes.value);
      if (snapRes.status === 'fulfilled') setSnapshot(snapRes.value);
      setLoadingInfo(false);
    });
  }, [ticker]);

  // ---- FolioObs data: 이 종목을 보유한 투자자들 ----
  const stockHolders = useMemo(() => {
    const holders = [];
    INVESTORS.forEach(inv => {
      const invHoldings = HOLDINGS[inv.id] || [];
      const match = invHoldings.filter(h => h.ticker === ticker);
      if (match.length > 0) {
        const totalValue = match.reduce((s, h) => s + h.value, 0);
        const totalPct = match.reduce((s, h) => s + h.pct, 0);
        const totalShares = match.reduce((s, h) => s + h.shares, 0);

        // 이번 분기 매매 내역
        let action = null;
        const acts = QUARTERLY_ACTIVITY[inv.id] || [];
        if (acts.length > 0 && acts[0]?.actions) {
          action = acts[0].actions.find(a => a.ticker === ticker);
        }

        holders.push({
          investor: inv,
          value: totalValue,
          pct: totalPct,
          shares: totalShares,
          action,
        });
      }
    });
    return holders.sort((a, b) => b.value - a.value);
  }, [INVESTORS, HOLDINGS, QUARTERLY_ACTIVITY, ticker]);

  // ---- Price info from snapshot ----
  const priceInfo = useMemo(() => {
    if (!snapshot) return null;
    const todaysChange = snapshot.todaysChange || 0;
    const todaysChangePerc = snapshot.todaysChangePerc || 0;
    const price = snapshot.day?.c || snapshot.prevDay?.c || snapshot.lastTrade?.p || 0;
    const volume = snapshot.day?.v || 0;
    return { price, change: todaysChange, changePerc: todaysChangePerc, volume };
  }, [snapshot]);

  // ---- Company details ----
  const companyInfo = useMemo(() => {
    if (!details) return null;
    return {
      name: details.name || ticker,
      description: details.description || '',
      sector: details.sic_description || '',
      industry: details.type || '',
      marketCap: details.market_cap || 0,
      employees: details.total_employees || 0,
      homepageUrl: details.homepage_url || '',
      logoUrl: details.branding?.icon_url
        ? `${details.branding.icon_url}?apiKey=${import.meta.env.VITE_POLYGON_API_KEY}`
        : null,
      listDate: details.list_date || '',
      exchange: details.primary_exchange || '',
    };
  }, [details, ticker]);

  const isDark = t.name === 'dark';

  if (!ticker) return null;

  return (
    <div className="page-enter">
      {/* Back button */}
      <button onClick={onBack}
        className="flex items-center gap-1.5 mb-4 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-70"
        style={{ color: t.textMuted }}>
        <ArrowLeft size={16} /> {L.t('common.back')}
      </button>

      {/* ===== HEADER: Logo + Name + Price ===== */}
      <div className="flex items-start gap-4 mb-6">
        {/* Logo */}
        {companyInfo?.logoUrl ? (
          <img src={companyInfo.logoUrl} alt={ticker}
            className="w-12 h-12 rounded-xl object-contain"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', padding: '6px' }}
            onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', color: t.textSecondary }}>
            {ticker.slice(0, 2)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: t.text }}>{ticker}</h1>
            {companyInfo?.exchange && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: t.textMuted }}>
                {companyInfo.exchange.replace('XNAS', 'NASDAQ').replace('XNYS', 'NYSE')}
              </span>
            )}
          </div>
          <p className="text-sm mt-0.5 truncate" style={{ color: t.textMuted }}>
            {loadingInfo ? '...' : (companyInfo?.name || ticker)}
          </p>
        </div>

        {/* Price */}
        <div className="text-right flex-shrink-0">
          {priceInfo ? (
            <>
              <div className="text-2xl font-bold tracking-tight" style={{ color: t.text }}>
                ${priceInfo.price.toFixed(2)}
              </div>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                {priceInfo.change >= 0
                  ? <ArrowUpRight size={14} style={{ color: t.green }} />
                  : <ArrowDownRight size={14} style={{ color: t.red }} />}
                <span className="text-sm font-semibold" style={{ color: priceInfo.change >= 0 ? t.green : t.red }}>
                  {priceInfo.change >= 0 ? '+' : ''}{priceInfo.change.toFixed(2)} ({priceInfo.changePerc >= 0 ? '+' : ''}{priceInfo.changePerc.toFixed(2)}%)
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                {L.locale === 'ko' ? '15분 지연' : '15min delayed'}
              </p>
            </>
          ) : loadingInfo ? (
            <div className="w-20 h-8 rounded animate-pulse" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }} />
          ) : null}
        </div>
      </div>

      {/* ===== CHART ===== */}
      <GlassCard hover={false}>
        <div className="p-4 sm:p-5">
          <StockChart ticker={ticker} theme={t.name} />
        </div>
      </GlassCard>

      {/* ===== KEY STATS ===== */}
      {(priceInfo || companyInfo) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: L.locale === 'ko' ? '시가총액' : 'Market Cap', value: companyInfo?.marketCap ? formatUSD(companyInfo.marketCap) : '-' },
            { label: L.locale === 'ko' ? '거래량' : 'Volume', value: priceInfo?.volume ? priceInfo.volume.toLocaleString() : '-' },
            { label: L.locale === 'ko' ? '섹터' : 'Sector', value: companyInfo?.sector?.slice(0, 20) || '-' },
            { label: L.locale === 'ko' ? '직원 수' : 'Employees', value: companyInfo?.employees ? companyInfo.employees.toLocaleString() : '-' },
          ].map((stat, i) => (
            <div key={i} className="px-3 py-2.5 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
              <p className="text-xs" style={{ color: t.textMuted }}>{stat.label}</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: t.text }}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ===== WHO'S HOLDING — FolioObs 핵심 ===== */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} style={{ color: t.accent }} />
          <h2 className="text-lg font-bold" style={{ color: t.text }}>
            {L.locale === 'ko' ? '이 종목을 보유한 투자자' : 'Who\'s Holding This'}
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${t.accent}15`, color: t.accent }}>
            {stockHolders.length}{L.t('common.people')}
          </span>
        </div>

        {stockHolders.length === 0 ? (
          <GlassCard hover={false}>
            <div className="p-6 text-center">
              <p className="text-sm" style={{ color: t.textMuted }}>
                {L.locale === 'ko' ? '추적 중인 투자자 중 이 종목을 보유한 투자자가 없습니다.' : 'None of the tracked investors hold this stock.'}
              </p>
            </div>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {stockHolders.map(({ investor: inv, value, pct, shares, action }) => (
              <GlassCard key={inv.id} onClick={() => onNavigate('investor', inv.id)}>
                <div className="p-3 sm:p-4 flex items-center gap-3 cursor-pointer">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: inv.gradient }}>
                    {inv.avatar}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: t.text }}>{L.investorName(inv)}</span>
                      {action && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                          style={{
                            background: action.type === 'new' ? `${t.accent}15` :
                              action.type === 'buy' ? `${t.green}15` :
                                action.type === 'sell' ? `${t.red}15` :
                                  action.type === 'exit' ? `${t.red}15` : `${t.textMuted}15`,
                            color: action.type === 'new' ? t.accent :
                              action.type === 'buy' ? t.green :
                                action.type === 'sell' ? t.red :
                                  action.type === 'exit' ? t.red : t.textMuted,
                          }}>
                          {action.type === 'new' ? (L.locale === 'ko' ? '신규' : 'New') :
                            action.type === 'buy' ? (L.locale === 'ko' ? '매수' : 'Buy') :
                              action.type === 'sell' ? (L.locale === 'ko' ? '매도' : 'Sell') :
                                action.type === 'exit' ? (L.locale === 'ko' ? '청산' : 'Exit') : action.type}
                          {action.pctChange ? ` ${action.pctChange > 0 ? '+' : ''}${action.pctChange.toFixed(0)}%` : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                      {L.locale === 'ko'
                        ? `포트폴리오 비중 ${pct.toFixed(2)}% · ${formatUSD(value)}`
                        : `${pct.toFixed(2)}% of portfolio · ${formatUSD(value)}`}
                    </p>
                  </div>

                  {/* Pct bar */}
                  <div className="hidden sm:block w-20 flex-shrink-0">
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: t.accent }} />
                    </div>
                    <p className="text-xs text-right mt-0.5 font-medium" style={{ color: t.accent }}>{pct.toFixed(1)}%</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* ===== COMPANY DESCRIPTION ===== */}
      {companyInfo?.description && (
        <div className="mt-6">
          <GlassCard hover={false}>
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={16} style={{ color: t.textMuted }} />
                <h3 className="text-sm font-bold" style={{ color: t.text }}>
                  {L.locale === 'ko' ? '기업 개요' : 'About'}
                </h3>
                {companyInfo.homepageUrl && (
                  <a href={companyInfo.homepageUrl} target="_blank" rel="noopener noreferrer"
                    className="ml-auto flex items-center gap-1 text-xs hover:opacity-70 transition"
                    style={{ color: t.accent }}>
                    <Globe size={12} /> {L.locale === 'ko' ? '홈페이지' : 'Website'}
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: t.textSecondary }}>
                {companyInfo.description.length > 400
                  ? companyInfo.description.slice(0, 400) + '...'
                  : companyInfo.description}
              </p>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default StockDetailPage;
