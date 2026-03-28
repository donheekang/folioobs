-- ============================================
-- 3/27 캐시 우드 일별 매매 데이터 입력
-- ============================================

-- 기존 3/27 데이터 삭제 (중복 방지)
DELETE FROM ark_daily_trades WHERE trade_date = '2026-03-27';

-- ============ 매수 (BUY) ============

-- ARCT: ARKG 48,659주 (0.0311%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-27', 'ARCT', 'ARCTURUS THERAPEUTICS HOLDINGS INC', 'buy', 48659, 'ARKG');

-- ============ 매도 (SELL) ============

-- NVDA: ARKK 44,728주 (0.1295%) + ARKW 12,954주 (0.1460%) + ARKF 437주 (0.0097%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-27', 'NVDA', 'NVIDIA CORP', 'sell', -58119, 'ARKK,ARKW,ARKF');

-- BLSH: ARKK 31,853주 (0.0189%) + ARKW 3,998주 (0.0092%) + ARKF 2,025주 (0.0092%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-27', 'BLSH', 'BULLISH', 'sell', -37876, 'ARKK,ARKW,ARKF');

-- AMD: ARKK 14,699주 (0.0505%) + ARKW 4,427주 (0.0592%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-27', 'AMD', 'ADVANCED MICRO DEVICES INC', 'sell', -19126, 'ARKK,ARKW');

-- META: ARKK 9,194주 (0.0825%) + ARKF 1,306주 (0.0900%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-27', 'META', 'META PLATFORMS INC', 'sell', -10500, 'ARKK,ARKF');

-- TER: ARKK 17,092주 (0.0870%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-27', 'TER', 'TERADYNE INC', 'sell', -17092, 'ARKK');

-- ROKU: ARKK 6,729주 (0.0101%) + ARKW 1,689주 (0.0098%) + ARKF 856주 (0.0098%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-27', 'ROKU', 'ROKU INC', 'sell', -9274, 'ARKK,ARKW,ARKF');

-- TSLA: ARKW 4,221주 (0.1013%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-27', 'TSLA', 'TESLA INC', 'sell', -4221, 'ARKW');
