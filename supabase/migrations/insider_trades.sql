-- =====================================================
-- insider_trades 테이블: FMP API 기반 내부자 거래 데이터
-- =====================================================

CREATE TABLE IF NOT EXISTS insider_trades (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  company_name TEXT,
  reporting_name TEXT NOT NULL,        -- 내부자 이름 (e.g. "COOK TIMOTHY D")
  type_of_owner TEXT,                  -- officer, director, 10% owner, etc.
  transaction_type TEXT NOT NULL,      -- P-Purchase, S-Sale, M-Exempt, A-Award, etc.
  acquisition_or_disposition TEXT,     -- A (취득) or D (처분)
  securities_transacted NUMERIC,      -- 거래 주식 수
  price NUMERIC,                      -- 거래 가격
  transaction_value NUMERIC,           -- 거래 금액 (price * securitiesTransacted)
  securities_owned NUMERIC,           -- 거래 후 보유 주식 수
  security_name TEXT,                 -- Common Stock, Options, etc.
  filing_date DATE NOT NULL,          -- SEC 제출일
  transaction_date DATE,              -- 실제 거래일
  sec_link TEXT,                      -- SEC 공시 링크
  form_type TEXT,                     -- Form 4, Form 3, etc.
  is_tracked_stock BOOLEAN DEFAULT FALSE,  -- FolioObs 추적 종목 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 중복 방지: 같은 내부자가 같은 날짜에 같은 종목 같은 거래 방지
  UNIQUE(symbol, reporting_name, transaction_date, transaction_type, securities_transacted)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_insider_trades_symbol ON insider_trades(symbol);
CREATE INDEX IF NOT EXISTS idx_insider_trades_filing_date ON insider_trades(filing_date DESC);
CREATE INDEX IF NOT EXISTS idx_insider_trades_transaction_type ON insider_trades(transaction_type);
CREATE INDEX IF NOT EXISTS idx_insider_trades_transaction_value ON insider_trades(transaction_value DESC);
CREATE INDEX IF NOT EXISTS idx_insider_trades_is_tracked ON insider_trades(is_tracked_stock) WHERE is_tracked_stock = TRUE;

-- RLS (Row Level Security)
ALTER TABLE insider_trades ENABLE ROW LEVEL SECURITY;

-- 읽기 전용 정책 (anon 키로 읽기만 허용)
CREATE POLICY "insider_trades_select" ON insider_trades
  FOR SELECT TO anon USING (true);

-- service_role은 모든 작업 가능
CREATE POLICY "insider_trades_service" ON insider_trades
  FOR ALL TO service_role USING (true) WITH CHECK (true);
