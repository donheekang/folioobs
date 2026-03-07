-- ============================================================
-- FolioObs Database Schema (PostgreSQL)
-- SEC 13F 기반 기관투자자 포트폴리오 분석 서비스
-- ============================================================

-- 1. 투자자 (SEC 13F 제출 기관)
CREATE TABLE investors (
  id            SERIAL PRIMARY KEY,
  cik           VARCHAR(10) UNIQUE NOT NULL,     -- SEC CIK 번호 (예: '0001067983')
  name          VARCHAR(200) NOT NULL,            -- 영문 기관명
  name_ko       VARCHAR(200),                     -- 한국어 이름
  fund_name     VARCHAR(200),                     -- 펀드명
  fund_name_ko  VARCHAR(200),                     -- 펀드명 (한국어)
  style         VARCHAR(50),                      -- 투자 스타일 (가치투자, 성장주, 매크로 등)
  bio           TEXT,                             -- 소개
  founded_year  INTEGER,                          -- 설립 연도
  avatar        VARCHAR(10),                      -- 아바타 텍스트 (WB, CW 등)
  color         VARCHAR(7),                       -- 대표 색상
  gradient      VARCHAR(100),                     -- CSS 그래디언트
  is_active     BOOLEAN DEFAULT TRUE,             -- 추적 활성 여부
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 종목 (Securities)
CREATE TABLE securities (
  id            SERIAL PRIMARY KEY,
  cusip         VARCHAR(9) UNIQUE NOT NULL,       -- CUSIP 번호 (13F에서 사용)
  ticker        VARCHAR(10),                      -- 티커 심볼
  name          VARCHAR(200) NOT NULL,            -- 영문 종목명
  name_ko       VARCHAR(200),                     -- 한국어 종목명
  sector        VARCHAR(50),                      -- 섹터
  sector_ko     VARCHAR(50),                      -- 섹터 (한국어)
  market_cap    BIGINT,                           -- 시가총액 (USD)
  exchange      VARCHAR(20),                      -- 거래소 (NYSE, NASDAQ 등)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 13F 제출 기록 (Filing)
CREATE TABLE filings (
  id              SERIAL PRIMARY KEY,
  investor_id     INTEGER NOT NULL REFERENCES investors(id),
  accession_no    VARCHAR(25) UNIQUE NOT NULL,    -- SEC 접수번호 (예: '0001067983-24-000012')
  filing_date     DATE NOT NULL,                  -- 제출일
  report_date     DATE NOT NULL,                  -- 보고 기준일 (분기말)
  quarter         VARCHAR(6) NOT NULL,            -- 분기 (예: '2024Q1')
  total_value     BIGINT,                         -- 포트폴리오 총 가치 (천 달러)
  holding_count   INTEGER,                        -- 보유 종목 수
  xml_url         TEXT,                           -- SEC EDGAR XML 파일 URL
  parsed_at       TIMESTAMPTZ,                    -- 파싱 완료 시각
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 보유종목 (Holdings) — 핵심 테이블
CREATE TABLE holdings (
  id              SERIAL PRIMARY KEY,
  filing_id       INTEGER NOT NULL REFERENCES filings(id) ON DELETE CASCADE,
  investor_id     INTEGER NOT NULL REFERENCES investors(id),
  security_id     INTEGER NOT NULL REFERENCES securities(id),
  quarter         VARCHAR(6) NOT NULL,            -- 분기 (빠른 조회용)
  shares          BIGINT NOT NULL,                -- 보유 주식 수
  value           BIGINT NOT NULL,                -- 가치 (천 달러, SEC 기준)
  pct_of_portfolio DECIMAL(5,2),                  -- 포트폴리오 비중 (%)
  option_type     VARCHAR(10),                    -- 'PUT', 'CALL', 또는 NULL (주식)
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 분기별 변동 (자동 계산 — 현재 vs 이전 분기 비교)
CREATE TABLE holding_changes (
  id              SERIAL PRIMARY KEY,
  investor_id     INTEGER NOT NULL REFERENCES investors(id),
  security_id     INTEGER NOT NULL REFERENCES securities(id),
  quarter         VARCHAR(6) NOT NULL,
  prev_quarter    VARCHAR(6),
  change_type     VARCHAR(10) NOT NULL,           -- 'new', 'buy', 'sell', 'exit'
  shares_change   BIGINT,                         -- 주식 수 변동
  pct_change      DECIMAL(8,2),                   -- 변동률 (%)
  value_current   BIGINT,                         -- 현재 가치
  value_prev      BIGINT,                         -- 이전 가치
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 투자자 분기별 메트릭 (집계 테이블)
CREATE TABLE investor_metrics (
  id              SERIAL PRIMARY KEY,
  investor_id     INTEGER NOT NULL REFERENCES investors(id),
  quarter         VARCHAR(6) NOT NULL,
  total_aum       BIGINT,                         -- 총 운용자산 (천 달러)
  holding_count   INTEGER,                        -- 보유 종목 수
  sector_count    INTEGER,                        -- 섹터 수
  concentration   DECIMAL(5,3),                   -- 상위 10개 비중 합
  top_holding_pct DECIMAL(5,2),                   -- 최대 비중 종목 %
  qoq_change      DECIMAL(5,2),                   -- 전분기 대비 AUM 변동률
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(investor_id, quarter)
);

-- 7. ARK 일별 매매 내역 (캐시 우드 전용 — 전일 대비 변동)
CREATE TABLE ark_daily_trades (
  id              SERIAL PRIMARY KEY,
  trade_date      DATE NOT NULL,                  -- 매매일
  ticker          VARCHAR(10) NOT NULL,            -- 티커 심볼
  company         VARCHAR(200) NOT NULL,           -- 종목명
  direction       VARCHAR(4) NOT NULL,             -- 'buy' 또는 'sell'
  shares_change   BIGINT NOT NULL,                 -- 변동 주식 수 (양수=매수, 음수=매도)
  weight_today    DECIMAL(5,2),                    -- 당일 포트폴리오 비중 (%)
  weight_prev     DECIMAL(5,2),                    -- 전일 포트폴리오 비중 (%)
  funds           TEXT,                            -- 보유 ETF 목록 (쉼표 구분: 'ARKK,ARKW')
  is_new          BOOLEAN DEFAULT FALSE,           -- 신규 편입 여부
  is_exit         BOOLEAN DEFAULT FALSE,           -- 완전 청산 여부
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trade_date, ticker)
);

-- 8. AI 인사이트 (투자자별 AI 분석)
CREATE TABLE ai_insights (
  id              SERIAL PRIMARY KEY,
  investor_id     INTEGER NOT NULL REFERENCES investors(id),
  quarter         VARCHAR(6) NOT NULL,
  insights        JSONB NOT NULL,                    -- [{title, desc, tag, confidence}]
  model           VARCHAR(50),                       -- 사용된 AI 모델
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(investor_id, quarter)
);

-- ===== 인덱스 =====
CREATE INDEX idx_holdings_investor_quarter ON holdings(investor_id, quarter);
CREATE INDEX idx_holdings_security ON holdings(security_id);
CREATE INDEX idx_holdings_quarter ON holdings(quarter);
CREATE INDEX idx_filings_investor ON filings(investor_id);
CREATE INDEX idx_filings_quarter ON filings(quarter);
CREATE INDEX idx_changes_investor_quarter ON holding_changes(investor_id, quarter);
CREATE INDEX idx_changes_type ON holding_changes(change_type);
CREATE INDEX idx_securities_ticker ON securities(ticker);
CREATE INDEX idx_securities_cusip ON securities(cusip);
CREATE INDEX idx_securities_sector ON securities(sector);
CREATE INDEX idx_ark_trades_date ON ark_daily_trades(trade_date DESC);
CREATE INDEX idx_ark_trades_ticker ON ark_daily_trades(ticker);
CREATE INDEX idx_ark_trades_direction ON ark_daily_trades(direction);
CREATE INDEX idx_ai_insights_investor ON ai_insights(investor_id, quarter);

-- ===== 유용한 뷰 =====

-- 최신 분기 보유종목 (가장 많이 쓸 쿼리)
CREATE VIEW v_latest_holdings AS
SELECT
  h.*,
  i.name AS investor_name,
  i.name_ko AS investor_name_ko,
  i.cik,
  s.ticker,
  s.name AS security_name,
  s.name_ko AS security_name_ko,
  s.sector,
  s.sector_ko
FROM holdings h
JOIN investors i ON h.investor_id = i.id
JOIN securities s ON h.security_id = s.id
WHERE h.quarter = (SELECT MAX(quarter) FROM filings);

-- 투자자 오버랩 (2명 이상 보유 종목)
CREATE VIEW v_overlap_stocks AS
SELECT
  s.ticker,
  s.name,
  s.sector,
  COUNT(DISTINCT h.investor_id) AS holder_count,
  ARRAY_AGG(DISTINCT i.name_ko) AS investor_names,
  SUM(h.value) AS total_value
FROM holdings h
JOIN securities s ON h.security_id = s.id
JOIN investors i ON h.investor_id = i.id
WHERE h.quarter = (SELECT MAX(quarter) FROM filings)
GROUP BY s.id, s.ticker, s.name, s.sector
HAVING COUNT(DISTINCT h.investor_id) >= 2
ORDER BY holder_count DESC;

-- 최근 신규 매수 종목
CREATE VIEW v_new_positions AS
SELECT
  hc.*,
  i.name_ko AS investor_name_ko,
  s.ticker,
  s.name_ko AS security_name_ko,
  s.sector_ko
FROM holding_changes hc
JOIN investors i ON hc.investor_id = i.id
JOIN securities s ON hc.security_id = s.id
WHERE hc.change_type = 'new'
  AND hc.quarter = (SELECT MAX(quarter) FROM filings)
ORDER BY hc.value_current DESC;
