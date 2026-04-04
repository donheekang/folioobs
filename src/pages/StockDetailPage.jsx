import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ArrowLeft, Building2, Globe,
  ArrowUpRight, ArrowDownRight, ExternalLink, TrendingUp, Calendar,
  Target, Newspaper
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

/** Compute Exponential Moving Average */
function computeEMA(data, period) {
  const result = [];
  const k = 2 / (period + 1);
  let ema = null;
  for (let i = 0; i < data.length; i++) {
    if (ema === null) {
      // Initialize EMA with SMA of first period values
      if (i < period - 1) { result.push(null); continue; }
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += data[j].c;
      ema = sum / period;
    } else {
      ema = data[i].c * k + ema * (1 - k);
    }
    result.push(ema);
  }
  return result;
}

/** Compute Bollinger Bands (period=20, stddev=2) */
function computeBollingerBands(data, period = 20, stddev = 2) {
  const sma = computeSMA(data, period);
  const upper = [];
  const lower = [];
  const middle = sma;

  for (let i = 0; i < data.length; i++) {
    if (sma[i] === null) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    // Calculate standard deviation for this window
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = data[j].c - sma[i];
      sumSq += diff * diff;
    }
    const std = Math.sqrt(sumSq / period);
    upper.push(sma[i] + stddev * std);
    lower.push(sma[i] - stddev * std);
  }

  return { upper, middle, lower };
}

/** Compute MACD */
function computeMACD(data) {
  const ema12 = computeEMA(data, 12);
  const ema26 = computeEMA(data, 26);
  const macdLine = [];
  const signalLine = [];
  const histogram = [];

  // MACD line = EMA12 - EMA26
  for (let i = 0; i < data.length; i++) {
    if (ema12[i] !== null && ema26[i] !== null) {
      macdLine.push(ema12[i] - ema26[i]);
    } else {
      macdLine.push(null);
    }
  }

  // Signal line = EMA(9) of MACD line
  const signal = computeEMA(
    macdLine.map(val => ({ c: val })).filter(x => x.c !== null),
    9
  );

  let signalIdx = 0;
  for (let i = 0; i < data.length; i++) {
    if (macdLine[i] !== null) {
      signalLine.push(signal[signalIdx] !== undefined ? signal[signalIdx] : null);
      signalIdx++;
    } else {
      signalLine.push(null);
    }
  }

  // Histogram = MACD - Signal
  for (let i = 0; i < data.length; i++) {
    if (macdLine[i] !== null && signalLine[i] !== null) {
      histogram.push(macdLine[i] - signalLine[i]);
    } else {
      histogram.push(null);
    }
  }

  return { macdLine, signalLine, histogram };
}

/** Compute RSI (period=14) */
function computeRSI(data, period = 14) {
  const result = [];
  let gains = 0, losses = 0;

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(null);
      continue;
    }

    const change = data[i].c - data[i - 1].c;
    if (change > 0) {
      gains += change;
    } else {
      losses += -change;
    }

    if (i < period) {
      result.push(null);
      continue;
    }

    if (i === period) {
      // Initialize with SMA of gains/losses
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - (100 / (1 + rs)));
    } else {
      // Use EMA smoothing for subsequent values
      const prevRSI = result[i - 1];
      const k = 1 / period;
      // This is a simplified RSI calculation
      const change = data[i].c - data[i - 1].c;
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;
      // For proper RSI, we need to track avgGain and avgLoss
      result.push(prevRSI);
    }
  }

  // More accurate RSI calculation
  const rsiResult = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      rsiResult.push(null);
      continue;
    }

    let avgGain = 0, avgLoss = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const change = data[j].c - data[j - 1].c;
      if (change > 0) avgGain += change;
      else avgLoss += -change;
    }
    avgGain /= period;
    avgLoss /= period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiResult.push(100 - (100 / (1 + rs)));
  }

  return rsiResult;
}

// Moving average configs
const MA_LINES = [
  { period: 5,   color: '#f59e0b', label: 'MA5'  },
  { period: 20,  color: '#8b5cf6', label: 'MA20' },
  { period: 60,  color: '#3b82f6', label: 'MA60' },
  { period: 120, color: '#ef4444', label: 'MA120' },
];

// ========== WELL-KNOWN TICKER → DOMAIN MAP ==========
// ========== LOGO COMPONENT (Polygon only) ==========
function CompanyLogo({ ticker, details, isDark, textSecondary }) {
  const [srcIdx, setSrcIdx] = useState(0);

  // Build ordered list of logo source URLs (Polygon via proxy)
  const sources = useMemo(() => {
    const srcs = [];
    // 1. Polygon icon (best quality)
    if (details?.branding?.icon_url) srcs.push(polygon.getLogoUrl(details.branding.icon_url));
    // 2. Polygon logo (fallback)
    if (details?.branding?.logo_url) srcs.push(polygon.getLogoUrl(details.branding.logo_url));
    return srcs.filter(Boolean);
  }, [details]);

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
      <div className="w-14 h-14 rounded flex items-center justify-center text-lg font-bold"
        style={{
          background: `${colors[colorIdx]}18`,
          color: colors[colorIdx],
          outline: `1px solid ${colors[colorIdx]}10`,
        }}>
        {ticker.slice(0, 2)}
      </div>
    );
  }

  return (
    <img src={currentSrc} alt={ticker}
      className="w-14 h-14 rounded object-contain"
      style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', padding: '8px' }}
      onError={handleError} />
  );
}

// ========== CHART COMPONENT ==========
// Upbit-style: single timeframe selector determines both candle size and date range
const TIMEFRAMES = [
  { key: '15m', label: '15분', range: '1D' },
  { key: '30m', label: '30분', range: '1W' },
  { key: '1h', label: '1시간', range: '1M' },
  { key: '1d', label: '일', range: '1Y' },
  { key: '1w', label: '주', range: '5Y' },
];

function StockChart({ ticker, theme }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [timeframe, setTimeframe] = useState('1d');
  const range = TIMEFRAMES.find(tf => tf.key === timeframe)?.range || '1Y';
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoverIdx, setHoverIdx] = useState(-1);
  const [showMA, setShowMA] = useState({ 5: true, 20: true, 60: false, 120: false });
  const [chartMode, setChartMode] = useState('line'); // 'line' or 'candle'
  const [showBB, setShowBB] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [prevClose, setPrevClose] = useState(null);

  // Fetch chart data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setHoverIdx(-1);
    polygon.getChartData(ticker, range, timeframe)
      .then(bars => { if (!cancelled) { setChartData(bars || []); setLoading(false); } })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [ticker, range, timeframe]);

  // Fetch previous close for intraday
  useEffect(() => {
    const isIntraday = range === '1D' || ['15m', '30m', '1h'].includes(timeframe);
    if (!isIntraday) {
      setPrevClose(null);
      return;
    }
    let cancelled = false;
    polygon.getPreviousClose(ticker)
      .then(data => { if (!cancelled && data) setPrevClose(data.c); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [ticker, range, timeframe]);

  const isDark = theme === 'dark';

  // Compute chart metrics + moving averages + indicators
  const metrics = useMemo(() => {
    if (chartData.length === 0) return null;
    const closes = chartData.map(b => b.c);
    const highs = chartData.map(b => b.h || b.c);
    const lows = chartData.map(b => b.l || b.c);
    const volumes = chartData.map(b => b.v || 0);
    let min = Math.min(...lows);
    let max = Math.max(...highs);
    const maxVol = Math.max(...volumes);
    const isUp = closes[closes.length - 1] >= closes[0];

    // Compute MAs
    const mas = {};
    MA_LINES.forEach(({ period }) => {
      mas[period] = computeSMA(chartData, period);
    });

    // Compute Bollinger Bands (reuse MA20 as middle)
    const bb = showBB ? computeBollingerBands(chartData, 20, 2) : null;

    // Compute MACD
    const macd = showMACD ? computeMACD(chartData) : null;

    // Compute RSI
    const rsi = showRSI ? computeRSI(chartData, 14) : null;

    // Expand min/max to include BB bands if active
    if (bb) {
      bb.upper.forEach(v => { if (v !== null && v > max) max = v; });
      bb.lower.forEach(v => { if (v !== null && v < min) min = v; });
    }

    return { closes, volumes, min, max, maxVol, isUp, mas, bb, macd, rsi };
  }, [chartData, showBB, showMACD, showRSI]);

  // Draw chart on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Clear canvas and show message when no data
    if (!metrics) {
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);
      if (!loading) {
        ctx.fillStyle = isDark ? '#555' : '#aaa';
        ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No trading data available', rect.width / 2, rect.height / 2);
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

    // Calculate layout based on active sub-indicators
    const MARGIN_B = 22; // Bottom margin for X-axis labels
    const MARGIN_R = 55;
    const CHART_W = W - MARGIN_R;
    const usableH = H - MARGIN_B;

    let CHART_H, VOL_H, MACD_H, RSI_H, VOL_Y, MACD_Y, RSI_Y;
    const subIndicatorCount = (showMACD ? 1 : 0) + (showRSI ? 1 : 0);

    if (subIndicatorCount === 0) {
      CHART_H = usableH * 0.75;
      VOL_H = usableH * 0.18;
      MACD_H = 0;
      RSI_H = 0;
      VOL_Y = usableH * 0.82;
    } else if (subIndicatorCount === 1) {
      CHART_H = usableH * 0.55;
      VOL_H = usableH * 0.12;
      MACD_H = usableH * 0.25;
      RSI_H = usableH * 0.25;
      VOL_Y = usableH * 0.67;
      MACD_Y = usableH * 0.68;
      RSI_Y = usableH * 0.68;
    } else {
      CHART_H = usableH * 0.45;
      VOL_H = usableH * 0.10;
      MACD_H = usableH * 0.18;
      RSI_H = usableH * 0.18;
      VOL_Y = usableH * 0.55;
      MACD_Y = usableH * 0.56;
      RSI_Y = usableH * 0.75;
    }

    const { closes, volumes, min, max, maxVol, isUp, mas, bb, macd, rsi } = metrics;
    const pad = (max - min) * 0.08 || 1;
    const priceMin = min - pad;
    const priceMax = max + pad;

    const lineColor = isUp ? '#22c55e' : '#ef4444';

    ctx.clearRect(0, 0, W, H);

    const toY = (price) => CHART_H - ((price - priceMin) / (priceMax - priceMin)) * CHART_H;
    const toX = (i) => (i / (chartData.length - 1)) * CHART_W;

    // ===== MAIN CHART AREA =====
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
      const labelY = Math.max(7, Math.min(y, CHART_H - 7));
      ctx.fillText(`$${price.toFixed(price >= 1000 ? 0 : 2)}`, CHART_W + 8, labelY);
    }

    // Previous close reference line (intraday only)
    const isIntraday = range === '1D' || ['15m', '30m', '1h'].includes(timeframe);
    if (isIntraday && prevClose) {
      const prevY = toY(prevClose);
      if (prevY >= 0 && prevY <= CHART_H) {
        ctx.strokeStyle = isDark ? 'rgba(150,150,150,0.4)' : 'rgba(100,100,100,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, prevY);
        ctx.lineTo(CHART_W, prevY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
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

    // Bollinger Bands fill
    if (showBB && bb) {
      const bbGradient = ctx.createLinearGradient(0, 0, 0, CHART_H);
      bbGradient.addColorStop(0, isDark ? 'rgba(139,92,246,0.05)' : 'rgba(139,92,246,0.08)');
      bbGradient.addColorStop(1, isDark ? 'rgba(139,92,246,0.02)' : 'rgba(139,92,246,0.03)');
      ctx.fillStyle = bbGradient;
      ctx.beginPath();
      let startedUpper = false;
      bb.upper.forEach((val, i) => {
        if (val === null || bb.lower[i] === null) return;
        const x = toX(i);
        const yUpper = toY(val);
        const yLower = toY(bb.lower[i]);
        if (!startedUpper) {
          ctx.moveTo(x, yUpper);
          startedUpper = true;
        } else {
          ctx.lineTo(x, yUpper);
        }
      });
      for (let i = bb.lower.length - 1; i >= 0; i--) {
        if (bb.lower[i] !== null) {
          ctx.lineTo(toX(i), toY(bb.lower[i]));
          break;
        }
      }
      for (let i = chartData.length - 1; i >= 0; i--) {
        if (bb.lower[i] !== null) {
          const x = toX(i);
          const yLower = toY(bb.lower[i]);
          ctx.lineTo(x, yLower);
          break;
        }
      }
      ctx.closePath();
      ctx.fill();
    }

    // Area fill with gradient (line mode)
    if (chartMode === 'line') {
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
    }

    // Candlestick rendering
    if (chartMode === 'candle') {
      const candleW = Math.max(1, (CHART_W / chartData.length) * 0.6);
      chartData.forEach((bar, i) => {
        const x = toX(i);
        const yOpen = toY(bar.o);
        const yClose = toY(bar.c);
        const yHigh = toY(bar.h);
        const yLow = toY(bar.l);

        const isGreen = bar.c >= bar.o;
        const candleColor = isGreen ? '#22c55e' : '#ef4444';

        // Wick (high-low line)
        ctx.strokeStyle = candleColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();

        // Body
        const bodyTop = Math.min(yOpen, yClose);
        const bodyHeight = Math.abs(yClose - yOpen);
        ctx.fillStyle = candleColor;
        ctx.fillRect(x - candleW / 2, bodyTop, candleW, Math.max(1, bodyHeight));
      });
    }

    // Bollinger Bands lines
    if (showBB && bb) {
      // Upper band
      ctx.beginPath();
      let started = false;
      bb.upper.forEach((val, i) => {
        if (val === null) return;
        const x = toX(i);
        const y = toY(val);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = 'rgba(139,92,246,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Middle band (already computed as SMA20)
      ctx.beginPath();
      started = false;
      bb.middle.forEach((val, i) => {
        if (val === null) return;
        const x = toX(i);
        const y = toY(val);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = 'rgba(139,92,246,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Lower band
      ctx.beginPath();
      started = false;
      bb.lower.forEach((val, i) => {
        if (val === null) return;
        const x = toX(i);
        const y = toY(val);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = 'rgba(139,92,246,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

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
    if (chartMode === 'line') {
      ctx.beginPath();
      chartData.forEach((bar, i) => {
        const x = toX(i);
        const y = toY(bar.c);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ===== MACD SUB-CHART =====
    if (showMACD && macd && MACD_H > 0) {
      const macdValues = macd.macdLine.filter(v => v !== null);
      const signalValues = macd.signalLine.filter(v => v !== null);
      const histValues = macd.histogram.filter(v => v !== null);
      const allMACD = [...macdValues, ...signalValues, ...histValues];
      const macdMin = Math.min(...allMACD);
      const macdMax = Math.max(...allMACD);
      const macdRange = macdMax - macdMin || 1;
      const macdPad = macdRange * 0.1;

      const macdYMin = macdMin - macdPad;
      const macdYMax = macdMax + macdPad;

      const macdToY = (val) => MACD_Y + MACD_H - ((val - macdYMin) / (macdYMax - macdYMin)) * MACD_H;

      // Grid line
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, MACD_Y);
      ctx.lineTo(CHART_W, MACD_Y);
      ctx.stroke();

      // Histogram bars
      const barW = Math.max(1, (CHART_W / chartData.length) * 0.6);
      chartData.forEach((bar, i) => {
        if (macd.histogram[i] === null) return;
        const x = toX(i);
        const histVal = macd.histogram[i];
        const y0 = macdToY(0);
        const y1 = macdToY(histVal);
        ctx.fillStyle = histVal >= 0 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)';
        ctx.fillRect(x - barW / 2, Math.min(y0, y1), barW, Math.abs(y1 - y0));
      });

      // MACD line
      ctx.beginPath();
      let started = false;
      macd.macdLine.forEach((val, i) => {
        if (val === null) return;
        const x = toX(i);
        const y = macdToY(val);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Signal line
      ctx.beginPath();
      started = false;
      macd.signalLine.forEach((val, i) => {
        if (val === null) return;
        const x = toX(i);
        const y = macdToY(val);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ===== RSI SUB-CHART =====
    if (showRSI && rsi && RSI_H > 0) {
      const rsiValues = rsi.filter(v => v !== null);
      if (rsiValues.length > 0) {
        const rsiMin = 0;
        const rsiMax = 100;

        const rsiToY = (val) => RSI_Y + RSI_H - ((val - rsiMin) / (rsiMax - rsiMin)) * RSI_H;

        // Grid line
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, RSI_Y);
        ctx.lineTo(CHART_W, RSI_Y);
        ctx.stroke();

        // Overbought zone (>70)
        ctx.fillStyle = isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.12)';
        ctx.fillRect(0, RSI_Y, CHART_W, RSI_H * (30 / 100));

        // Oversold zone (<30)
        ctx.fillStyle = isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.12)';
        ctx.fillRect(0, RSI_Y + RSI_H * (70 / 100), CHART_W, RSI_H * (30 / 100));

        // Reference lines at 30 and 70
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(0, rsiToY(30));
        ctx.lineTo(CHART_W, rsiToY(30));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, rsiToY(70));
        ctx.lineTo(CHART_W, rsiToY(70));
        ctx.stroke();
        ctx.setLineDash([]);

        // RSI line
        ctx.beginPath();
        let started = false;
        rsi.forEach((val, i) => {
          if (val === null) return;
          const x = toX(i);
          const y = rsiToY(val);
          if (!started) { ctx.moveTo(x, y); started = true; }
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    // ===== X-AXIS DATE/TIME LABELS =====
    if (chartData.length > 1) {
      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const labelY = usableH + 4;

      // Detect actual data interval from timestamps to determine label format
      const t0 = chartData[0]?.t;
      const t1 = chartData[1]?.t;
      const avgInterval = t0 && t1 ? (chartData[chartData.length - 1].t - t0) / (chartData.length - 1) : 0;
      const isActuallyIntraday = avgInterval > 0 && avgInterval < 4 * 3600 * 1000; // < 4h between bars
      const isActuallyDaily = avgInterval >= 4 * 3600 * 1000 && avgInterval < 5 * 86400 * 1000;
      const isActuallyWeekly = avgInterval >= 5 * 86400 * 1000;

      // Determine total time span
      const totalSpanDays = t0 ? (chartData[chartData.length - 1].t - t0) / 86400000 : 0;

      const maxLabels = Math.floor(CHART_W / 70);
      const step = Math.max(1, Math.floor(chartData.length / maxLabels));

      let prevLabel = '';
      for (let i = 0; i < chartData.length; i += step) {
        const bar = chartData[i];
        if (!bar.t) continue;

        // Convert to US Eastern Time for intraday display
        const d = new Date(bar.t);
        let label = '';

        if (isActuallyIntraday && totalSpanDays <= 1.5) {
          // Single day intraday: show time in ET
          const utcH = d.getUTCHours();
          const utcM = d.getUTCMinutes();
          const month = d.getUTCMonth();
          const isDST = month >= 2 && month <= 10;
          const etOffset = isDST ? -4 : -5;
          let etH = utcH + etOffset;
          if (etH < 0) etH += 24;
          label = `${etH}:${utcM.toString().padStart(2, '0')}`;
        } else if (isActuallyIntraday && totalSpanDays > 1.5) {
          // Multi-day intraday (1W 30min): show date at day boundaries
          const dateKey = `${d.getMonth() + 1}/${d.getDate()}`;
          if (dateKey === prevLabel) continue;
          label = dateKey;
        } else if (totalSpanDays <= 35) {
          // Short range (1W, 1M): show date "3/10"
          label = `${d.getMonth() + 1}/${d.getDate()}`;
        } else if (totalSpanDays > 1000) {
          // Very long range (5Y+): show year, only on change
          const yearStr = `${d.getFullYear()}`;
          if (yearStr === prevLabel) continue;
          label = yearStr;
        } else {
          // Medium range (3M, 1Y): show month, only on change
          const months = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
          const monthLabel = months[d.getMonth()];
          if (monthLabel === prevLabel) continue;
          label = monthLabel;
        }

        prevLabel = label;
        const x = toX(i);
        if (x > 10 && x < CHART_W - 20) {
          ctx.fillText(label, x, labelY);
        }
      }
    }

  }, [chartData, metrics, isDark, showMA, chartMode, showBB, showMACD, showRSI, range, timeframe, prevClose, loading]);

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

    // Calculate layout (same as main chart)
    const MARGIN_B = 22;
    const MARGIN_R = 55;
    const CHART_W = W - MARGIN_R;
    const usableH = H - MARGIN_B;

    let CHART_H, VOL_H, MACD_H, RSI_H, VOL_Y, MACD_Y, RSI_Y;
    const subIndicatorCount = (showMACD ? 1 : 0) + (showRSI ? 1 : 0);

    if (subIndicatorCount === 0) {
      CHART_H = usableH * 0.75;
      VOL_H = usableH * 0.18;
      MACD_H = 0;
      RSI_H = 0;
      VOL_Y = usableH * 0.82;
    } else if (subIndicatorCount === 1) {
      CHART_H = usableH * 0.55;
      VOL_H = usableH * 0.12;
      MACD_H = usableH * 0.25;
      RSI_H = usableH * 0.25;
      VOL_Y = usableH * 0.67;
      MACD_Y = usableH * 0.68;
      RSI_Y = usableH * 0.68;
    } else {
      CHART_H = usableH * 0.45;
      VOL_H = usableH * 0.10;
      MACD_H = usableH * 0.18;
      RSI_H = usableH * 0.18;
      VOL_Y = usableH * 0.55;
      MACD_Y = usableH * 0.56;
      RSI_Y = usableH * 0.75;
    }

    const { min, max, macd, rsi } = metrics;
    const pad = (max - min) * 0.08 || 1;
    const priceMin = min - pad;
    const priceMax = max + pad;

    const bar = chartData[hoverIdx];
    const x = (hoverIdx / (chartData.length - 1)) * CHART_W;
    const y = CHART_H - ((bar.c - priceMin) / (priceMax - priceMin)) * CHART_H;

    ctx.clearRect(0, 0, W, H);

    // Vertical line (full height minus x-axis area)
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, usableH);
    ctx.stroke();

    // Horizontal line in main chart
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

    // MACD hover indicator
    if (showMACD && macd && MACD_H > 0) {
      const macdValues = macd.macdLine.filter(v => v !== null);
      const signalValues = macd.signalLine.filter(v => v !== null);
      const histValues = macd.histogram.filter(v => v !== null);
      const allMACD = [...macdValues, ...signalValues, ...histValues];
      const macdMin = Math.min(...allMACD);
      const macdMax = Math.max(...allMACD);
      const macdRange = macdMax - macdMin || 1;
      const macdPad = macdRange * 0.1;
      const macdYMin = macdMin - macdPad;
      const macdYMax = macdMax + macdPad;
      const macdToY = (val) => MACD_Y + MACD_H - ((val - macdYMin) / (macdYMax - macdYMin)) * MACD_H;

      if (macd.macdLine[hoverIdx] !== null) {
        const macdVal = macd.macdLine[hoverIdx];
        const macdY = macdToY(macdVal);
        ctx.beginPath();
        ctx.moveTo(0, macdY);
        ctx.lineTo(CHART_W, macdY);
        ctx.stroke();
      }
    }

    // RSI hover indicator
    if (showRSI && rsi && RSI_H > 0) {
      const rsiValues = rsi.filter(v => v !== null);
      if (rsiValues.length > 0 && rsi[hoverIdx] !== null) {
        const rsiVal = rsi[hoverIdx];
        const rsiToY = (val) => RSI_Y + RSI_H - ((val - 0) / (100 - 0)) * RSI_H;
        const rsiY = rsiToY(rsiVal);
        ctx.beginPath();
        ctx.moveTo(0, rsiY);
        ctx.lineTo(CHART_W, rsiY);
        ctx.stroke();
      }
    }
  }, [hoverIdx, chartData, metrics, isDark, showMACD, showRSI]);

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
    // Prevent page scroll on touch devices when interacting with chart
    if (e.touches) e.preventDefault();
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

  // Dynamic height based on sub-indicators
  const subIndicatorCount = (showMACD ? 1 : 0) + (showRSI ? 1 : 0);
  let chartHeight = '320px';
  if (subIndicatorCount === 1) chartHeight = '420px';
  else if (subIndicatorCount === 2) chartHeight = '520px';

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
            <span>{TIMEFRAMES.find(tf => tf.key === timeframe)?.label || timeframe} · {chartData.length} bars</span>
          </div>
        ) : null}
      </div>

      {/* Chart container */}
      <div className="relative w-full rounded overflow-hidden transition-all" style={{ height: chartHeight, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
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
          style={{ touchAction: 'none' }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(-1)}
          onTouchStart={handleMove}
          onTouchMove={handleMove}
          onTouchEnd={() => setHoverIdx(-1)}
        />
      </div>

      {/* Timeframe + Indicators + MA toggles */}
      <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
        {/* Timeframe selector (Upbit-style: single row) */}
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map(tf => {
            const active = timeframe === tf.key;
            return (
              <button key={tf.key}
                onClick={() => setTimeframe(tf.key)}
                className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
                style={{
                  background: active ? 'rgba(16,185,129,0.08)' : 'transparent',
                  color: active ? (isDark ? '#fff' : '#000') : (isDark ? '#555' : '#aaa'),
                }}>
                {tf.label}
              </button>
            );
          })}
        </div>

        {/* Chart mode + Indicator toggles */}
        <div className="flex items-center gap-1">
          {/* Line/Candle toggle */}
          <button
            onClick={() => setChartMode(chartMode === 'line' ? 'candle' : 'line')}
            className="px-2 py-1 rounded-md text-[10px] font-bold transition-all"
            style={{
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
              color: isDark ? '#ccc' : '#666',
              outline: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}`,
            }}>
            {chartMode === 'line' ? 'Line' : 'Candle'}
          </button>

          {/* BB toggle */}
          <button
            onClick={() => setShowBB(!showBB)}
            className="px-2 py-1 rounded-md text-[10px] font-bold transition-all"
            style={{
              background: showBB ? 'rgba(139,92,246,0.2)' : 'transparent',
              color: showBB ? '#a855f7' : (isDark ? '#444' : '#bbb'),
              outline: `1px solid ${showBB ? 'rgba(139,92,246,0.2)' : 'transparent'}`,
            }}>
            BB
          </button>

          {/* MACD toggle */}
          <button
            onClick={() => setShowMACD(!showMACD)}
            className="px-2 py-1 rounded-md text-[10px] font-bold transition-all"
            style={{
              background: showMACD ? 'rgba(59,130,246,0.2)' : 'transparent',
              color: showMACD ? '#3b82f6' : (isDark ? '#444' : '#bbb'),
              outline: `1px solid ${showMACD ? 'rgba(59,130,246,0.2)' : 'transparent'}`,
            }}>
            MACD
          </button>

          {/* RSI toggle */}
          <button
            onClick={() => setShowRSI(!showRSI)}
            className="px-2 py-1 rounded-md text-[10px] font-bold transition-all"
            style={{
              background: showRSI ? 'rgba(168,85,247,0.2)' : 'transparent',
              color: showRSI ? '#a855f7' : (isDark ? '#444' : '#bbb'),
              outline: `1px solid ${showRSI ? 'rgba(168,85,247,0.2)' : 'transparent'}`,
            }}>
            RSI
          </button>
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
                  outline: `1px solid ${active ? `${color}20` : 'transparent'}`,
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
                outline: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}`,
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
                  outline: `1px solid ${isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}`,
                }}>
                  {dateStr}
                </td>
                <td className="py-2 px-2 text-right font-bold" style={{
                  color: isDark ? '#fff' : '#000',
                  outline: `1px solid ${isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}`,
                  fontFamily: "'Newsreader', Georgia, serif",
                }}>
                  ${bar.c.toFixed(2)}
                </td>
                <td className="py-2 px-2 text-right font-bold" style={{
                  color: isUp ? '#22c55e' : '#ef4444',
                  outline: `1px solid ${isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}`,
                }}>
                  {prevBar ? `${isUp ? '+' : ''}${changeAbs.toFixed(2)} (${isUp ? '+' : ''}${change.toFixed(2)}%)` : '-'}
                </td>
                <td className="py-2 px-2 text-right" style={{
                  color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                  outline: `1px solid ${isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}`,
                  fontFamily: "'Newsreader', Georgia, serif",
                }}>
                  ${bar.o.toFixed(2)}
                </td>
                <td className="py-2 px-2 text-right" style={{
                  color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                  outline: `1px solid ${isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}`,
                  fontFamily: "'Newsreader', Georgia, serif",
                }}>
                  ${bar.h.toFixed(2)}
                </td>
                <td className="py-2 px-2 text-right" style={{
                  color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                  outline: `1px solid ${isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}`,
                  fontFamily: "'Newsreader', Georgia, serif",
                }}>
                  ${bar.l.toFixed(2)}
                </td>
                <td className="py-2 px-2 text-right" style={{
                  color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                  outline: `1px solid ${isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}`,
                }}>
                  {fmtVolume(bar.v)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {data.length > 5 && (
        <button className="w-full text-center py-2.5 mt-2 text-xs font-medium rounded transition-colors"
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
  const { investors: INVESTORS, holdings: HOLDINGS, quarterlyActivity: QUARTERLY_ACTIVITY, arkDailyTrades: ARK_TRADES, marketStatus } = useData();

  const ticker = initialTicker?.toUpperCase();

  // ---- Polygon data ----
  const [details, setDetails] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [prevClose, setPrevClose] = useState(null);
  const [yearlyBars, setYearlyBars] = useState([]);
  const [tickerNews, setTickerNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
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

    // 뉴스 별도 로드 (non-blocking)
    setNewsLoading(true);
    polygon.getTickerNews(ticker, 5)
      .then(news => setTickerNews(news))
      .catch(() => setTickerNews([]))
      .finally(() => setNewsLoading(false));
  }, [ticker]);

  // ---- FolioObs data: 이 종목을 보유한 투자자들 ----
  const stockHolders = useMemo(() => {
    const holders = [];
    const holderIds = new Set();

    INVESTORS.forEach(inv => {
      const invHoldings = HOLDINGS[inv.id] || [];
      const match = invHoldings.filter(h => h.ticker?.toUpperCase() === ticker?.toUpperCase());
      if (match.length > 0) {
        const totalValue = match.reduce((s, h) => s + h.value, 0);
        const totalPct = match.reduce((s, h) => s + h.pct, 0);
        const totalShares = match.reduce((s, h) => s + h.shares, 0);

        let action = null;
        const acts = QUARTERLY_ACTIVITY[inv.id] || [];
        if (acts.length > 0 && acts[0]?.actions) {
          action = acts[0].actions.find(a => a.ticker?.toUpperCase() === ticker?.toUpperCase());
        }

        holders.push({ investor: inv, value: totalValue, pct: totalPct, shares: totalShares, action });
        holderIds.add(inv.id);
      }
    });

    // ARK daily trades: 최근 매수 기록이 있지만 holdings에 없는 종목도 포함
    // ARK_TRADES 구조: [{ date, trades: [{ ticker, direction, sharesChange, ... }] }, ...]
    if (ARK_TRADES?.length > 0) {
      // 날짜별 그룹을 flat하게 펼침
      const allTrades = ARK_TRADES.flatMap(day => day.trades || []);
      const tickerTrades = allTrades.filter(t => t.ticker?.toUpperCase() === ticker?.toUpperCase());
      if (tickerTrades.length > 0) {
        const netShares = tickerTrades.reduce((sum, t) => sum + (t.direction === 'buy' ? (t.sharesChange || 0) : -(t.sharesChange || 0)), 0);
        if (netShares > 0) {
          // 캐시 우드 (ARK) 투자자 찾기
          const cwInvestor = INVESTORS.find(inv => inv.name?.toLowerCase().includes('cathie') || inv.name?.includes('캐시'));
          if (cwInvestor && !holderIds.has(cwInvestor.id)) {
            holders.push({
              investor: cwInvestor,
              value: 0,
              pct: 0,
              shares: netShares,
              action: { type: 'new', ticker, shares: netShares },
              fromTrades: true,
            });
          }
        }
      }
    }

    return holders.sort((a, b) => b.value - a.value);
  }, [INVESTORS, HOLDINGS, QUARTERLY_ACTIVITY, ARK_TRADES, ticker]);

  // ---- Price info ----
  const priceInfo = useMemo(() => {
    if (!snapshot) return null;
    const prevDayClose = snapshot.prevDay?.c || 0;
    // 정규장 종가 (day.c 우선)
    const regularClose = snapshot.day?.c || prevDayClose || 0;
    const regularChange = prevDayClose > 0 ? regularClose - prevDayClose : 0;
    const regularChangePerc = prevDayClose > 0 ? (regularChange / prevDayClose) * 100 : 0;

    // 애프터마켓 감지 (이중 체크 — 더 큰 차이를 사용)
    // 방법1: todaysChange(전체) vs regularChange(정규장)
    const totalChange = snapshot.todaysChange || 0;
    const ahDiff1 = totalChange - regularChange;
    // 방법2: lastTrade.p vs day.c (직접 비교)
    const lastTradeP = snapshot.lastTrade?.p || snapshot.min?.p || 0;
    const ahDiff2 = lastTradeP > 0 ? lastTradeP - regularClose : 0;
    // 둘 중 절대값이 큰 쪽 사용 (더 정확한 데이터)
    const ahDiff = Math.abs(ahDiff1) >= Math.abs(ahDiff2) ? ahDiff1 : ahDiff2;
    const hasAfterHours = Math.abs(ahDiff) > 0.005;
    const ahPrice = hasAfterHours ? regularClose + ahDiff : null;
    const ahChange = hasAfterHours ? ahDiff : null;
    const ahChangePerc = hasAfterHours && regularClose > 0 ? (ahDiff / regularClose) * 100 : null;

    const dayVolume = snapshot.day?.v || 0;
    const dayOpen = snapshot.day?.o || 0;
    const dayHigh = snapshot.day?.h || 0;
    const dayLow = snapshot.day?.l || 0;
    return {
      price: regularClose,
      change: regularChange,
      changePerc: regularChangePerc,
      volume: dayVolume, open: dayOpen, high: dayHigh, low: dayLow, prevClose: prevDayClose,
      // 애프터마켓
      ahPrice, ahChange, ahChangePerc,
    };
  }, [snapshot]);

  // ---- Company details ----
  const companyInfo = useMemo(() => {
    if (!details) return null;
    // holdings에서 한국어 종목명 찾기
    let koName = null;
    for (const inv of INVESTORS) {
      const h = (HOLDINGS[inv.id] || []).find(h => h.ticker?.toUpperCase() === ticker?.toUpperCase());
      if (h?.name) { koName = h.name; break; }
    }
    return {
      name: koName || details.name || ticker,
      nameEn: details.name || ticker,
      description: details.description || '',
      sector: details.sic_description || '',
      marketCap: details.market_cap || 0,
      employees: details.total_employees || 0,
      homepageUrl: details.homepage_url || '',
      exchange: details.primary_exchange || '',
    };
  }, [details, ticker, INVESTORS, HOLDINGS]);

  // ---- 52-week high/low & period performance ----
  const priceHighlights = useMemo(() => {
    if (yearlyBars.length === 0 || !priceInfo) return null;
    const currentPrice = priceInfo.price;

    // Filter out old company data for recycled tickers.
    // Detect price discontinuity: >70% day-over-day gap = ticker changed hands.
    // Only use bars AFTER the last such discontinuity.
    let validBars = yearlyBars;
    if (yearlyBars.length > 1) {
      let lastBreak = -1;
      for (let i = 1; i < yearlyBars.length; i++) {
        const prevClose = yearlyBars[i - 1].c;
        const curOpen = yearlyBars[i].o;
        if (prevClose > 0 && curOpen > 0) {
          const change = Math.abs(curOpen - prevClose) / prevClose;
          if (change > 0.70) lastBreak = i;
        }
      }
      if (lastBreak > 0) validBars = yearlyBars.slice(lastBreak);
    }

    // 52W high / low
    let high52 = { price: -Infinity, date: null };
    let low52 = { price: Infinity, date: null };
    validBars.forEach(bar => {
      if (bar.h > high52.price) { high52 = { price: bar.h, date: new Date(bar.t) }; }
      if (bar.l < low52.price) { low52 = { price: bar.l, date: new Date(bar.t) }; }
    });

    const fromHigh = high52.price > 0 ? ((currentPrice - high52.price) / high52.price * 100) : 0;
    const fromLow = low52.price > 0 ? ((currentPrice - low52.price) / low52.price * 100) : 0;

    // Position in 52W range (0-100%)
    const range52 = high52.price - low52.price;
    const position52 = range52 > 0 ? ((currentPrice - low52.price) / range52 * 100) : 50;

    // Period returns: find bar closest to N days ago (using validBars only)
    const getReturn = (daysAgo) => {
      if (validBars.length === 0) return null;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - daysAgo);
      const targetTs = targetDate.getTime();
      let closest = validBars[0];
      let minDiff = Infinity;
      for (const bar of validBars) {
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
        className="flex items-center gap-1.5 mb-4 px-3 py-1.5 rounded text-sm font-medium transition-all hover:opacity-70"
        style={{ color: t.textMuted }}>
        <ArrowLeft size={16} /> {L.t('common.back')}
      </button>

      {/* ===== HEADER: Logo + Name + Price ===== */}
      <div className="flex items-start gap-4 mb-6">
        <CompanyLogo ticker={ticker} details={details} isDark={isDark} textSecondary={t.textSecondary} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: t.text, fontFamily: "'Newsreader', Georgia, serif" }}>{ticker}</h1>
            {companyInfo?.exchange && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: t.textMuted }}>
                {companyInfo.exchange.replace('XNAS', 'NASDAQ').replace('XNYS', 'NYSE')}
              </span>
            )}
          </div>
          <p className="text-sm mt-0.5" style={{ color: t.textMuted }}>
            {loadingInfo ? '...' : (companyInfo ? L.stockName(companyInfo) : ticker)}
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          {priceInfo ? (
            <>
              {/* 정규장 가격 */}
              <div className="text-2xl font-bold tracking-tight" style={{ color: t.text, fontFamily: "'Newsreader', Georgia, serif" }}>
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
                {L.locale === 'ko' ? '전일 종가 대비 · 15분 지연' : 'vs prev close · 15min delayed'}
              </p>

              {/* 프리마켓/애프터마켓 라인 (장외 시간에만 표시) */}
              {(marketStatus === 'pre-market' || marketStatus === 'after-hours') && priceInfo.ahPrice != null && (() => {
                const ahUp = priceInfo.ahChange >= 0;
                const ahColor = ahUp ? t.green : t.red;
                const isPre = marketStatus === 'pre-market';
                const labelColor = isPre ? '#8b5cf6' : '#f59e0b';
                return (
                  <div className="mt-1 text-[12px]" style={{ color: t.textMuted }}>
                    <span style={{ color: labelColor, fontWeight: 600, opacity: 0.9 }}>{isPre ? 'Pre-Market' : 'After Market'}</span>{' '}
                    <span className="font-semibold" style={{ color: t.text }}>{priceInfo.ahPrice.toFixed(2)}</span>{' '}
                    <span className="font-semibold" style={{ color: ahColor }}>
                      {ahUp ? '\u25B2' : '\u25BC'}{Math.abs(priceInfo.ahChange).toFixed(2)} ({Math.abs(priceInfo.ahChangePerc).toFixed(2)}%)
                    </span>
                  </div>
                );
              })()}
            </>
          ) : loadingInfo ? (
            <div className="w-24 h-10 rounded animate-pulse" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }} />
          ) : null}
        </div>
      </div>

      {/* ===== CHART ===== */}
      <GlassCard hover={false} className="mt-8">
        <div className="p-4 sm:p-5">
          <StockChart ticker={ticker} theme={t.name} />
        </div>
      </GlassCard>

      {/* ===== KEY STATS ===== */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6">
          {stats.map((stat, i) => (
            <div key={i} className="px-3 py-2.5 rounded" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', outline: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
              <p className="text-[11px]" style={{ color: t.textMuted }}>{stat.label}</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: t.text, fontFamily: "'Newsreader', Georgia, serif" }}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ===== 52-WEEK RANGE & PERFORMANCE ===== */}
      {priceHighlights && (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 52-Week Range Card */}
          <GlassCard hover={false}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target size={14} style={{ color: t.accent }} />
                <span className="text-xs font-bold" style={{ color: t.text, fontFamily: "'Newsreader', Georgia, serif" }}>
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
                <div className="px-2.5 py-2 rounded" style={{ background: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)' }}>
                  <p className="text-[10px] font-medium" style={{ color: t.red, fontFamily: "'Newsreader', Georgia, serif" }}>
                    {L.locale === 'ko' ? '52주 최저' : '52W Low'}
                  </p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: t.text, fontFamily: "'Newsreader', Georgia, serif" }}>{fmtPrice(priceHighlights.low52.price)}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: t.green }}>
                    +{priceHighlights.fromLow.toFixed(1)}%
                    <span style={{ color: t.textMuted }}> · {priceHighlights.low52.date?.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </p>
                </div>
                <div className="px-2.5 py-2 rounded" style={{ background: isDark ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.04)' }}>
                  <p className="text-[10px] font-medium" style={{ color: t.green, fontFamily: "'Newsreader', Georgia, serif" }}>
                    {L.locale === 'ko' ? '52주 최고' : '52W High'}
                  </p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: t.text, fontFamily: "'Newsreader', Georgia, serif" }}>{fmtPrice(priceHighlights.high52.price)}</p>
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
                <span className="text-xs font-bold" style={{ color: t.text, fontFamily: "'Newsreader', Georgia, serif" }}>
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
                        style={{ color: isUp ? t.green : t.red, fontFamily: "'Newsreader', Georgia, serif" }}>
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
      <div className="mt-8">
        <GlassCard hover={false}>
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} style={{ color: t.accent }} />
              <h3 className="text-sm font-bold" style={{ color: t.text, fontFamily: "'Newsreader', Georgia, serif" }}>
                {L.locale === 'ko' ? '일별 시세' : 'Daily Price History'}
              </h3>
            </div>
            <DailyPriceTable ticker={ticker} theme={t.name} locale={L.locale} />
          </div>
        </GlassCard>
      </div>

      {/* ===== WHO'S HOLDING — FolioObs 핵심 ===== */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-6" style={{borderLeft: `3px solid ${t.accent}`, paddingLeft: '12px'}}>
          <h2 className="text-lg font-bold" style={{ color: t.text, fontFamily: "'Newsreader', Georgia, serif" }}>
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
                  <div className="w-10 h-10 rounded flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
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

      {/* ===== NEWS ===== */}
      {(tickerNews.length > 0 || newsLoading) && (
        <div className="mt-8">
          <GlassCard hover={false}>
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Newspaper size={16} style={{ color: t.textMuted }} />
                <h3 className="text-sm font-bold" style={{ color: t.text, fontFamily: "'Newsreader', Georgia, serif" }}>
                  {L.locale === 'ko' ? '관련 뉴스' : 'Related News'}
                </h3>
              </div>
              {newsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: `${t.accent}33`, borderTopColor: t.accent }} />
                </div>
              ) : (
                <div className="space-y-0">
                  {tickerNews.map((news, i) => {
                    const pubDate = news.publishedAt ? new Date(news.publishedAt) : null;
                    const timeAgo = pubDate ? (() => {
                      const diff = Date.now() - pubDate.getTime();
                      const mins = Math.floor(diff / 60000);
                      const hrs = Math.floor(diff / 3600000);
                      const days = Math.floor(diff / 86400000);
                      if (L.locale === 'ko') {
                        if (mins < 60) return `${mins}분 전`;
                        if (hrs < 24) return `${hrs}시간 전`;
                        if (days < 7) return `${days}일 전`;
                        return pubDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                      } else {
                        if (mins < 60) return `${mins}m ago`;
                        if (hrs < 24) return `${hrs}h ago`;
                        if (days < 7) return `${days}d ago`;
                        return pubDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }
                    })() : '';
                    const isDark = t.name === 'dark';
                    return (
                      <a key={news.id || i} href={news.articleUrl} target="_blank" rel="noopener noreferrer"
                        className="flex gap-3 py-3 transition-colors"
                        style={{ outlineTop: i > 0 ? `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}` : 'none', borderTop: i > 0 ? `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}` : 'none' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug mb-1.5" style={{ color: t.text, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {news.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs" style={{ color: t.textMuted }}>
                            {news.source && <span>{news.source}</span>}
                            {news.source && timeAgo && <span>·</span>}
                            {timeAgo && <span>{timeAgo}</span>}
                          </div>
                        </div>
                        {news.imageUrl && (
                          <div className="w-16 h-16 sm:w-20 sm:h-16 rounded overflow-hidden flex-shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                            <img src={news.imageUrl} alt="" className="w-full h-full object-cover"
                              onError={e => { e.target.style.display = 'none'; }} />
                          </div>
                        )}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ===== COMPANY DESCRIPTION ===== */}
      {companyInfo?.description && (
        <div className="mt-8">
          <GlassCard hover={false}>
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={16} style={{ color: t.textMuted }} />
                <h3 className="text-sm font-bold" style={{ color: t.text, fontFamily: "'Newsreader', Georgia, serif" }}>
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
