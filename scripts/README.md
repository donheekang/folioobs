# FolioObs — 스크립트 파이프라인 가이드

## 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                    데이터 소스                            │
├──────────────────────┬──────────────────────────────────┤
│   SEC EDGAR (분기)    │     ARK Invest CSV (매일)        │
│   13F 공시 XML        │     ARKK/ARKW/ARKG/ARKF/ARKQ    │
└──────────┬───────────┴──────────────┬───────────────────┘
           │                          │
           ▼                          ▼
  edgar-to-supabase.mjs      ark-to-supabase.mjs
           │                          │
           ▼                          ▼
┌──────────────────────────────────────────────────────────┐
│                    Supabase DB                            │
│  investors │ securities │ holdings │ ark_daily_trades     │
│  filings   │ holding_changes │ investor_metrics          │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
              generate-insights.mjs
                       │
                       ▼
              ai_insights 테이블
```

---

## 핵심 파이프라인 (자주 쓰는 것)

### 1. ARK 일별 매매 업데이트 (매일)

캐시 우드 ARK ETF 보유종목을 가져와서 전일 대비 매매를 계산하고 DB에 저장.

```bash
SUPABASE_SERVICE_KEY="eyJ..." node scripts/ark-to-supabase.mjs
```

인사이트까지 한번에:
```bash
SUPABASE_SERVICE_KEY="eyJ..." ANTHROPIC_API_KEY="sk-..." node scripts/ark-to-supabase.mjs --with-insights
```

| 옵션 | 설명 |
|------|------|
| `--with-insights` | 파이프라인 끝에 캐시우드 AI 인사이트 자동 생성 |
| `--force` | 이미 등록된 날짜도 재처리 |

**실행 타이밍**: 미국 장 마감 후 CSV 업데이트 (한국 시간 오전 9~11시 이후)

---

### 2. SEC 13F 분기 업데이트 (분기 1회)

워렌 버핏, 드러켄밀러, 레이 달리오 등 13F 공시 데이터를 가져와서 DB에 저장.

```bash
SUPABASE_SERVICE_KEY="eyJ..." node scripts/edgar-to-supabase.mjs
```

**실행 타이밍**: 분기말 후 45일 이내 (2/14, 5/15, 8/14, 11/14 전후)

**처리 과정**:
1. SEC EDGAR API에서 13F XML 다운로드
2. CUSIP → 티커 변환 (OpenFIGI API, `.cusip-cache.json`에 캐시)
3. 섹터 자동 분류
4. 분기별 변동 계산 (신규/매수/매도/청산)
5. Supabase 테이블에 저장

---

### 3. AI 인사이트 생성

Claude API로 투자자별 포트폴리오 분석 인사이트 생성.

```bash
# 전체 투자자 분기별 인사이트
SUPABASE_SERVICE_KEY="..." ANTHROPIC_API_KEY="..." node scripts/generate-insights.mjs

# 캐시우드 일별 매매 인사이트
SUPABASE_SERVICE_KEY="..." ANTHROPIC_API_KEY="..." node scripts/generate-insights.mjs --investor=cathie --daily

# 특정 투자자만
node scripts/generate-insights.mjs --investor=buffett

# 강제 재생성
node scripts/generate-insights.mjs --force
```

| 옵션 | 설명 |
|------|------|
| `--investor=이름` | 특정 투자자만 (buffett, cathie, druckenmiller 등) |
| `--daily` | 캐시우드 일별 매매 기반 인사이트 |
| `--force` | 이미 있어도 재생성 |

---

## 보조 스크립트

### 데이터 정비

| 스크립트 | 용도 | 실행 시점 |
|---------|------|----------|
| `fix-tickers.mjs` | CUSIP→티커 매핑 오류 수정 | 티커가 이상할 때 |
| `reclassify-sectors.mjs` | 종목 섹터 재분류 | 섹터 분류 개선 시 |
| `sync-sector-blocks.mjs` | 섹터 키워드 동기화 | reclassify 후 |

### 데이터 조회/업로드

| 스크립트 | 용도 |
|---------|------|
| `fetch-portfolio.mjs` | 포트폴리오 데이터 조회 (Claude 분석용) |
| `upload-insights.mjs` | 수동 인사이트 업로드 |
| `upload-quarterly-insights.mjs` | 분기 인사이트 일괄 업로드 |
| `export-etc-stocks.mjs` | 특정 종목 데이터 추출 |

### 레거시/디버그

| 스크립트 | 용도 |
|---------|------|
| `edgar-pipeline.mjs` | v1 파이프라인 (JSON 파일 출력, DB 미연동) |
| `debug-xml.mjs` | 13F XML 파싱 디버깅 |

---

## DB 스키마

```bash
# 초기 세팅 (한번만)
psql -d folioobs -f scripts/schema.sql
psql -d folioobs -f scripts/create-ark-daily-trades.sql
psql -d folioobs -f scripts/create-ai-insights.sql
```

### 주요 테이블

| 테이블 | 설명 | 갱신 주기 |
|--------|------|----------|
| `investors` | 추적 투자자 6명 | 투자자 추가 시 |
| `securities` | 종목 (CUSIP, 티커, 섹터) | 파이프라인 실행 시 |
| `filings` | 13F 제출 기록 | 분기 |
| `holdings` | 분기별 보유종목 | 분기 |
| `holding_changes` | 분기 변동 (신규/매수/매도) | 분기 |
| `investor_metrics` | 분기별 AUM/집중도 등 | 분기 |
| `ark_daily_trades` | ARK ETF 일별 매매 | 매일 |
| `ai_insights` | AI 생성 인사이트 | 매일/분기 |

---

## 데이터 파일

`scripts/data/` 폴더:

| 파일 | 설명 |
|------|------|
| `all-portfolios.json` | 전체 포트폴리오 스냅샷 |
| `quarterly-insights.json` | 분기 인사이트 백업 |
| `cathie-insights.json` | 캐시우드 인사이트 백업 |
| `cathie-latest.json` | ARK 최신 보유종목 스냅샷 |

`.cusip-cache.json` — CUSIP→티커 캐시 (OpenFIGI API 호출 최소화)

---

## 일상 운영 체크리스트

### 매일 (평일)
```bash
# 한국 시간 오전 9~11시 이후
SUPABASE_SERVICE_KEY="..." ANTHROPIC_API_KEY="..." \
  node scripts/ark-to-supabase.mjs --with-insights
```

### 분기마다 (2/14, 5/15, 8/14, 11/14 전후)
```bash
# 1. 13F 데이터 업데이트
SUPABASE_SERVICE_KEY="..." node scripts/edgar-to-supabase.mjs

# 2. 전체 인사이트 재생성
SUPABASE_SERVICE_KEY="..." ANTHROPIC_API_KEY="..." \
  node scripts/generate-insights.mjs --force
```

### 필요 시
```bash
# 티커 오류 수정
SUPABASE_SERVICE_KEY="..." node scripts/fix-tickers.mjs

# 섹터 재분류
SUPABASE_SERVICE_KEY="..." node scripts/reclassify-sectors.mjs
```

---

## 환경변수

| 변수 | 필수 | 용도 |
|------|------|------|
| `SUPABASE_SERVICE_KEY` | 필수 | Supabase DB 접근 |
| `ANTHROPIC_API_KEY` | 인사이트 생성 시 | Claude API 호출 |

---

## 투자자 추가하기

`edgar-to-supabase.mjs`에서 `TRACKED_INVESTORS` 배열에 추가:

```js
{
  cik: '0001234567',        // SEC CIK 번호
  name: 'Investor Name',
  nameKo: '투자자 이름',
  fund: 'Fund Name',
  fundKo: '펀드명',
  style: '투자스타일',
  color: '#6366F1',
  gradient: 'linear-gradient(135deg, #6366F1, #818CF8)',
  avatar: 'XX',
}
```

CIK 번호 찾기: https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=13F
