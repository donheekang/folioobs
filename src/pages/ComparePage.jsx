import { useState, useMemo } from "react";
import { ArrowLeft, GitCompare, CheckCircle, BarChart3, Users, Swords, Crown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useLocale } from "../hooks/useLocale";
import { useData } from "../hooks/useDataProvider";
import { SECTOR_COLORS } from "../data";
import { formatUSD } from "../utils/format";
import { GlassCard, Badge, GlowText, ChartTooltip } from "../components/shared";
import { getSectorData, generateComparisonInsight } from "../utils/insights";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Cell } from "recharts";

const ComparePage = ({ onBack, onNavigate }) => {
  const t = useTheme();
  const L = useLocale();
  const { investors: INVESTORS, holdings: HOLDINGS } = useData();
  const [selected, setSelected] = useState(["buffett","druckenmiller"]);
  const toggle = (id) => setSelected(p=>p.includes(id)?p.filter(x=>x!==id):p.length>=4?p:[...p,id]);
  const selInvs = INVESTORS.filter(i=>selected.includes(i.id));
  const cmp = useMemo(()=>selInvs.length>=2?generateComparisonInsight(selInvs[0],selInvs[1],HOLDINGS):null,[selected, INVESTORS, HOLDINGS]);

  const radarData = useMemo(()=>[L.t('comparePage.radar.concentration'),L.t('comparePage.radar.diversification'),L.t('comparePage.radar.volatility'),L.t('comparePage.radar.holdingCount'),L.t('comparePage.radar.aum')].map(m=>{const o={metric:m};selInvs.forEach(inv=>{const conc = inv.metrics?.concentration ?? 0; const qoq = inv.metrics?.qoqChange ?? 0; const hc = inv.metrics?.holdingCount ?? 0; const v={[L.t('comparePage.radar.concentration')]:conc*100,[L.t('comparePage.radar.diversification')]:(1-conc)*100,[L.t('comparePage.radar.volatility')]:Math.abs(qoq)*5,[L.t('comparePage.radar.holdingCount')]:Math.min(hc,100),[L.t('comparePage.radar.aum')]:Math.min((inv.aum||0)/10,100)};const val=v[m];o[L.investorName(inv)]=Number.isFinite(val)?val:50;});return o;}),[selected, INVESTORS, L]);

  const sectorCmp = useMemo(()=>{const all=new Set();selInvs.forEach(inv=>getSectorData(HOLDINGS[inv.id]||[]).forEach(s=>all.add(s.name)));return[...all].map(sec=>{const r={sector:L.sector(sec)};selInvs.forEach(inv=>{r[L.investorName(inv)]=getSectorData(HOLDINGS[inv.id]||[]).find(s=>s.name===sec)?.value||0;});return r;}).sort((a,b)=>selInvs.reduce((s,inv)=>s+(b[L.investorName(inv)]||0)-(a[L.investorName(inv)]||0),0));},[selected, INVESTORS, HOLDINGS, L]);

  // ===== 1. 공동 보유 종목 상세 =====
  const commonHoldings = useMemo(() => {
    if (selInvs.length < 2) return [];
    // 각 투자자의 ticker → holding 매핑
    const maps = selInvs.map(inv => {
      const m = new Map();
      (HOLDINGS[inv.id] || []).forEach(h => m.set(h.ticker, h));
      return m;
    });
    // 모든 투자자가 공통으로 보유하는 ticker
    const firstTickers = [...maps[0].keys()];
    const common = firstTickers.filter(ticker => maps.every(m => m.has(ticker)));
    return common.map(ticker => {
      const row = { ticker, name: maps[0].get(ticker)?.name || ticker };
      selInvs.forEach((inv, i) => {
        const h = maps[i].get(ticker);
        row[`pct_${inv.id}`] = h?.pct || 0;
        row[`change_${inv.id}`] = h?.change ?? 0;
      });
      // 정렬: 평균 비중 높은 순
      row._avgPct = selInvs.reduce((s, inv) => s + (row[`pct_${inv.id}`] || 0), 0) / selInvs.length;
      return row;
    }).sort((a, b) => b._avgPct - a._avgPct);
  }, [selInvs, HOLDINGS]);

  // ===== 2. 매매 방향 비교 (의견 충돌 / 일치) =====
  const tradeComparison = useMemo(() => {
    if (selInvs.length < 2) return { conflicts: [], agreements: [] };
    const maps = selInvs.map(inv => {
      const m = new Map();
      (HOLDINGS[inv.id] || []).forEach(h => {
        if (h.change !== 0) m.set(h.ticker, { ...h });
      });
      return m;
    });
    const allTickers = new Set();
    maps.forEach(m => m.forEach((_, k) => allTickers.add(k)));

    const conflicts = []; // 한쪽은 매수, 한쪽은 매도
    const agreements = []; // 같은 방향

    allTickers.forEach(ticker => {
      const data = selInvs.map((inv, i) => {
        const h = maps[i].get(ticker);
        return h ? { inv, change: h.change, name: h.name } : null;
      }).filter(Boolean);

      if (data.length >= 2) {
        const hasPositive = data.some(d => d.change > 0);
        const hasNegative = data.some(d => d.change < 0);
        const entry = {
          ticker,
          name: data[0].name,
          investors: data.map(d => ({
            id: d.inv.id,
            name: L.investorName(d.inv),
            color: d.inv.color,
            avatar: d.inv.avatar,
            gradient: d.inv.gradient,
            change: d.change,
          })),
        };
        if (hasPositive && hasNegative) conflicts.push(entry);
        else if (data.length >= 2) agreements.push(entry);
      }
    });

    // 정렬: 변동 절대값이 큰 순
    const sortFn = (a, b) => {
      const aMax = Math.max(...a.investors.map(i => Math.abs(i.change)));
      const bMax = Math.max(...b.investors.map(i => Math.abs(i.change)));
      return bMax - aMax;
    };
    return {
      conflicts: conflicts.sort(sortFn).slice(0, 10),
      agreements: agreements.sort(sortFn).slice(0, 10),
    };
  }, [selInvs, HOLDINGS, L]);

  // ===== 3. TOP 10 비중 비교 차트 =====
  const top10Data = useMemo(() => {
    if (selInvs.length < 2) return [];
    // 각 투자자의 상위 10 종목 합침
    const allTickers = new Map(); // ticker → { ticker, name, inv1_pct, inv2_pct, ... }
    selInvs.forEach(inv => {
      const h = (HOLDINGS[inv.id] || []).slice(0, 10);
      h.forEach(holding => {
        if (!allTickers.has(holding.ticker)) {
          allTickers.set(holding.ticker, { ticker: holding.ticker, name: holding.name });
        }
      });
    });
    // 각 투자자의 비중 채우기
    selInvs.forEach(inv => {
      const holdMap = new Map();
      (HOLDINGS[inv.id] || []).forEach(h => holdMap.set(h.ticker, h.pct));
      allTickers.forEach((row, ticker) => {
        row[L.investorName(inv)] = holdMap.get(ticker) || 0;
      });
    });
    // 최대 비중 기준 정렬
    return [...allTickers.values()]
      .sort((a, b) => {
        const aMax = Math.max(...selInvs.map(inv => a[L.investorName(inv)] || 0));
        const bMax = Math.max(...selInvs.map(inv => b[L.investorName(inv)] || 0));
        return bMax - aMax;
      })
      .slice(0, 15);
  }, [selInvs, HOLDINGS, L]);

  const changeIcon = (change) => {
    if (change === 100) return <TrendingUp size={12} />;
    if (change > 0) return <TrendingUp size={12} />;
    if (change < 0) return <TrendingDown size={12} />;
    return <Minus size={12} />;
  };

  const changeColor = (change) => {
    if (change === 100) return t.accent;
    if (change > 0) return t.green;
    if (change < 0) return t.red;
    return t.textMuted;
  };

  const changeLabel = (change) => {
    if (change === 100) return L.locale === 'ko' ? '신규' : 'NEW';
    if (change > 999) return L.locale === 'ko' ? '대폭↑' : '+++';
    if (change < -99) return '-99%↓';
    if (change === 0) return '—';
    return `${change > 0 ? '+' : ''}${Math.round(change)}%`;
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm" style={{color:t.textMuted}}><ArrowLeft size={16}/> {L.t('common.back')}</button>
      <div className="flex items-center gap-2"><div className="p-1.5 rounded-lg" style={{background:`${t.accent}20`}}><GitCompare size={20} style={{color:t.accent}}/></div><h1 className="text-2xl font-bold" style={{color:t.text}}>{L.t('comparePage.title')}</h1></div>

      <GlassCard hover={false}>
        <div className="p-4">
          <div className="text-sm mb-3" style={{color:t.textMuted}}>{L.t('comparePage.selectPrompt')}</div>
          <div className="flex flex-wrap gap-2">
            {INVESTORS.map(inv=>(
              <button key={inv.id} onClick={()=>toggle(inv.id)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={{background:selected.includes(inv.id)?t.selectedBtnBg(inv.color):t.unselectedBtnBg, border:`1px solid ${selected.includes(inv.id)?t.selectedBtnBorder(inv.color):t.unselectedBtnBorder}`, color:selected.includes(inv.id)?inv.color:t.textSecondary}}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{background:inv.gradient}}>{inv.avatar}</div>
                {L.investorName(inv)}{selected.includes(inv.id)&&<CheckCircle size={14}/>}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {selInvs.length < 2 && (
        <div className="text-center py-12 px-4 rounded-2xl" style={{ background: t.name === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
          <GitCompare size={36} style={{ color: t.textMuted, opacity: 0.3 }} className="mx-auto mb-3" />
          <p className="text-sm break-keep" style={{ color: t.textMuted }}>{L.t('comparePage.selectMin')}</p>
        </div>
      )}

      {selInvs.length>=2&&(<>
        {/* 핵심 지표 비교 */}
        <GlassCard hover={false}>
          <div className="p-5">
            <h3 className="font-bold mb-4" style={{color:t.text}}>{L.t('comparePage.keyMetrics')}</h3>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr style={{borderBottom:`1px solid ${t.tableBorder}`}}>
                <th className="text-left py-2.5 px-3 text-xs font-medium" style={{color:t.textMuted}}>{L.t('comparePage.metrics.style')}</th>
                {selInvs.map(inv=>(<th key={inv.id} className="text-center py-2.5 px-3"><div className="flex items-center justify-center gap-1.5"><div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-xs" style={{background:inv.gradient}}>{inv.avatar}</div><span className="font-medium" style={{color:t.text}}>{L.investorName(inv)}</span></div></th>))}
              </tr></thead>
              <tbody>{[
                {l:L.t('comparePage.metrics.style'),fn:inv=><Badge color={inv.color}>{L.style(inv.style)}</Badge>},
                {l:L.t('comparePage.metrics.aum'),fn:inv=>formatUSD(inv.aum)},
                {l:L.t('comparePage.metrics.holdings'),fn:inv=>`${inv.metrics.holdingCount}${L.t('common.items')}`},
                {l:L.t('comparePage.metrics.concentration'),fn:inv=>`${((inv.metrics?.concentration ?? 0)*100).toFixed(0)}%`},
                {l:L.t('comparePage.metrics.maxWeight'),fn:inv=>`${(HOLDINGS[inv.id]||[])[0]?.ticker||'-'} (${inv.metrics.topHoldingPct}%)`},
                {l:L.t('comparePage.metrics.qoqChange'),fn:inv=><GlowText color={inv.metrics.qoqChange>=0?t.green:t.red}>{inv.metrics.qoqChange>=0?'+':''}{inv.metrics.qoqChange}%</GlowText>},
              ].map((r,i)=>(<tr key={i} style={{borderBottom:`1px solid ${t.cardRowBorder}`}}><td className="py-3 px-3 font-medium" style={{color:t.textSecondary}}>{r.l}</td>{selInvs.map(inv=><td key={inv.id} className="py-3 px-3 text-center font-medium" style={{color:t.text}}>{r.fn(inv)}</td>)}</tr>))}</tbody>
            </table></div>
          </div>
        </GlassCard>

        {/* TOP 10 비중 비교 차트 */}
        <GlassCard hover={false}>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Crown size={18} style={{color:t.amber}} />
              <h3 className="font-bold" style={{color:t.text}}>
                {L.locale === 'ko' ? 'TOP 종목 비중 비교' : 'Top Holdings Weight Comparison'}
              </h3>
            </div>
            {top10Data.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(350, top10Data.length * 28)}>
                <BarChart data={top10Data} layout="vertical" margin={{left:10, right:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} horizontal={false} />
                  <XAxis type="number" tick={{fontSize:10,fill:t.textMuted}} stroke="transparent" tickFormatter={v => `${v}%`} />
                  <YAxis dataKey="ticker" type="category" tick={{fontSize:11,fill:t.textSecondary, fontWeight:600}} width={55} stroke="transparent" />
                  {selInvs.map(inv=><Bar key={inv.id} dataKey={L.investorName(inv)} fill={inv.color} barSize={8} radius={[0,4,4,0]} fillOpacity={0.85}/>)}
                  <Tooltip content={<ChartTooltip/>}/>
                  <Legend wrapperStyle={{color:t.textSecondary,fontSize:12}}/>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-center py-8" style={{color:t.textMuted}}>
                {L.locale === 'ko' ? '데이터를 불러오는 중...' : 'Loading...'}
              </p>
            )}
          </div>
        </GlassCard>

        {/* 공동 보유 종목 상세 테이블 */}
        {commonHoldings.length > 0 && (
          <GlassCard hover={false}>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users size={18} style={{color:t.cyan}} />
                <h3 className="font-bold" style={{color:t.text}}>
                  {L.locale === 'ko' ? `공동 보유 종목 (${commonHoldings.length}개)` : `Common Holdings (${commonHoldings.length})`}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{borderBottom:`1px solid ${t.tableBorder}`}}>
                      <th className="text-left py-2.5 px-3 text-xs font-medium" style={{color:t.textMuted}}>
                        {L.locale === 'ko' ? '종목' : 'Stock'}
                      </th>
                      {selInvs.map(inv => (
                        <th key={inv.id} className="text-center py-2.5 px-3 text-xs font-medium" style={{color:t.textMuted}}>
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-4 h-4 rounded flex items-center justify-center text-white" style={{background:inv.gradient, fontSize:8}}>{inv.avatar}</div>
                            <span>{L.locale === 'ko' ? '비중' : 'Weight'}</span>
                          </div>
                        </th>
                      ))}
                      {selInvs.map(inv => (
                        <th key={`chg_${inv.id}`} className="text-center py-2.5 px-3 text-xs font-medium" style={{color:t.textMuted}}>
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-4 h-4 rounded flex items-center justify-center text-white" style={{background:inv.gradient, fontSize:8}}>{inv.avatar}</div>
                            <span>{L.locale === 'ko' ? '변동' : 'Change'}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {commonHoldings.slice(0, 20).map((row, i) => (
                      <tr key={row.ticker} style={{borderBottom:`1px solid ${t.cardRowBorder}`}}
                        className="cursor-pointer hover:opacity-80"
                        onClick={() => onNavigate?.('stock', row.ticker)}>
                        <td className="py-2.5 px-3">
                          <div>
                            <span className="font-semibold" style={{color:t.accent}}>{row.ticker}</span>
                            <div className="text-xs truncate max-w-[140px]" style={{color:t.textMuted}}>{row.name}</div>
                          </div>
                        </td>
                        {selInvs.map(inv => (
                          <td key={inv.id} className="text-center py-2.5 px-3 font-medium" style={{color:t.text}}>
                            {(row[`pct_${inv.id}`] || 0).toFixed(1)}%
                          </td>
                        ))}
                        {selInvs.map(inv => {
                          const chg = row[`change_${inv.id}`] || 0;
                          return (
                            <td key={`chg_${inv.id}`} className="text-center py-2.5 px-3">
                              <span className="inline-flex items-center gap-0.5 text-xs font-medium" style={{color:changeColor(chg)}}>
                                {changeIcon(chg)} {changeLabel(chg)}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </GlassCard>
        )}

        {/* 매매 방향 비교: 의견 충돌 + 의견 일치 */}
        {(tradeComparison.conflicts.length > 0 || tradeComparison.agreements.length > 0) && (
          <GlassCard hover={false}>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-5">
                <Swords size={18} style={{color:t.red}} />
                <h3 className="font-bold" style={{color:t.text}}>
                  {L.locale === 'ko' ? '매매 방향 비교' : 'Trade Direction Comparison'}
                </h3>
              </div>

              {/* 의견 충돌 */}
              {tradeComparison.conflicts.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full" style={{background:t.red}} />
                    <span className="text-sm font-semibold" style={{color:t.red}}>
                      {L.locale === 'ko' ? `의견 충돌 (${tradeComparison.conflicts.length}개)` : `Conflicting Views (${tradeComparison.conflicts.length})`}
                    </span>
                    <span className="text-xs" style={{color:t.textMuted}}>
                      {L.locale === 'ko' ? '— 한 쪽은 매수, 한 쪽은 매도' : '— One buys, the other sells'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {tradeComparison.conflicts.map(item => (
                      <div key={item.ticker}
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:opacity-80"
                        style={{background: t.name === 'dark' ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)', border:`1px solid ${t.name === 'dark' ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)'}`}}
                        onClick={() => onNavigate?.('stock', item.ticker)}>
                        <div className="min-w-[80px]">
                          <span className="font-semibold text-sm" style={{color:t.accent}}>{item.ticker}</span>
                          <div className="text-xs truncate max-w-[100px]" style={{color:t.textMuted}}>{item.name}</div>
                        </div>
                        <div className="flex-1 flex items-center gap-3 flex-wrap">
                          {item.investors.map(inv => (
                            <div key={inv.id} className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded flex items-center justify-center text-white text-xs" style={{background:inv.gradient}}>{inv.avatar}</div>
                              <span className="text-xs font-medium" style={{color:changeColor(inv.change)}}>
                                {changeIcon(inv.change)} {changeLabel(inv.change)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 의견 일치 */}
              {tradeComparison.agreements.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full" style={{background:t.green}} />
                    <span className="text-sm font-semibold" style={{color:t.green}}>
                      {L.locale === 'ko' ? `의견 일치 (${tradeComparison.agreements.length}개)` : `Same Direction (${tradeComparison.agreements.length})`}
                    </span>
                    <span className="text-xs" style={{color:t.textMuted}}>
                      {L.locale === 'ko' ? '— 같은 방향으로 매매' : '— Trading in the same direction'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {tradeComparison.agreements.map(item => (
                      <div key={item.ticker}
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:opacity-80"
                        style={{background: t.name === 'dark' ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.04)', border:`1px solid ${t.name === 'dark' ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)'}`}}
                        onClick={() => onNavigate?.('stock', item.ticker)}>
                        <div className="min-w-[80px]">
                          <span className="font-semibold text-sm" style={{color:t.accent}}>{item.ticker}</span>
                          <div className="text-xs truncate max-w-[100px]" style={{color:t.textMuted}}>{item.name}</div>
                        </div>
                        <div className="flex-1 flex items-center gap-3 flex-wrap">
                          {item.investors.map(inv => (
                            <div key={inv.id} className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded flex items-center justify-center text-white text-xs" style={{background:inv.gradient}}>{inv.avatar}</div>
                              <span className="text-xs font-medium" style={{color:changeColor(inv.change)}}>
                                {changeIcon(inv.change)} {changeLabel(inv.change)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {/* 스타일 레이더 + 섹터 비교 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassCard hover={false}><div className="p-5"><h3 className="font-bold mb-4" style={{color:t.text}}>{L.t('comparePage.styleRadar')}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}><PolarGrid stroke={t.chartGrid}/><PolarAngleAxis dataKey="metric" tick={{fontSize:11,fill:t.textSecondary}}/><PolarRadiusAxis tick={{fontSize:10,fill:t.textMuted}} domain={[0,100]} stroke="transparent"/>
                {selInvs.map(inv=><Radar key={inv.id} name={L.investorName(inv)} dataKey={L.investorName(inv)} stroke={inv.color} fill={inv.color} fillOpacity={0.12} strokeWidth={2}/>)}
                <Legend wrapperStyle={{color:t.textSecondary,fontSize:12}}/><Tooltip content={<ChartTooltip/>}/>
              </RadarChart>
            </ResponsiveContainer>
          </div></GlassCard>

          <GlassCard hover={false}><div className="p-5"><h3 className="font-bold mb-4" style={{color:t.text}}>{L.t('comparePage.sectorCompare')}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sectorCmp} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid}/><XAxis type="number" tick={{fontSize:10,fill:t.textMuted}} stroke="transparent"/><YAxis dataKey="sector" type="category" tick={{fontSize:11,fill:t.textSecondary}} width={70} stroke="transparent"/>
                {selInvs.map(inv=><Bar key={inv.id} dataKey={L.investorName(inv)} fill={inv.color} barSize={10} radius={[0,4,4,0]} fillOpacity={0.8}/>)}
                <Tooltip content={<ChartTooltip/>}/><Legend wrapperStyle={{color:t.textSecondary,fontSize:12}}/>
              </BarChart>
            </ResponsiveContainer>
          </div></GlassCard>
        </div>

        {/* 비교 분석 요약 */}
        {cmp&&(<div className="relative overflow-hidden rounded-2xl p-6" style={{background:t.compareBg,border:`1px solid ${t.compareBorder}`}}>
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20" style={{background:`radial-gradient(circle, ${t.purple}${t.compareOrb}, transparent)`,filter:'blur(50px)'}}/>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4"><BarChart3 size={20} style={{color:t.purple}}/><h3 className="font-bold" style={{color:t.text}}>{L.t('comparePage.comparisonAnalysis')}</h3></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {[{l:L.t('comparePage.commonStocks'),v:`${cmp.commonCount}${L.t('common.items')}`,c:t.accent},{l:L.t('comparePage.overlapRate'),v:`${cmp.overlapPct}%`,c:t.cyan},{l:L.t('comparePage.sectorSimilarity'),v:`${cmp.sectorOverlap}%`,c:t.purple}].map((s,i)=>(
                <GlassCard key={i} hover={false}><div className="p-3 text-center"><div className="text-xs" style={{color:t.textMuted}}>{s.l}</div><div className="text-2xl font-bold mt-1"><GlowText color={s.c}>{s.v}</GlowText></div></div></GlassCard>
              ))}
            </div>
            {cmp.commonCount>0&&<p className="text-sm leading-relaxed" style={{color:t.textSecondary}}><span className="font-medium" style={{color:t.text}}>{L.t('comparePage.commonHoldings')}:</span> {cmp.commonNames.join(', ')}.{cmp.styleMatch?' '+L.t('comparePage.sameStyle'):' '+L.t('comparePage.diffStyle')}</p>}
          </div>
        </div>)}
      </>)}
    </div>
  );
};

export default ComparePage;
