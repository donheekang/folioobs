import { useState, useMemo, useEffect } from "react";
import { Clock, ChevronRight, ArrowLeft, TrendingUp, TrendingDown, Zap, AlertCircle, BarChart3, Activity, ExternalLink } from "lucide-react";
import { useLocale } from "../hooks/useLocale";
import { supabase } from "../lib/supabase";

// ========== SVG 일러스트 컴포넌트 (Bloomberg Terminal v2) ==========
const F = "monospace"; // font shorthand

function BuffettIllustration({ className }) {
  const bars = [
    { ticker: "LLYVK", val: 0.3, x: 55 },
    { ticker: "FWONK", val: 0.1, x: 115 },
    { ticker: "LLYVA", val: 0.1, x: 175 },
    { ticker: "NYT",   val: 0.1, x: 235 },
  ];
  const sells = [
    { ticker: "FWONKUSD", x: 305 },
    { ticker: "LLYVA*", x: 355 },
  ];
  return (
    <svg viewBox="0 0 420 260" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bb" x1="0" y1="0" x2="420" y2="260" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#020617"/>
          <stop offset="100%" stopColor="#0f172a"/>
        </linearGradient>
        <filter id="glow-g"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="glow-r"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="420" height="260" fill="url(#bb)"/>
      {/* Subtle grid */}
      {[70,110,150,190].map(y=><line key={y} x1="30" y1={y} x2="400" y2={y} stroke="#1e293b" strokeWidth=".5"/>)}
      {/* Header bar */}
      <rect x="0" y="0" width="420" height="36" fill="#0f172a" opacity=".8"/>
      <text x="16" y="24" fill="#fbbf24" fontSize="12" fontWeight="bold" fontFamily={F}>BERKSHIRE HATHAWAY 13F</text>
      <text x="310" y="24" fill="#475569" fontSize="10" fontFamily={F}>Q4 2025</text>
      <rect x="370" y="14" width="8" height="8" rx="4" fill="#22c55e"><animate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite"/></rect>
      <text x="382" y="23" fill="#22c55e" fontSize="8" fontFamily={F}>LIVE</text>
      {/* AUM badge */}
      <rect x="16" y="44" width="100" height="20" rx="3" fill="#fbbf24" opacity=".08" stroke="#fbbf24" strokeWidth=".5" opacity=".3"/>
      <text x="66" y="58" fill="#fbbf24" fontSize="10" textAnchor="middle" fontFamily={F}>AUM $274.2B</text>
      <text x="140" y="58" fill="#475569" fontSize="9" fontFamily={F}>41 holdings · Top: AAPL 22.6%</text>
      {/* Buy bars with glow */}
      {bars.map((b,i) => {
        const h = 40 + b.val * 400;
        const y = 200 - h;
        return (
          <g key={i} filter="url(#glow-g)">
            <rect x={b.x} y={y} width="36" height={h} rx="2" fill="#22c55e" opacity={.25 + i * .05}/>
            <rect x={b.x} y={y} width="36" height={h} rx="2" fill="none" stroke="#22c55e" strokeWidth="1" opacity=".6"/>
            <text x={b.x+18} y={y-6} fill="#22c55e" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily={F}>{b.ticker}</text>
            <text x={b.x+18} y={y+14} fill="#22c55e" fontSize="8" textAnchor="middle" fontFamily={F} opacity=".8">{b.val}%</text>
            {/* Animated entry line */}
            <line x1={b.x+18} y1={200} x2={b.x+18} y2={y} stroke="#22c55e" strokeWidth=".5" opacity=".3">
              <animate attributeName="y2" from="200" to={y} dur={`${0.5+i*0.15}s`} fill="freeze"/>
            </line>
          </g>
        );
      })}
      {/* Sell indicators */}
      {sells.map((s,i) => (
        <g key={i} filter="url(#glow-r)">
          <rect x={s.x-18} y="120" width="36" height="80" rx="2" fill="#ef4444" opacity=".15"/>
          <rect x={s.x-18} y="120" width="36" height="80" rx="2" fill="none" stroke="#ef4444" strokeWidth="1" opacity=".5"/>
          <line x1={s.x-10} y1="148" x2={s.x+10} y2="168" stroke="#ef4444" strokeWidth="1.5" opacity=".7"/>
          <line x1={s.x+10} y1="148" x2={s.x-10} y2="168" stroke="#ef4444" strokeWidth="1.5" opacity=".7"/>
          <text x={s.x} y="115" fill="#ef4444" fontSize="7" textAnchor="middle" fontFamily={F}>SOLD</text>
        </g>
      ))}
      {/* Divider */}
      <line x1="275" y1="70" x2="275" y2="205" stroke="#fbbf24" strokeWidth=".5" strokeDasharray="3,3" opacity=".3"/>
      {/* Bottom labels */}
      <rect x="0" y="212" width="420" height="48" fill="#020617" opacity=".5"/>
      <text x="150" y="235" fill="#22c55e" fontSize="9" textAnchor="middle" fontWeight="bold" fontFamily={F}>▲ 4 NEW POSITIONS</text>
      <text x="335" y="235" fill="#ef4444" fontSize="9" textAnchor="middle" fontWeight="bold" fontFamily={F}>▼ 3 EXITS</text>
      <text x="210" y="252" fill="#334155" fontSize="7" textAnchor="middle" fontFamily={F}>Source: SEC EDGAR 13F Filing · Berkshire Hathaway Inc.</text>
    </svg>
  );
}

function CathieWoodIllustration({ className }) {
  // DNA-like price scatter
  const points = Array.from({length:20}, (_,i) => ({
    x: 30 + i * 19,
    y1: 110 + Math.sin(i * 0.6) * 35 + (Math.random()*10-5),
    y2: 110 - Math.sin(i * 0.6) * 35 + (Math.random()*10-5),
  }));
  return (
    <svg viewBox="0 0 420 260" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ba" x1="0" y1="0" x2="420" y2="260" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#020617"/>
          <stop offset="100%" stopColor="#0f172a"/>
        </linearGradient>
        <filter id="glow-b"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="420" height="260" fill="url(#ba)"/>
      {/* Header */}
      <rect x="0" y="0" width="420" height="36" fill="#0f172a" opacity=".8"/>
      <text x="16" y="24" fill="#fbbf24" fontSize="12" fontWeight="bold" fontFamily={F}>ARK INVEST DAILY TRADES</text>
      <text x="340" y="24" fill="#475569" fontSize="10" fontFamily={F}>MAR 19</text>
      <rect x="310" y="14" width="8" height="8" rx="4" fill="#ef4444"><animate attributeName="opacity" values="1;.3;1" dur="1.5s" repeatCount="indefinite"/></rect>
      <text x="322" y="23" fill="#ef4444" fontSize="8" fontFamily={F}>LIVE</text>
      {/* DNA scatter with glow */}
      <g filter="url(#glow-b)">
        {points.map((p,i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y1} r="3.5" fill="#22c55e" opacity={.3 + (i/20)*.5}>
              <animate attributeName="r" values="3;4.5;3" dur={`${2+i*0.1}s`} repeatCount="indefinite"/>
            </circle>
            <circle cx={p.x} cy={p.y2} r="3.5" fill="#3b82f6" opacity={.3 + (i/20)*.5}>
              <animate attributeName="r" values="3.5;2;3.5" dur={`${2+i*0.1}s`} repeatCount="indefinite"/>
            </circle>
            <line x1={p.x} y1={p.y1} x2={p.x} y2={p.y2} stroke="#1e293b" strokeWidth=".5"/>
          </g>
        ))}
        {/* Connection paths */}
        <path d={`M${points.map(p=>`${p.x},${p.y1}`).join(' L')}`} fill="none" stroke="#22c55e" strokeWidth=".8" opacity=".3"/>
        <path d={`M${points.map(p=>`${p.x},${p.y2}`).join(' L')}`} fill="none" stroke="#3b82f6" strokeWidth=".8" opacity=".3"/>
      </g>
      {/* Trade cards */}
      {[
        { ticker:"TXG", sub:"10x Genomics", x:40, color:"#22c55e" },
        { ticker:"ARCT", sub:"Arcturus Therapeutics", x:170, color:"#22c55e" },
        { ticker:"ARKG", sub:"Genomic Revolution ETF", x:310, color:"#fbbf24" },
      ].map((c,i) => (
        <g key={i}>
          <rect x={c.x} y="178" width="110" height="52" rx="4" fill={c.color} opacity=".06" stroke={c.color} strokeWidth="1" opacity=".4"/>
          <text x={c.x+55} y="198" fill={c.color} fontSize="14" fontWeight="bold" textAnchor="middle" fontFamily={F}>{c.ticker}</text>
          <text x={c.x+55} y="212" fill="#64748b" fontSize="7" textAnchor="middle" fontFamily={F}>{c.sub}</text>
          <text x={c.x+55} y="225" fill={c.color} fontSize="8" textAnchor="middle" fontFamily={F} opacity=".7">{i<2?'▲ BUY':'FUND'}</text>
        </g>
      ))}
      {/* AUM info */}
      <text x="16" y="252" fill="#334155" fontSize="7" fontFamily={F}>AUM $11.7B · 114 holdings · Source: ARK Invest Daily Trade Notification</text>
    </svg>
  );
}

function Top5Illustration({ className }) {
  const data = [
    { ticker:"CRH", count:5, color:"#fbbf24" },
    { ticker:"AMZN", count:5, color:"#f59e0b" },
    { ticker:"SPOT", count:3, color:"#d97706" },
    { ticker:"GOOG", count:4, color:"#92400e", mixed:true },
    { ticker:"CPNG", count:4, color:"#b45309" },
  ];
  const maxW = 260;
  return (
    <svg viewBox="0 0 420 260" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bt" x1="0" y1="0" x2="420" y2="260" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#020617"/>
          <stop offset="100%" stopColor="#0f172a"/>
        </linearGradient>
        <filter id="glow-a"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="420" height="260" fill="url(#bt)"/>
      {/* Header */}
      <rect x="0" y="0" width="420" height="36" fill="#0f172a" opacity=".8"/>
      <text x="16" y="24" fill="#fbbf24" fontSize="12" fontWeight="bold" fontFamily={F}>CONSENSUS SIGNAL — TOP 5</text>
      <text x="340" y="24" fill="#475569" fontSize="10" fontFamily={F}>Q4 2025</text>
      <text x="16" y="56" fill="#475569" fontSize="8" fontFamily={F}>11 legendary investors · SEC 13F cross-analysis</text>
      {/* Bars */}
      {data.map((d,i) => {
        const y = 68 + i * 36;
        const w = (d.count / 5) * maxW;
        return (
          <g key={i} filter="url(#glow-a)">
            {/* Rank */}
            <text x="16" y={y+18} fill="#fbbf24" fontSize="16" fontWeight="bold" fontFamily={F} opacity=".4">{i+1}</text>
            {/* Ticker */}
            <text x="42" y={y+18} fill="#e2e8f0" fontSize="12" fontWeight="bold" fontFamily={F}>{d.ticker}</text>
            {/* Bar */}
            <rect x="100" y={y+2} width={w} height="22" rx="2" fill={d.color} opacity=".15"/>
            <rect x="100" y={y+2} width={w} height="22" rx="2" fill="none" stroke={d.color} strokeWidth="1" opacity=".5"/>
            {/* Fill segments (investor dots) */}
            {Array.from({length:d.count},(_,j)=>(
              <circle key={j} cx={115+j*22} cy={y+13} r="6" fill={d.mixed && j>=2 ? "#ef4444" : d.color} opacity={d.mixed && j>=2 ? .4 : .3} stroke={d.mixed && j>=2 ? "#ef4444" : d.color} strokeWidth=".5"/>
            ))}
            {/* Count label */}
            <text x={108 + w} y={y+17} fill={d.color} fontSize="10" fontWeight="bold" fontFamily={F}>{d.count}</text>
            {d.mixed && <text x={108+w+16} y={y+17} fill="#ef4444" fontSize="7" fontFamily={F}>MIXED</text>}
          </g>
        );
      })}
      {/* Footer */}
      <rect x="0" y="240" width="420" height="20" fill="#020617" opacity=".5"/>
      <text x="210" y="254" fill="#334155" fontSize="7" textAnchor="middle" fontFamily={F}>Circles represent individual investors · Data: SEC EDGAR 13F Filings</text>
    </svg>
  );
}

function DruckenmillerIllustration({ className }) {
  return (
    <svg viewBox="0 0 420 260" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bd" x1="0" y1="0" x2="420" y2="260" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#020617"/>
          <stop offset="100%" stopColor="#0f172a"/>
        </linearGradient>
        <filter id="glow-d"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="420" height="260" fill="url(#bd)"/>
      {/* Header */}
      <rect x="0" y="0" width="420" height="36" fill="#0f172a" opacity=".8"/>
      <text x="16" y="24" fill="#fbbf24" fontSize="12" fontWeight="bold" fontFamily={F}>DUQUESNE FAMILY OFFICE</text>
      <text x="340" y="24" fill="#475569" fontSize="10" fontFamily={F}>Q4 2025</text>
      {/* Central hub */}
      <g filter="url(#glow-d)">
        <circle cx="210" cy="120" r="45" fill="#fbbf24" opacity=".05" stroke="#fbbf24" strokeWidth="1.5" opacity=".4"/>
        <circle cx="210" cy="120" r="35" fill="#fbbf24" opacity=".03" stroke="#fbbf24" strokeWidth=".5" opacity=".2"/>
        <text x="210" y="112" fill="#fbbf24" fontSize="24" fontWeight="bold" textAnchor="middle" fontFamily={F}>79</text>
        <text x="210" y="128" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily={F}>CHANGES</text>
        <text x="210" y="140" fill="#22c55e" fontSize="10" textAnchor="middle" fontWeight="bold" fontFamily={F}>+10.6%</text>
        {/* Pulsing ring */}
        <circle cx="210" cy="120" r="48" fill="none" stroke="#fbbf24" strokeWidth=".5" opacity=".2">
          <animate attributeName="r" values="45;55;45" dur="3s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".2;0;.2" dur="3s" repeatCount="indefinite"/>
        </circle>
      </g>
      {/* Left - Exits flowing in */}
      <g>
        <rect x="20" y="95" width="70" height="50" rx="4" fill="#ef4444" opacity=".1" stroke="#ef4444" strokeWidth="1" opacity=".4"/>
        <text x="55" y="116" fill="#ef4444" fontSize="18" fontWeight="bold" textAnchor="middle" fontFamily={F}>28</text>
        <text x="55" y="132" fill="#ef4444" fontSize="8" textAnchor="middle" fontFamily={F}>EXITS</text>
        {/* Flow particles */}
        {[0,1,2].map(i=>(
          <circle key={i} cx="100" cy="120" r="2" fill="#ef4444" opacity=".6">
            <animate attributeName="cx" values="90;165" dur={`${1.5+i*.3}s`} repeatCount="indefinite"/>
            <animate attributeName="opacity" values=".6;0" dur={`${1.5+i*.3}s`} repeatCount="indefinite"/>
          </circle>
        ))}
        <path d="M90,120 Q130,120 165,120" fill="none" stroke="#ef4444" strokeWidth="1" opacity=".2" strokeDasharray="4,4"/>
      </g>
      {/* Right - New buys flowing out */}
      <g>
        <rect x="330" y="95" width="70" height="50" rx="4" fill="#22c55e" opacity=".1" stroke="#22c55e" strokeWidth="1" opacity=".4"/>
        <text x="365" y="116" fill="#22c55e" fontSize="18" fontWeight="bold" textAnchor="middle" fontFamily={F}>26</text>
        <text x="365" y="132" fill="#22c55e" fontSize="8" textAnchor="middle" fontFamily={F}>NEW</text>
        {[0,1,2].map(i=>(
          <circle key={i} cx="255" cy="120" r="2" fill="#22c55e" opacity=".6">
            <animate attributeName="cx" values="255;330" dur={`${1.5+i*.3}s`} repeatCount="indefinite"/>
            <animate attributeName="opacity" values=".6;0" dur={`${1.5+i*.3}s`} repeatCount="indefinite"/>
          </circle>
        ))}
        <path d="M255,120 Q290,120 330,120" fill="none" stroke="#22c55e" strokeWidth="1" opacity=".2" strokeDasharray="4,4"/>
      </g>
      {/* Bottom key positions */}
      {[
        { ticker:"XLF", pct:"6.7%", x:50, color:"#22c55e" },
        { ticker:"EZU", pct:"5.5%", x:130, color:"#22c55e" },
        { ticker:"RSP", pct:"5.0%", x:210, color:"#22c55e" },
        { ticker:"AA", pct:"1.6%", x:290, color:"#22c55e" },
        { ticker:"$4.5B", pct:"AUM", x:370, color:"#fbbf24" },
      ].map((p,i)=>(
        <g key={i}>
          <rect x={p.x-30} y="190" width="60" height="36" rx="3" fill={p.color} opacity=".06" stroke={p.color} strokeWidth=".5" opacity=".3"/>
          <text x={p.x} y="206" fill={p.color} fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily={F}>{p.ticker}</text>
          <text x={p.x} y="219" fill="#475569" fontSize="8" textAnchor="middle" fontFamily={F}>{p.pct}</text>
        </g>
      ))}
      <text x="210" y="250" fill="#334155" fontSize="7" textAnchor="middle" fontFamily={F}>Source: SEC EDGAR 13F Filing · Duquesne Family Office LLC</text>
    </svg>
  );
}

function GuideIllustration({ className }) {
  return (
    <svg viewBox="0 0 420 260" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="420" y2="260" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#020617"/>
          <stop offset="100%" stopColor="#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="420" height="260" fill="url(#bg)"/>
      {/* Header */}
      <rect x="0" y="0" width="420" height="36" fill="#0f172a" opacity=".8"/>
      <text x="16" y="24" fill="#fbbf24" fontSize="12" fontWeight="bold" fontFamily={F}>SEC FORM 13F — GUIDE</text>
      <text x="340" y="24" fill="#475569" fontSize="10" fontFamily={F}>EXPLAINER</text>
      {/* Document illustration */}
      <g>
        <rect x="155" y="48" width="110" height="130" rx="3" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5"/>
        <rect x="155" y="48" width="110" height="22" rx="3" fill="#fbbf24" opacity=".08"/>
        <text x="210" y="63" fill="#fbbf24" fontSize="9" textAnchor="middle" fontWeight="bold" fontFamily={F}>FORM 13F-HR</text>
        <text x="210" y="76" fill="#475569" fontSize="7" textAnchor="middle" fontFamily={F}>SEC File Number</text>
        {/* Document lines */}
        {[90,102,114,126,138,150,162].map((y,i) => (
          <rect key={i} x="168" y={y} width={80 - i*8} height="3" rx="1.5" fill="#1e293b"/>
        ))}
        {/* SEC badge */}
        <circle cx="210" cy="174" r="0"/>
        <rect x="180" y="168" width="60" height="14" rx="2" fill="#fbbf24" opacity=".1" stroke="#fbbf24" strokeWidth=".5"/>
        <text x="210" y="179" fill="#fbbf24" fontSize="7" textAnchor="middle" fontFamily={F}>CONFIDENTIAL</text>
      </g>
      {/* Left info: Who Files */}
      <text x="30" y="65" fill="#22c55e" fontSize="8" fontWeight="bold" fontFamily={F}>WHO FILES?</text>
      <text x="30" y="80" fill="#64748b" fontSize="7" fontFamily={F}>Hedge Funds</text>
      <text x="30" y="92" fill="#64748b" fontSize="7" fontFamily={F}>Mutual Funds</text>
      <text x="30" y="104" fill="#64748b" fontSize="7" fontFamily={F}>Pension Funds</text>
      <text x="30" y="116" fill="#64748b" fontSize="7" fontFamily={F}>Insurance Co.</text>
      <text x="30" y="135" fill="#fbbf24" fontSize="8" fontFamily={F}>AUM {'>'} $100M</text>
      {/* Right info: What You Learn */}
      <text x="290" y="65" fill="#3b82f6" fontSize="8" fontWeight="bold" fontFamily={F}>WHAT YOU LEARN</text>
      <text x="290" y="80" fill="#64748b" fontSize="7" fontFamily={F}>Holdings & Shares</text>
      <text x="290" y="92" fill="#64748b" fontSize="7" fontFamily={F}>New Positions</text>
      <text x="290" y="104" fill="#64748b" fontSize="7" fontFamily={F}>Increases/Decreases</text>
      <text x="290" y="116" fill="#64748b" fontSize="7" fontFamily={F}>Complete Exits</text>
      <text x="290" y="135" fill="#ef4444" fontSize="7" fontFamily={F}>⚠ 45-day delay</text>
      {/* Timeline */}
      <line x1="40" y1="210" x2="380" y2="210" stroke="#1e293b" strokeWidth="2"/>
      {[
        { label:"Q1", date:"→ MAY 15", x:80, active:false },
        { label:"Q2", date:"→ AUG 14", x:160, active:false },
        { label:"Q3", date:"→ NOV 14", x:240, active:false },
        { label:"Q4", date:"→ FEB 14", x:320, active:true },
      ].map((q,i) => (
        <g key={i}>
          <circle cx={q.x} cy="210" r={q.active?7:5} fill={q.active?"#fbbf24":"#1e293b"} stroke="#fbbf24" strokeWidth={q.active?1.5:.5} opacity={q.active?1:.5}/>
          {q.active && <circle cx={q.x} cy="210" r="10" fill="none" stroke="#fbbf24" strokeWidth=".5" opacity=".3">
            <animate attributeName="r" values="7;14;7" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values=".3;0;.3" dur="2s" repeatCount="indefinite"/>
          </circle>}
          <text x={q.x} y="200" fill={q.active?"#fbbf24":"#94a3b8"} fontSize="10" textAnchor="middle" fontWeight="bold" fontFamily={F}>{q.label}</text>
          <text x={q.x} y="228" fill="#475569" fontSize="7" textAnchor="middle" fontFamily={F}>{q.date}</text>
        </g>
      ))}
      <text x="210" y="250" fill="#334155" fontSize="7" textAnchor="middle" fontFamily={F}>FolioObs tracks 11 legendary investors · Updated quarterly</text>
    </svg>
  );
}

// ========== 추가 SVG 일러스트 (Ray Dalio, Ackman, Soros 등) ==========
function DalioIllustration({ className }) {
  return (
    <svg viewBox="0 0 420 260" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dalio-bg" x1="0" y1="0" x2="420" y2="260" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#020617"/><stop offset="100%" stopColor="#0f172a"/>
        </linearGradient>
        <filter id="dalio-glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="420" height="260" fill="url(#dalio-bg)"/>
      <rect x="0" y="0" width="420" height="36" fill="#0f172a" opacity=".8"/>
      <text x="210" y="24" fill="#10B981" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily={F} opacity=".8">RAY DALIO — ALL WEATHER Q4</text>
      <g filter="url(#dalio-glow)">
        <circle cx="100" cy="130" r="45" fill="#10B981" opacity=".15" stroke="#10B981" strokeWidth="1.5"/>
        <text x="100" y="110" fill="#10B981" fontSize="9" textAnchor="middle" fontFamily={F} fontWeight="bold">STOCKS</text>
        <text x="100" y="160" fill="#10B981" fontSize="8" textAnchor="middle" fontFamily={F}>40%</text>
      </g>
      <g filter="url(#dalio-glow)">
        <circle cx="210" cy="110" r="45" fill="#10B981" opacity=".15" stroke="#10B981" strokeWidth="1.5"/>
        <text x="210" y="95" fill="#10B981" fontSize="9" textAnchor="middle" fontFamily={F} fontWeight="bold">BONDS</text>
        <text x="210" y="140" fill="#10B981" fontSize="8" textAnchor="middle" fontFamily={F}>30%</text>
      </g>
      <g filter="url(#dalio-glow)">
        <circle cx="320" cy="130" r="45" fill="#10B981" opacity=".15" stroke="#10B981" strokeWidth="1.5"/>
        <text x="320" y="110" fill="#10B981" fontSize="9" textAnchor="middle" fontFamily={F} fontWeight="bold">GOLD</text>
        <text x="320" y="160" fill="#10B981" fontSize="8" textAnchor="middle" fontFamily={F}>20%</text>
      </g>
      <text x="210" y="250" fill="#334155" fontSize="7" textAnchor="middle" fontFamily={F}>Bridgewater AUM $196B</text>
    </svg>
  );
}

function AckmanIllustration({ className }) {
  return (
    <svg viewBox="0 0 420 260" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ackman-bg" x1="0" y1="0" x2="420" y2="260" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#020617"/><stop offset="100%" stopColor="#0f172a"/>
        </linearGradient>
        <filter id="ackman-glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="420" height="260" fill="url(#ackman-bg)"/>
      <rect x="0" y="0" width="420" height="36" fill="#0f172a" opacity=".8"/>
      <text x="210" y="24" fill="#A855F7" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily={F} opacity=".8">BILL ACKMAN — CONCENTRATED</text>
      <g filter="url(#ackman-glow)">
        {[{x:50,h:140},{x:110,h:160},{x:170,h:120},{x:230,h:150},{x:290,h:140},{x:350,h:130}].map((b,i)=>(
          <g key={i}>
            <rect x={b.x} y={200-b.h} width="40" height={b.h} rx="2" fill="#A855F7" opacity=".3" stroke="#A855F7" strokeWidth="1"/>
            <text x={b.x+20} y="220" fill="#A855F7" fontSize="7" textAnchor="middle" fontFamily={F}>8</text>
          </g>
        ))}
      </g>
      <text x="210" y="250" fill="#334155" fontSize="7" textAnchor="middle" fontFamily={F}>Pershing Square AUM $18B</text>
    </svg>
  );
}

function SorosIllustration({ className }) {
  return (
    <svg viewBox="0 0 420 260" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="soros-bg" x1="0" y1="0" x2="420" y2="260" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#020617"/><stop offset="100%" stopColor="#0f172a"/>
        </linearGradient>
        <filter id="soros-glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="420" height="260" fill="url(#soros-bg)"/>
      <rect x="0" y="0" width="420" height="36" fill="#0f172a" opacity=".8"/>
      <text x="210" y="24" fill="#EF4444" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily={F} opacity=".8">GEORGE SOROS — MACRO TRADES</text>
      <g filter="url(#soros-glow)">
        <path d="M50,180 L100,160 L150,140 L200,145 L250,120 L300,130 L350,110" stroke="#EF4444" strokeWidth="2" fill="none" opacity=".6"/>
        <circle cx="50" cy="180" r="3" fill="#EF4444" opacity=".8"/>
        <circle cx="100" cy="160" r="3" fill="#EF4444" opacity=".8"/>
        <circle cx="150" cy="140" r="3" fill="#EF4444" opacity=".8"/>
        <circle cx="200" cy="145" r="3" fill="#EF4444" opacity=".8"/>
        <circle cx="250" cy="120" r="3" fill="#EF4444" opacity=".8"/>
        <circle cx="300" cy="130" r="3" fill="#EF4444" opacity=".8"/>
        <circle cx="350" cy="110" r="3" fill="#EF4444" opacity=".8"/>
        <text x="70" y="95" fill="#EF4444" fontSize="7" fontFamily={F}>GBP/USD</text>
      </g>
      <text x="210" y="250" fill="#334155" fontSize="7" textAnchor="middle" fontFamily={F}>Soros Fund AUM $25B</text>
    </svg>
  );
}

function TepperIllustration({ className }) {
  return (
    <svg viewBox="0 0 420 260" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tepper-bg" x1="0" y1="0" x2="420" y2="260" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#020617"/><stop offset="100%" stopColor="#0f172a"/>
        </linearGradient>
        <filter id="tepper-glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="420" height="260" fill="url(#tepper-bg)"/>
      <rect x="0" y="0" width="420" height="36" fill="#0f172a" opacity=".8"/>
      <text x="210" y="24" fill="#F97316" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily={F} opacity=".8">DAVID TEPPER — V-SHAPE RECOVERY</text>
      <g filter="url(#tepper-glow)">
        <path d="M80,200 L210,60 L340,200" stroke="#F97316" strokeWidth="3" fill="none" opacity=".6"/>
        <circle cx="80" cy="200" r="4" fill="#F97316" opacity=".8"/>
        <circle cx="210" cy="60" r="4" fill="#F97316" opacity=".8"/>
        <circle cx="340" cy="200" r="4" fill="#F97316" opacity=".8"/>
        <text x="90" y="220" fill="#F97316" fontSize="7" fontFamily={F}>BOTTOM</text>
        <text x="190" y="50" fill="#F97316" fontSize="7" fontFamily={F}>TODAY</text>
        <text x="330" y="220" fill="#F97316" fontSize="7" fontFamily={F}>PROFIT</text>
      </g>
      <text x="210" y="250" fill="#334155" fontSize="7" textAnchor="middle" fontFamily={F}>Appaloosa AUM $7B</text>
    </svg>
  );
}

function ColemanIllustration({ className }) {
  return (
    <svg viewBox="0 0 420 260" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="coleman-bg" x1="0" y1="0" x2="420" y2="260" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#020617"/><stop offset="100%" stopColor="#0f172a"/>
        </linearGradient>
        <filter id="coleman-glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="420" height="260" fill="url(#coleman-bg)"/>
      <rect x="0" y="0" width="420" height="36" fill="#0f172a" opacity=".8"/>
      <text x="210" y="24" fill="#3B82F6" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily={F} opacity=".8">CHASE COLEMAN — AI INFRASTRUCTURE</text>
      <g filter="url(#coleman-glow)">
        {[{x:80,t:"META"},{x:160,t:"MSFT"},{x:240,t:"AMZN"},{x:320,t:"CPNG"}].map((p,i)=>(
          <g key={i}>
            <rect x={p.x-25} y="110" width="50" height="70" rx="2" fill="#3B82F6" opacity=".15" stroke="#3B82F6" strokeWidth="1"/>
            <text x={p.x} y="180" fill="#3B82F6" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily={F}>{p.t}</text>
            <path d={`M${p.x-15},160 L${p.x},130 L${p.x+15},145`} stroke="#3B82F6" strokeWidth="1.5" fill="none" opacity=".7"/>
          </g>
        ))}
      </g>
      <text x="210" y="250" fill="#334155" fontSize="7" textAnchor="middle" fontFamily={F}>Tiger Global AUM $30B</text>
    </svg>
  );
}

function LoebIllustration({ className }) {
  return (
    <svg viewBox="0 0 420 260" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="loeb-bg" x1="0" y1="0" x2="420" y2="260" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#020617"/><stop offset="100%" stopColor="#0f172a"/>
        </linearGradient>
        <filter id="loeb-glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="420" height="260" fill="url(#loeb-bg)"/>
      <rect x="0" y="0" width="420" height="36" fill="#0f172a" opacity=".8"/>
      <text x="210" y="24" fill="#8B5CF6" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily={F} opacity=".8">DAN LOEB — ACTIVIST CAMPAIGNS</text>
      <g filter="url(#loeb-glow)">
        <rect x="140" y="80" width="140" height="100" rx="3" fill="#8B5CF6" opacity=".1" stroke="#8B5CF6" strokeWidth="2"/>
        <line x1="150" y1="100" x2="260" y2="100" stroke="#8B5CF6" strokeWidth="1.5" opacity=".6"/>
        <line x1="150" y1="115" x2="260" y2="115" stroke="#8B5CF6" strokeWidth="1.5" opacity=".6"/>
        <line x1="150" y1="130" x2="240" y2="130" stroke="#8B5CF6" strokeWidth="1.5" opacity=".6"/>
        <text x="210" y="160" fill="#8B5CF6" fontSize="9" textAnchor="middle" fontFamily={F} fontWeight="bold">LETTER</text>
        <path d="M290,140 L320,120 L340,150" stroke="#8B5CF6" strokeWidth="2" fill="none" opacity=".7"/>
      </g>
      <text x="210" y="250" fill="#334155" fontSize="7" textAnchor="middle" fontFamily={F}>Third Point AUM $12B</text>
    </svg>
  );
}

function KlarmanIllustration({ className }) {
  return (
    <svg viewBox="0 0 420 260" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="klarman-bg" x1="0" y1="0" x2="420" y2="260" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#020617"/><stop offset="100%" stopColor="#0f172a"/>
        </linearGradient>
        <filter id="klarman-glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="420" height="260" fill="url(#klarman-bg)"/>
      <rect x="0" y="0" width="420" height="36" fill="#0f172a" opacity=".8"/>
      <text x="210" y="24" fill="#14B8A6" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily={F} opacity=".8">SETH KLARMAN — MARGIN OF SAFETY</text>
      <g filter="url(#klarman-glow)">
        <text x="60" y="140" fill="#14B8A6" fontSize="8" fontFamily={F} fontWeight="bold">PRICE</text>
        <line x1="50" y1="150" x2="150" y2="150" stroke="#14B8A6" strokeWidth="2" opacity=".6"/>
        <text x="270" y="120" fill="#14B8A6" fontSize="8" fontFamily={F} fontWeight="bold">VALUE</text>
        <line x1="260" y1="130" x2="360" y2="130" stroke="#14B8A6" strokeWidth="2" opacity=".6"/>
        <path d="M150,150 L260,130" stroke="#14B8A6" strokeWidth="1.5" strokeDasharray="3,3" opacity=".5"/>
        <text x="210" y="175" fill="#14B8A6" fontSize="7" textAnchor="middle" fontFamily={F} fontWeight="bold">SAFETY MARGIN</text>
      </g>
      <text x="210" y="250" fill="#334155" fontSize="7" textAnchor="middle" fontFamily={F}>Baupost AUM $25B</text>
    </svg>
  );
}

function NPSIllustration({ className }) {
  return (
    <svg viewBox="0 0 420 260" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nps-bg" x1="0" y1="0" x2="420" y2="260" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#020617"/><stop offset="100%" stopColor="#0f172a"/>
        </linearGradient>
        <filter id="nps-glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="420" height="260" fill="url(#nps-bg)"/>
      <rect x="0" y="0" width="420" height="36" fill="#0f172a" opacity=".8"/>
      <text x="210" y="24" fill="#DC2626" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily={F} opacity=".8">KOREA NPS — DIVERSIFIED PENSION</text>
      <g filter="url(#nps-glow)">
        {Array.from({length:24},(_,i)=>{
          const x=50+Math.floor(i%8)*50;
          const y=90+Math.floor(i/8)*50;
          const colors=["#DC2626","#EF4444","#F97316"];
          return <rect key={i} x={x} y={y} width="40" height="40" rx="2" fill={colors[i%3]} opacity=".2" stroke={colors[i%3]} strokeWidth=".5"/>;
        })}
      </g>
      <text x="210" y="250" fill="#334155" fontSize="7" textAnchor="middle" fontFamily={F}>561 Holdings • $135B AUM</text>
    </svg>
  );
}

// 기사별 일러스트 매핑
const ARTICLE_ILLUSTRATIONS = {
  "buffett-q4-2025-new-buys": BuffettIllustration,
  "cathie-wood-march-20-trades": CathieWoodIllustration,
  "top5-most-bought-q4-2025": Top5Illustration,
  "druckenmiller-q4-major-changes": DruckenmillerIllustration,
  "dalio-q4-all-weather": DalioIllustration,
  "ackman-q4-concentrated": AckmanIllustration,
  "soros-q4-macro-bets": SorosIllustration,
  "tepper-q4-financials": TepperIllustration,
  "coleman-q4-tech-growth": ColemanIllustration,
  "loeb-q4-activist": LoebIllustration,
  "klarman-q4-value-plays": KlarmanIllustration,
  "nps-q4-pension-moves": NPSIllustration,
  "what-is-13f-guide": GuideIllustration,
};

// AI 생성 이미지 매핑 (있으면 우선 사용, 없으면 SVG 폴백)
const ARTICLE_IMAGES = {
  "cathie-wood-march-25-trades": "/news/cathie-wood-daily.png",
  "cathie-wood-march-24-trades": "/news/cathie-wood-daily.png",
  "cathie-wood-march-23-trades": "/news/cathie-wood-daily.png",
  "buffett-q4-2025-new-buys": "/news/buffett-q4.png",
  "cathie-wood-march-20-trades": "/news/cathie-wood-daily.png",
  "top5-most-bought-q4-2025": "/news/top5-consensus.png",
  "druckenmiller-q4-major-changes": "/news/druckenmiller-rebalance.png",
  "dalio-q4-all-weather": "/news/dalio-all-weather.png",
  "ackman-q4-concentrated": "/news/ackman-concentrated.png",
  "soros-q4-macro-bets": "/news/soros-macro.png",
  "tepper-q4-financials": "/news/tepper-financials.png",
  "coleman-q4-tech-growth": "/news/coleman-tech.png",
  "loeb-q4-activist": "/news/loeb-activist.png",
  "klarman-q4-value-plays": "/news/klarman-value.png",
  "nps-q4-pension-moves": "/news/nps-pension.png",
  "what-is-13f-guide": "/news/sec-13f-guide.png",
};

// 이미지 → SVG 폴백 비주얼 컴포넌트
function ArticleVisual({ articleId, className }) {
  const [imgError, setImgError] = useState(false);
  const imgSrc = ARTICLE_IMAGES[articleId];
  const SvgFallback = ARTICLE_ILLUSTRATIONS[articleId];

  if (imgSrc && !imgError) {
    return (
      <div className={className || ''} style={{ minHeight: '140px', background: '#0a1628' }}>
        <img
          src={imgSrc}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  if (SvgFallback) {
    return (
      <div className={className || ''}>
        <SvgFallback className="w-full h-full" />
      </div>
    );
  }

  return null;
}

// ========== FolioObs 뉴스 기사 데이터 ==========
const NEWS_ARTICLES = [
  {
    id: "cathie-wood-march-23-trades",
    date: "2026-03-23",
    category: "일별 매매",
    categoryEn: "DAILY TRADES",
    categoryColor: "green",
    title: "캐시 우드 3월 23일 매매 — TXG 9.8만주 매수, BLSH 연속 매도",
    titleEn: "Cathie Wood March 23 Trades — TXG 98K Shares Buy, BLSH Consecutive Sell",
    summary: "ARK Invest가 3월 23일 10X Genomics(TXG)를 2개 펀드에서 총 9.8만주 매수하고, Bullish(BLSH)를 3.9만주 추가 매도했습니다. 크립토→유전체학 리밸런싱 3일 연속.",
    summaryEn: "ARK Invest bought 98K shares of 10X Genomics (TXG) across 2 funds on March 23, while selling another 39K shares of Bullish (BLSH). Crypto→Genomics rebalancing continues for the 3rd day.",
    tickers: ["TXG", "BLSH"],
    readTime: "3 min",
    content: `캐시 우드가 3월 23일에도 유전체학 베팅을 이어갔습니다. 10X Genomics(TXG)를 ARKK와 ARKG 두 펀드에 걸쳐 총 98,722주 매수하며 바닥권 공격적 저점매수를 지속했습니다. 동시에 크립토 관련주 Bullish(BLSH)를 3.9만주 추가 매도했습니다.

■ 매수 종목

TXG (10X Genomics) — ARKK 84,342주 (비중 0.0261%) + ARKG 14,380주 (비중 0.0269%)
3/20에 이어 연속 매수이며, 최근 2주간 매수·매도를 반복하며 물량을 확보하는 전략입니다. TXG는 단일세포 유전체 분석 분야의 글로벌 리더로, 52주 저점 근처에서 거래되고 있습니다. 캐시 우드는 유전체학 기술이 AI와 결합하여 정밀의료 혁명을 이끌 것으로 보고 있으며, 지금이 매수 적기라고 판단하는 것으로 보입니다.

■ 매도 종목

BLSH (Bullish) — ARKK 31,154주 (비중 0.0195%) + ARKW 8,208주 (비중 0.0203%)
3/20(10.3만주), 3/23(3.9만주)으로 이틀 연속 대량 매도. 크립토 거래소 Bullish에 대한 비중을 적극적으로 줄이고 있습니다. 현재 포트폴리오 비중 약 1.93%에서 더 낮아질 전망입니다.

■ 핵심 인사이트: 크립토→유전체학 전환 가속

3/19, 3/20, 3/23 3일 연속으로 "BLSH 매도 + TXG 매수" 패턴이 반복되고 있습니다. 이는 우연이 아닌 체계적인 섹터 리밸런싱입니다. 캐시 우드가 크립토/블록체인 수익 실현 자금을 유전체학 저점매수에 재배분하는 중기 전략이 뚜렷해졌습니다.

ARK의 '파괴적 혁신' 테마 내에서 유전체학의 비중을 높이려는 전략은, AI 기반 신약 개발과 정밀의료가 2026년 하반기부터 본격적인 상용화 단계에 진입할 것이라는 캐시 우드의 확신을 반영합니다.

※ 본 기사는 ARK Invest 공개 매매 데이터 기반이며, 투자 권유가 아닙니다.`,
    contentEn: `Cathie Wood continued her genomics bet on March 23. She bought a total of 98,722 shares of 10X Genomics (TXG) across ARKK and ARKG, continuing aggressive bottom-fishing. Meanwhile, she sold another 39,362 shares of crypto play Bullish (BLSH).

■ Buy

TXG (10X Genomics) — ARKK 84,342 shares (0.0261%) + ARKG 14,380 shares (0.0269%)
Consecutive buy after 3/20, alternating between buying and selling over the past 2 weeks to accumulate shares. TXG is the global leader in single-cell genomic analysis, trading near 52-week lows. Cathie Wood believes genomics technology combined with AI will lead the precision medicine revolution, and now is the time to buy.

■ Sell

BLSH (Bullish) — ARKK 31,154 shares (0.0195%) + ARKW 8,208 shares (0.0203%)
Heavy selling for the 2nd consecutive day: 103K shares on 3/20 and 39K on 3/23. Actively reducing exposure to crypto exchange Bullish. Currently at ~1.93% portfolio weight, expected to decrease further.

■ Key Insight: Crypto→Genomics Rotation Accelerates

For the 3rd consecutive day (3/19, 3/20, 3/23), the "sell BLSH + buy TXG" pattern repeats. This is not coincidence but systematic sector rebalancing. Cathie Wood's medium-term strategy of reallocating crypto/blockchain profits into genomics bottom-fishing has become unmistakable.

The strategy to increase genomics weight within ARK's 'disruptive innovation' theme reflects Cathie Wood's conviction that AI-powered drug development and precision medicine will enter commercial deployment in H2 2026.

※ This article is based on publicly available ARK Invest trade data and is not investment advice.`,
  },
  {
    id: "buffett-q4-2025-new-buys",
    date: "2026-03-20",
    category: "속보",
    categoryEn: "BREAKING",
    categoryColor: "red",
    title: "워렌 버핏, 2025 Q4 신규 매수 4종목 공개 — 리버티 미디어·뉴욕타임즈 포함",
    titleEn: "Warren Buffett Reveals 4 New Buys in Q4 2025 — Liberty Media & NYT Included",
    summary: "버크셔 해서웨이의 2025년 4분기 13F 공시에서 LLYVK, FWONK, LLYVA, NYT 4개 종목을 신규 매수한 것으로 확인되었습니다. 동시에 FWONKUSD, LLYVA*, LLYVK* 3개 종목을 완전 매도했습니다.",
    summaryEn: "Berkshire Hathaway's Q4 2025 13F filing reveals 4 new positions: LLYVK, FWONK, LLYVA, and NYT. Three positions were completely sold.",
    tickers: ["LLYVK", "FWONK", "LLYVA", "NYT"],
    readTime: "3 min",
    content: `95세의 워렌 버핏이 또 한 번 움직였습니다. 버크셔 해서웨이의 2025년 4분기 13F 공시는 단순한 종목 추가가 아니라, 리버티 미디어 그룹 내 구조적 재편에 대한 정밀한 대응이었습니다.

■ 신규 매수 4종목

LLYVK (리버티 라이브 홀딩스) — 포트폴리오 비중 0.3%
FWONK (리버티 미디어) — 비중 0.1%
LLYVA (리버티 라이브 홀딩스) — 비중 0.1%
NYT (뉴욕타임즈) — 비중 0.1%

■ 완전 매도 3종목

FWONKUSD, LLYVA*, LLYVK* — 모두 리버티 미디어 구조 변경 이전 종목

■ 핵심 인사이트

리버티 미디어 3종목의 동시 매도와 신규 매수는 단순한 종목 교체가 아닙니다. 2025년 하반기 리버티 미디어가 포뮬러 원(F1) 사업부 분리를 위해 진행한 기업 구조 재편에 맞춰, 버핏은 기존 주식을 매도하고 새로운 구조의 주식으로 전환한 것입니다. 이는 버핏의 전형적인 스타일 — "기업을 이해하고 있다면, 구조가 바뀌어도 따라간다"는 원칙의 실행입니다.

NYT 신규 매수가 특히 주목됩니다. 비중은 0.1%로 작지만, 버핏이 "미디어의 미래"를 어디에 걸고 있는지 보여주는 시그널입니다. 뉴욕타임즈는 디지털 구독자 1,100만 명을 돌파하며 전통 미디어 중 가장 성공적인 디지털 전환을 이뤄낸 기업입니다.

■ 포트폴리오 전체 그림

운용자산 $274.2B, 보유 종목 41개. 상위 5개 종목이 포트폴리오의 70% 이상을 차지하는 극단적 집중 투자 전략은 여전합니다. 최대 보유 종목 AAPL(22.6%)은 비중이 줄었지만, 여전히 압도적 1위입니다.

※ 본 기사는 SEC 13F 공시 데이터 기반이며, 투자 권유가 아닙니다.`,
    contentEn: `At 95, Warren Buffett has made another move — and as always, it's more calculated than it first appears. Berkshire Hathaway's Q4 2025 13F filing wasn't just about adding new stocks. It was a precise response to Liberty Media's corporate restructuring.

■ 4 New Positions

LLYVK (Liberty Live Holdings) — 0.3% of portfolio
FWONK (Liberty Media) — 0.1%
LLYVA (Liberty Live Holdings) — 0.1%
NYT (New York Times) — 0.1%

■ 3 Complete Exits

FWONKUSD, LLYVA*, LLYVK* — all pre-restructuring Liberty Media shares

■ Key Insight

The simultaneous sale and repurchase of Liberty Media positions isn't a simple swap. In late 2025, Liberty Media restructured to spin off its Formula One (F1) business division. Buffett sold the old shares and replaced them with the post-restructuring equivalents — classic Buffett: "If you understand the business, follow it through structural changes."

The NYT purchase deserves special attention. At just 0.1%, it's a small position, but it signals where Buffett sees the future of media. The New York Times has crossed 11 million digital subscribers, making it the most successful digital transformation story in traditional media.

■ The Big Picture

AUM: $274.2B across just 41 holdings. The top 5 positions still account for over 70% of the portfolio — an extreme concentration strategy that hasn't changed. AAPL remains the dominant #1 at 22.6%, though the weighting has decreased.

※ This article is based on SEC 13F filing data and is not investment advice.`,
  },
  {
    id: "cathie-wood-march-20-trades",
    date: "2026-03-20",
    category: "일별 매매",
    categoryEn: "DAILY TRADES",
    categoryColor: "green",
    title: "캐시 우드 3월 20일 매매 — 피그마(FIG) 대량 매수, 크립토 정리",
    titleEn: "Cathie Wood March 20 Trades — Massive Figma Buy, Crypto Exits",
    summary: "ARK Invest가 3월 20일 ARKK·ARKW에서 피그마(FIG)를 대량 매수하고, 크립토 관련주 BLSH·CRCL을 매도했습니다. ARKG에서는 TXG·ARCT 매수 지속.",
    summaryEn: "ARK Invest bought Figma (FIG) heavily across ARKK & ARKW on March 20, while selling crypto plays BLSH & CRCL. ARKG continued buying TXG & ARCT.",
    tickers: ["FIG", "TXG", "ARCT", "BLSH", "CRCL"],
    readTime: "4 min",
    content: `캐시 우드의 3월 20일 매매에서 가장 눈에 띄는 이름은 단연 피그마(FIG)입니다. ARKK와 ARKW 두 펀드에 걸쳐 총 337,381주를 매수하며, 디자인 플랫폼에 대한 강한 확신을 드러냈습니다. 동시에 크립토 관련주를 정리하고, 바이오테크 매수를 이어갔습니다.

■ 매수 종목

FIG (피그마) — ARKK에서 269,652주, ARKW에서 67,729주 매수
전일 최대 규모 매수입니다. 피그마는 UI/UX 디자인 협업 도구의 글로벌 1위 기업으로, 2024년 IPO 이후 주목받고 있습니다. 어도비의 $20B 인수 시도가 규제로 무산된 후 독자 상장한 이 기업은, 디자인·프로토타이핑·개발자 핸드오프를 하나의 플랫폼에서 해결합니다. 캐시 우드가 두 펀드에 걸쳐 동시 매수한 것은, 피그마를 "파괴적 혁신" 범주의 핵심 종목으로 보고 있다는 강력한 시그널입니다.

TXG (10x Genomics) — ARKK에서 165,430주, ARKG에서 27,228주 매수
이틀 연속 매수입니다. 3월 19일에 이어 20일에도 두 펀드에서 대량 매수를 이어갔습니다. 단일세포 유전체학 분석의 선두주자로, 주가가 52주 저점 근처에서 거래 중입니다. 연속 매수는 캐시 우드의 확신이 매우 강하다는 의미입니다.

ARCT (Arcturus Therapeutics) — ARKG에서 22,773주 매수
mRNA 치료제 개발사로, 3월 19일에 이어 연속 매수. 희귀질환 치료에 mRNA 기술을 적용하는 기업입니다.

■ 매도 종목 — 크립토 관련주 정리

BLSH (Bullish) — ARKK에서 89,282주, ARKW에서 14,097주 매도
CRCL (Circle Internet Group) — ARKK에서 39,723주, ARKW에서 6,275주 매도

두 종목 모두 크립토/블록체인 관련 기업으로, ARKK와 ARKW에서 동시에 매도했습니다. 캐시 우드가 크립토 섹터의 비중을 줄이고, 그 자금을 피그마 같은 SaaS 플랫폼과 바이오테크로 재배분하고 있는 것으로 읽힙니다.

TER (Teradyne) — ARKK에서 19,206주 매도
반도체 테스트 장비 기업. 소규모 비중 조정.

BFLY (Butterfly Network) — ARKG에서 182,353주 매도
휴대용 초음파 기기 기업. 가장 큰 규모의 매도로, ARKG 내 헬스케어 포지션 재편의 일환.

GH (Guardant Health) — ARKG에서 9,621주 매도
액체 생검(Liquid Biopsy) 기업. 비중 축소.

■ 핵심 인사이트 — 캐시 우드의 방향 전환

오늘 매매의 큰 그림은 명확합니다:

첫째, 크립토에서 SaaS로의 자금 이동입니다. BLSH·CRCL을 팔고 피그마를 산 것은, "파괴적 혁신"의 축이 크립토에서 AI 시대의 디자인 인프라로 이동하고 있다는 캐시 우드의 판단을 보여줍니다.

둘째, 바이오테크 확신은 여전합니다. TXG·ARCT 이틀 연속 매수는 단순한 포지션 구축이 아니라, 공격적인 저점 매수 전략입니다.

셋째, 3개 펀드 동시 움직임은 주목해야 합니다. ARKK, ARKW, ARKG가 모두 같은 날 큰 매매를 보여준 것은, ARK 전체의 전략적 리밸런싱이 진행 중임을 시사합니다.

■ 펀드별 요약

ARKK (Innovation) — FIG·TXG 매수 / BLSH·CRCL·TER 매도
ARKW (Next Gen Internet) — FIG 매수 / BLSH·CRCL 매도
ARKG (Genomic Revolution) — TXG·ARCT 매수 / BFLY·GH 매도

FolioObs 대시보드에서 캐시 우드의 일별 매매를 실시간으로 확인하세요.

※ 본 기사는 ARK Invest 공개 데이터 기반이며, 투자 권유가 아닙니다.`,
    contentEn: `The biggest name in Cathie Wood's March 20 trades is undoubtedly Figma (FIG). With a combined 337,381 shares purchased across ARKK and ARKW, she's sending a strong signal about design platforms. Meanwhile, crypto plays were trimmed and biotech buying continued.

■ Buys

FIG (Figma) — 269,652 shares in ARKK, 67,729 shares in ARKW
The day's largest purchase. Figma is the global #1 in UI/UX design collaboration tools, drawing attention since its 2024 IPO. After Adobe's $20B acquisition attempt was blocked by regulators, Figma went public independently. It handles design, prototyping, and developer handoff in a single platform. Buying across two funds simultaneously signals that Wood views Figma as a core "disruptive innovation" holding.

TXG (10x Genomics) — 165,430 shares in ARKK, 27,228 shares in ARKG
Second consecutive day of buying. Following March 19 purchases, Wood continued heavy buying across two funds. The single-cell genomics leader is trading near its 52-week low. Consecutive buying indicates very strong conviction.

ARCT (Arcturus Therapeutics) — 22,773 shares in ARKG
mRNA therapeutics developer, bought for the second straight day. Applying mRNA technology to rare disease treatments.

■ Sells — Crypto Cleanup

BLSH (Bullish) — 89,282 shares from ARKK, 14,097 from ARKW
CRCL (Circle Internet Group) — 39,723 shares from ARKK, 6,275 from ARKW

Both are crypto/blockchain companies, sold simultaneously across ARKK and ARKW. Wood appears to be reducing crypto sector exposure and reallocating capital toward SaaS platforms like Figma and biotech.

TER (Teradyne) — 19,206 shares from ARKK
Semiconductor test equipment company. Minor position adjustment.

BFLY (Butterfly Network) — 182,353 shares from ARKG
Portable ultrasound device company. The day's largest sell, part of healthcare position restructuring within ARKG.

GH (Guardant Health) — 9,621 shares from ARKG
Liquid biopsy company. Position reduction.

■ Key Insight — Cathie Wood's Directional Shift

The big picture from today's trades is clear:

First, capital is flowing from crypto to SaaS. Selling BLSH/CRCL and buying Figma suggests Wood sees the "disruptive innovation" axis shifting from crypto toward AI-era design infrastructure.

Second, biotech conviction remains strong. Consecutive TXG/ARCT buying isn't just position building — it's aggressive bottom-fishing.

Third, three-fund simultaneous movement demands attention. ARKK, ARKW, and ARKG all showing major activity on the same day suggests a strategic rebalancing across all of ARK.

■ Fund Summary

ARKK (Innovation) — Bought FIG, TXG / Sold BLSH, CRCL, TER
ARKW (Next Gen Internet) — Bought FIG / Sold BLSH, CRCL
ARKG (Genomic Revolution) — Bought TXG, ARCT / Sold BFLY, GH

Track Cathie Wood's daily trades in real-time on the FolioObs dashboard.

※ This article is based on ARK Invest public data and is not investment advice.`,
  },
  {
    id: "top5-most-bought-q4-2025",
    date: "2026-03-17",
    category: "데이터 분석",
    categoryEn: "DATA",
    categoryColor: "blue",
    title: "2025 Q4 월가 전설들이 가장 많이 매수한 종목 TOP 5",
    titleEn: "Top 5 Most Bought Stocks by Legendary Investors in Q4 2025",
    summary: "11명의 전설 투자자 13F 데이터를 분석한 결과, CRH, AMZN, SPOT이 가장 많은 투자자에게 신규 매수되었습니다.",
    summaryEn: "Analysis of 11 legendary investors' 13F data shows CRH, AMZN, and SPOT were the most widely bought stocks.",
    tickers: ["CRH", "AMZN", "SPOT", "GOOG", "CPNG"],
    readTime: "4 min",
    content: `11명의 월가 전설 투자자가 같은 분기에 같은 종목을 샀다면? FolioObs가 2025 Q4 13F 공시 데이터를 교차 분석해, 가장 강한 컨센서스가 형성된 종목 5개를 찾았습니다.

■ 1위. CRH — 5명 동시 매수 🏗️

국민연금, 레이 달리오 등 5명의 투자자가 동시에 포지션을 잡았습니다. CRH는 아일랜드 기반 글로벌 건축자재 기업으로, 미국 인프라 투자법(IIJA)과 반도체법(CHIPS Act)의 직접적 수혜주입니다. 도로, 교량, 데이터센터 건설 붐이 이어지는 한, CRH의 수요는 구조적으로 증가합니다. 5명이 동시에 매수한 것은 이 스토리에 대한 확신이 매우 높다는 의미입니다.

■ 2위. AMZN (아마존) — 5명 매수 ☁️

조지 소로스, 빌 애크먼, 댄 로엡, 세스 클라만을 포함한 5명이 매수했습니다. 아마존은 이커머스뿐 아니라, AWS 클라우드와 AI 인프라 매출이 분기마다 사상 최고를 경신하고 있습니다. 전설 투자자들이 이 가격대에서 동시에 움직인다는 것은, "아직 비싸지 않다"는 판단으로 읽힙니다.

■ 3위. SPOT (스포티파이) — 3명 신규 매수 🎵

레이 달리오, 국민연금 등이 새롭게 포트폴리오에 편입했습니다. 스포티파이는 팟캐스트와 오디오북으로 사업을 확장하며, 구독자당 수익(ARPU)이 꾸준히 상승 중입니다. 더 이상 "적자 스트리밍 회사"가 아닌, 수익성이 입증된 플랫폼으로 재평가받고 있습니다.

■ 4위. GOOG (알파벳) — 의견 분열 ⚡

흥미롭게도 GOOG는 매수와 매도가 동시에 나온 유일한 종목입니다. 빌 애크먼, 세스 클라만 등 4명이 비중을 줄이거나 매도한 반면, 다른 투자자들은 유지했습니다. AI 경쟁 심화, 반독점 소송 리스크에 대한 우려가 반영된 것으로 보입니다. 전설들도 의견이 갈리는 종목 — 이런 종목이야말로 개인 투자자가 자신만의 분석이 필요한 영역입니다.

■ 5위. CPNG (쿠팡) — 4명 매수 🇰🇷

조지 소로스, 빌 애크먼 등이 한국 이커머스 대장주에 베팅했습니다. 쿠팡의 로켓배송 인프라와 쿠팡이츠, 쿠팡플레이 등 슈퍼앱 전략이 해외 투자자들의 관심을 끌고 있습니다. 특히 한국 시장에 대한 글로벌 투자자들의 신뢰를 보여주는 상징적 신호입니다.

■ 컨센서스의 힘

여러 전설 투자자가 독립적으로 같은 판단에 도달했다는 것은 강력한 시그널입니다. 물론 이것이 "무조건 사라"는 의미는 아닙니다. 13F는 45일 지연 데이터이고, 이미 주가에 반영되었을 수 있습니다. 하지만 "어디를 봐야 하는지"에 대한 최고의 출발점이 됩니다.

FolioObs 스크리너에서 "2인 이상 보유" 필터로 직접 확인해보세요.

※ 본 기사는 SEC 13F 공시 데이터 기반이며, 투자 권유가 아닙니다.`,
    contentEn: `When 11 legendary Wall Street investors buy the same stock in the same quarter, it's worth paying attention. FolioObs cross-analyzed Q4 2025 13F filings to find the 5 stocks with the strongest consensus.

■ #1. CRH — Bought by 5 Investors 🏗️

NPS (Korea's National Pension), Ray Dalio, and 3 others all took positions simultaneously. CRH is an Ireland-based global building materials company and a direct beneficiary of the U.S. Infrastructure Investment and Jobs Act (IIJA) and CHIPS Act. As long as roads, bridges, and data centers keep getting built, CRH's demand is structurally growing. Five investors buying at once signals very high conviction in this thesis.

■ #2. AMZN (Amazon) — Bought by 5 Investors ☁️

George Soros, Bill Ackman, Dan Loeb, and Seth Klarman were among the buyers. Amazon isn't just e-commerce anymore — AWS cloud and AI infrastructure revenue are hitting all-time highs every quarter. When legendary investors move in at these price levels, the message is clear: "It's not expensive yet."

■ #3. SPOT (Spotify) — 3 New Positions 🎵

Ray Dalio, NPS, and others added Spotify to their portfolios for the first time. Spotify has expanded into podcasts and audiobooks, with average revenue per user (ARPU) steadily climbing. It's being re-rated from "money-losing streaming company" to "proven profitable platform."

■ #4. GOOG (Alphabet) — Divided Opinions ⚡

Interestingly, GOOG was the only stock where buying and selling happened simultaneously. Bill Ackman, Seth Klarman, and 2 others reduced or exited positions while other investors held. Concerns about AI competition and antitrust litigation risk seem to be factors. When even legends disagree on a stock — that's exactly where individual investors need to do their own analysis.

■ #5. CPNG (Coupang) — Bought by 4 Investors 🇰🇷

George Soros and Bill Ackman bet on Korea's dominant e-commerce player. Coupang's Rocket Delivery infrastructure and super-app strategy (Coupang Eats, Coupang Play) are attracting global investor interest. It's a symbolic signal of global investors' confidence in the Korean market.

■ The Power of Consensus

When multiple legendary investors independently reach the same conclusion, it's a powerful signal. Of course, this doesn't mean "buy blindly." 13F data has a 45-day delay and may already be priced in. But it's the best starting point for knowing where to look.

Check the FolioObs Screener with the "2+ Holders" filter to explore on your own.

※ This article is based on SEC 13F filing data and is not investment advice.`,
  },
  {
    id: "druckenmiller-q4-major-changes",
    date: "2026-03-15",
    category: "속보",
    categoryEn: "BREAKING",
    categoryColor: "red",
    title: "드러켄밀러, Q4에 79종목 대규모 리밸런싱 — 신규 26개, 완전 매도 28개",
    titleEn: "Druckenmiller's Massive Q4 Rebalancing — 26 New Buys, 28 Complete Exits",
    summary: "스탠리 드러켄밀러의 듀케인 패밀리 오피스가 2025 Q4에 79종목을 변동시키며 대규모 포트폴리오 리밸런싱을 단행했습니다.",
    summaryEn: "Stanley Druckenmiller's Duquesne Family Office made massive changes in Q4 2025, touching 79 positions with 26 new buys and 28 complete exits.",
    tickers: ["XLF", "EZU", "RSP"],
    readTime: "4 min",
    content: `79종목. 신규 26개. 완전 매도 28개. 스탠리 드러켄밀러가 2025년 4분기에 보여준 것은 미세 조정이 아니라, 포트폴리오의 근본적인 체질 변환이었습니다.

■ 무엇을 샀나 — 3가지 테마가 보인다

1) 금융 섹터 올인
XLF (금융 섹터 ETF)를 포트폴리오 비중 6.7%로 가장 큰 신규 포지션으로 잡았습니다. 이는 금리 인하 사이클에서 은행과 금융사의 수익성 개선에 베팅하는 것입니다. 금리가 내려가면 대출 수요가 살아나고, 채권 포트폴리오의 평가손이 회복됩니다.

2) 유럽으로의 글로벌 로테이션
EZU (유로존 ETF)를 비중 5.5%로 대량 매수했습니다. 미국 시장이 고평가 구간에 진입했다는 판단 아래, 상대적으로 저평가된 유럽 시장으로 자금을 이동시킨 것으로 해석됩니다. 드러켄밀러가 유럽 ETF를 이 정도 규모로 매수한 것은 매우 이례적입니다.

3) 원자재·산업재 회귀
AA (알코아, 1.6%)와 ENTG (엔테그리스, 1.6%)의 매수는 원자재 슈퍼사이클과 반도체 소재에 대한 관심을 동시에 보여줍니다. RSP (S&P 500 동일가중 ETF, 5.0%)의 매수는 빅테크 집중에서 벗어나 시장 전체로 투자를 분산시키려는 의도로 읽힙니다.

■ 무엇을 팔았나 — 에너지·헬스케어 이탈

VST (비스트라 에너지), VRNA (베로나 파마) 등 28종목을 완전 매도했습니다. 이전 분기에 에너지 섹터에 공격적으로 투자했던 드러켄밀러가 이번에는 대부분을 정리한 것이 주목됩니다. "싸게 사서 비싸게 팔라"는 원칙의 전형적 실행입니다.

■ 드러켄밀러를 읽는 법

드러켄밀러의 매매를 해석할 때 가장 중요한 것은 "방향성"입니다. 개별 종목보다 전체 포트폴리오가 어느 방향으로 기울고 있는지를 봐야 합니다. 이번 Q4의 메시지는 명확합니다: 미국 테크 → 글로벌 분산, 에너지 → 금융·산업재.

운용자산 $4.5B, 보유 종목 60개. 분기 수익률 +10.6%.

※ 본 기사는 SEC 13F 공시 데이터 기반이며, 투자 권유가 아닙니다.`,
    contentEn: `79 positions changed. 26 new buys. 28 complete exits. What Stanley Druckenmiller showed in Q4 2025 wasn't fine-tuning — it was a fundamental transformation of his portfolio's DNA.

■ What He Bought — 3 Clear Themes

1) All-In on Financials
XLF (Financial Select Sector ETF) became his largest new position at 6.7% of the portfolio. This is a bet on improved bank profitability during the rate-cutting cycle. As rates fall, loan demand recovers and bond portfolio losses reverse.

2) Global Rotation to Europe
EZU (iShares MSCI Eurozone ETF) was purchased at a massive 5.5% weight. The read: U.S. markets have entered overvaluation territory, and relatively cheaper European markets offer better risk-reward. Druckenmiller buying European ETFs at this scale is highly unusual.

3) Commodities & Industrials Comeback
AA (Alcoa, 1.6%) and ENTG (Entegris, 1.6%) signal interest in both the commodity supercycle and semiconductor materials. RSP (S&P 500 Equal Weight ETF, 5.0%) suggests intent to diversify away from Big Tech concentration toward the broader market.

■ What He Sold — Exit from Energy & Healthcare

VST (Vistra Energy), VRNA (Verona Pharma), and 26 other positions were completely exited. Notable: Druckenmiller was aggressively invested in energy last quarter and has now cleared most of it. Classic execution of "buy cheap, sell dear."

■ How to Read Druckenmiller

The key to interpreting Druckenmiller's trades is directionality. Don't focus on individual stocks — look at which way the entire portfolio is tilting. The Q4 message is clear: U.S. tech → global diversification, energy → financials and industrials.

AUM: $4.5B, 60 holdings. Quarterly return: +10.6%.

※ This article is based on SEC 13F filing data and is not investment advice.`,
  },
  {
    id: "dalio-q4-all-weather",
    date: "2026-03-14",
    category: "분석",
    categoryEn: "ANALYSIS",
    categoryColor: "green",
    title: "레이 달리오, Q4 올웨더 전략 재확인 — 금 ETF·중국 비중 대폭 확대",
    titleEn: "Ray Dalio Reaffirms All Weather in Q4 — Gold ETF & China Exposure Surges",
    summary: "브릿지워터의 Q4 13F에서 GLD 비중 확대와 중국 ADR 대량 매수가 확인되었습니다. 인플레이션 헤지와 글로벌 분산의 정석.",
    summaryEn: "Bridgewater's Q4 13F reveals increased GLD allocation and massive China ADR purchases. A textbook inflation hedge and global diversification play.",
    tickers: ["GLD", "PDD", "BABA", "SPY"],
    readTime: "4 min",
    content: `세계 최대 헤지펀드의 수장이 보내는 시그널은 항상 무게가 다릅니다. 레이 달리오의 브릿지워터 어소시에이츠가 2025 Q4 13F를 통해 공개한 포트폴리오는, '올웨더(All Weather)' 전략의 교과서적 실행이었습니다.

■ 금(Gold) — 인플레이션 방패를 더 두껍게

GLD(금 ETF) 비중을 전 분기 대비 크게 확대했습니다. 달리오는 수십 년간 "현금은 쓰레기(Cash is Trash)"라고 말해왔고, 인플레이션이 구조적으로 높아지는 환경에서 금을 최고의 자산으로 봅니다. 2025년 금 가격이 사상 최고치를 경신한 이후에도 비중을 늘린 것은, 인플레이션이 아직 끝나지 않았다는 판단입니다.

■ 중국 — 역발상 투자의 정수

PDD(핀둬둬), BABA(알리바바) 등 중국 ADR을 대량 매수했습니다. 대부분의 투자자가 중국을 회피하는 시점에서 달리오가 반대로 움직인 것은 주목할 만합니다. 달리오는 "제국의 흥망성쇠" 관점에서 중국의 장기적 부상을 여전히 확신하고 있으며, 현재 밸류에이션이 극단적으로 저렴하다고 판단하는 것으로 보입니다.

■ 올웨더 전략이란?

달리오의 올웨더 포트폴리오는 경제가 성장/하강, 인플레이션 상승/하락 중 어떤 환경이 와도 작동하도록 설계된 리스크 패리티 전략입니다. 주식, 채권, 금, 원자재를 적절히 배분하여 어떤 시나리오에서도 큰 손실 없이 꾸준한 수익을 추구합니다.

■ 포트폴리오 전체 그림

운용자산 $196B, 보유 종목 약 120개. 상위 10개 종목에 SPY, GLD, 중국 ADR이 대거 포진해 있으며, 전형적인 글로벌 매크로 분산 투자 포트폴리오입니다.

※ 본 기사는 SEC 13F 공시 데이터 기반이며, 투자 권유가 아닙니다.`,
    contentEn: `When the head of the world's largest hedge fund sends a signal, it carries weight. Ray Dalio's Bridgewater Associates Q4 2025 13F filing was a textbook execution of the 'All Weather' strategy.

■ Gold — Building a Thicker Inflation Shield

GLD (Gold ETF) allocation was significantly increased quarter-over-quarter. Dalio has spent decades declaring "Cash is Trash," and in a structurally elevated inflation environment, he sees gold as the ultimate asset. Increasing exposure even after gold hit all-time highs in 2025 suggests his view that inflation isn't over yet.

■ China — Contrarian Investing at Its Finest

Major purchases of Chinese ADRs including PDD (Pinduoduo) and BABA (Alibaba). While most investors are avoiding China, Dalio moved in the opposite direction. Through his "Rise and Fall of Empires" framework, he remains convinced of China's long-term ascent and appears to view current valuations as extremely cheap.

■ What Is the All Weather Strategy?

Dalio's All Weather portfolio is a risk parity strategy designed to perform regardless of whether the economy is growing/shrinking or inflation is rising/falling. By properly allocating across stocks, bonds, gold, and commodities, it aims for consistent returns without major drawdowns in any scenario.

■ The Big Picture

AUM: $196B across ~120 holdings. The top 10 positions are dominated by SPY, GLD, and Chinese ADRs — a classic global macro diversification portfolio.

※ This article is based on SEC 13F filing data and is not investment advice.`,
  },
  {
    id: "ackman-q4-concentrated",
    date: "2026-03-13",
    category: "속보",
    categoryEn: "BREAKING",
    categoryColor: "red",
    title: "빌 애크먼, 8종목 초집중 포트폴리오 — 알파벳 비중 22%로 최대",
    titleEn: "Bill Ackman's Ultra-Concentrated 8-Stock Portfolio — Alphabet at 22%",
    summary: "퍼싱 스퀘어의 Q4 13F는 단 8종목. 알파벳이 최대 비중이며, 나이키를 신규 매수했습니다.",
    summaryEn: "Pershing Square's Q4 13F holds just 8 stocks. Alphabet leads at 22%, with Nike as a new position.",
    tickers: ["GOOG", "NKE", "HLT", "QSR"],
    readTime: "3 min",
    content: `빌 애크먼의 투자 철학은 단순합니다 — "확신이 있는 종목에만, 크게 투자한다." 퍼싱 스퀘어의 Q4 13F는 이 철학의 극단적 실행을 보여줍니다. 단 8종목으로 $18B를 운용합니다.

■ 포트폴리오 전체 구성

GOOG (알파벳) — 22.0% (최대 보유)
HLT (힐튼 호텔) — 18.5%
QSR (레스토랑 브랜즈) — 15.2%
CP (캐나디안 퍼시픽) — 14.8%
HHH (하워드 휴즈) — 12.3%
CMG (치폴레) — 8.1%
NKE (나이키) — 5.8% ← 신규 매수
MNST (몬스터 음료) — 3.3%

■ 왜 8종목인가?

애크먼은 "분산투자는 무지에 대한 보험"이라는 워렌 버핏의 말을 자주 인용합니다. 그의 논리: 정말 잘 아는 기업 8개에 집중하는 것이, 잘 모르는 기업 100개에 분산하는 것보다 낫다. 이 초집중 전략은 맞을 때 시장을 압도하고, 틀릴 때 큰 손실을 야기합니다. 2025 Q4 수익률 +12.3%는 이번엔 맞았다는 것을 보여줍니다.

■ 나이키 신규 매수의 의미

나이키(NKE)를 5.8% 비중으로 새롭게 매수한 것이 이번 분기 최대 뉴스입니다. 나이키는 경영진 교체 후 구조조정 중이며, 주가가 고점 대비 50% 이상 하락한 상태입니다. 애크먼은 전형적인 "좋은 기업이 일시적 어려움을 겪을 때 매수"하는 패턴을 보여주고 있습니다.

■ 행동주의 투자자의 눈

애크먼이 포지션을 잡은 기업들은 대부분 경영진에 직접 영향력을 행사할 수 있는 규모입니다. 하워드 휴즈(HHH)의 경우, 애크먼은 이사회 의장직을 맡고 있기도 합니다.

※ 본 기사는 SEC 13F 공시 데이터 기반이며, 투자 권유가 아닙니다.`,
    contentEn: `Bill Ackman's investment philosophy is simple — "Invest big, but only in what you truly understand." Pershing Square's Q4 13F is the extreme execution of this philosophy. Just 8 stocks managing $18B.

■ Full Portfolio

GOOG (Alphabet) — 22.0% (top holding)
HLT (Hilton Hotels) — 18.5%
QSR (Restaurant Brands) — 15.2%
CP (Canadian Pacific) — 14.8%
HHH (Howard Hughes) — 12.3%
CMG (Chipotle) — 8.1%
NKE (Nike) — 5.8% ← NEW POSITION
MNST (Monster Beverage) — 3.3%

■ Why 8 Stocks?

Ackman often quotes Warren Buffett: "Diversification is protection against ignorance." His logic: concentrating on 8 companies you truly understand beats diversifying across 100 you don't. This ultra-concentrated strategy dominates when right and punishes when wrong. A Q4 return of +12.3% shows he got it right this time.

■ The Nike Buy

Adding Nike (NKE) at 5.8% is the quarter's biggest news. Nike is mid-turnaround under new management, with the stock down over 50% from its highs. Ackman is showing his classic pattern: "Buy great companies during temporary struggles."

■ The Activist's Eye

Most of Ackman's positions are large enough to influence management directly. In the case of Howard Hughes (HHH), Ackman serves as Chairman of the board.

※ This article is based on SEC 13F filing data and is not investment advice.`,
  },
  {
    id: "soros-q4-macro-bets",
    date: "2026-03-12",
    category: "분석",
    categoryEn: "ANALYSIS",
    categoryColor: "blue",
    title: "조지 소로스, Q4에 이커머스·반도체 대량 매수 — AMZN·CPNG·INTC 주목",
    titleEn: "George Soros Q4 — Heavy Bets on E-Commerce & Semiconductors",
    summary: "소로스 펀드 매니지먼트의 Q4 13F에서 아마존, 쿠팡, 인텔을 대량 매수. 매크로 투자의 전설이 보는 다음 사이클.",
    summaryEn: "Soros Fund Management's Q4 13F reveals large buys in Amazon, Coupang, and Intel. The macro legend's view of the next cycle.",
    tickers: ["AMZN", "CPNG", "INTC", "UBER"],
    readTime: "3 min",
    content: `"영란은행을 무너뜨린 남자"가 이번에는 이커머스와 반도체에 베팅했습니다. 조지 소로스의 펀드 매니지먼트가 Q4 13F에서 공개한 매매는 전형적인 매크로 투자자의 시선을 담고 있습니다.

■ 핵심 매수 종목

AMZN (아마존) — 비중 대폭 확대. AI 인프라(AWS)와 이커머스 동시 성장 스토리에 베팅.
CPNG (쿠팡) — 한국 이커머스 시장의 지배적 위치와 수익성 개선에 주목.
INTC (인텔) — 반도체 업사이클과 미국 정부의 CHIPS Act 보조금 수혜 기대.
UBER (우버) — 모빌리티 플랫폼의 네트워크 효과와 수익성 전환 베팅.

■ 소로스의 매크로 렌즈

소로스의 투자를 이해하려면 개별 기업이 아닌 거시적 흐름을 봐야 합니다. 이번 포트폴리오에서 읽히는 메시지는 명확합니다:

첫째, 소비 회복에 베팅합니다. 아마존과 쿠팡은 모두 소비자 지출의 바로미터입니다. 금리 인하 사이클이 시작되면 소비가 살아날 것이라는 판단입니다.

둘째, 미국 제조업 부활에 투자합니다. 인텔 매수는 단순한 반도체 투자가 아니라, CHIPS Act로 촉발된 미국 내 반도체 생산 회귀에 대한 매크로 베팅입니다.

셋째, 플랫폼 경제의 승자에 집중합니다. 아마존, 쿠팡, 우버 모두 각 시장의 지배적 플랫폼으로, 규모의 경제가 작동하는 기업들입니다.

■ 반사성 이론의 실전

소로스의 유명한 "반사성 이론"에 따르면, 시장 참여자의 인식이 현실을 변화시킵니다. 시장이 금리 인하를 확신하는 순간, 소비와 투자가 살아나 실제로 경기가 좋아지는 자기 실현적 예언이 작동합니다. 소로스는 이 사이클의 초기에 포지션을 잡고 있는 것으로 보입니다.

운용자산 $25B, 보유 종목 85개.

※ 본 기사는 SEC 13F 공시 데이터 기반이며, 투자 권유가 아닙니다.`,
    contentEn: `"The man who broke the Bank of England" is now betting on e-commerce and semiconductors. Soros Fund Management's Q4 13F reveals trades through the lens of a classic macro investor.

■ Key Purchases

AMZN (Amazon) — Significantly increased. Betting on the dual growth story of AI infrastructure (AWS) and e-commerce.
CPNG (Coupang) — Focused on dominant Korean e-commerce positioning and improving profitability.
INTC (Intel) — Anticipating the semiconductor upcycle and CHIPS Act government subsidies.
UBER (Uber) — Betting on mobility platform network effects and profitability inflection.

■ Soros's Macro Lens

Understanding Soros requires looking at macro flows, not individual companies. The message from this portfolio is clear:

First, he's betting on consumer recovery. Amazon and Coupang are consumer spending barometers. The thesis: as rate cuts begin, consumption will revive.

Second, he's investing in U.S. manufacturing revival. Intel isn't just a semiconductor play — it's a macro bet on the CHIPS Act-driven reshoring of American chip production.

Third, he's concentrating on platform economy winners. Amazon, Coupang, and Uber are all dominant platforms in their markets where economies of scale are at work.

■ Reflexivity Theory in Practice

According to Soros's famous "reflexivity theory," market participants' perceptions change reality. The moment markets become convinced of rate cuts, spending and investment revive, creating a self-fulfilling prophecy. Soros appears to be positioning at the beginning of this cycle.

AUM: $25B, 85 holdings.

※ This article is based on SEC 13F filing data and is not investment advice.`,
  },
  {
    id: "tepper-q4-financials",
    date: "2026-03-11",
    category: "분석",
    categoryEn: "ANALYSIS",
    categoryColor: "green",
    title: "데이비드 테퍼, Q4 중국·테크 더블 베팅 — 알리바바·메타 집중",
    titleEn: "David Tepper Doubles Down on China & Tech — Alibaba & Meta in Focus",
    summary: "아팔루사의 Q4 13F에서 중국 ADR과 빅테크 포지션을 대폭 확대. 위기에서 기회를 찾는 테퍼의 전매특허.",
    summaryEn: "Appaloosa's Q4 13F shows massive increases in China ADR and Big Tech positions. Classic Tepper: finding opportunity in crisis.",
    tickers: ["BABA", "META", "GOOG", "AMZN"],
    readTime: "3 min",
    content: `2008년 금융위기 때 은행주를 대량 매수해 한 해에 $7B을 벌어들인 남자. 데이비드 테퍼는 "모두가 공포에 떨 때 매수한다"는 원칙의 살아있는 전설입니다. Q4 13F에서도 그 DNA는 변함없습니다.

■ 중국 — 공포가 기회다

BABA (알리바바) 비중을 크게 확대했습니다. 중국 경제 둔화, 규제 리스크, 지정학적 긴장 — 모든 악재가 쏟아지는 중에 테퍼는 오히려 매수를 늘렸습니다. "남들이 팔 때 사라"의 전형적 실행입니다. 알리바바의 현재 PER은 역사적 최저 수준이며, 테퍼는 이를 "공짜에 가까운 밸류에이션"으로 판단하는 것으로 보입니다.

■ 빅테크 — AI 수혜주 집중

META (메타)와 GOOG (알파벳)을 대거 매수했습니다. 두 기업 모두 AI 인프라에 대규모 투자를 하고 있으며, 광고 사업에서 AI가 만드는 효율성 개선이 바로 수익으로 연결되는 구조입니다. AMZN (아마존)도 상위 보유 종목에 포함되어 있어, 테퍼가 "AI는 빅테크의 이익을 더 키운다"는 테마에 강하게 베팅하고 있음을 알 수 있습니다.

■ 테퍼를 읽는 법

테퍼의 투자 스타일은 한 문장으로 요약됩니다: "가장 싼 것을 찾아서, 크게 산다." 2008년 은행주, 2020년 항공주, 그리고 2025년 중국 ADR — 패턴은 항상 같습니다. 시장이 극단적 비관에 빠진 섹터에서 반등을 노리는 것이 그의 전매특허입니다.

물론 이 전략에는 리스크가 있습니다. "싸다"고 산 것이 더 싸질 수 있고, 중국의 구조적 문제가 생각보다 깊을 수도 있습니다. 하지만 테퍼의 30년 트랙레코드는 이 전략이 장기적으로 작동한다는 것을 증명합니다.

운용자산 $7B, 보유 종목 45개. 분기 수익률 +8.2%.

※ 본 기사는 SEC 13F 공시 데이터 기반이며, 투자 권유가 아닙니다.`,
    contentEn: `The man who made $7B in a single year by buying bank stocks during the 2008 financial crisis. David Tepper is a living legend of the principle "buy when everyone is terrified." His Q4 13F shows the same DNA.

■ China — Fear Equals Opportunity

BABA (Alibaba) exposure was significantly increased. Chinese economic slowdown, regulatory risk, geopolitical tension — amid all the bad news, Tepper bought more. Classic "buy when others sell." Alibaba's current P/E is near historic lows, and Tepper appears to see it as "nearly free valuation."

■ Big Tech — Concentrated AI Beneficiaries

META (Meta) and GOOG (Alphabet) were purchased heavily. Both companies are investing massively in AI infrastructure, with AI-driven efficiency improvements in advertising translating directly to profits. AMZN (Amazon) is also among top holdings, confirming Tepper's strong bet on the theme: "AI makes Big Tech profits even bigger."

■ How to Read Tepper

Tepper's style summarized in one sentence: "Find the cheapest thing and buy a lot of it." Bank stocks in 2008, airline stocks in 2020, Chinese ADRs in 2025 — the pattern is always the same. Betting on a rebound from sectors drowning in extreme pessimism is his signature move.

Of course, there are risks. What's cheap can get cheaper, and China's structural problems may run deeper than expected. But Tepper's 30-year track record proves this strategy works over the long term.

AUM: $7B, 45 holdings. Quarterly return: +8.2%.

※ This article is based on SEC 13F filing data and is not investment advice.`,
  },
  {
    id: "coleman-q4-tech-growth",
    date: "2026-03-10",
    category: "분석",
    categoryEn: "ANALYSIS",
    categoryColor: "blue",
    title: "체이스 콜먼, Q4 AI·클라우드 올인 — META·MSFT·AMZN 비중 확대",
    titleEn: "Chase Coleman Goes All-In on AI & Cloud — META, MSFT, AMZN Heavy",
    summary: "타이거 글로벌의 Q4 13F에서 AI 인프라 빅3에 집중 투자. '줄리안 로버트슨의 제자'가 보는 차세대 성장주.",
    summaryEn: "Tiger Global's Q4 13F shows concentrated bets on AI infrastructure Big 3. The 'Robertson protégé' picks next-gen growth.",
    tickers: ["META", "MSFT", "AMZN", "CPNG"],
    readTime: "3 min",
    content: `"호랑이의 제자"가 AI 시대의 승자를 고르고 있습니다. 체이스 콜먼이 이끄는 타이거 글로벌 매니지먼트의 Q4 13F는 명확한 메시지를 담고 있습니다: AI 인프라를 소유한 기업이 다음 10년을 지배한다.

■ AI 빅3 집중 매수

META (메타) — 최대 비중. AI 기반 광고 타겟팅과 메타버스/AR 장기 투자.
MSFT (마이크로소프트) — OpenAI 파트너십과 Azure 클라우드의 AI 통합.
AMZN (아마존) — AWS의 AI 서비스(Bedrock)와 이커머스 자동화.

세 기업의 공통점은 "AI를 만드는 것"이 아니라 "AI를 돈으로 바꿀 수 있는 플랫폼"이라는 점입니다. 콜먼은 GPU를 만드는 NVIDIA가 아니라, GPU를 활용해 수익을 창출하는 기업에 베팅하고 있습니다.

■ 쿠팡 — 글로벌 이커머스의 숨은 강자

CPNG (쿠팡)은 타이거 글로벌의 오랜 투자처입니다. 상장 전부터 초기 투자자였으며, 쿠팡의 IPO로 막대한 수익을 올렸습니다. Q4에도 비중을 유지하거나 확대한 것은, 쿠팡의 수익성 개선 트렌드에 대한 지속적인 확신을 보여줍니다.

■ 타이거 글로벌의 투자 DNA

줄리안 로버트슨(타이거 매니지먼트 창립자)의 제자인 콜먼은, 스승의 "최고의 기업을 찾아 투자하고, 최악의 기업을 숏하라"는 원칙을 현대에 적용합니다. 다만 13F에는 롱 포지션만 공개되므로, 숏 포지션은 알 수 없습니다.

운용자산 $30B, 보유 종목 50개.

※ 본 기사는 SEC 13F 공시 데이터 기반이며, 투자 권유가 아닙니다.`,
    contentEn: `The "Tiger Cub" is picking AI era winners. Chase Coleman's Tiger Global Management Q4 13F carries a clear message: companies that own AI infrastructure will dominate the next decade.

■ AI Big 3 Concentrated Buys

META (Meta) — Largest position. AI-powered ad targeting and long-term metaverse/AR investment.
MSFT (Microsoft) — OpenAI partnership and Azure cloud AI integration.
AMZN (Amazon) — AWS AI services (Bedrock) and e-commerce automation.

The common thread: these aren't companies "making AI" — they're "platforms that can turn AI into money." Coleman is betting not on NVIDIA (which makes GPUs), but on the companies using GPUs to generate revenue.

■ Coupang — The Hidden Global E-Commerce Power

CPNG (Coupang) has been a long-standing Tiger Global investment. An early investor since pre-IPO, Tiger Global reaped massive returns from Coupang's listing. Maintaining or increasing the position in Q4 shows continued conviction in Coupang's improving profitability trend.

■ Tiger Global's Investment DNA

As a protégé of Julian Robertson (Tiger Management founder), Coleman applies his mentor's principle — "buy the best companies, short the worst" — to the modern era. However, since 13F only reveals long positions, the short side remains unknown.

AUM: $30B, 50 holdings.

※ This article is based on SEC 13F filing data and is not investment advice.`,
  },
  {
    id: "loeb-q4-activist",
    date: "2026-03-09",
    category: "분석",
    categoryEn: "ANALYSIS",
    categoryColor: "purple",
    title: "댄 로엡, Q4 신규 매수 집중 — 행동주의 타겟 확대",
    titleEn: "Dan Loeb Expands Activist Targets in Q4 — New Positions in Focus",
    summary: "써드 포인트의 Q4 13F에서 새로운 행동주의 투자 타겟이 포착되었습니다. 기업 가치 해소를 노리는 전략.",
    summaryEn: "Third Point's Q4 13F reveals new activist targets. A strategy aimed at unlocking corporate value.",
    tickers: ["AMZN", "GOOG", "META", "INTC"],
    readTime: "3 min",
    content: `"공개 서한의 제왕"이 새로운 표적을 선정했습니다. 댄 로엡의 써드 포인트가 Q4 13F에서 포트폴리오를 대폭 재편하며, 행동주의 투자의 새로운 캠페인을 예고하고 있습니다.

■ 핵심 포지션 변화

AMZN (아마존) — 비중 대폭 확대. 아마존의 사업부별 분리(AWS 분사) 가능성에 베팅하는 것으로 해석됩니다.
META (메타) — 신규 매수. AI 투자 효율성에 대한 경영진 압박 가능성.
INTC (인텔) — 반도체 사업 구조조정 기대. 파운드리 사업부 분리 논의에 주목.

■ 행동주의 투자란?

댄 로엡의 행동주의 투자는 단순히 "주식을 사는 것"이 아닙니다. 대규모 지분을 확보한 후, 경영진에 공개 서한을 보내 전략 변화를 요구합니다. 사업부 분리, 경영진 교체, 자사주 매입, 배당 확대 등을 통해 숨겨진 기업 가치를 끌어냅니다.

과거 캠페인: 소니(게임 사업부 분리 요구), 디즈니(ESPN 전략 변경 압박), 캠벨 수프(이사회 교체) 등

■ 로엡의 서한을 기다려야 할까?

써드 포인트가 특정 종목의 비중을 크게 늘렸다면, 이는 곧 해당 기업에 대한 행동주의 캠페인이 시작될 수 있다는 시그널입니다. 공개 서한이 발표되면 주가가 크게 움직이는 경우가 많으므로, 로엡의 포지션 변화를 추적하는 것은 선행 지표가 될 수 있습니다.

운용자산 $12B, 보유 종목 40개.

※ 본 기사는 SEC 13F 공시 데이터 기반이며, 투자 권유가 아닙니다.`,
    contentEn: `The "King of Public Letters" has selected new targets. Dan Loeb's Third Point significantly reshuffled its portfolio in Q4 13F, signaling new activist campaigns ahead.

■ Key Position Changes

AMZN (Amazon) — Major increase. Interpreted as a bet on potential business unit separation (AWS spinoff).
META (Meta) — New position. Possible management pressure on AI investment efficiency.
INTC (Intel) — Restructuring expectations. Focus on foundry business separation discussions.

■ What Is Activist Investing?

Dan Loeb's activism isn't just "buying stocks." It's about acquiring large stakes, then sending public letters to management demanding strategic changes. Business unit spinoffs, management changes, share buybacks, dividend increases — all tools to unlock hidden corporate value.

Past campaigns: Sony (gaming division spinoff demand), Disney (ESPN strategy pressure), Campbell Soup (board replacement).

■ Should You Watch for Loeb's Letters?

When Third Point significantly increases a position, it signals a potential activist campaign at that company. Since stock prices often move sharply when public letters drop, tracking Loeb's position changes can serve as a leading indicator.

AUM: $12B, 40 holdings.

※ This article is based on SEC 13F filing data and is not investment advice.`,
  },
  {
    id: "klarman-q4-value-plays",
    date: "2026-03-08",
    category: "분석",
    categoryEn: "ANALYSIS",
    categoryColor: "green",
    title: "세스 클라먼, Q4 '안전마진' 전략 — 현금 비중 높이며 선별적 매수",
    titleEn: "Seth Klarman's Q4 'Margin of Safety' — High Cash, Selective Buys",
    summary: "바우포스트 그룹의 Q4 13F는 극도로 보수적. 대부분 보유 유지하며 현금 비중을 높인 것으로 추정됩니다.",
    summaryEn: "Baupost Group's Q4 13F is extremely conservative. Mostly held positions while likely increasing cash allocation.",
    tickers: ["LBTYA", "VSAT", "FOXA"],
    readTime: "3 min",
    content: `"안전마진(Margin of Safety)" — 절판 후 중고 가격이 수백만 원에 달하는 투자 바이블의 저자 세스 클라먼. 그의 Q4 포트폴리오는 이 책의 철학을 그대로 보여줍니다: "잃지 않는 것이 버는 것보다 중요하다."

■ Q4 포트폴리오 특징

클라먼의 바우포스트 그룹은 이번 Q4에도 극도로 보수적인 자세를 유지했습니다. 대규모 신규 매수 없이, 기존 포지션을 대부분 유지하면서 일부 비중만 조정했습니다.

주요 보유 종목:
LBTYA (리버티 글로벌) — 유럽 통신 사업의 저평가에 베팅
VSAT (비아셋) — 위성 통신 기업, 기업 가치 대비 극단적 할인
FOXA (폭스 코퍼레이션) — 미디어 자산의 숨겨진 가치

■ "사지 않는 것"도 투자 결정이다

클라먼이 현금을 많이 들고 있다는 것은, "지금 살 만한 것이 별로 없다"는 강력한 시그널입니다. 바우포스트는 역사적으로 운용자산의 30~50%를 현금으로 보유하는 것으로 유명합니다. 이는 시장이 비쌀 때 참을성 있게 기다리다가, 위기가 올 때 "총알"을 쏘기 위함입니다.

2008년 금융위기, 2020년 코로나 폭락 때 클라먼이 현금으로 저점 매수를 단행한 것은 전설적인 사례입니다.

■ 클라먼에게 배울 점

대부분의 투자자는 "뭘 살까?"에 집중합니다. 하지만 클라먼은 "뭘 사지 말아야 할까?"에 더 집중합니다. 매수 기회가 없으면 현금을 들고 기다리는 인내심 — 이것이 30년간 연평균 15% 이상의 수익률을 만든 비결입니다.

현재 시장이 고평가 구간이라는 클라먼의 암묵적 판단에 주목할 필요가 있습니다.

운용자산 $25B, 보유 종목 60개.

※ 본 기사는 SEC 13F 공시 데이터 기반이며, 투자 권유가 아닙니다.`,
    contentEn: `"Margin of Safety" — the author of an investment bible that trades for thousands of dollars out of print. Seth Klarman's Q4 portfolio perfectly embodies his book's philosophy: "Not losing is more important than winning."

■ Q4 Portfolio Characteristics

Klarman's Baupost Group maintained an extremely conservative stance in Q4. No major new purchases — mostly holding existing positions with minor weight adjustments.

Key holdings:
LBTYA (Liberty Global) — Betting on undervalued European telecom operations
VSAT (ViaSat) — Satellite communications, extreme discount to enterprise value
FOXA (Fox Corporation) — Hidden value in media assets

■ "Not Buying" Is Also an Investment Decision

Klarman holding large cash positions is a powerful signal: "There's not much worth buying right now." Baupost is historically known for holding 30-50% of AUM in cash. This is about patiently waiting when markets are expensive, then deploying "ammunition" when crisis arrives.

Klarman's legendary bottom-buying during the 2008 financial crisis and the 2020 COVID crash exemplify this strategy perfectly.

■ What to Learn from Klarman

Most investors focus on "What should I buy?" Klarman focuses on "What should I NOT buy?" The patience to hold cash when there are no opportunities — that's the secret behind 30+ years of 15%+ average annual returns.

Pay attention to Klarman's implicit message that current markets are in overvaluation territory.

AUM: $25B, 60 holdings.

※ This article is based on SEC 13F filing data and is not investment advice.`,
  },
  {
    id: "nps-q4-pension-moves",
    date: "2026-03-07",
    category: "데이터 분석",
    categoryEn: "DATA",
    categoryColor: "blue",
    title: "국민연금 Q4 — $135B 글로벌 포트폴리오, CRH·SPOT 신규 매수",
    titleEn: "Korea's National Pension Q4 — $135B Portfolio, New Buys in CRH & SPOT",
    summary: "세계 3위 연기금의 Q4 13F 분석. 561종목 분산 투자 전략과 신규 편입 종목을 살펴봅니다.",
    summaryEn: "Analyzing the world's 3rd largest pension fund's Q4 13F. 561-stock diversification strategy and new additions.",
    tickers: ["CRH", "SPOT", "AAPL", "MSFT"],
    readTime: "4 min",
    content: `우리가 매달 내는 국민연금이 월스트리트에서 어떻게 운용되고 있을까요? 국민연금공단(NPS)의 Q4 13F는 세계 3위 규모의 공적 연기금이 $135B(약 180조 원)을 어떻게 배분하는지 보여주는 유일한 공식 데이터입니다.

■ 핵심 신규 매수

CRH — 글로벌 건축자재 기업. 미국 인프라 투자 수혜주로, 레이 달리오 등 다른 전설 투자자들과 동시 매수.
SPOT (스포티파이) — 디지털 오디오 플랫폼. 수익성 전환에 대한 기대.

■ 561종목 — 극단적 분산의 이유

국민연금은 단일 종목 리스크를 극도로 회피합니다. 561개 종목에 분산 투자하는 것은, 국민의 노후 자금을 운용하는 기관으로서 당연한 전략입니다. 개인 투자자의 집중 투자와는 철학이 완전히 다릅니다.

상위 보유 종목은 AAPL, MSFT, AMZN, GOOG, META 등 미국 빅테크가 주를 이루며, 이는 시가총액 가중 인덱스와 유사한 패턴입니다. 다만 국민연금은 인덱스 펀드가 아니라 적극적으로 종목을 선별하는 액티브 운용을 합니다.

■ 국민연금의 투자 스타일

안정적 수익 추구: 연간 목표 수익률 5~7%로, 헤지펀드와 달리 큰 수익보다 꾸준한 성장을 중시합니다.
ESG 통합: 환경·사회·지배구조 기준을 투자 결정에 반영합니다.
장기 투자: 분기마다 큰 변동 없이, 점진적으로 포트폴리오를 조정합니다.
글로벌 분산: 미국 주식뿐 아니라 전 세계 자산에 투자합니다 (13F에는 미국 주식만 공개).

■ 우리 연금이 빅테크에 있다

국민연금의 최대 보유 종목이 애플(AAPL)이라는 사실은 흥미롭습니다. 우리가 매달 내는 연금의 일부가 아이폰을 만드는 회사, 아마존에서 물건을 파는 회사, 구글 검색엔진을 운영하는 회사에 투자되어 있는 것입니다. 미국 빅테크가 잘 될수록 우리 연금도 불어나는 구조입니다.

운용자산 $135B, 보유 종목 561개.

※ 본 기사는 SEC 13F 공시 데이터 기반이며, 투자 권유가 아닙니다.`,
    contentEn: `How is the pension we pay monthly being managed on Wall Street? The National Pension Service (NPS) Q4 13F is the only official data showing how the world's 3rd largest public pension fund allocates $135B (approximately 180 trillion KRW).

■ Key New Purchases

CRH — Global building materials company. A U.S. infrastructure investment beneficiary, bought simultaneously with other legendary investors like Ray Dalio.
SPOT (Spotify) — Digital audio platform. Expectation of profitability inflection.

■ 561 Stocks — Why Extreme Diversification?

NPS minimizes single-stock risk. Diversifying across 561 stocks is a natural strategy for an institution managing citizens' retirement funds. It's a fundamentally different philosophy from concentrated individual investing.

Top holdings include U.S. Big Tech: AAPL, MSFT, AMZN, GOOG, META — a pattern similar to market-cap weighted indices. However, NPS is not an index fund; it actively selects stocks.

■ NPS Investment Style

Stable returns: Targeting 5-7% annual returns, prioritizing consistent growth over outsized gains.
ESG integration: Environmental, social, and governance criteria are factored into decisions.
Long-term focus: Gradual portfolio adjustments with minimal quarterly volatility.
Global diversification: Invests worldwide, not just U.S. equities (13F only reveals U.S. holdings).

■ Our Pension Money in Big Tech

It's fascinating that NPS's largest holding is Apple (AAPL). A portion of our monthly pension payments is invested in the company that makes iPhones, the company that sells goods on Amazon, and the company that runs Google Search. The better U.S. Big Tech performs, the more our pension grows.

AUM: $135B, 561 holdings.

※ This article is based on SEC 13F filing data and is not investment advice.`,
  },
  {
    id: "what-is-13f-guide",
    date: "2026-03-10",
    category: "가이드",
    categoryEn: "GUIDE",
    categoryColor: "purple",
    title: "SEC 13F란? — 월가 전설 투자자 포트폴리오를 추적하는 법",
    titleEn: "What is SEC 13F? — How to Track Legendary Investors",
    summary: "SEC 13F 공시의 개념, 누가 제출하는지, 언제 나오는지, 그리고 개인 투자자가 이를 활용하는 방법을 알아봅니다.",
    summaryEn: "Learn about SEC 13F filings — who files them, when they're due, and how individual investors can use them.",
    tickers: [],
    readTime: "5 min",
    content: `워렌 버핏이 무슨 주식을 사는지, 레이 달리오가 어디에 베팅하는지 — 우리가 이걸 알 수 있는 이유는 단 하나, SEC 13F 공시 덕분입니다. 이 가이드에서 13F의 모든 것을 쉽게 정리해드립니다.

■ 13F란 무엇인가?

미국 증권거래위원회(SEC)가 대형 기관투자자에게 "당신이 뭘 가지고 있는지 알려라"고 요구하는 분기별 보유 주식 보고서입니다. 운용자산(AUM) 1억 달러($100M) 이상인 기관은 의무적으로 제출해야 합니다. 헤지펀드, 뮤추얼펀드, 연기금, 보험사, 은행 등이 모두 해당됩니다.

쉽게 말해, 이 보고서는 월가의 '족보'입니다. 누가 무엇을 얼마나 들고 있는지 분기마다 공개되는 유일한 공식 데이터입니다.

■ 언제 나오나?

각 분기 종료 후 45일 이내에 제출합니다:

Q1 (1~3월) → 5월 15일 마감
Q2 (4~6월) → 8월 14일 마감
Q3 (7~9월) → 11월 14일 마감
Q4 (10~12월) → 2월 14일 마감

실무 팁: 실제로는 대부분의 대형 투자자가 마감일 직전에 제출합니다. 2월 14일 전후가 가장 바쁜 시즌으로, FolioObs에서는 이 기간에 실시간 업데이트를 제공합니다.

■ 무엇을 알 수 있나?

보유 종목 전체 목록과 주식 수량, 분기 간 변화 (신규 매수, 비중 확대/축소, 완전 매도), 포트폴리오 집중도 (상위 10개 종목 비중 등), 섹터별 투자 비중 변화를 확인할 수 있습니다.

특히 강력한 시그널: 여러 전설 투자자가 같은 분기에 같은 종목을 매수하면, 이를 "컨센서스 매수"라 부릅니다. FolioObs의 핵심 기능 중 하나가 바로 이 컨센서스를 자동으로 찾아주는 것입니다.

■ 한계점 — 꼭 알아야 할 것

45일 지연: 12월 31일 기준 포트폴리오가 2월 중순에야 공개됩니다. 이미 주가에 반영되었을 수 있습니다.
롱 포지션만: 숏셀링, 옵션, 스왑 등은 포함되지 않습니다. 즉, 헤지펀드의 "진짜 전략"은 13F만으로는 알 수 없습니다.
미국 상장 주식만: 해외 주식, 채권, 원자재, 암호화폐 등은 미포함입니다.
시점 불확실: 분기 말 보유량이므로, 그 사이에 사고팔았을 수 있습니다.

■ 그럼에도 13F를 봐야 하는 이유

한계에도 불구하고, 13F는 "세계 최고 투자자들이 어디에 돈을 넣고 있는가"를 보여주는 유일한 공식 데이터입니다. 완벽한 데이터는 아니지만, "어디를 봐야 하는가"에 대한 최고의 출발점입니다.

FolioObs는 워렌 버핏, 캐시 우드, 레이 달리오, 스탠리 드러켄밀러 등 11명의 전설 투자자 13F를 자동 추적하여 쉽게 비교할 수 있게 해줍니다.`,
    contentEn: `How do we know what Warren Buffett buys or where Ray Dalio is betting? One reason: SEC 13F filings. This guide breaks down everything you need to know.

■ What is a 13F?

It's a quarterly holdings report that the SEC requires from large institutional investors — essentially saying "tell us what you own." Any institution managing $100M or more in assets must file. This includes hedge funds, mutual funds, pension funds, insurance companies, and banks.

Think of it as Wall Street's family tree. It's the only official data showing who owns what, and how much, every quarter.

■ When Are They Released?

Filed within 45 days after each quarter ends:

Q1 (Jan-Mar) → Due May 15
Q2 (Apr-Jun) → Due Aug 14
Q3 (Jul-Sep) → Due Nov 14
Q4 (Oct-Dec) → Due Feb 14

Pro tip: Most major investors file close to the deadline. The days around February 14 are the busiest season — FolioObs provides real-time updates during this period.

■ What Can You Learn?

Complete holdings lists with share counts, quarter-over-quarter changes (new buys, increases/decreases, complete exits), portfolio concentration (top 10 holdings weight), and sector allocation shifts.

The strongest signal: When multiple legendary investors buy the same stock in the same quarter, it's called a "consensus buy." One of FolioObs' core features is automatically detecting these consensus patterns.

■ Limitations — Must Know

45-day delay: A December 31 portfolio isn't public until mid-February. Prices may have already moved.
Long positions only: Short selling, options, and swaps aren't included. A hedge fund's "real strategy" can't be fully seen through 13F alone.
U.S. listed equities only: Foreign stocks, bonds, commodities, and crypto are excluded.
Point-in-time snapshot: It shows end-of-quarter holdings, but the investor may have bought and sold in between.

■ Why 13F Still Matters

Despite limitations, 13F filings are the only official data showing where the world's best investors are putting their money. It's not perfect data, but it's the best starting point for knowing where to look.

FolioObs automatically tracks 13F filings from 11 legendary investors including Warren Buffett, Cathie Wood, Ray Dalio, and Stanley Druckenmiller — making it easy to compare and analyze.`,
  },
];

// 카테고리 색상 매핑
const CATEGORY_COLORS = {
  red: "bg-red-500/20 text-red-400 border border-red-500/30",
  green: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  blue: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  purple: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
  yellow: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
};

const CATEGORY_DOT = {
  red: "bg-red-500",
  green: "bg-emerald-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
};

// ========== 뉴스 기사 상세 뷰 (Bloomberg style) ==========
function NewsArticleView({ article, onBack, L }) {
  const isEn = L.locale === 'en';
  const title = isEn ? article.titleEn : article.title;
  const content = isEn ? article.contentEn : article.content;
  const category = isEn ? article.categoryEn : article.category;
  const colorClass = CATEGORY_COLORS[article.categoryColor] || CATEGORY_COLORS.blue;
  return (
    <div className="max-w-4xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-amber-400 transition-colors text-sm font-mono"
        >
          <ArrowLeft size={14} />
          <span className="font-mono uppercase tracking-wider text-xs">{isEn ? 'Back to Terminal' : '터미널로 돌아가기'}</span>
        </button>
        <div className="flex items-center gap-2 text-xs text-gray-600 font-mono">
          <Clock size={12} />
          {article.date}
          {article.readTime && <span className="ml-2">· {article.readTime}</span>}
        </div>
      </div>

      {/* Hero illustration (AI image with SVG fallback) */}
      <ArticleVisual articleId={article.id} className="rounded-lg overflow-hidden mb-6 border border-gray-800 max-h-[400px]" />

      {/* Category + Title */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded ${colorClass}`}>
            {category}
          </span>
          {article.tickers?.length > 0 && (
            <div className="flex gap-1.5">
              {article.tickers.slice(0, 4).map(t => (
                <span key={t} className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-mono font-bold rounded border border-amber-500/20">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold leading-tight text-white mb-3">{title}</h1>
        <div className="flex items-center gap-4 text-xs text-gray-500 font-mono border-b border-gray-800 pb-4">
          <span>FolioObs Research</span>
          <span>·</span>
          <span>{article.date}</span>
          <span>·</span>
          <span>{isEn ? 'Based on SEC 13F / ARK public data' : 'SEC 13F / ARK 공시 데이터 기반'}</span>
        </div>
      </div>

      {/* Article body */}
      <article className="space-y-4">
        {content.split('\n').map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return null;

          if (trimmed.startsWith('•') || trimmed.startsWith('·')) {
            const text = trimmed.slice(1).trim();
            return (
              <div key={i} className="flex items-start gap-3 pl-4 py-1">
                <span className="text-amber-400 mt-0.5 text-xs">▸</span>
                <span className="text-gray-300 leading-relaxed">{formatLine(text)}</span>
              </div>
            );
          }
          if (/^\d+\./.test(trimmed)) {
            return (
              <div key={i} className="flex items-start gap-3 pl-4 py-1">
                <span className="text-amber-400 font-bold min-w-[20px] font-mono">{trimmed.match(/^\d+/)[0]}.</span>
                <span className="text-gray-300 leading-relaxed">{formatLine(trimmed.replace(/^\d+\.\s*/, ''))}</span>
              </div>
            );
          }
          if (trimmed.startsWith('※')) {
            return (
              <div key={i} className="mt-8 pt-4 border-t border-gray-800 flex items-start gap-2">
                <AlertCircle size={14} className="text-gray-600 mt-0.5 flex-shrink-0" />
                <p className="text-gray-600 text-xs leading-relaxed">{trimmed.slice(1).trim()}</p>
              </div>
            );
          }
          if (trimmed.endsWith(':') || trimmed.endsWith(':')) {
            return <h3 key={i} className="text-amber-400 font-bold mt-6 mb-2 font-mono text-sm uppercase tracking-wide">{trimmed}</h3>;
          }
          return <p key={i} className="text-gray-300 leading-relaxed">{formatLine(trimmed)}</p>;
        })}
      </article>

      {/* Bottom CTA */}
      <div className="mt-10 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
        <p className="text-amber-400 text-xs font-mono">
          {isEn
            ? '→ Explore this data live on FolioObs Dashboard'
            : '→ FolioObs 대시보드에서 실시간 데이터를 확인하세요'}
        </p>
      </div>
    </div>
  );
}

// 텍스트에서 티커 심볼 강조
function formatLine(text) {
  const parts = text.split(/(\b[A-Z]{2,5}\b)/g);
  return parts.map((part, i) => {
    if (/^[A-Z]{2,5}$/.test(part) && !['ETF', 'AUM', 'SEC', 'ARK', 'TOP', 'NEW', 'DEL', 'CORP', 'INC', 'MSCI', 'NPS', 'LIBERTY', 'MEDIA', 'BUY', 'QTR'].includes(part)) {
      return <span key={i} className="text-amber-400 font-mono font-semibold">{part}</span>;
    }
    return part;
  });
}

// ========== Ticker Tape 컴포넌트 ==========
function TickerTape() {
  const tickers = [
    { symbol: "AAPL", change: "+1.24%" },
    { symbol: "MSFT", change: "+0.87%" },
    { symbol: "AMZN", change: "+2.13%" },
    { symbol: "GOOG", change: "-0.45%" },
    { symbol: "TSLA", change: "+3.21%" },
    { symbol: "NVDA", change: "+1.56%" },
    { symbol: "META", change: "-0.32%" },
    { symbol: "SPOT", change: "+4.12%" },
    { symbol: "CRH", change: "+1.89%" },
    { symbol: "CPNG", change: "+2.67%" },
    { symbol: "NYT", change: "+0.98%" },
    { symbol: "XLF", change: "+0.44%" },
  ];

  return (
    <div className="overflow-hidden border-y border-gray-800 bg-black/40 py-1.5 mb-6">
      <div className="flex animate-scroll-x whitespace-nowrap gap-6">
        {[...tickers, ...tickers].map((t, i) => (
          <span key={i} className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-gray-400">{t.symbol}</span>
            <span className={t.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}>
              {t.change}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// Supabase → camelCase 변환
function mapArticle(row) {
  return {
    id: row.id,
    date: row.date,
    category: row.category,
    categoryEn: row.category_en,
    categoryColor: row.category_color,
    title: row.title,
    titleEn: row.title_en,
    summary: row.summary,
    summaryEn: row.summary_en,
    tickers: row.tickers || [],
    readTime: row.read_time,
    content: row.content,
    contentEn: row.content_en,
    imageUrl: row.image_url,
  };
}

// ========== 뉴스 메인 (Bloomberg Terminal Style) ==========
export default function NewsPage() {
  const L = useLocale();
  const isEn = L.locale === 'en';
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Supabase에서 뉴스 불러오기
  useEffect(() => {
    async function fetchNews() {
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .order('date', { ascending: false });
      if (!error && data) {
        setArticles(data.map(mapArticle));
      }
      setLoading(false);
    }
    fetchNews();
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(articles.map(p => isEn ? p.categoryEn : p.category))];
    return ['all', ...cats];
  }, [isEn, articles]);

  const filteredArticles = useMemo(() => {
    if (selectedCategory === 'all') return articles;
    return articles.filter(p =>
      (isEn ? p.categoryEn : p.category) === selectedCategory
    );
  }, [selectedCategory, isEn, articles]);

  if (selectedArticle) {
    return <NewsArticleView article={selectedArticle} onBack={() => setSelectedArticle(null)} L={L} />;
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="text-amber-400" size={20} />
          <h1 className="text-lg font-bold font-mono tracking-tight text-white">
            FOLIOBS <span className="text-amber-400">TERMINAL</span>
          </h1>
        </div>
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-32 bg-gray-900 rounded-lg animate-pulse border border-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  const headline = filteredArticles[0];
  const rest = filteredArticles.slice(1);

  return (
    <div className="max-w-5xl mx-auto">
      {/* ===== Terminal Header ===== */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Activity className="text-amber-400" size={20} />
            <h1 className="text-lg font-bold font-mono tracking-tight text-white">
              FOLIOBS <span className="text-amber-400">TERMINAL</span>
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-1.5 ml-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 text-[10px] font-mono uppercase tracking-wider">Live</span>
          </div>
        </div>
        <div className="text-gray-600 text-[10px] font-mono tracking-wider">
          SEC 13F · ARK DAILY · INSIDER
        </div>
      </div>

      <p className="text-gray-500 text-xs font-mono mb-4 tracking-wide">
        {isEn
          ? 'DATA-DRIVEN INVESTMENT INTELLIGENCE FROM PUBLIC FILINGS'
          : '공시 데이터 기반 투자 인텔리전스'}
      </p>

      {/* ===== Ticker Tape ===== */}
      <TickerTape />

      {/* ===== Category Filter ===== */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map(cat => {
          const article = articles.find(a => (isEn ? a.categoryEn : a.category) === cat);
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded text-[11px] font-mono uppercase tracking-wider font-bold transition-all ${
                isActive
                  ? 'bg-amber-400 text-black'
                  : 'bg-gray-900 text-gray-500 border border-gray-800 hover:border-gray-600 hover:text-gray-300'
              }`}
            >
              {cat === 'all' ? (isEn ? 'ALL' : '전체') : cat}
            </button>
          );
        })}
      </div>

      {/* ===== Headline Article (Hero) ===== */}
      {headline && (
        <article
          onClick={() => setSelectedArticle(headline)}
          className="relative rounded-lg overflow-hidden mb-6 cursor-pointer group border border-gray-800 hover:border-amber-500/50 transition-all"
        >
          {/* Hero visual (AI image → SVG fallback) */}
          <div className="relative">
            <ArticleVisual articleId={headline.id} className="w-full min-h-[200px]" />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
            {/* Content overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded ${CATEGORY_COLORS[headline.categoryColor]}`}>
                  {isEn ? headline.categoryEn : headline.category}
                </span>
                <span className="text-gray-400 text-xs font-mono flex items-center gap-1">
                  <Clock size={11} /> {headline.date}
                </span>
                {headline.readTime && (
                  <span className="text-gray-500 text-xs font-mono">{headline.readTime}</span>
                )}
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-2 text-white group-hover:text-amber-400 transition-colors leading-snug">
                {isEn ? headline.titleEn : headline.title}
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed line-clamp-2 mb-3">
                {isEn ? headline.summaryEn : headline.summary}
              </p>
              <div className="flex items-center gap-3">
                {headline.tickers?.map(t => (
                  <span key={t} className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-mono font-bold rounded border border-amber-500/20">
                    {t}
                  </span>
                ))}
                <span className="ml-auto text-amber-400 text-xs font-mono flex items-center gap-1 group-hover:gap-2 transition-all">
                  {isEn ? 'READ' : '읽기'} <ChevronRight size={12} />
                </span>
              </div>
            </div>
          </div>
        </article>
      )}

      {/* ===== Article Grid (2 columns) ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rest.map(article => {
          return (
            <article
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              className="rounded-lg overflow-hidden cursor-pointer group border border-gray-800 hover:border-amber-500/40 transition-all bg-gray-950"
            >
              {/* Thumbnail (AI image → SVG fallback) */}
              <div className="relative h-36 overflow-hidden">
                <ArticleVisual articleId={article.id} className="w-full h-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent opacity-80" />
              </div>

              {/* Text content */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${CATEGORY_DOT[article.categoryColor] || 'bg-gray-500'}`} />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 font-bold">
                    {isEn ? article.categoryEn : article.category}
                  </span>
                  <span className="text-gray-700 text-[10px] font-mono ml-auto">{article.date}</span>
                </div>
                <h3 className="text-sm font-bold mb-2 text-white group-hover:text-amber-400 transition-colors leading-snug">
                  {isEn ? article.titleEn : article.title}
                </h3>
                <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed mb-3">
                  {isEn ? article.summaryEn : article.summary}
                </p>
                <div className="flex items-center gap-2 pt-2 border-t border-gray-800/50">
                  {article.tickers?.slice(0, 3).map(t => (
                    <span key={t} className="text-[9px] font-mono text-amber-500/70 font-bold">{t}</span>
                  ))}
                  <span className="ml-auto text-amber-400/60 text-[10px] font-mono flex items-center gap-0.5 group-hover:text-amber-400 transition-colors">
                    {article.readTime} <ChevronRight size={10} />
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* ===== Disclaimer ===== */}
      <div className="mt-10 py-4 border-t border-gray-800">
        <div className="flex items-start gap-3">
          <AlertCircle size={12} className="text-gray-700 mt-0.5 flex-shrink-0" />
          <p className="text-gray-700 text-[10px] font-mono leading-relaxed tracking-wide">
            {isEn
              ? 'FOLIOBS TERMINAL — All content is based on publicly available SEC 13F filings and ARK Invest daily trade disclosures. For informational purposes only. Not investment advice. Article illustrations are AI-generated and do not depict real individuals.'
              : 'FOLIOBS TERMINAL — SEC 13F 공시 및 ARK Invest 일별 매매 공개 데이터 기반. 정보 제공 목적이며, 투자 권유가 아닙니다. 기사 내 일러스트는 AI 생성 이미지이며, 실제 인물을 묘사하지 않습니다.'}
          </p>
        </div>
      </div>
    </div>
  );
}
