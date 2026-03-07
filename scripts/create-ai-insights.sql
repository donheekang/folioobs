-- AI 인사이트 테이블 생성
-- Supabase SQL Editor에서 실행하세요

CREATE TABLE IF NOT EXISTS ai_insights (
  id              SERIAL PRIMARY KEY,
  investor_id     INTEGER NOT NULL REFERENCES investors(id),
  quarter         VARCHAR(12) NOT NULL,  -- 분기별: "2026Q1"(6자), 일별: "2026Q1-0307"(10자)
  insights        JSONB NOT NULL,
  model           VARCHAR(50),
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(investor_id, quarter)
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_investor ON ai_insights(investor_id, quarter);

-- RLS
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for service role" ON ai_insights FOR ALL USING (true) WITH CHECK (true);
