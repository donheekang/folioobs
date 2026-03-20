import { ArrowLeft, Heart } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useLocale } from "../hooks/useLocale";
import { useData } from "../hooks/useDataProvider";
import { formatUSD } from "../utils/format";
import { GlassCard, WatchButton } from "../components/shared";

const WatchlistPage = ({ onBack, onNavigate, watchlist }) => {
  const t = useTheme();
  const L = useLocale();
  const { investors: INVESTORS, holdings: HOLDINGS, quarterlyHistory: QUARTERLY_HISTORY, quarterlyActivity: QUARTERLY_ACTIVITY } = useData();
  const { watchInvestors, watchTickers, toggleInvestor, toggleTicker, isWatchedInv, isWatchedTkr } = watchlist;

  const watchedInvs = INVESTORS.filter(inv => watchInvestors.includes(inv.id));
  const watchedStocks = watchTickers.map(ticker => {
    const holders = [];
    INVESTORS.forEach(inv => {
      const h = (HOLDINGS[inv.id] || []).find(h => h.ticker === ticker);
      if (h) holders.push({ investor: inv, holding: h });
    });
    return { ticker, holders };
  }).filter(s => s.holders.length > 0);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm" style={{ color: t.textMuted }}><ArrowLeft size={16} /> {L.t('common.back')}</button>
      <div className="flex items-center gap-2">
        <Heart size={22} style={{ color: t.red }} />
        <h1 className="text-2xl font-bold" style={{ color: t.text }}>{L.t('watchlistPage.title')}</h1>
        <span className="text-sm" style={{ color: t.textMuted }}>{watchInvestors.length + watchTickers.length}{L.t('common.items')}</span>
      </div>

      {watchInvestors.length === 0 && watchTickers.length === 0 && (
        <div className="text-center py-16">
          <Heart size={40} style={{ color: t.textMuted, opacity: 0.3 }} className="mx-auto mb-4" />
          <p className="text-sm" style={{ color: t.textMuted }}>{L.t('watchlistPage.emptyMessage')}</p>
          <p className="text-xs mt-1" style={{ color: t.textMuted }}>{L.t('watchlistPage.emptyHint')}</p>
        </div>
      )}

      {watchedInvs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: t.textSecondary }}>{L.t('watchlistPage.watchedInvestors')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {watchedInvs.map(inv => {
              const h = HOLDINGS[inv.id] || [];
              const hist = QUARTERLY_HISTORY[inv.id] || [];
              const activity = QUARTERLY_ACTIVITY[inv.id] || [];
              const latestActions = activity[0]?.actions || [];
              const buys = latestActions.filter(a => a.type === 'new' || a.type === 'buy').length;
              const sells = latestActions.filter(a => a.type === 'sell').length;
              return (
                <GlassCard key={inv.id} onClick={() => onNavigate("investor", inv.id)}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: inv.gradient }}>{inv.avatar}</div>
                        <div>
                          <div className="font-semibold text-sm" style={{ color: t.text }}>{L.investorName(inv)}</div>
                          <div className="text-xs" style={{ color: t.textMuted }}>{formatUSD(inv.aum)} · {inv.metrics.holdingCount}{L.t('common.stocks_count')}</div>
                        </div>
                      </div>
                      <WatchButton active={true} onClick={() => toggleInvestor(inv.id)} />
                    </div>
                    {latestActions.length > 0 && (
                      <div className="flex items-center gap-3 text-xs" style={{ color: t.textMuted }}>
                        <span>{L.t('watchlistPage.recentQuarter')}:</span>
                        {buys > 0 && <span style={{ color: t.green }}>{L.t('watchlistPage.buys')} {buys}{L.t('watchlistPage.trades')}</span>}
                        {sells > 0 && <span style={{ color: t.red }}>{L.t('watchlistPage.sells')} {sells}{L.t('watchlistPage.trades')}</span>}
                      </div>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}

      {watchedStocks.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: t.textSecondary }}>{L.t('watchlistPage.watchedStocks')}</h2>
          <div className="space-y-2">
            {watchedStocks.map(({ ticker, holders }) => (
              <GlassCard key={ticker}>
                <div className="flex items-center gap-3 p-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm cursor-pointer hover:underline" style={{ color: t.accent }} onClick={()=>onNavigate("stock",ticker)}>{ticker}</span>
                      <span className="text-xs" style={{ color: t.textMuted }}>{holders[0]?.holding ? L.stockName(holders[0].holding) : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {holders.map(h => (
                        <button key={h.investor.id} onClick={() => onNavigate("investor", h.investor.id)}
                          className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                          style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', color: t.textSecondary }}>
                          <span className="w-4 h-4 rounded flex items-center justify-center text-white" style={{ background: h.investor.gradient, fontSize: 8 }}>{h.investor.avatar}</span>
                          {h.holding.pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <WatchButton active={true} onClick={() => toggleTicker(ticker)} />
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WatchlistPage;
