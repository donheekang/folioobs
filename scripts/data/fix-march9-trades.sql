-- ============================================
-- 1) 3/5, 3/6 일별 매매 데이터 삭제 (CSV 기반 부정확)
-- ============================================
DELETE FROM ark_daily_trades WHERE trade_date = '2026-03-05';
DELETE FROM ark_daily_trades WHERE trade_date = '2026-03-06';

-- ============================================
-- 2) 3/9 기존 CSV 데이터 삭제
-- ============================================
DELETE FROM ark_daily_trades WHERE trade_date = '2026-03-09';

-- ============================================
-- 3) 3/9 이메일 기반 매매 데이터 입력
-- ============================================

-- 매수 (BUY)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES
  ('2026-03-09', 'JOBY', 'JOBY AVIATION INC', 'buy', 27759, 'ARKQ,ARKX'),
  ('2026-03-09', 'DKNG', 'DRAFTKINGS INC', 'buy', 32155, 'ARKW'),
  ('2026-03-09', 'CNTN', 'CANTON STRATEGIC HOLDINGS INC', 'buy', 37485, 'ARKF'),
  ('2026-03-09', 'WGS', 'GENEDX HOLDINGS CORP', 'buy', 92, 'ARKK,ARKG');

-- 매도 (SELL)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES
  ('2026-03-09', 'LAB', 'STANDARD BIOTOOLS INC', 'sell', -186633, 'ARKG'),
  ('2026-03-09', 'TXG', '10X GENOMICS INC', 'sell', -87460, 'ARKK'),
  ('2026-03-09', 'SLMT', 'BRERA HOLDINGS PLC', 'sell', -69333, 'ARKW,ARKF'),
  ('2026-03-09', 'NXDR', 'NEXTDOOR HOLDINGS INC', 'sell', -8951, 'ARKW'),
  ('2026-03-09', 'PD', 'PAGERDUTY INC', 'sell', -395, 'ARKW'),
  ('2026-03-09', 'PRNT', '3D PRINTING ETF', 'sell', -301, 'ARKX'),
  ('2026-03-09', 'DSY', 'DASSAULT SYSTEMES SE', 'sell', -100, 'ARKX');
