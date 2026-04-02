-- ============================================
-- 4/1 캐시 우드 일별 매매 데이터 입력
-- ============================================

-- 기존 4/1 데이터 삭제 (중복 방지)
DELETE FROM ark_daily_trades WHERE trade_date = '2026-04-01';

-- ============ 매수 (BUY) ============

-- CRWV (CoreWeave): ARKK 15,419주 (0.0203%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-04-01', 'CRWV', 'COREWEAVE INC', 'buy', 15419, 'ARKK');

-- WGS (GeneDx): ARKK 5,943주 (0.0065%) + ARKG 5,162주 (0.0324%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-04-01', 'WGS', 'GENEDX HOLDINGS CORP', 'buy', 11105, 'ARKK,ARKG');

-- KDK (Kodiak AI): ARKQ 91,027주 (0.0352%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-04-01', 'KDK', 'KODIAK AI INC', 'buy', 91027, 'ARKQ');

-- OKLO: ARKQ 11,062주 (0.0304%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-04-01', 'OKLO', 'OKLO INC', 'buy', 11062, 'ARKQ');

-- ARCT (Arcturus): ARKG 7,182주 (0.0054%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-04-01', 'ARCT', 'ARCTURUS THERAPEUTICS HOLDINGS INC', 'buy', 7182, 'ARKG');

-- ============ 매도 (SELL) ============

-- VCYT (Veracyte): ARKK 1,886주 (0.0010%) + ARKG 2,729주 (0.0087%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-04-01', 'VCYT', 'VERACYTE INC', 'sell', -4615, 'ARKK,ARKG');

-- SRTA (Strata Critical Medical): ARKQ 64,690주 (0.0149%) + ARKX 12,758주 (0.0075%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-04-01', 'SRTA', 'STRATA CRITICAL MEDICAL INC', 'sell', -77448, 'ARKQ,ARKX');
