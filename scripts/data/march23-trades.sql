-- ============================================
-- 3/23 캐시 우드 일별 매매 데이터 입력
-- ============================================

-- 기존 3/23 데이터 삭제 (중복 방지)
DELETE FROM ark_daily_trades WHERE trade_date = '2026-03-23';

-- 매수 (BUY)
-- TXG: ARKK 84,342주 (ETF 비중 0.0261%) + ARKG 14,380주 (0.0269%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES
  ('2026-03-23', 'TXG', '10X GENOMICS INC', 'buy', 98722, 'ARKK,ARKG');

-- 매도 (SELL)
-- BLSH: ARKK 31,154주 (0.0195%) + ARKW 8,208주 (0.0203%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES
  ('2026-03-23', 'BLSH', 'BULLISH', 'sell', -39362, 'ARKK,ARKW');
