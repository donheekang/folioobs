-- ============================================
-- 3/24 캐시 우드 일별 매매 데이터 입력
-- ============================================

-- 기존 3/24 데이터 삭제 (중복 방지)
DELETE FROM ark_daily_trades WHERE trade_date = '2026-03-24';

-- 매수 (BUY)
-- CRCL: ARKK 116,123주 (0.1950%) + ARKW 30,123주 (0.1928%) + ARKF 15,267주 (0.1914%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES
  ('2026-03-24', 'CRCL', 'CIRCLE INTERNET GROUP INC', 'buy', 161513, 'ARKK,ARKW,ARKF');

-- TXG: ARKK 19,207주 (0.0060%) + ARKG 3,331주 (0.0061%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES
  ('2026-03-24', 'TXG', '10X GENOMICS INC', 'buy', 22538, 'ARKK,ARKG');

-- ARCT: ARKG 4,525주 (0.0029%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES
  ('2026-03-24', 'ARCT', 'ARCTURUS THERAPEUTICS HOLDINGS INC', 'buy', 4525, 'ARKG');

-- 매도 (SELL)
-- BLSH: ARKK 36,605주 (0.0233%) + ARKW 2,474주 (0.0060%) + ARKF 1,985주 (0.0094%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES
  ('2026-03-24', 'BLSH', 'BULLISH', 'sell', -41064, 'ARKK,ARKW,ARKF');

-- ROKU: ARKK 30,666주 (0.0484%) + ARKW 15,910주 (0.0958%) + ARKF 8,064주 (0.0950%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES
  ('2026-03-24', 'ROKU', 'ROKU INC', 'sell', -54640, 'ARKK,ARKW,ARKF');

-- TWST: ARKK 190,100주 (0.1430%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES
  ('2026-03-24', 'TWST', 'TWIST BIOSCIENCE CORP', 'sell', -190100, 'ARKK');

-- BEAM: ARKK 27,716주 (0.0111%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES
  ('2026-03-24', 'BEAM', 'BEAM THERAPEUTICS INC', 'sell', -27716, 'ARKK');

-- VCYT: ARKK 44,617주 (0.0243%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES
  ('2026-03-24', 'VCYT', 'VERACYTE INC', 'sell', -44617, 'ARKK');

-- TER: ARKK 18,620주 (0.0981%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES
  ('2026-03-24', 'TER', 'TERADYNE INC', 'sell', -18620, 'ARKK');

-- TSM: ARKW 3,148주 (0.0679%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES
  ('2026-03-24', 'TSM', 'TAIWAN SEMICONDUCTOR MANUFACTURING CO LTD', 'sell', -3148, 'ARKW');

-- ADYEN: ARKF 474주 (0.0600%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES
  ('2026-03-24', 'ADYEN', 'ADYEN NV', 'sell', -474, 'ARKF');

-- DSY: ARKF 264,891주 (0.4796%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES
  ('2026-03-24', 'DSY', 'DISCOVERY LTD', 'sell', -264891, 'ARKF');
