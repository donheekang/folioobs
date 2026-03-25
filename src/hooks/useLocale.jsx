import { createContext, useContext } from 'react';
import ko from '../i18n/ko';
import en from '../i18n/en';

const LOCALES = { ko, en };

export const LocaleContext = createContext(null);

// 번역 함수: 중첩 키를 점(.) 으로 접근
// 예: t('dashboard.title') → '월가의 눈'
// 예: t('sectors.기술') → '기술' (ko) / 'Technology' (en)
export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // 컨텍스트 밖에서 호출 시 한국어 기본
    return { locale: 'ko', strings: ko, t: (key, fallback) => resolve(ko, key) ?? fallback ?? key };
  }
  return ctx;
}

// 점(.) 구분 키로 번역 객체에서 값 찾기
function resolve(obj, path) {
  const keys = path.split('.');
  let cur = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[k];
  }
  return cur;
}

// 번역 헬퍼 생성 (App에서 사용)
export function createLocaleValue(locale) {
  const strings = LOCALES[locale] || ko;
  return {
    locale,
    strings,
    // t('dashboard.title') → 번역된 문자열
    t: (key, fallback) => {
      const val = resolve(strings, key);
      return val !== undefined ? val : (fallback ?? key);
    },
    // 섹터명 번역: DB에서 온 한국어 섹터명 → 현재 언어
    sector: (koName) => strings.sectors[koName] ?? koName,
    // 스타일명 번역
    style: (koName) => strings.styles[koName] ?? koName,
    // 태그명 번역
    tag: (koName) => strings.tags[koName] ?? koName,
    // 투자자명: locale에 따라 nameKo 또는 name 사용
    investorName: (inv) => locale === 'ko' ? (inv.nameKo || inv.name) : inv.name,
    // 펀드명
    fundName: (inv) => locale === 'ko' ? (inv.fundKo || inv.fund) : inv.fund,
    // 투자자 소개
    bio: (inv) => locale === 'en' ? (inv.bioEn || inv.bio) : inv.bio,
    // 종목명: DB에 name_ko/name 있으면 locale에 따라
    stockName: (h) => {
      if (locale === 'en' && h.nameEn) return h.nameEn;
      return h.name; // name은 이미 useDataProvider에서 name_ko 우선 매핑됨
    },
    // 분기 포맷 — 짧은 형태 (대시보드 카드 등에서 줄바꿈 방지)
    quarter: (q) => {
      if (!q) return '';
      // 202601-0324 형태 (일별 AI 인사이트: YYYYQQ-MMDD)
      const m0 = q.match(/^(\d{4})(\d{2})-(\d{2})(\d{2})$/);
      if (m0) {
        const yr = m0[1].slice(2);
        const qNum = parseInt(m0[2]);
        const mm = parseInt(m0[3]);
        const dd = parseInt(m0[4]);
        return `Q${qNum}'${yr} (${mm}/${dd})`;
      }
      // Q1'24 형태
      const m1 = q.match(/^Q(\d)'(\d{2})$/);
      if (m1) return locale === 'ko' ? `'${m1[2]} Q${m1[1]}` : `Q${m1[1]} '${m1[2]}`;
      // 2024Q1 형태
      const m2 = q.match(/^(\d{4})Q(\d)$/);
      if (m2) return locale === 'ko' ? `'${m2[1].slice(2)} Q${m2[2]}` : `Q${m2[2]} '${m2[1].slice(2)}`;
      return q;
    },
  };
}

export { LOCALES };
