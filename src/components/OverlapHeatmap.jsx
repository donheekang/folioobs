import { useState, useMemo, memo, Fragment } from "react";
import { useTheme } from "../hooks/useTheme";
import { useData } from "../hooks/useDataProvider";
import { useLocale } from "../hooks/useLocale";

const OverlapHeatmap = memo(({ onNavigate }) => {
  const t = useTheme();
  const L = useLocale();
  const { investors: INVESTORS, holdings: HOLDINGS } = useData();
  const [hoveredCell, setHoveredCell] = useState(null);

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

  const cellSize = 42;

  return (
    <div>
      <div className="overflow-x-auto" role="grid" aria-label={L.t('nav.overlapHeatmap')}>
        <div style={{
          display: "grid",
          gridTemplateColumns: `72px repeat(${INVESTORS.length}, ${cellSize}px)`,
          gap: "2px",
          justifyContent: "center",
          alignItems: "center",
        }}>
          {/* Header row: empty corner + investor avatars */}
          <div />
          {INVESTORS.map(inv => (
            <div key={inv.id} className="flex flex-col items-center gap-0.5 pb-1 cursor-pointer"
              onClick={() => onNavigate && onNavigate("investor", inv.id)}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold hover:scale-110 transition-transform"
                style={{ background: inv.gradient }}>{inv.avatar}</div>
            </div>
          ))}

          {/* Data rows */}
          {INVESTORS.map(rowInv => (
            <Fragment key={`row-${rowInv.id}`}>
              {/* Row label — full name, clickable */}
              <div
                className="flex items-center gap-1.5 justify-end pr-1 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ height: `${cellSize}px` }}
                onClick={() => onNavigate && onNavigate("investor", rowInv.id)}>
                <span className="text-xs font-medium text-right leading-tight" style={{ color: t.textSecondary }}>
                  {L.investorName(rowInv)}
                </span>
              </div>
              {/* Cells */}
              {INVESTORS.map(colInv => {
                const val = matrix[rowInv.id]?.[colInv.id] ?? 0;
                const isDiag = rowInv.id === colInv.id;
                const isHovered = hoveredCell?.row === rowInv.id && hoveredCell?.col === colInv.id;
                const hasValue = !isDiag && val > 0;
                return (
                  <div key={`${rowInv.id}-${colInv.id}`}
                    className="rounded-lg flex items-center justify-center transition-all"
                    style={{
                      width: `${cellSize}px`, height: `${cellSize}px`,
                      background: getColor(val, isDiag),
                      color: hasValue ? '#fff' : t.textMuted,
                      border: isHovered && hasValue
                        ? `2px solid ${t.accent}`
                        : isDiag
                          ? `1px dashed ${t.name === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
                          : '2px solid transparent',
                      cursor: hasValue ? 'pointer' : 'default',
                      fontWeight: hasValue ? 700 : 400,
                      fontSize: isDiag ? '10px' : '14px',
                      opacity: isDiag ? 0.5 : 1,
                    }}
                    onMouseEnter={() => !isDiag && setHoveredCell({ row: rowInv.id, col: colInv.id })}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => hasValue && onNavigate?.("compare")}>
                    {isDiag ? `${val}${L.t('shared.stocksUnit')}` : (val || "")}
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

      {/* Hover detail */}
      {hoveredCell && hoveredCell.row !== hoveredCell.col && (() => {
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
    </div>
  );
});

OverlapHeatmap.displayName = "OverlapHeatmap";
export default OverlapHeatmap;
