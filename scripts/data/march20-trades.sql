-- ============================================
-- 3/20 캐시 우드 일별 매매 데이터 입력
-- ============================================

-- 기존 3/20 데이터 삭제 (중복 방지)
DELETE FROM ark_daily_trades WHERE trade_date = '2026-03-20';

-- 매수 (BUY)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES
  ('2026-03-20', 'FIG', 'FIGMA INC', 'buy', 337381, 'ARKK,ARKW'),
  ('2026-03-20', 'TXG', '10X GENOMICS INC', 'buy', 192658, 'ARKK,ARKG'),
  ('2026-03-20', 'ARCT', 'ARCTURUS THERAPEUTICS HOLDINGS INC', 'buy', 22773, 'ARKG');

-- 매도 (SELL)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES
  ('2026-03-20', 'BFLY', 'BUTTERFLY NETWORK INC', 'sell', -182353, 'ARKG'),
  ('2026-03-20', 'BLSH', 'BULLISH', 'sell', -103379, 'ARKK,ARKW'),
  ('2026-03-20', 'CRCL', 'CIRCLE INTERNET GROUP INC', 'sell', -45998, 'ARKK,ARKW'),
  ('2026-03-20', 'TER', 'TERADYNE INC', 'sell', -19206, 'ARKK'),
  ('2026-03-20', 'GH', 'GUARDANT HEALTH INC', 'sell', -9621, 'ARKG');
