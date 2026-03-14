import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ArrowLeft, Building2, Globe, Users,
  ArrowUpRight, ArrowDownRight, ExternalLink, TrendingUp, Calendar,
  BarChart3, Target
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

/** Extract domain from URL for Clearbit logo */
function extractDomain(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '');
  } catch { return null; }
}

/** Compute Simple Moving Average */
function computeSMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j].c;
    result.push(sum / period);
  }
  return result;
}

// Moving average configs
const MA_LINES = [
  { period: 5,   color: '#f59e0b', label: 'MA5'  },
  { period: 20,  color: '#8b5cf6', label: 'MA20' },
  { period: 60,  color: '#3b82f6', label: 'MA60' },
  { period: 120, color: '#ef4444', label: 'MA120' },
];

// ========== WELL-KNOWN TICKER → DOMAIN MAP ==========
const TICKER_DOMAINS = {
  AAPL: 'apple.com', MSFT: 'microsoft.com', AMZN: 'amazon.com', GOOGL: 'google.com', GOOG: 'google.com',
  META: 'meta.com', TSLA: 'tesla.com', NVDA: 'nvidia.com', BRK: 'berkshirehathaway.com',
  JPM: 'jpmorganchase.com', V: 'visa.com', JNJ: 'jnj.com', WMT: 'walmart.com', MA: 'mastercard.com',
  PG: 'pg.com', UNH: 'unitedhealthgroup.com', HD: 'homedepot.com', DIS: 'disney.com',
  BAC: 'bankofamerica.com', XOM: 'exxonmobil.com', NFLX: 'netflix.com', KO: 'coca-cola.com',
  PEP: 'pepsico.com', COST: 'costco.com', ABBV: 'abbvie.com', AVGO: 'broadcom.com',
  MRK: 'merck.com', LLY: 'lilly.com', TMO: 'thermofisher.com', CSCO: 'cisco.com',
  ADBE: 'adobe.com', CRM: 'salesforce.com', ACN: 'accenture.com', AMD: 'amd.com',
  INTC: 'intel.com', IBM: 'ibm.com', ORCL: 'oracle.com', NKE: 'nike.com',
  QCOM: 'qualcomm.com', TXN: 'ti.com', INTU: 'intuit.com', AMAT: 'appliedmaterials.com',
  PYPL: 'paypal.com', NOW: 'servicenow.com', ISRG: 'intuitive.com', GS: 'goldmansachs.com',
  MS: 'morganstanley.com', BLK: 'blackrock.com', SCHW: 'schwab.com', C: 'citigroup.com',
  WFC: 'wellsfargo.com', AXP: 'americanexpress.com', CVX: 'chevron.com', COP: 'conocophillips.com',
  ABNB: 'airbnb.com', UBER: 'uber.com', SQ: 'squareup.com', SHOP: 'shopify.com',
  SNAP: 'snap.com', SPOT: 'spotify.com', PINS: 'pinterest.com', ZM: 'zoom.us',
  ROKU: 'roku.com', NET: 'cloudflare.com', SNOW: 'snowflake.com', DDOG: 'datadoghq.com',
  CRWD: 'crowdstrike.com', ZS: 'zscaler.com', PANW: 'paloaltonetworks.com',
  BA: 'boeing.com', CAT: 'caterpillar.com', GE: 'ge.com', MMM: '3m.com',
  T: 'att.com', VZ: 'verizon.com', TMUS: 't-mobile.com', CMCSA: 'comcast.com',
  MCD: 'mcdonalds.com', SBUX: 'starbucks.com', LOW: 'lowes.com', TGT: 'target.com',
  F: 'ford.com', GM: 'gm.com', TM: 'toyota.com', LMT: 'lockheedmartin.com',
  RTX: 'rtx.com', HON: 'honeywell.com', UPS: 'ups.com', FDX: 'fedex.com',
  PFE: 'pfizer.com', BMY: 'bms.com', GILD: 'gilead.com', AMGN: 'amgen.com',
  CVS: 'cvshealth.com', CI: 'cigna.com', HUM: 'humana.com', ELV: 'elevancehealth.com',
  DE: 'deere.com', ABT: 'abbott.com', DHR: 'danaher.com', SYK: 'stryker.com',
  MDT: 'medtronic.com', BSX: 'bostonscientific.com', ZTS: 'zoetis.com',
  PLTR: 'palantir.com', COIN: 'coinbase.com', HOOD: 'robinhood.com',
  ARM: 'arm.com', SMCI: 'supermicro.com', TSM: 'tsmc.com', ASML: 'asml.com',
  MU: 'micron.com', MRVL: 'marvell.com', LRCX: 'lamresearch.com', KLAC: 'kla.com',
  SOFI: 'sofi.com', RIVN: 'rivian.com', LCID: 'lucidmotors.com', NIO: 'nio.com',
};

// ========== LOGO COMPONENT (Multi-source fallback) ==========
function CompanyLogo({ ticker, details, isDark, textSecondary }) {
  const [srcIdx, setSrcIdx] = useState(0);

  const polygonKey = import.meta.env.VITE_POLYGON_API_KEY;
  const domain = extractDomain(details?.homepage_url) || TICKER_DOMAINS[ticker] || null;

  // Build ordered list of logo source URLs
  const sources = useMemo(() => {
    const srcs = [];
    // 1. Polygon icon
    if (details?.branding?.icon_url) srcs.push(`${details.branding.icon_url}?apiKey=${polygonKey}`);
    // 2. Polygon logo
    if (details?.branding?.logo_url) srcs.push(`${details.branding.logo_url}?apiKey=${polygonKey}`);
    // 3. Clearbit (from homepage_url or known domain)
    if (domain) srcs.push(`https://logo.clearbit.com/${domain}`);
    // 4. Google Favicons (128px, very reliable)
    if (domain) srcs.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
    // 5. Known domain from map (if homepage_url domain was different)
    const mappedDomain = TICKER_DOMAINS[ticker];
    if (mappedDomain && mappedDomain !== domain) {
      srcs.push(`https://logo.clearbit.com/${mappedDomain}`);
      srcs.push(`https://www.google.com/s2/favicons?domain=${mappedDomain}&sz=128`);
    }
    return srcs;
  }, [details, ticker, domain, polygonKey]);

  useEffect(() => { setSrcIdx(0); }, [ticker, sources]);

  const handleError = () => {
    setSrcIdx(prev => prev + 1);
  };

  const currentSrc = srcIdx < sources.length ? sources[srcIdx] : null;

  if (!currentSrc) {
    // Final fallback: styled initials
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#06b6d4', '#ef4444'];
    const colorIdx = ticker.charCodeAt(0) % colors.length;
    return (
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold"
        style={{
          background: `${colors[colorIdx]}18`,
          color: colors[colorIdx],
          border: `1px solid ${colors[colorIdx]}25`,
        }}>
        {ticker.slice(0, 2)}
      </div>
    );
  }

  return (
    <img src={currentSrc} alt={ticker}
      className="w-14 h-14 rounded-2xl object-contain"
      style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', padding: '8px' }}
      onError={handleError} />
  );
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
  const [showMA, setShowMA] = useState({ 5: true, 20: true, 60: false, 120: false });

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

  // Compute chart metrics + moving averages
  const metrics = useMemo(() => {
    if (chartData.length === 0) return null;
    const closes = chartData.map(b => b.c);
    const volumes = chartData.map(b => b.v || 0);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const maxVol = Math.max(...volumes);
    const isUp = closes[closes.length - 1] >= closes[0];

    // Compute MAs
    const mas = {};
    MA_LINES.forEach(({ period }) => {
      mas[period] = computeSMA(chartData, period);
    });

    return { closes, volumes, min, max, maxVol, isUp, mas };
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
    const CHART_H = H * 0.75;
    const VOL_H = H * 0.18;
    const VOL_Y = H * 0.82;
    const MARGIN_R = 55;
    const CHART_W = W - MARGIN_R;

    const { closes, volumes, min, max, maxVol, isUp, mas } = metrics;
    const pad = (max - min) * 0.05 || 1;
    const priceMin = min - pad;
    const priceMax = max + pad;

    const lineColor = isUp ? '#22c55e' : '#ef4444';

    ctx.clearRect(0, 0, W, H);

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
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CHART_W, y);
      ctx.stroke();
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
      gradient.addColorStop(0, 'rgba(34,197,94,0.12)');
      gradient.addColorStop(1, 'rgba(34,197,94,0)');
    } else {
      gradient.addColorStop(0, 'rgba(239,68,68,0.12)');
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

    // Moving average lines
    MA_LINES.forEach(({ period, color }) => {
      if (!showMA[period]) return;
      const maData = mas[period];
      if (!maData) return;
      ctx.beginPath();
      let started = false;
      maData.forEach((val, i) => {
        if (val === null) return;
        const x = toX(i);
        const y = toY(val);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.7;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Price line (on top of MAs)
    ctx.beginPath();
    chartData.forEach((bar, i) => {
      const x = toX(i);
      const y = toY(bar.c);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [chartData, metrics, isDark, showMA]);

  // Draw overlay (crosshair)
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || !metrics || hoverIdx < 0) {
      if (canvas) {
        const ctx = canvas.getContext('2d');
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

  const toggleMA = (period) => setShowMA(prev => ({ ...prev, [period]: !prev[period] }));

  return (
    <div>
      {/* Hover info bar */}
      <div className="min-h-[28px] mb-1 flex items-center gap-4 flex-wrap">
        {hoverBar ? (
          <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: isDark ? '#aaa' : '#666' }}>
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
      <div className="relative w-full rounded-xl overflow-hidden" style={{ height: '320px', background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
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

      {/* Range tabs + MA toggles */}
      <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
        <div className="flex items-center gap-1">
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

        {/* MA toggle pills */}
        <div className="flex items-center gap-1">
          {MA_LINES.map(({ period, color, label }) => {
            const active = showMA[period];
            return (
              <button key={period}
                onClick={() => toggleMA(period)}
                className="px-2 py-1 rounded-md text-[10px] font-bold transition-all"
                style={{
                  background: active ? `${color}20` : 'transparent',
                  color: active ? color : (isDark ? '#444' : '#bbb'),
                  border: `1px solid ${active ? `${color}40` : 'transparent'}`,
                }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ========== DAILY PRICE TABLE ==========
function DailyPriceTable({ ticker, theme, locale }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    const from = new Date(now);
    from.setDate(from.getDate() - 60); // ~2 months for ~40 trading days
    const fromStr = from.toISOString().split('T')[0];

    polygon.getAggregates(ticker, 'day', 1, fromStr, to)
      .then(bars => {
        if (!cancelled) {
          // Reverse to show most recent first, take top 30
          setData((bars || []).slice().reverse().slice(0, 30));
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) { setData([]); setLoading(false); } });
    return () => { cancelled = true; };
  }, [ticker]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: 'transparent' }} />
      </div>
    );
  }
  if (data.length === 0) return null;

  const isKo = locale === 'ko';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr>
            {[
              isKo ? '날짜' : 'Date',
              isKo ? '종가' : 'Close',
              isKo ? '등락률' : 'Change',
              isKo ? '시가' : 'Open',
              isKo ? '고가' : 'High',
              isKo ? '저가' : 'Low',
              isKo ? '거래량' : 'Volume',
            ].map((h, i) => (
              <th key={i} className="text-left py-2 px-2 font-medium" style={{
                color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                ...(i > 0 ? { textAlign: 'right' } : {}),
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(showAll ? data : data.slice(0, 5)).map((bar, idx) => {
            const prevBar = idx < data.length - 1 ? data[idx + 1] : null;
            const change = prevBar ? ((bar.c - prevBar.c) / prevBar.c * 100) : 0;
            const changeAbs = prevBar ? (bar.c - prevBar.c) : 0;
            const isUp = change >= 0;
            const d = new Date(bar.t);
            const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

            return (
              <tr key={bar.t}
                className="transition-colors"
                style={{ cursor: 'default' }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td className="py-2 px-2 font-medium" style={{
                  color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}`,
                }}>
                  {dateStr}
                </td>
                <td className="py-2 px-2 text-right font-bold" style={{
                  color: isDark ? '#fff' : '#000',
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}`,
                }}>
                  ${bar.c.toFixed(2)}
                </td>
                <td className="py-2 px-2 text-right font-bold" style={{
                  color: isUp ? '#22c55e' : '#ef4444',
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}`,
                }}>
                  {prevBar ? `${isUp ? '+' : ''}${changeAbs.toFixed(2)} (${isUp ? '+' : ''}${change.toFixed(2)}%)` : '-'}
                </td>
                <td className="py-2 px-2 text-right" style={{
                  color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}`,
                }}>
                  ${bar.o.toFixed(2)}
                </td>
                <td className="py-2 px-2 text-right" style={{
                  color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}`,
                }}>
                  ${bar.h.toFixed(2)}
                </td>
                <td className="py-2 px-2 text-right" style={{
                  color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}`,
                }}>
                  ${bar.l.toFixed(2)}
                </td>
                <td className="py-2 px-2 text-right" style={{
                  color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}`,
                }}>
                  {fmtVolume(bar.v)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {data.length > 5 && (
        <button className="w-full text-center py-2.5 mt-2 text-xs font-medium rounded-lg transition-colors"
          style={{ color: isDark ? '#60a5fa' : '#2563eb', background: 'transparent' }}
          onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          onClick={() => setShowAll(!showAll)}>
          {showAll ? (locale === 'ko' ? '접기' : 'Show less') : `+${data.length - 5} ${locale === 'ko' ? '더보기' : 'more'}`}
        </button>
      )}
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
  const [yearlyBars, setYearlyBars] = useState([]);
  const [loadingInfo, setLoadingInfo] = useState(true);

  useEffect(() => {
    if (!ticker) return;
    setLoadingInfo(true);
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    const from1Y = new Date(now); from1Y.setFullYear(from1Y.getFullYear() - 1);
    const fromStr = from1Y.toISOString().split('T')[0];

    Promise.allSettled([
      polygon.getTickerDetails(ticker),
      polygon.getSnapshot(ticker),
      polygon.getPreviousClose(ticker),
      polygon.getAggregates(ticker, 'day', 1, fromStr, to),
    ]).then(([detailRes, snapRes, prevRes, yearRes]) => {
      if (detailRes.status === 'fulfilled') setDetails(detailRes.value);
      if (snapRes.status === 'fulfilled') setSnapshot(snapRes.value);
      if (prevRes.status === 'fulfilled') setPrevClose(prevRes.value);
      if (yearRes.status === 'fulfilled') setYearlyBars(yearRes.value || []);
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
      exchange: details.primary_exchange || '',
    };
  }, [details, ticker]);

  // ---- 52-week high/low & period performance ----
  const priceHighlights = useMemo(() => {
    if (yearlyBars.length === 0 || !priceInfo) return null;
    const currentPrice = priceInfo.price;

    // 52W high / low
    let high52 = { price: -Infinity, date: null };
    let low52 = { price: Infinity, date: null };
    yearlyBars.forEach(bar => {
      if (bar.h > high52.price) { high52 = { price: bar.h, date: new Date(bar.t) }; }
      if (bar.l < low52.price) { low52 = { price: bar.l, date: new Date(bar.t) }; }
    });

    const fromHigh = high52.price > 0 ? ((currentPrice - high52.price) / high52.price * 100) : 0;
    const fromLow = low52.price > 0 ? ((currentPrice - low52.price) / low52.price * 100) : 0;

    // Position in 52W range (0-100%)
    const range52 = high52.price - low52.price;
    const position52 = range52 > 0 ? ((currentPrice - low52.price) / range52 * 100) : 50;

    // Period returns: find bar closest to N days ago
    const getReturn = (daysAgo) => {
      if (yearlyBars.length === 0) return null;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - daysAgo);
      const targetTs = targetDate.getTime();
      let closest = yearlyBars[0];
      let minDiff = Infinity;
      for (const bar of yearlyBars) {
        const diff = Math.abs(bar.t - targetTs);
        if (diff < minDiff) { minDiff = diff; closest = bar; }
      }
      if (!closest || closest.c === 0) return null;
      return ((currentPrice - closest.c) / closest.c * 100);
    };

    const returns = {
      '1W': getReturn(7),
      '1M': getReturn(30),
      '3M': getReturn(90),
      '6M': getReturn(180),
      '1Y': getReturn(365),
    };

    return { high52, low52, fromHigh, fromLow, position52, returns };
  }, [yearlyBars, priceInfo]);

  const isDark = t.name === 'dark';

  if (!ticker) return null;

  // Stats grid data
  const stats = [];
  if (companyInfo?.marketCap) stats.push({ label: L.locale === 'ko' ? '시가총액' : 'Market Cap', value: fmtLargeNum(companyInfo.marketCap) });
  if (priceInfo?.volume) stats.push({ label: L.locale === 'ko' ? '거래량' : 'Volume', value: fmtVolume(priceInfo.volume) });
  if (priceInfo?.open) stats.push({ label: L.locale === 'ko' ? '시가' : 'Open', value: fmtPrice(priceInfo.open) });
  if (priceInfo?.prevClose) stats.push({ label: L.locale === 'ko' ? '전일 종가' : 'Prev Close', value: fmtPrice(priceInfo.prevClose) });
  if (priceInfo?.high && priceInfo?.low) stats.push({ label: L.locale === 'ko' ? '일중 범위' : 'Day Range', value: `${fmtPrice(priceInfo.low)} – ${fmtPrice(priceInfo.high)}` });
  if (priceHighlights?.high52) stats.push({ label: L.locale === 'ko' ? '52주 최고' : '52W High', value: fmtPrice(priceHighlights.high52.price) });
  if (priceHighlights?.low52) stats.push({ label: L.locale === 'ko' ? '52주 최저' : '52W Low', value: fmtPrice(priceHighlights.low52.price) });
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
        <CompanyLogo ticker={ticker} details={details} isDark={isDark} textSecondary={t.textSecondary} />

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
                {L.locale === 'ko' ? '전일 종가 대비' : 'vs prev close'} · {L.locale === 'ko' ? '15분 지연' : '15min delayed'}
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

      {/* ===== 52-WEEK RANGE & PERFORMANCE ===== */}
      {priceHighlights && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 52-Week Range Card */}
          <GlassCard hover={false}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target size={14} style={{ color: t.accent }} />
                <span className="text-xs font-bold" style={{ color: t.text }}>
                  {L.locale === 'ko' ? '52주 가격 범위' : '52-Week Range'}
                </span>
              </div>

              {/* Visual range bar */}
              <div className="mb-3">
                <div className="flex justify-between text-[11px] mb-1.5" style={{ color: t.textMuted }}>
                  <span>{fmtPrice(priceHighlights.low52.price)}</span>
                  <span>{fmtPrice(priceHighlights.high52.price)}</span>
                </div>
                <div className="relative w-full h-2 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                  <div className="absolute h-full rounded-full" style={{
                    background: `linear-gradient(90deg, ${t.red}, ${t.green})`,
                    opacity: 0.3,
                    width: '100%',
                  }} />
                  <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2"
                    style={{
                      left: `${Math.max(2, Math.min(98, priceHighlights.position52))}%`,
                      transform: 'translate(-50%, -50%)',
                      background: t.accent,
                      borderColor: isDark ? '#1a1a2e' : '#fff',
                      boxShadow: `0 0 6px ${t.accent}40`,
                    }} />
                </div>
                <div className="text-center mt-1.5">
                  <span className="text-[11px] font-bold" style={{ color: t.accent }}>
                    {L.locale === 'ko' ? '현재 위치' : 'Current'}: {priceHighlights.position52.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* High / Low details */}
              <div className="grid grid-cols-2 gap-2">
                <div className="px-2.5 py-2 rounded-lg" style={{ background: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)' }}>
                  <p className="text-[10px] font-medium" style={{ color: t.red }}>
                    {L.locale === 'ko' ? '52주 최저' : '52W Low'}
                  </p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: t.text }}>{fmtPrice(priceHighlights.low52.price)}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: t.green }}>
                    +{priceHighlights.fromLow.toFixed(1)}%
                    <span style={{ color: t.textMuted }}> · {priceHighlights.low52.date?.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </p>
                </div>
                <div className="px-2.5 py-2 rounded-lg" style={{ background: isDark ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.04)' }}>
                  <p className="text-[10px] font-medium" style={{ color: t.green }}>
                    {L.locale === 'ko' ? '52주 최고' : '52W High'}
                  </p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: t.text }}>{fmtPrice(priceHighlights.high52.price)}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: t.red }}>
                    {priceHighlights.fromHigh.toFixed(1)}%
                    <span style={{ color: t.textMuted }}> · {priceHighlights.high52.date?.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Period Performance Card */}
          <GlassCard hover={false}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={14} style={{ color: t.accent }} />
                <span className="text-xs font-bold" style={{ color: t.text }}>
                  {L.locale === 'ko' ? '기간별 수익률' : 'Period Returns'}
                </span>
              </div>

              <div className="space-y-2">
                {Object.entries(priceHighlights.returns).map(([period, ret]) => {
                  if (ret === null) return null;
                  const isUp = ret >= 0;
                  const absRet = Math.abs(ret);
                  const maxBar = 40; // max bar width %
                  const barWidth = Math.min(absRet, 100) / 100 * maxBar;

                  return (
                    <div key={period} className="flex items-center gap-2">
                      <span className="text-xs font-medium w-8 flex-shrink-0" style={{ color: t.textMuted }}>{period}</span>
                      <div className="flex-1 h-5 rounded-md flex items-center relative overflow-hidden"
                        style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                        <div className="h-full rounded-md transition-all duration-500"
                          style={{
                            width: `${Math.max(barWidth, 2)}%`,
                            background: isUp
                              ? (isDark ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.2)')
                              : (isDark ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.2)'),
                          }} />
                      </div>
                      <span className="text-xs font-bold w-16 text-right flex-shrink-0"
                        style={{ color: isUp ? t.green : t.red }}>
                        {isUp ? '+' : ''}{ret.toFixed(2)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ===== DAILY PRICE TABLE (일별 시세) ===== */}
      <div className="mt-6">
        <GlassCard hover={false}>
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} style={{ color: t.accent }} />
              <h3 className="text-sm font-bold" style={{ color: t.text }}>
                {L.locale === 'ko' ? '일별 시세' : 'Daily Price History'}
              </h3>
            </div>
            <DailyPriceTable ticker={ticker} theme={t.name} locale={L.locale} />
          </div>
        </GlassCard>
      </div>

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
