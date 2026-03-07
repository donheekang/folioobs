-- ARK 일별 매매 내역 테이블 생성
-- Supabase SQL Editor에서 실행하세요

CREATE TABLE IF NOT EXISTS ark_daily_trades (
  id              SERIAL PRIMARY KEY,
  trade_date      DATE NOT NULL,
  ticker          VARCHAR(10) NOT NULL,
  company         VARCHAR(200) NOT NULL,
  direction       VARCHAR(4) NOT NULL,
  shares_change   BIGINT NOT NULL,
  weight_today    DECIMAL(5,2),
  weight_prev     DECIMAL(5,2),
  funds           TEXT,
  is_new          BOOLEAN DEFAULT FALSE,
  is_exit         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trade_date, ticker)
);

CREATE INDEX IF NOT EXISTS idx_ark_trades_date ON ark_daily_trades(trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_ark_trades_ticker ON ark_daily_trades(ticker);
CREATE INDEX IF NOT EXISTS idx_ark_trades_direction ON ark_daily_trades(direction);

-- RLS (Row Level Security) 비활성화 (service key 사용하므로)
ALTER TABLE ark_daily_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service role" ON ark_daily_trades FOR ALL USING (true) WITH CHECK (true);
