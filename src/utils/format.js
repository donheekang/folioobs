export const formatUSD = (b) => {
  if (b == null || !isFinite(b)) return '$0B';
  if (b >= 1000) return `$${(b/1000).toFixed(1)}T`;
  if (b < 0.1 && b > 0) return `$${(b*1000).toFixed(0)}M`;
  return `$${b.toFixed(1)}B`;
};

export const formatShares = (n) => {
  if (n == null || !isFinite(n)) return '0';
  if (n >= 1e9) return `${(n/1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n/1e3).toFixed(0)}K`;
  return `${n}`;
};

// "Q1'24" → "24년 1분기", "2024Q1" → "24년 1분기"
export const formatQuarterKo = (q) => {
  if (!q) return '';
  // Q1'24 형태
  const m1 = q.match(/^Q(\d)'(\d{2})$/);
  if (m1) return `${m1[2]}년 ${m1[1]}분기`;
  // 2024Q1 형태
  const m2 = q.match(/^(\d{4})Q(\d)$/);
  if (m2) return `${m2[1].slice(2)}년 ${m2[2]}분기`;
  return q;
};

// 변동률 포맷 (상한/하한 캡 통일)
export const formatChange = (change) => {
  if (change === 100) return '신규';
  if (change === 0) return null; // 변동 없음
  const rounded = Math.round(change);
  if (rounded > 999) return '+999%↑';
  if (rounded < -99) return '-99%↓';
  return `${change > 0 ? '+' : ''}${rounded}%`;
};

// 숫자를 한국식으로 (억/조)
export const formatKRW = (b) => {
  if (b == null || !isFinite(b)) return '0';
  if (b >= 1000) return `${(b/1000).toFixed(1)}조`;
  if (b >= 1) return `${b.toFixed(0)}억`;
  if (b > 0) return `${(b*100).toFixed(0)}백만`;
  return '0';
};
