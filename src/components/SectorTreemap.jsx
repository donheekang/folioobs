import { useState, useMemo, memo } from "react";
import { useTheme } from "../hooks/useTheme";
import { useData } from "../hooks/useDataProvider";
import { useLocale } from "../hooks/useLocale";
import { SECTOR_COLORS } from "../data";

// Squarify treemap algorithm — produces better aspect ratios
function squarify(data, x, y, w, h) {
  if (data.length === 0) return [];
  if (data.length === 1) {
    return [{ ...data[0], x, y, w, h }];
  }

  const total = data.reduce((s, d) => s + d.area, 0);
  const isWide = w >= h;

  // Try adding items to a row and check if aspect ratio improves
  let row = [];
  let rowArea = 0;
  let bestWorst = Infinity;
  let splitIdx = 1;

  for (let i = 0; i < data.length; i++) {
    row.push(data[i]);
    rowArea += data[i].area;

    const side = isWide ? (rowArea / total) * w : (rowArea / total) * h;
    if (side === 0) continue;

    // Calculate worst aspect ratio in this row
    let worst = 0;
    for (const item of row) {
      const otherSide = isWide
        ? (item.area / rowArea) * h
        : (item.area / rowArea) * w;
      const ratio = Math.max(side / otherSide, otherSide / side);
      worst = Math.max(worst, ratio);
    }

    if (worst <= bestWorst) {
      bestWorst = worst;
      splitIdx = i + 1;
    } else {
      break;
    }
  }

  // Lay out the chosen row
  const rowItems = data.slice(0, splitIdx);
  const remaining = data.slice(splitIdx);
  const rowTotal = rowItems.reduce((s, d) => s + d.area, 0);
  const frac = rowTotal / total;

  const rects = [];
  let cx = x, cy = y;

  if (isWide) {
    const rowW = frac * w;
    for (const item of rowItems) {
      const itemH = (item.area / rowTotal) * h;
      rects.push({ ...item, x: cx, y: cy, w: rowW, h: itemH });
      cy += itemH;
    }
    if (remaining.length > 0) {
      rects.push(...squarify(remaining, x + rowW, y, w - rowW, h));
    }
  } else {
    const rowH = frac * h;
    for (const item of rowItems) {
      const itemW = (item.area / rowTotal) * w;
      rects.push({ ...item, x: cx, y: cy, w: itemW, h: rowH });
      cx += itemW;
    }
    if (remaining.length > 0) {
      rects.push(...squarify(remaining, x, y + rowH, w, h - rowH));
    }
  }

  return rects;
}

const SectorTreemap = memo(({ onNavigate }) => {
  const t = useTheme();
  const L = useLocale();
  const { investors: INVESTORS, holdings: HOLDINGS } = useData();
  const [hoveredSector, setHoveredSector] = useState(null);

  const sectorData = useMemo(() => {
    const map = new Map();
    INVESTORS.forEach(inv => {
      (HOLDINGS[inv.id] || []).forEach(h => {
        if (!map.has(h.sector)) map.set(h.sector, { sector: h.sector, totalValue: 0, tickers: new Set(), investors: new Set() });
        const s = map.get(h.sector);
        s.totalValue += h.value;
        s.tickers.add(h.ticker);
        s.investors.add(inv.id);
      });
    });
    return [...map.values()]
      .map(s => ({ ...s, tickers: s.tickers.size, investors: s.investors.size }))
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [INVESTORS, HOLDINGS]);

  const totalValue = sectorData.reduce((s, d) => s + d.totalValue, 0);

  const rects = useMemo(() => {
    if (totalValue === 0) return [];
    const items = sectorData.map(s => ({
      ...s,
      pct: s.totalValue / totalValue,
      area: (s.totalValue / totalValue) * 100 * 70,
    }));
    return squarify(items, 0, 0, 100, 70);
  }, [sectorData, totalValue]);

  // Determine label visibility: full name, abbreviation, percentage only, or hidden
  const getLabel = (r) => {
    // Large blocks: full sector name + percentage
    if (r.w > 18 && r.h > 10) return { name: r.sector, pct: true, fontSize: r.w > 28 ? "3.4" : "2.6" };
    // Medium blocks: full name only (no percentage)
    if (r.w > 14 && r.h > 7) return { name: r.sector, pct: false, fontSize: "2.2" };
    // Smaller blocks: 2-char abbreviation
    if (r.w > 8 && r.h > 6) return { name: r.sector.slice(0, 2), pct: false, fontSize: "2" };
    // Tiny blocks: percentage only if there's some space
    if (r.w > 5 && r.h > 4) return { name: null, pct: true, fontSize: "1.6" };
    // Too small: no label
    return null;
  };

  return (
    <div>
      <div className="relative w-full" style={{ paddingBottom: "70%" }}>
        <svg viewBox="0 0 100 70" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet"
          role="img" aria-label={L.t('nav.sectorTreemap')}>
          <defs>
            {rects.map((r, i) => {
              const gap = 0.4;
              return (
                <clipPath key={`clip-${i}`} id={`treemap-clip-${i}`}>
                  <rect x={r.x + gap} y={r.y + gap} width={Math.max(r.w - gap * 2, 0.1)} height={Math.max(r.h - gap * 2, 0.1)} rx="1" />
                </clipPath>
              );
            })}
          </defs>
          {rects.map((r, i) => {
            const color = SECTOR_COLORS[r.sector] || "#64748B";
            const isHovered = hoveredSector === r.sector;
            const gap = 0.4;
            const label = getLabel(r);
            return (
              <g key={i}
                onMouseEnter={() => setHoveredSector(r.sector)}
                onMouseLeave={() => setHoveredSector(null)}
                onClick={() => onNavigate && onNavigate("screener", r.sector)}
                style={{ cursor: "pointer" }}>
                <rect
                  x={r.x + gap} y={r.y + gap}
                  width={Math.max(r.w - gap * 2, 0.1)}
                  height={Math.max(r.h - gap * 2, 0.1)}
                  rx="1" fill={color}
                  opacity={isHovered ? 1 : 0.78}
                  stroke={isHovered ? "#fff" : "transparent"} strokeWidth="0.4"
                  style={{ transition: "opacity 0.2s, stroke 0.2s" }} />
                <g clipPath={`url(#treemap-clip-${i})`}>
                  {label && label.name && label.pct && (
                    <>
                      <text x={r.x + r.w / 2} y={r.y + r.h / 2 - 1}
                        textAnchor="middle" fill="#fff" fontSize={label.fontSize} fontWeight="700">
                        {L.sector(label.name)}
                      </text>
                      <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 2.8}
                        textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="1.8">
                        {(r.pct * 100).toFixed(1)}%
                      </text>
                    </>
                  )}
                  {label && label.name && !label.pct && (
                    <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 0.6}
                      textAnchor="middle" fill="#fff" fontSize={label.fontSize} fontWeight="600">
                      {label.name.length === 2 ? L.sector(r.sector).slice(0, 2) : L.sector(label.name)}
                    </text>
                  )}
                  {label && !label.name && label.pct && (
                    <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 0.5}
                      textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={label.fontSize} fontWeight="600">
                      {(r.pct * 100).toFixed(0)}%
                    </text>
                  )}
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Sector legend — always visible, ensures all sectors are identifiable */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 justify-center">
        {sectorData.map(s => {
          const isActive = hoveredSector === s.sector;
          return (
            <div key={s.sector}
              className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md cursor-pointer transition-colors"
              style={{
                background: isActive ? (t.name === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') : 'transparent',
              }}
              onMouseEnter={() => setHoveredSector(s.sector)}
              onMouseLeave={() => setHoveredSector(null)}
              onClick={() => onNavigate && onNavigate("screener", s.sector)}>
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: SECTOR_COLORS[s.sector] || "#64748B" }} />
              <span className="text-xs" style={{ color: isActive ? t.text : t.textMuted }}>
                {L.sector(s.sector)} {totalValue > 0 ? (s.totalValue / totalValue * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Hover detail */}
      {hoveredSector && (() => {
        const d = sectorData.find(s => s.sector === hoveredSector);
        return d ? (
          <div className="mt-2 flex items-center gap-3 px-3 py-2 rounded text-xs"
            style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
            <div className="w-3 h-3 rounded" style={{ background: SECTOR_COLORS[d.sector] || "#64748B" }} />
            <span className="font-medium" style={{ color: t.text }}>{L.sector(d.sector)}</span>
            <span style={{ color: t.textMuted }}>{d.tickers} {L.t('shared.stocksUnit')} · {d.investors} {L.t('shared.investorUnit')} · ${d.totalValue.toFixed(1)}B</span>
          </div>
        ) : null;
      })()}
    </div>
  );
});

SectorTreemap.displayName = "SectorTreemap";
export default SectorTreemap;
