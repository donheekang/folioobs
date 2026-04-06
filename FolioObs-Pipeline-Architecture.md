# FolioObs — 전체 파이프라인 아키텍처

> 최종 업데이트: 2026-03-17

---

## 1. 프로젝트 개요

**FolioObs (월가의 눈)** 은 월가 전설적인 투자자 10명의 SEC 13F 공시 데이터를 실시간으로 추적하고 분석하는 한국어/영어 포트폴리오 분석 플랫폼입니다.

| 항목 | 내용 |
|------|------|
| 추적 투자자 | 10명 (워렌 버핏, 캐시 우드, 드러켄밀러, 레이 달리오, 빌 애크먼, 조지 소로스, 데이비드 테퍼, 체이스 콜먼, 댄 로엡, 세스 클라먼) |
| 추적 종목 | 1,283개 |
| 총 운용자산 | $390.7B |
| 프론트엔드 | React 18.3 + Vite 5 + Tailwind CSS |
| 백엔드 | Supabase (PostgreSQL + Edge Functions) |
| 가격 API | Polygon.io (Starter $29/mo, 15분 지연) |
| AI 분석 | Claude API (포트폴리오 인사이트) |
| 배포 | GitHub Pages (정적 SPA) |
| 저장소 | https://github.com/donheekang/folioobs.git |

---

## 2. 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                       데이터 소스                            │
├────────────────────┬──────────────────┬─────────────────────┤
│  SEC EDGAR (13F)   │  ARK Invest CSV  │  Polygon.io API     │
│  분기 1회 공시      │  매일 매매 공개    │  주가 데이터         │
└────────┬───────────┴────────┬─────────┴──────────┬──────────┘
         │                    │                     │
         ▼                    ▼                     ▼
  edgar-to-supabase    ark-to-supabase     Edge Functions
  (Node.js 스크립트)    (Node.js 스크립트)   (Deno Deploy)
         │                    │                     │
         └────────────────────┼─────────────────────┘
                              ▼
              ┌──────────────────────────┐
              │    Supabase PostgreSQL    │
              │  ┌────────────────────┐  │
              │  │ investors          │  │
              │  │ securities         │  │
              │  │ filings            │  │
              │  │ holdings           │  │
              │  │ holding_changes    │  │
              │  │ investor_metrics   │  │
              │  │ ark_daily_trades   │  │
              │  │ stock_prices       │  │
              │  │ ai_insights        │  │
              │  └────────────────────┘  │
              │  ┌────────────────────┐  │
              │  │ pg_cron (자동 실행)  │  │
              │  │ 매일 22:00 UTC     │  │
              │  │ = 한국 07:00 AM    │  │
              │  └────────────────────┘  │
              └────────────┬─────────────┘
                           ▼
              ┌──────────────────────────┐
              │   React SPA (프론트엔드)   │
              │  • 대시보드               │
              │  • 스크리너               │
              │  • 투자자 비교             │
              │  • AI 인사이트            │
              │  • 워치리스트             │
              └──────────────────────────┘
```

---

## 3. 데이터베이스 스키마

| 테이블 | 용도 | 업데이트 주기 |
|--------|------|-------------|
| `investors` | 투자자 프로필 (이름, 펀드, AUM) | 분기 |
| `securities` | 종목 메타데이터 (티커, CUSIP, 섹터) | 파이프라인 실행 시 |
| `filings` | 13F 제출 기록 (날짜, accession number) | 분기 |
| `holdings` | 포트폴리오 보유 현황 (비중, 주수, 가치) | 분기 + 매일(ARK) |
| `holding_changes` | 분기 대비 변동 (신규/매수/매도/청산) | 분기 |
| `investor_metrics` | AUM, 집중도, 섹터 수 | 분기 |
| `ark_daily_trades` | ARK ETF 일일 매매 (방향, 주수, 펀드) | 매일 |
| `stock_prices` | 주가 데이터 (OHLCV) | 매일 (pg_cron) |
| `ai_insights` | AI 포트폴리오 분석 (JSONB) | 분기/매일 |

---

## 4. Edge Functions (Supabase)

### 4-1. `fetch-stock-prices`

**목적**: Polygon.io API로 전체 시장 종가 데이터를 일괄 가져와 DB에 저장

**실행 방식**:
- pg_cron 자동 실행: 매일 월~금 UTC 22:00 (한국 07:00 AM)
- 수동 호출: `curl -X POST` 또는 Supabase 대시보드

**처리 흐름**:
1. `holdings` 테이블에서 보유 중인 모든 티커 조회
2. Polygon Grouped Daily API로 전체 시장 데이터 가져오기
3. 누락 티커는 개별 Aggregate Bars API로 폴백
4. UTC → ET 타임존 변환 (EDT=UTC-4, EST=UTC-5)
5. `stock_prices` 테이블에 upsert

**핵심 코드** — 타임존 처리:
```typescript
function getLastTradingDate(): string {
  const now = new Date();
  const utcMonth = now.getUTCMonth();
  const isDST = utcMonth >= 2 && utcMonth <= 10;
  const offsetHours = isDST ? 4 : 5;
  const etMs = now.getTime() - offsetHours * 3600000;
  const et = new Date(etMs);
  // ET 기준 17시 이전이면 전일 사용
  if (et.getUTCHours() < 17) day -= 1;
  // 주말이면 금요일로
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
}
```

> **주의**: Deno Deploy에서 `toLocaleString("en-US", { timeZone })` 가 작동하지 않으므로, UTC 기반 수동 계산 필수

### 4-2. `live-prices`

**목적**: 프론트엔드에서 실시간(15분 지연) 가격 조회용 프록시

**실행 방식**: 프론트엔드에서 5~15분 간격 호출

**처리 흐름**:
1. 요청 body에서 티커 배열 수신
2. Polygon Snapshot API 호출 (15분 지연 실시간 데이터)
3. 실패 시 Grouped Daily API 폴백
4. 인메모리 1분 캐시로 rate limit 방지
5. DB에 쓰지 않음 (프록시 전용)

**반환 형식**:
```json
{
  "prices": { "AAPL": { "c": 175.5, "o": 174.0, "ch": 0.86 } },
  "marketStatus": "open",
  "lastTradeDate": "2026-03-17"
}
```

---

## 5. 자동화 (pg_cron)

### 설정 방법 (Supabase SQL Editor)

```sql
-- pg_cron 활성화
SELECT cron.schedule(
  'daily-fetch-stock-prices',
  '0 22 * * 1-5',  -- 월~금 UTC 22:00 = 한국 07:00 AM
  $$
  SELECT net.http_post(
    url := 'https://mghfgcjcbpizjmfrtozi.supabase.co/functions/v1/fetch-stock-prices',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_ANON_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### 실행 로그 확인

```sql
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

---

## 6. 데이터 수집 스크립트

### 6-1. `edgar-to-supabase.mjs` — 분기별 13F 파이프라인

**실행 시기**: 분기 공시 마감 후 (2/14, 5/15, 8/14, 11/14 이후)

```bash
SUPABASE_SERVICE_KEY="..." node scripts/edgar-to-supabase.mjs
```

**처리 흐름**:
1. SEC EDGAR에서 10명 투자자의 13F XML 파싱
2. CUSIP → 티커 변환 (OpenFIGI API, 캐시 사용)
3. 섹터 자동 분류 (키워드 매칭)
4. 분기 대비 변동 계산 (신규/비중확대/비중축소/청산)
5. Supabase DB에 일괄 저장

### 6-2. `ark-to-supabase.mjs` — ARK 일일 매매

**실행 시기**: 매일 (장 마감 후)

```bash
SUPABASE_SERVICE_KEY="..." ANTHROPIC_API_KEY="..." \
  node scripts/ark-to-supabase.mjs --with-insights
```

### 6-3. `generate-insights.mjs` — AI 인사이트 생성

```bash
SUPABASE_SERVICE_KEY="..." ANTHROPIC_API_KEY="..." \
  node scripts/generate-insights.mjs --force
```

### 6-4. `fetch-stock-prices.mjs` — 수동 주가 수집

```bash
POLYGON_API_KEY="..." SUPABASE_SERVICE_KEY="..." \
  node scripts/fetch-stock-prices.mjs
```

---

## 7. 프론트엔드 아키텍처

### 기술 스택

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| React | 18.3.1 | UI 프레임워크 |
| Vite | 5.4.2 | 빌드 도구 |
| Tailwind CSS | 3.4.10 | 스타일링 |
| Recharts | 2.12.7 | 차트/그래프 |
| Lucide React | 0.263.1 | 아이콘 |
| @supabase/supabase-js | 2.45.0 | DB 클라이언트 |

### 페이지 구성

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `#dashboard` | DashboardPage | 메인 대시보드: 히어로, 수익률 랭킹, 핫 종목, 투자자 카드, 오버랩 매트릭스 |
| `#screener` | ScreenerPage | 종목 스크리너: 섹터/투자자/변동 필터링 |
| `#compare` | ComparePage | 투자자 비교 (최대 4명) |
| `#insights` | InsightsPage | AI 포트폴리오 인사이트 (46개) |
| `#watchlist` | WatchlistPage | 사용자 워치리스트 (localStorage) |
| `#investor/:id` | InvestorDetailPage | 투자자 상세: 보유현황, AUM 추이, 분기 변동 |
| `#stock/:ticker` | StockDetailPage | 종목 상세: 보유 투자자, 수익률 |
| `#ark-report` | ArkReportPage | ARK 매매 리포트 |

### 핵심 Hook: `useDataProvider`

전체 앱의 데이터를 관리하는 Context Provider (795줄)

**데이터 로딩 순서**:
1. 투자자 목록 + 메트릭스
2. 보유 종목 (share class 중복 제거)
3. 분기별 히스토리 (AUM 추이)
4. 분기별 매매 활동
5. ARK 일일 매매 (최근 90일)
6. AI 인사이트
7. 주가 데이터 (현재가 + 분기말 종가 + 공시 후 수익률)

**실시간 가격 업데이트**:
- 15분 간격으로 `/live-prices` Edge Function 호출
- 기존 분기말 가격과 병합하여 `sinceFiling` 수익률 계산
- 장 상태(open/closed) 및 마지막 거래일 표시

### 다국어 지원 (i18n)

| 파일 | 역할 |
|------|------|
| `src/i18n/ko.js` | 한국어 번역 |
| `src/i18n/en.js` | 영어 번역 |
| `src/hooks/useLocale.jsx` | 번역 함수 제공 (`L.t()`, `L.investorName()`, `L.style()`, `L.sector()`) |

### 수익률 계산 로직

```
공시 후 수익률 (sinceFiling)
= (현재가 - 분기말 종가) / 분기말 종가 × 100

투자자 포트폴리오 성과
= Σ (보유비중 × sinceFiling) / Σ 보유비중
= 가중평균 수익률
```

---

## 8. 환경변수

### 프론트엔드 (`.env`)

```
VITE_SUPABASE_URL=https://mghfgcjcbpizjmfrtozi.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_POLYGON_API_KEY=B1kOZd...
```

### 백엔드 스크립트

```
SUPABASE_SERVICE_KEY=...     # DB 쓰기 권한 (service_role key)
ANTHROPIC_API_KEY=...         # Claude API (인사이트 생성)
POLYGON_API_KEY=...           # Polygon.io (주가 데이터)
```

---

## 9. 운영 체크리스트

### 매일 (평일)

| 시간 (KST) | 작업 | 방식 |
|------------|------|------|
| 07:00 AM | 전일 종가 수집 | pg_cron 자동 실행 (`fetch-stock-prices`) |
| 09:00 AM | ARK 매매 데이터 수집 | 수동 스크립트 (`ark-to-supabase.mjs`) |

### 분기별

| 시기 | 작업 | 방식 |
|------|------|------|
| 공시 마감 후 | 13F 데이터 수집 | `edgar-to-supabase.mjs` |
| 13F 수집 후 | AI 인사이트 생성 | `generate-insights.mjs --force` |
| 인사이트 후 | 프론트엔드 빌드 & 배포 | `npm run build` → GitHub Pages |

### 장애 대응

| 문제 | 원인 | 해결 |
|------|------|------|
| 주가 날짜가 안 바뀜 | 타임존 버그 | Edge Function의 `getLastTradingDate()` 확인 |
| 특정 티커 가격 없음 | Grouped Daily API 누락 | 개별 Aggregate Bars API로 수동 보충 |
| upsert 409 에러 | on_conflict 미지정 | `?on_conflict=ticker,price_date` 쿼리 파라미터 추가 |
| Deno Deploy 날짜 이상 | `toLocaleString` 미지원 | UTC 기반 수동 ET 계산 사용 |

---

## 10. 비용 구조

| 서비스 | 플랜 | 월 비용 |
|--------|------|--------|
| Supabase | Free | $0 |
| Polygon.io | Starter | $29/mo |
| Claude API | Pay-per-use | ~$5-10/mo (인사이트 생성) |
| GitHub Pages | Free | $0 |
| **합계** | | **~$35-40/mo** |

---

## 11. 주요 해결한 기술 이슈

1. **Deno Deploy 타임존 버그**: `toLocaleString("en-US", { timeZone: "America/New_York" })`가 Deno Deploy에서 작동 안 함 → UTC 기반 수동 ET 오프셋 계산으로 해결

2. **Supabase 1000행 페이지네이션**: PostgREST 기본 1000행 제한 → `range()` 페이지네이션 구현

3. **Grouped Daily API 티커 누락**: ETF, 특수 티커가 일괄 API에 포함 안 됨 → 개별 API 폴백 + 수동 보충 프로세스

4. **다국어 번역 누락**: 투자 스타일 "매크로가치투자", "테크성장투자" 영어 번역 미등록 → en.js에 "Macro Value", "Tech Growth" 추가

---

*이 문서는 FolioObs 프로젝트의 전체 기술 아키텍처를 정리한 것입니다.*
*문의: support@pluslabkorea.com*
