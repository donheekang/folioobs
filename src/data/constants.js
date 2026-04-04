import { Shield, Zap, Activity, Layers, Target } from "lucide-react";

// ===== 미국 시장 휴장일 (NYSE/NASDAQ) =====
export const US_MARKET_HOLIDAYS = {
  '2025-01-01': { ko: '신정', en: "New Year's Day" },
  '2025-01-09': { ko: '지미 카터 추모일', en: 'Jimmy Carter Mourning' },
  '2025-01-20': { ko: 'MLK의 날', en: 'MLK Jr. Day' },
  '2025-02-17': { ko: '대통령의 날', en: "Presidents' Day" },
  '2025-04-18': { ko: '성금요일', en: 'Good Friday' },
  '2025-05-26': { ko: '현충일', en: 'Memorial Day' },
  '2025-06-19': { ko: '준틴스', en: 'Juneteenth' },
  '2025-07-04': { ko: '독립기념일', en: 'Independence Day' },
  '2025-09-01': { ko: '노동절', en: 'Labor Day' },
  '2025-11-27': { ko: '추수감사절', en: 'Thanksgiving' },
  '2025-12-25': { ko: '크리스마스', en: 'Christmas' },
  '2026-01-01': { ko: '신정', en: "New Year's Day" },
  '2026-01-19': { ko: 'MLK의 날', en: 'MLK Jr. Day' },
  '2026-02-16': { ko: '대통령의 날', en: "Presidents' Day" },
  '2026-04-03': { ko: '성금요일', en: 'Good Friday' },
  '2026-05-25': { ko: '현충일', en: 'Memorial Day' },
  '2026-06-19': { ko: '준틴스', en: 'Juneteenth' },
  '2026-07-03': { ko: '독립기념일(대체)', en: 'Independence Day (Observed)' },
  '2026-09-07': { ko: '노동절', en: 'Labor Day' },
  '2026-11-26': { ko: '추수감사절', en: 'Thanksgiving' },
  '2026-12-25': { ko: '크리스마스', en: 'Christmas' },
};

/** 오늘이 미국 시장 휴장일인지 확인 (ET 기준) */
export function getTodayHoliday() {
  // ET(미국 동부시간) 기준 오늘 날짜
  const now = new Date();
  const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const etDate = new Date(etStr);
  const y = etDate.getFullYear();
  const m = String(etDate.getMonth() + 1).padStart(2, '0');
  const d = String(etDate.getDate()).padStart(2, '0');
  const todayET = `${y}-${m}-${d}`;
  const holiday = US_MARKET_HOLIDAYS[todayET];
  return holiday ? { date: todayET, ...holiday } : null;
}

export const SECTOR_COLORS = {
  "기술": "#3B82F6", "금융": "#10B981", "필수소비재": "#F59E0B",
  "에너지": "#EF4444", "헬스케어": "#A855F7", "경기소비재": "#EC4899",
  "산업": "#6366F1", "원자재": "#F97316", "지수": "#06B6D4", "채권": "#64748B"
};

export const STYLE_ICONS = {
  "가치투자": Shield, "성장주투자": Zap, "매크로투자": Activity,
  "분산투자": Layers, "행동주의투자": Target,
  "매크로가치투자": Activity, "테크성장투자": Zap
};

export const TAG_COLORS_MAP = (t) => ({
  "리스크": t.red, "섹터": t.blue, "신규매수": t.green,
  "비중확대": t.green, "비중축소": t.amber, "스타일": t.purple, "트렌드": t.accent
});
