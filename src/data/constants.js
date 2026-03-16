import { Shield, Zap, Activity, Layers, Target } from "lucide-react";

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
