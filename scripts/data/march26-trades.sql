-- ============================================
-- 3/26 캐시 우드 일별 매매 데이터 입력
-- ============================================

-- 기존 3/26 데이터 삭제 (중복 방지)
DELETE FROM ark_daily_trades WHERE trade_date = '2026-03-26';

-- ============ 매수 (BUY) ============

-- TEM: ARKK 51,881주 (0.0393%) + ARKG 9,092주 (0.0392%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'TEM', 'TEMPUS AI INC', 'buy', 60973, 'ARKK,ARKG');

-- ============ 매도 (SELL) ============

-- NVDA: ARKK 120,936주 (0.3458%) + ARKW 32,904주 (0.3646%) + ARKF 1,601주 (0.0352%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'NVDA', 'NVIDIA CORP', 'sell', -155441, 'ARKK,ARKW,ARKF');

-- META: ARKK 60,348주 (0.5508%) + ARKW 15,612주 (0.5519%) + ARKF 662주 (0.0467%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'META', 'META PLATFORMS INC', 'sell', -76622, 'ARKK,ARKW,ARKF');

-- BLSH: ARKK 167,537주 (0.1024%) + ARKW 9,964주 (0.0236%) + ARKF 8,366주 (0.0393%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'BLSH', 'BULLISH', 'sell', -185867, 'ARKK,ARKW,ARKF');

-- ARKB: ARKW 408,816주 (0.5948%) + ARKF 86,184주 (0.2487%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'ARKB', 'ARK 21SHARES BITCOIN ETF', 'sell', -495000, 'ARKW,ARKF');

-- AMD: ARKK 28,927주 (0.0999%) + ARKW 9,318주 (0.1247%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'AMD', 'ADVANCED MICRO DEVICES INC', 'sell', -38245, 'ARKK,ARKW');

-- ROKU: ARKK 54,020주 (0.0825%) + ARKW 15,467주 (0.0915%) + ARKF 6,234주 (0.0732%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'ROKU', 'ROKU INC', 'sell', -75721, 'ARKK,ARKW,ARKF');

-- XYZ: ARKK 70,745주 (0.0702%) + ARKW 15,627주 (0.0601%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'XYZ', 'BLOCK INC', 'sell', -86372, 'ARKK,ARKW');

-- RXRX: ARKK 191,322주 (0.0100%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'RXRX', 'RECURSION PHARMACEUTICALS INC', 'sell', -191322, 'ARKK');

-- TOST: ARKW 17,489주 (0.0300%) + ARKF 35,246주 (0.1201%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'TOST', 'TOAST INC', 'sell', -52735, 'ARKW,ARKF');

-- ACHR: ARKK 436,322주 (0.0391%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'ACHR', 'ARCHER AVIATION INC', 'sell', -436322, 'ARKK');

-- GOOG: ARKK 4,189주 (0.0196%) + ARKW 4,857주 (0.0883%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'GOOG', 'ALPHABET INC', 'sell', -9046, 'ARKK,ARKW');

-- BIDU: ARKK 15,739주 (0.0290%) + ARKW 4,056주 (0.0289%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'BIDU', 'BAIDU INC', 'sell', -19795, 'ARKK,ARKW');

-- AVGO: ARKK 5,707주 (0.0296%) + ARKW 2,941주 (0.0590%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'AVGO', 'BROADCOM INC', 'sell', -8648, 'ARKK,ARKW');

-- TER: ARKK 16,009주 (0.0805%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'TER', 'TERADYNE INC', 'sell', -16009, 'ARKK');

-- TSM: ARKK 15,696주 (0.0862%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'TSM', 'TAIWAN SEMICONDUCTOR MANUFACTURING CO LTD', 'sell', -15696, 'ARKK');

-- DE: ARKK 9,444주 (0.0903%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'DE', 'DEERE & CO', 'sell', -9444, 'ARKK');

-- ILMN: ARKK 14,418주 (0.0299%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'ILMN', 'ILLUMINA INC', 'sell', -14418, 'ARKK');

-- GTLB: ARKW 22,684주 (0.0306%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'GTLB', 'GITLAB INC', 'sell', -22684, 'ARKW');

-- NFLX: ARKW 6,775주 (0.0403%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'NFLX', 'NETFLIX INC', 'sell', -6775, 'ARKW');

-- SPOT: ARKW 1,313주 (0.0401%) + ARKF 828주 (0.0501%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'SPOT', 'SPOTIFY TECHNOLOGY SA', 'sell', -2141, 'ARKW,ARKF');

-- DDOG: ARKW 5,071주 (0.0407%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'DDOG', 'DATADOG INC', 'sell', -5071, 'ARKW');

-- NET: ARKW 4,302주 (0.0592%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'NET', 'CLOUDFLARE INC', 'sell', -4302, 'ARKW');

-- CRWD: ARKW 2,419주 (0.0603%) + ARKF 1,014주 (0.0502%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'CRWD', 'CROWDSTRIKE HOLDINGS INC', 'sell', -3433, 'ARKW,ARKF');

-- RBRK: ARKW 9,938주 (0.0305%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'RBRK', 'RUBRIK INC', 'sell', -9938, 'ARKW');

-- ABNB: ARKW 2,371주 (0.0201%) + ARKF 2,390주 (0.0403%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'ABNB', 'AIRBNB INC', 'sell', -4761, 'ARKW,ARKF');

-- DASH: ARKW 3,066주 (0.0300%) + ARKF 2,060주 (0.0400%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'DASH', 'DOORDASH INC', 'sell', -5126, 'ARKW,ARKF');

-- NU: ARKF 32,994주 (0.0592%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'NU', 'NU HOLDINGS LTD', 'sell', -32994, 'ARKF');

-- KLAR: ARKF 24,305주 (0.0401%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'KLAR', 'KLARNA GROUP PLC', 'sell', -24305, 'ARKF');

-- SE: ARKF 4,774주 (0.0493%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'SE', 'SEA LTD', 'sell', -4774, 'ARKF');

-- KSPI: ARKF 2,106주 (0.0200%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'KSPI', 'KASPI.KZ AO', 'sell', -2106, 'ARKF');

-- ICE: ARKF 1,506주 (0.0299%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'ICE', 'INTERCONTINENTAL EXCHANGE INC', 'sell', -1506, 'ARKF');

-- FUTU: ARKF 2,240주 (0.0391%)
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-03-26', 'FUTU', 'FUTU HOLDINGS LTD', 'sell', -2240, 'ARKF');
