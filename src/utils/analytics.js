/**
 * GA4 전환 이벤트 유틸
 *
 * 이벤트 목록:
 *   investor_click  — 투자자 카드 클릭 (대시보드, 스크리너 등)
 *   detail_view     — 투자자 상세 페이지 진입
 *   cta_click       — CTA 버튼 클릭
 *   page_view       — 페이지 전환
 */

function send(eventName, params = {}) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
}

/** 투자자 카드 클릭 */
export function trackInvestorClick(investorId, source = 'unknown') {
  send('investor_click', {
    investor_id: investorId,
    click_source: source,
  });
}

/** 투자자 상세 페이지 진입 */
export function trackDetailView(investorId) {
  send('detail_view', {
    investor_id: investorId,
  });
}

/** CTA 버튼 클릭 */
export function trackCtaClick(ctaName, location = 'hero') {
  send('cta_click', {
    cta_name: ctaName,
    cta_location: location,
  });
}

/** 페이지 전환 */
export function trackPageView(pageName, param = null) {
  send('page_view', {
    page_name: pageName,
    page_param: param,
  });
}
