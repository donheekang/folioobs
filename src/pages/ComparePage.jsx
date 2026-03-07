import { useState, useMemo } from "react";
import { ArrowLeft, GitCompare, CheckCircle, BarChart3 } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useLocale } from "../hooks/useLocale";
import { useData } from "../hooks/useDataProvider";
import { SECTOR_COLORS } from "../data";
import { formatUSD } from "../utils/format";
import { GlassCard, Badge, GlowText, ChartTooltip } from "../components/shared";
import { getSectorData, generateComparisonInsight } from "../utils/insights";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";

const ComparePage = ({ onBack }) => {
  const t = useTheme();
  const L = useLocale();
  const { investors: INVESTORS, holdings: HOLDINGS } = useData();
  const [selected, setSelected] = useState(["buffett","druckenmiller"]);
  const toggle = (id) => setSelected(p=>p.includes(id)?p.filter(x=>x!==id):p.length>=4?p:[...p,id]);
  const selInvs = INVESTORS.filter(i=>selected.includes(i.id));
  const cmp = useMemo(()=>selInvs.length>=2?generateComparisonInsight(selInvs[0],selInvs[1],HOLDINGS):null,[selected, INVESTORS, HOLDINGS]);

  const radarData = useMemo(()=>[L.t('comparePage.radar.concentration'),L.t('comparePage.radar.diversification'),L.t('comparePage.radar.volatility'),L.t('comparePage.radar.holdingCount'),L.t('comparePage.radar.aum')].map(m=>{const o={metric:m};selInvs.forEach(inv=>{const conc = inv.metrics?.concentration ?? 0; const qoq = inv.metrics?.qoqChange ?? 0; const hc = inv.metrics?.holdingCount ?? 0; const v={[L.t('comparePage.radar.concentration')]:conc*100,[L.t('comparePage.radar.diversification')]:(1-conc)*100,[L.t('comparePage.radar.volatility')]:Math.abs(qoq)*5,[L.t('comparePage.radar.holdingCount')]:Math.min(hc,100),[L.t('comparePage.radar.aum')]:Math.min((inv.aum||0)/10,100)};const val=v[m];o[L.investorName(inv)]=Number.isFinite(val)?val:50;});return o;}),[selected, INVESTORS, L]);

  const sectorCmp = useMemo(()=>{const all=new Set();selInvs.forEach(inv=>getSectorData(HOLDINGS[inv.id]||[]).forEach(s=>all.add(s.name)));return[...all].map(sec=>{const r={sector:L.sector(sec)};selInvs.forEach(inv=>{r[L.investorName(inv)]=getSectorData(HOLDINGS[inv.id]||[]).find(s=>s.name===sec)?.value||0;});return r;}).sort((a,b)=>selInvs.reduce((s,inv)=>s+(b[L.investorName(inv)]||0)-(a[L.investorName(inv)]||0),0));},[selected, INVESTORS, HOLDINGS, L]);

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
