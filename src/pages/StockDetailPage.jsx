import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ArrowLeft, Building2, Globe, Users,
  ArrowUpRight, ArrowDownRight, ExternalLink
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useLocale } from "../hooks/useLocale";
import { useData } from "../hooks/useDataProvider";
import { formatUSD } from "../utils/format";
import { GlassCard } from "../components/shared";
import polygon from "../services/polygon";

// ========== HELPERS ==========
function fmtLargeNum(n) {
  if (!n || n === 0) return '-';
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtVolume(n) {
  if (!n) return '-';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString();
}

function fmtPrice(p) {
  if (p == null) return '-';
  return `$${p.toFixed(2)}`;
}

// ========== CHART COMPONENT ==========
const RANGES = ['1D', '1W', '1M', '3M', '1Y', '5Y'];

function StockChart({ ticker, theme }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [range, setRange] = useState('1Y');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoverIdx, setHoverIdx] = useState(-1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setHoverIdx(-1);
    polygon.getChartData(ticker, range)
      .then(bars => { if (!cancelled) { setChartData(bars || []); setLoading(false); } })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [ticker, range]);

  const isDark = theme === 'dark';

  // Compute chart metrics
  const metrics = useMemo(() => {
    if (chartData.length === 0) return null;
    const closes = chartData.map(b => b.c);
    const volumes = chartData.map(b => b.v || 0);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const maxVol = Math.max(...volumes);
    const isUp = closes[closes.length - 1] >= closes[0];
    return { closes, volumes, min, max, maxVol, isUp };
  }, [chartData]);

  // Draw chart on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !metrics) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const CHART_H = H * 0.75; // top 75% for price
    const VOL_H = H * 0.18;   // bottom 18% for volume
    const VOL_Y = H * 0.82;
    const MARGIN_R = 55; // right margin for Y-axis labels
    const CHART_W = W - MARGIN_R;

    const { closes, volumes, min, max, maxVol, isUp } = metrics;
    const pad = (max - min) * 0.05 || 1;
    const priceMin = min - pad;
    const priceMax = max + pad;

    const lineColor = isUp ? '#22c55e' : '#ef4444';
    const volColor = isUp ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)';

    ctx.clearRect(0, 0, W, H);

    // Helper: price to Y
    const toY = (price) => CHART_H - ((price - priceMin) / (priceMax - priceMin)) * CHART_H;
    const toX = (i) => (i / (chartData.length - 1)) * CHART_W;

    // Grid lines + Y-axis labels
    const gridCount = 4;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    for (let i = 0; i <= gridCount; i++) {
      const ratio = i / gridCount;
      const y = CHART_H * ratio;
      const price = priceMax - (priceMax - priceMin) * ratio;

      // grid line
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CHART_W, y);
      ctx.stroke();

      // Y label
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
      ctx.fillText(`$${price.toFixed(price >= 1000 ? 0 : 2)}`, CHART_W + 8, y);
    }

    // Volume bars
    if (maxVol > 0) {
      const barW = Math.max(1, (CHART_W / chartData.length) * 0.6);
      chartData.forEach((bar, i) => {
        const x = toX(i);
        const h = (bar.v / maxVol) * VOL_H;
        const barColor = bar.c >= bar.o
          ? (isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.2)')
          : (isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.2)');
        ctx.fillStyle = barColor;
        ctx.fillRect(x - barW / 2, VOL_Y + VOL_H - h, barW, h);
      });
    }

    // Area fill with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, CHART_H);
    if (isUp) {
      gradient.addColorStop(0, 'rgba(34,197,94,0.15)');
      gradient.addColorStop(1, 'rgba(34,197,94,0)');
    } else {
      gradient.addColorStop(0, 'rgba(239,68,68,0.15)');
      gradient.addColorStop(1, 'rgba(239,68,68,0)');
    }

    ctx.beginPath();
    chartData.forEach((bar, i) => {
      const x = toX(i);
      const y = toY(bar.c);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(toX(chartData.length - 1), CHART_H);
    ctx.lineTo(0, CHART_H);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Price line
    ctx.beginPath();
    chartData.forEach((bar, i) => {
      const x = toX(i);
      const y = toY(bar.c);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [chartData, metrics, isDark]);

  // Draw overlay (crosshair)
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || !metrics || hoverIdx < 0) {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const CHART_H = H * 0.75;
    const MARGIN_R = 55;
    const CHART_W = W - MARGIN_R;

    const { min, max } = metrics;
    const pad = (max - min) * 0.05 || 1;
    const priceMin = min - pad;
    const priceMax = max + pad;

    const bar = chartData[hoverIdx];
    const x = (hoverIdx / (chartData.length - 1)) * CHART_W;
    const y = CHART_H - ((bar.c - priceMin) / (priceMax - priceMin)) * CHART_H;

    ctx.clearRect(0, 0, W, H);

    // Vertical line
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CHART_W, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price label on Y-axis
    const labelH = 18;
    ctx.fillStyle = metrics.isUp ? '#22c55e' : '#ef4444';
    ctx.beginPath();
    ctx.roundRect(CHART_W + 2, y - labelH / 2, MARGIN_R - 4, labelH, 3);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`$${bar.c.toFixed(2)}`, CHART_W + MARGIN_R / 2, y);

    // Dot
    ctx.fillStyle = metrics.isUp ? '#22c55e' : '#ef4444';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isDark ? '#111' : '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [hoverIdx, chartData, metrics, isDark]);

  // Mouse/touch handlers
  const getIdx = useCallback((clientX) => {
    const canvas = canvasRef.current;
    if (!canvas || chartData.length === 0) return -1;
    const rect = canvas.getBoundingClientRect();
    const MARGIN_R = 55;
    const x = clientX - rect.left;
    const chartW = rect.width - MARGIN_R;
    if (x < 0 || x > chartW) return -1;
    return Math.round((x / chartW) * (chartData.length - 1));
  }, [chartData]);

  const handleMove = useCallback((e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    setHoverIdx(getIdx(clientX));
  }, [getIdx]);

  const hoverBar = hoverIdx >= 0 && hoverIdx < chartData.length ? chartData[hoverIdx] : null;
  const hoverDate = hoverBar ? new Date(hoverBar.t) : null;
  const fmtDate = (d) => {
    if (!d) return '';
    if (range === '1D') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div>
      {/* Hover info bar */}
      <div className="h-7 mb-1 flex items-center gap-4">
        {hoverBar ? (
          <div className="flex items-center gap-3 text-xs" style={{ color: isDark ? '#aaa' : '#666' }}>
            <span className="font-medium" style={{ color: isDark ? '#fff' : '#000' }}>{fmtDate(hoverDate)}</span>
            <span>O <span style={{ color: isDark ? '#ddd' : '#333' }}>{fmtPrice(hoverBar.o)}</span></span>
            <span>H <span style={{ color: isDark ? '#ddd' : '#333' }}>{fmtPrice(hoverBar.h)}</span></span>
            <span>L <span style={{ color: isDark ? '#ddd' : '#333' }}>{fmtPrice(hoverBar.l)}</span></span>
            <span>C <span className="font-bold" style={{ color: isDark ? '#fff' : '#000' }}>{fmtPrice(hoverBar.c)}</span></span>
            <span>Vol <span style={{ color: isDark ? '#ddd' : '#333' }}>{fmtVolume(hoverBar.v)}</span></span>
          </div>
        ) : chartData.length > 0 && metrics ? (
          <div className="flex items-center gap-2 text-xs" style={{ color: isDark ? '#666' : '#999' }}>
            <span>{range === '1D' ? 'Intraday' : range} · {chartData.length} bars</span>
          </div>
        ) : null}
      </div>

      {/* Chart container */}
      <div className="relative w-full rounded-xl overflow-hidden" style={{ height: '300px', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: 'transparent' }} />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <p className="text-xs" style={{ color: isDark ? '#888' : '#999' }}>Chart unavailable</p>
          </div>
        )}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        <canvas ref={overlayRef} className="absolute inset-0 w-full h-full cursor-crosshair"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(-1)}
          onTouchMove={handleMove}
          onTouchEnd={() => setHoverIdx(-1)}
        />
      </div>

      {/* Range tabs */}
      <div className="flex items-center justify-center gap-1 mt-3">
        {RANGES.map(r => {
          const active = range === r;
          return (
            <button key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: active ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)') : 'transparent',
                color: active ? (isDark ? '#fff' : '#000') : (isDark ? '#555' : '#aaa'),
              }}>
              {r}
            </button>
          );
        })}
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
  const [prevClose, setPrevClose] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  useEffect(() => {
    if (!ticker) return;
    setLoadingInfo(true);
    Promise.allSettled([
      polygon.getTickerDetails(ticker),
      polygon.getSnapshot(ticker),
      polygon.getPreviousClose(ticker),
    ]).then(([detailRes, snapRes, prevRes]) => {
      if (detailRes.status === 'fulfilled') setDetails(detailRes.value);
      if (snapRes.status === 'fulfilled') setSnapshot(snapRes.value);
      if (prevRes.status === 'fulfilled') setPrevClose(prevRes.value);
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

        let action = null;
        const acts = QUARTERLY_ACTIVITY[inv.id] || [];
        if (acts.length > 0 && acts[0]?.actions) {
          action = acts[0].actions.find(a => a.ticker === ticker);
        }

        holders.push({ investor: inv, value: totalValue, pct: totalPct, shares: totalShares, action });
      }
    });
    return holders.sort((a, b) => b.value - a.value);
  }, [INVESTORS, HOLDINGS, QUARTERLY_ACTIVITY, ticker]);

  // ---- Price info ----
  const priceInfo = useMemo(() => {
    if (!snapshot) return null;
    const price = snapshot.day?.c || snapshot.prevDay?.c || snapshot.lastTrade?.p || 0;
    const todaysChange = snapshot.todaysChange || 0;
    const todaysChangePerc = snapshot.todaysChangePerc || 0;
    const dayVolume = snapshot.day?.v || 0;
    const dayOpen = snapshot.day?.o || 0;
    const dayHigh = snapshot.day?.h || 0;
    const dayLow = snapshot.day?.l || 0;
    const prevDayClose = snapshot.prevDay?.c || 0;
    return { price, change: todaysChange, changePerc: todaysChangePerc, volume: dayVolume, open: dayOpen, high: dayHigh, low: dayLow, prevClose: prevDayClose };
  }, [snapshot]);

  // ---- Company details ----
  const companyInfo = useMemo(() => {
    if (!details) return null;
    return {
      name: details.name || ticker,
      description: details.description || '',
      sector: details.sic_description || '',
      marketCap: details.market_cap || 0,
      employees: details.total_employees || 0,
      homepageUrl: details.homepage_url || '',
      logoUrl: details.branding?.icon_url
        ? `${details.branding.icon_url}?apiKey=${import.meta.env.VITE_POLYGON_API_KEY}`
        : null,
      exchange: details.primary_exchange || '',
    };
  }, [details, ticker]);

  const isDark = t.name === 'dark';

  if (!ticker) return null;

  // Stats grid data
  const stats = [];
  if (companyInfo?.marketCap) stats.push({ label: L.locale === 'ko' ? '시가총액' : 'Market Cap', value: fmtLargeNum(companyInfo.marketCap) });
  if (priceInfo?.volume) stats.push({ label: L.locale === 'ko' ? '거래량' : 'Volume', value: fmtVolume(priceInfo.volume) });
  if (priceInfo?.open) stats.push({ label: L.locale === 'ko' ? '시가' : 'Open', value: fmtPrice(priceInfo.open) });
  if (priceInfo?.prevClose) stats.push({ label: L.locale === 'ko' ? '전일 종가' : 'Prev Close', value: fmtPrice(priceInfo.prevClose) });
  if (priceInfo?.high && priceInfo?.low) stats.push({ label: L.locale === 'ko' ? '일중 범위' : 'Day Range', value: `${fmtPrice(priceInfo.low)} – ${fmtPrice(priceInfo.high)}` });
  if (prevClose?.h && prevClose?.l) stats.push({ label: '52W Range', value: '-' }); // placeholder
  if (companyInfo?.sector) stats.push({ label: L.locale === 'ko' ? '섹터' : 'Sector', value: companyInfo.sector.length > 25 ? companyInfo.sector.slice(0, 25) + '...' : companyInfo.sector });
  if (companyInfo?.employees) stats.push({ label: L.locale === 'ko' ? '직원 수' : 'Employees', value: companyInfo.employees.toLocaleString() });

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
        {companyInfo?.logoUrl ? (
          <img src={companyInfo.logoUrl} alt={ticker}
            className="w-14 h-14 rounded-2xl object-contain"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', padding: '8px' }}
            onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', color: t.textSecondary }}>
            {ticker.slice(0, 2)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: t.text }}>{ticker}</h1>
            {companyInfo?.exchange && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: t.textMuted }}>
                {companyInfo.exchange.replace('XNAS', 'NASDAQ').replace('XNYS', 'NYSE')}
              </span>
            )}
          </div>
          <p className="text-sm mt-0.5" style={{ color: t.textMuted }}>
            {loadingInfo ? '...' : (companyInfo?.name || ticker)}
          </p>
        </div>

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
              <p className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>
                {L.locale === 'ko' ? '15분 지연' : '15min delayed'}
              </p>
            </>
          ) : loadingInfo ? (
            <div className="w-24 h-10 rounded-lg animate-pulse" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }} />
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
      {stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
          {stats.map((stat, i) => (
            <div key={i} className="px-3 py-2.5 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
              <p className="text-[11px]" style={{ color: t.textMuted }}>{stat.label}</p>
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
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: inv.gradient }}>
                    {inv.avatar}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold" style={{ color: t.text }}>{L.investorName(inv)}</span>
                      {action && (
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{
                            background: action.type === 'new' ? `${t.accent}15` :
                              (action.type === 'buy') ? `${t.green}15` :
                                `${t.red}15`,
                            color: action.type === 'new' ? t.accent :
                              (action.type === 'buy') ? t.green : t.red,
                          }}>
                          {action.type === 'new' ? (L.locale === 'ko' ? '신규' : 'New') :
                            action.type === 'buy' ? (L.locale === 'ko' ? '매수' : 'Buy') :
                              action.type === 'sell' ? (L.locale === 'ko' ? '매도' : 'Sell') :
                                (L.locale === 'ko' ? '청산' : 'Exit')}
                          {action.pctChange ? ` ${action.pctChange > 0 ? '+' : ''}${action.pctChange.toFixed(0)}%` : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                      {L.locale === 'ko'
                        ? `포트폴리오 ${pct.toFixed(2)}% · ${formatUSD(value)} · ${shares.toLocaleString()}주`
                        : `${pct.toFixed(2)}% · ${formatUSD(value)} · ${shares.toLocaleString()} shares`}
                    </p>
                  </div>

                  <div className="hidden sm:block w-20 flex-shrink-0">
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(pct * 3, 100)}%`, background: t.accent }} />
                    </div>
                    <p className="text-xs text-right mt-0.5 font-semibold" style={{ color: t.accent }}>{pct.toFixed(1)}%</p>
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
                {companyInfo.description.length > 500
                  ? companyInfo.description.slice(0, 500) + '...'
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
