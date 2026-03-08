import { memo } from "react";
import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";
import { Heart, Moon, Sun, Plus, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useData } from "../hooks/useDataProvider";
import { useLocale } from "../hooks/useLocale";
import { formatQuarterKo, formatChange } from "../utils/format";

export const GlassCard = memo(({ children, className = "", glow, onClick, hover = true }) => {
  const t = useTheme();
  const interactive = !!onClick;
  return (
    <div onClick={onClick} className={`rounded-2xl ${interactive ? 'cursor-pointer' : ''} ${className}`}
      {...(interactive ? { role: 'button', tabIndex: 0, onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } } : {})}
      style={{
        background: t.name === 'dark' ? t.surface : t.glassBg,
        border: `1px solid ${t.glassBorder}`,
        transition: 'all 0.25s ease',
      }}
      onMouseEnter={e => { if(hover){e.currentTarget.style.borderColor=t.glassBorderHover;e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow=t.name==='dark'?'0 4px 16px rgba(0,0,0,0.4)':'0 4px 16px rgba(0,0,0,0.06)';} }}
      onMouseLeave={e => { if(hover){e.currentTarget.style.borderColor=t.glassBorder;e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';} }}>
      {children}
    </div>
  );
});
GlassCard.displayName = "GlassCard";

export const Badge = memo(({ children, color }) => {
  const t = useTheme();
  const c = color || t.accent;
  return (
    <span className="inline-flex items-center gap-1 rounded-full font-medium px-2.5 py-0.5 text-xs"
      style={{ background: `${c}${t.badgeBgAlpha}`, color: c }}>
      {children}
    </span>
  );
});
Badge.displayName = "Badge";

export const GlowText = ({ children, color }) => {
  const t = useTheme();
  const c = color || t.accent;
  return <span style={{ color: c, fontWeight: 600 }}>{children}</span>;
};

export const MiniChart = memo(({ data, color, height = 40, width = 100 }) => {
  const id = `mc-${color.replace('#','')}`;
  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={data}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.3}/><stop offset="100%" stopColor={color} stopOpacity={0}/></linearGradient></defs>
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
});
MiniChart.displayName = "MiniChart";

export const ChartTooltip = ({ active, payload, label }) => {
  const t = useTheme();
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: t.tooltipBg, border: `1px solid ${t.glassBorder}`, backdropFilter: t.glassBlur, borderRadius: 12, padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
      <div style={{ color: t.textMuted, fontSize: 11, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || t.text, fontSize: 13, fontWeight: 600 }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</div>
      ))}
    </div>
  );
};

export const WatchButton = ({ active, onClick, size = 16 }) => {
  const t = useTheme();
  const L = useLocale();
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="p-1.5 rounded-full transition-all hover:scale-110"
      style={{ color: active ? t.red : t.textMuted, opacity: active ? 1 : 0.4 }}
      title={active ? L.t('shared.removeFromWatchlist') : L.t('shared.addToWatchlist')}
      aria-label={active ? L.t('shared.removeFromWatchlist') : L.t('shared.addToWatchlist')}
      aria-pressed={active}>
      <Heart size={size} fill={active ? "currentColor" : "none"} />
    </button>
  );
};

export const ThemeToggle = ({ theme, onToggle }) => {
  const L = useLocale();
  return (
    <button onClick={onToggle} className="p-1.5 rounded-full transition hover:opacity-70"
      style={{ color: theme === 'dark' ? '#f5f5f7' : '#1d1d1f' }}
      aria-label={theme === 'dark' ? L.t('nav.lightMode') : L.t('nav.darkMode')}
      title={theme === 'dark' ? L.t('nav.lightMode') : L.t('nav.darkMode')}>
      {theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}
    </button>
  );
};

export const QuarterlyTimeline = ({ investorId }) => {
  const t = useTheme();
  const L = useLocale();
  const { quarterlyActivity: QUARTERLY_ACTIVITY } = useData();
  const activities = QUARTERLY_ACTIVITY[investorId] || [];
  if (activities.length === 0) return null;

  const typeConfig = {
    new: { label: L.t('common.new'), color: t.accent, icon: Plus, bg: t.name === 'dark' ? 'rgba(41,151,255,0.1)' : 'rgba(0,113,227,0.06)' },
    buy: { label: L.t('common.buy'), color: t.green, icon: ArrowUpRight, bg: t.name === 'dark' ? 'rgba(48,209,88,0.1)' : 'rgba(40,167,69,0.06)' },
    sell: { label: L.t('common.sell'), color: t.red, icon: ArrowDownRight, bg: t.name === 'dark' ? 'rgba(255,69,58,0.1)' : 'rgba(222,55,48,0.06)' },
    exit: { label: L.t('common.exit'), color: t.red, icon: ArrowDownRight, bg: t.name === 'dark' ? 'rgba(255,69,58,0.1)' : 'rgba(222,55,48,0.06)' },
    hold: { label: L.t('common.hold'), color: t.textMuted, icon: Minus, bg: 'transparent' },
  };

  return (
    <div className="space-y-4">
      {activities.map((quarter, qi) => (
        <div key={qi}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: qi === 0 ? t.accent : t.textMuted }} />
            <span className="text-sm font-semibold" style={{ color: qi === 0 ? t.text : t.textSecondary }}>{L.quarter(quarter.q)}</span>
            {qi === 0 && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: t.name === 'dark' ? 'rgba(41,151,255,0.1)' : 'rgba(0,113,227,0.06)', color: t.accent }}>{L.t('common.latest')}</span>}
          </div>
          <div className="ml-3 pl-3 space-y-1.5" style={{ borderLeft: `1px solid ${t.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
            {quarter.actions.map((action, ai) => {
              const cfg = typeConfig[action.type] || typeConfig.hold;
              const Icon = cfg.icon;
              return (
                <div key={ai} className="flex items-center gap-3 py-1.5 px-2 rounded-lg transition-colors"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = t.cardRowHover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                    <Icon size={12} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium" style={{ color: t.text }}>{action.ticker}</span>
                    <span className="text-xs ml-1.5" style={{ color: t.textMuted }}>{action.name}</span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: cfg.color }}>
                    {action.type === 'new' ? L.t('common.new') : action.type === 'hold' ? L.t('common.hold') : (() => { const v = formatChange(action.pctChange); return v === '대폭 확대' ? L.t('common.significantIncrease') : (v || '—'); })()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
