import { useState, useEffect, useMemo, memo, Fragment } from "react";
import { useTheme } from "../hooks/useTheme";
import { useData } from "../hooks/useDataProvider";
import { useLocale } from "../hooks/useLocale";

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
};

const OverlapHeatmap = memo(({ onNavigate }) => {
  const t = useTheme();
  const L = useLocale();
  const { investors: INVESTORS, holdings: HOLDINGS } = useData();
  const [hoveredCell, setHoveredCell] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const isMobile = useIsMobile();

  const { matrix, commonStocks } = useMemo(() => {
    const invIds = INVESTORS.map(i => i.id);
    const holdingsMap = {};
    invIds.forEach(id => {
      holdingsMap[id] = new Set((HOLDINGS[id] || []).map(h => h.ticker));
    });
    const matrix = {};
    const commonStocks = {};
    invIds.forEach(a => {
      matrix[a] = {};
      commonStocks[a] = {};
      invIds.forEach(b => {
        if (a === b) {
          matrix[a][b] = holdingsMap[a].size;
          commonStocks[a][b] = [...holdingsMap[a]];
        } else {
          const common = [...holdingsMap[a]].filter(tk => holdingsMap[b].has(tk));
          matrix[a][b] = common.length;
          commonStocks[a][b] = common;
        }
      });
    });
    return { matrix, commonStocks };
  }, [INVESTORS, HOLDINGS]);

  const maxOverlap = useMemo(() => {
    let max = 0;
    INVESTORS.forEach(a => INVESTORS.forEach(b => {
      if (a.id !== b.id) max = Math.max(max, matrix[a.id][b.id]);
    }));
    return max;
  }, [matrix]);

  const getColor = (val, isDiag) => {
    if (isDiag) return 'transparent';
    if (val === 0) return 'transparent';
    const intensity = val / Math.max(maxOverlap, 1);
    return t.name === 'dark'
      ? `rgba(41, 151, 255, ${0.12 + intensity * 0.58})`
      : `rgba(0, 113, 227, ${0.06 + intensity * 0.44})`;
  };

  const cellSize = isMobile ? 30 : 42;
  const labelWidth = isMobile ? 36 : 72;

  // Get detail info for selected cell's common stocks
  const selectedDetail = useMemo(() => {
    if (!selectedCell) return null;
    const a = INVESTORS.find(i => i.id === selectedCell.row);
    const b = INVESTORS.find(i => i.id === selectedCell.col);
    if (!a || !b) return null;
    const common = commonStocks[selectedCell.row]?.[selectedCell.col] || [];
    // Enrich with holdings data (pct from each investor)
    const enriched = common.map(ticker => {
      const hA = (HOLDINGS[a.id] || []).find(h => h.ticker === ticker);
      const hB = (HOLDINGS[b.id] || []).find(h => h.ticker === ticker);
      return {
        ticker,
        name: hA?.name || hB?.name || '',
        pctA: hA?.pct ?? 0,
        pctB: hB?.pct ?? 0,
        valueA: hA?.value ?? 0,
        valueB: hB?.value ?? 0,
      };
    }).sort((x, y) => (y.pctA + y.pctB) - (x.pctA + x.pctB));
    return { a, b, stocks: enriched };
  }, [selectedCell, INVESTORS, HOLDINGS, commonStocks]);

  return (
    <div>
      <div className="overflow-x-auto" role="grid" aria-label={L.t('nav.overlapHeatmap')}>
        <div style={{
          display: "grid",
          gridTemplateColumns: `${labelWidth}px repeat(${INVESTORS.length}, ${cellSize}px)`,
          gap: "2px",
          justifyContent: "center",
          alignItems: "center",
        }}>
          {/* Header row: empty corner + investor avatars */}
          <div />
          {INVESTORS.map(inv => (
            <div key={inv.id} className="flex flex-col items-center gap-0.5 pb-1 cursor-pointer"
              onClick={() => onNavigate && onNavigate("investor", inv.id)}>
              <div className={`${isMobile ? 'w-5 h-5 text-[9px]' : 'w-7 h-7 text-xs'} rounded-lg flex items-center justify-center text-white font-bold hover:scale-110 transition-transform`}
                style={{ background: inv.gradient }}>{inv.avatar}</div>
            </div>
          ))}

          {/* Data rows */}
          {INVESTORS.map(rowInv => (
            <Fragment key={`row-${rowInv.id}`}>
              {/* Row label — avatar on mobile, full name on desktop */}
              <div
                className="flex items-center justify-end pr-1 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ height: `${cellSize}px` }}
                onClick={() => onNavigate && onNavigate("investor", rowInv.id)}>
                {isMobile ? (
                  <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold"
                    style={{ background: rowInv.gradient }}>{rowInv.avatar}</div>
                ) : (
                  <span className="text-xs font-medium text-right leading-tight" style={{ color: t.textSecondary }}>
                    {L.investorName(rowInv)}
                  </span>
                )}
              </div>
              {/* Cells */}
              {INVESTORS.map(colInv => {
                const val = matrix[rowInv.id]?.[colInv.id] ?? 0;
                const isDiag = rowInv.id === colInv.id;
                const isHovered = hoveredCell?.row === rowInv.id && hoveredCell?.col === colInv.id;
                const isSelected = selectedCell?.row === rowInv.id && selectedCell?.col === colInv.id;
                const hasValue = !isDiag && val > 0;
                return (
                  <div key={`${rowInv.id}-${colInv.id}`}
                    className="rounded-lg flex items-center justify-center transition-all"
                    style={{
                      width: `${cellSize}px`, height: `${cellSize}px`,
                      background: getColor(val, isDiag),
                      color: hasValue ? '#fff' : t.textMuted,
                      border: (isHovered || isSelected) && hasValue
                        ? `2px solid ${t.accent}`
                        : isDiag
                          ? `1px dashed ${t.name === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
                          : '2px solid transparent',
                      cursor: hasValue ? 'pointer' : 'default',
                      fontWeight: hasValue ? 700 : 400,
                      fontSize: isDiag ? (isMobile ? '8px' : '10px') : (isMobile ? '11px' : '14px'),
                      opacity: isDiag ? 0.5 : 1,
                      transform: isSelected && hasValue ? 'scale(1.1)' : 'none',
                    }}
                    onMouseEnter={() => !isDiag && setHoveredCell({ row: rowInv.id, col: colInv.id })}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => {
                      if (hasValue) {
                        if (isSelected) {
                          setSelectedCell(null);
                        } else {
                          setSelectedCell({ row: rowInv.id, col: colInv.id });
                        }
                      }
                    }}>
                    {isDiag ? (isMobile ? val : `${val}${L.t('shared.stocksUnit')}`) : (val || "")}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-2 mt-3 justify-center">
        <span className="text-xs" style={{ color: t.textMuted }}>{L.t('shared.less')}</span>
        <div className="flex gap-0.5">
          {[0.15, 0.3, 0.45, 0.6, 0.75].map((op, i) => (
            <div key={i} className="w-5 h-3 rounded-sm"
              style={{ background: t.name === 'dark' ? `rgba(41,151,255,${op})` : `rgba(0,113,227,${op * 0.7})` }} />
          ))}
        </div>
        <span className="text-xs" style={{ color: t.textMuted }}>{L.t('shared.more')}</span>
        <span className="text-xs ml-2" style={{ color: t.textMuted }}>= {L.t('shared.commonStocksCount')}</span>
      </div>

      {/* Hover detail (shown when hovering, but not when a cell is selected) */}
      {!selectedCell && hoveredCell && hoveredCell.row !== hoveredCell.col && (() => {
        const a = INVESTORS.find(i => i.id === hoveredCell.row);
        const b = INVESTORS.find(i => i.id === hoveredCell.col);
        const common = commonStocks[hoveredCell.row][hoveredCell.col];
        return (
          <div className="mt-2 px-3 py-2.5 rounded-xl text-xs"
            style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-xs font-bold"
                style={{ background: a.gradient }}>{a.avatar}</div>
              <span style={{ color: t.textMuted }}>×</span>
              <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-xs font-bold"
                style={{ background: b.gradient }}>{b.avatar}</div>
              <span className="font-medium" style={{ color: t.text }}>{L.investorName(a)} & {L.investorName(b)}</span>
            </div>
            {common.length > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span style={{ color: t.textMuted }}>{L.t('shared.commonCount')} {common.length}{L.t('shared.stocksUnit')}:</span>
                {common.map(tk => (
                  <span key={tk} className="px-1.5 py-0.5 rounded font-medium"
                    style={{ background: `${t.accent}15`, color: t.accent }}>{tk}</span>
                ))}
              </div>
            ) : (
              <span style={{ color: t.textMuted }}>{L.t('shared.noCommonStocks')}</span>
            )}
          </div>
        );
      })()}

      {/* Selected cell detail — expanded common stocks list */}
      {selectedDetail && (
        <div className="mt-4 rounded-2xl overflow-hidden"
          style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${t.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: `1px solid ${t.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
                style={{ background: selectedDetail.a.gradient }}>{selectedDetail.a.avatar}</div>
              <span style={{ color: t.textMuted }}>×</span>
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
                style={{ background: selectedDetail.b.gradient }}>{selectedDetail.b.avatar}</div>
              <span className="font-bold text-sm" style={{ color: t.text }}>
                {L.locale === 'ko' ? '공동 보유' : 'Common Holdings'} ({selectedDetail.stocks.length})
              </span>
            </div>
            <button onClick={() => setSelectedCell(null)}
              className="text-xs px-2 py-1 rounded-lg hover:opacity-80 transition-opacity"
              style={{ color: t.textMuted, background: t.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
              ✕
            </button>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium"
            style={{ color: t.textMuted, borderBottom: `1px solid ${t.name === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
            <div className="col-span-2">{L.locale === 'ko' ? '티커' : 'Ticker'}</div>
            <div className="col-span-4">{L.locale === 'ko' ? '종목명' : 'Name'}</div>
            <div className="col-span-3 text-right">{L.investorName(selectedDetail.a)} %</div>
            <div className="col-span-3 text-right">{L.investorName(selectedDetail.b)} %</div>
          </div>

          {/* Stock rows */}
          <div className="max-h-80 overflow-y-auto">
            {selectedDetail.stocks.map((s, i) => (
              <div key={s.ticker}
                className="grid grid-cols-12 gap-2 px-4 py-2.5 text-sm items-center hover:opacity-80 transition-opacity cursor-pointer"
                style={{
                  borderBottom: i < selectedDetail.stocks.length - 1 ? `1px solid ${t.name === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}` : 'none',
                }}
                onClick={() => onNavigate?.("screener", s.ticker)}>
                <div className="col-span-2 font-bold" style={{ color: t.accent }}>{s.ticker}</div>
                <div className="col-span-4 text-xs truncate" style={{ color: t.textSecondary }}>{s.name}</div>
                <div className="col-span-3 text-right font-medium" style={{ color: t.text }}>{s.pctA.toFixed(1)}%</div>
                <div className="col-span-3 text-right font-medium" style={{ color: t.text }}>{s.pctB.toFixed(1)}%</div>
              </div>
            ))}
          </div>

          {selectedDetail.stocks.length === 0 && (
            <div className="px-4 py-6 text-center text-sm" style={{ color: t.textMuted }}>
              {L.locale === 'ko' ? '공동 보유 종목이 없습니다' : 'No common holdings'}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

OverlapHeatmap.displayName = "OverlapHeatmap";
export default OverlapHeatmap;
