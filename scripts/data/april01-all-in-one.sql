-- ============================================
-- 4/1 캐시 우드 전체 데이터 통합 입력
-- Supabase SQL Editor에서 한 번에 실행하세요
-- ============================================

-- ========== 1. 일별 매매 (ark_daily_trades) ==========

DELETE FROM ark_daily_trades WHERE trade_date = '2026-04-01';

-- 매수 5종목
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-04-01', 'CRWV', 'COREWEAVE INC', 'buy', 15419, 'ARKK');

INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-04-01', 'WGS', 'GENEDX HOLDINGS CORP', 'buy', 11105, 'ARKK,ARKG');

INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-04-01', 'KDK', 'KODIAK AI INC', 'buy', 91027, 'ARKQ');

INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-04-01', 'OKLO', 'OKLO INC', 'buy', 11062, 'ARKQ');

INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-04-01', 'ARCT', 'ARCTURUS THERAPEUTICS HOLDINGS INC', 'buy', 7182, 'ARKG');

-- 매도 2종목
INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-04-01', 'VCYT', 'VERACYTE INC', 'sell', -4615, 'ARKK,ARKG');

INSERT INTO ark_daily_trades (trade_date, ticker, company, direction, shares_change, funds)
VALUES ('2026-04-01', 'SRTA', 'STRATA CRITICAL MEDICAL INC', 'sell', -77448, 'ARKQ,ARKX');

-- ========== 2. AI 인사이트 (ai_insights) ==========

-- 먼저 캐시우드 investor_id 가져오기
DO $$
DECLARE
  inv_id uuid;
  q_key text := '2026Q2-0401';
BEGIN
  SELECT id INTO inv_id FROM investors WHERE slug = 'cathie' LIMIT 1;

  IF inv_id IS NULL THEN
    RAISE NOTICE 'cathie investor not found, trying name match';
    SELECT id INTO inv_id FROM investors WHERE name ILIKE '%cathie%' LIMIT 1;
  END IF;

  IF inv_id IS NOT NULL THEN
    -- 기존 4/1 인사이트 삭제
    DELETE FROM ai_insights WHERE investor_id = inv_id AND quarter = q_key;

    -- 인사이트 1: 적극매수
    INSERT INTO ai_insights (investor_id, quarter, title, title_en, description, description_en, tag, confidence)
    VALUES (inv_id, q_key,
      '4월 첫 거래일 — 매수 5종목 vs 매도 2종목, 바이오·AI 인프라 집중 매수',
      'April Opening — 5 Buys vs 2 Sells, Bio & AI Infra Focused Buying',
      '4월 첫 거래일, ARK는 4개 펀드(ARKK·ARKQ·ARKG·ARKX)에서 5종목 매수·2종목 매도를 단행했다. 매수 측에서 KDK(Kodiak AI) 9.1만주가 단일 종목 최대 물량이며, CRWV(CoreWeave), WGS, OKLO, ARCT까지 AI 인프라와 바이오테크에 자금을 집중 배분. 3월의 대규모 매도에서 확보한 현금을 4월 초부터 적극 재투자하는 모습.',
      'On April''s first trading day, ARK executed 5 buys and 2 sells across 4 funds. KDK (Kodiak AI) led with 91K shares, followed by CRWV (CoreWeave), WGS, OKLO, and ARCT — concentrating on AI infrastructure and biotech. Cash raised from March''s massive sell-off is being aggressively redeployed from the start of April.',
      '적극매수', 93);

    -- 인사이트 2: 연속매수
    INSERT INTO ai_insights (investor_id, quarter, title, title_en, description, description_en, tag, confidence)
    VALUES (inv_id, q_key,
      'KDK(Kodiak AI) 9.1만주 대량 매수 — 자율주행 AI 베팅 확대',
      'KDK (Kodiak AI) 91K Share Bulk Buy — Expanding Autonomous Driving AI Bet',
      'ARKQ에서 KDK를 91,027주 매수(비중 0.0352%). Kodiak AI는 자율주행 트럭 기술 기업으로, 3/31에도 매수한 바 있어 이틀 연속 매수. 캐시 우드가 자율주행 상용화 테마에서 Tesla 외 대안 종목으로 KDK에 대한 확신을 키우고 있음을 시사한다.',
      'Bought 91,027 shares of KDK in ARKQ (0.0352% weight). Kodiak AI, an autonomous trucking company, was also bought on 3/31 — making this a 2-day consecutive buy. This signals Cathie Wood''s growing conviction in KDK as an alternative autonomous driving play beyond Tesla.',
      '연속매수', 91);

    -- 인사이트 3: 연속매도
    INSERT INTO ai_insights (investor_id, quarter, title, title_en, description, description_en, tag, confidence)
    VALUES (inv_id, q_key,
      'SRTA 7.7만주 매도 — ARKQ+ARKX 동시 축소, 의료기기 비중 조정',
      'SRTA 77K Shares Sold — ARKQ+ARKX Simultaneous Reduction',
      'Strata Critical Medical(SRTA)을 ARKQ 64,690주 + ARKX 12,758주, 합산 77,448주 매도. 3/31에도 SRTA를 대량 매도한 바 있어 이틀 연속 포지션 축소. 의료기기 섹터에서의 비중을 줄이고, AI·자율주행·유전체학 쪽으로 자금을 이동시키는 리밸런싱이 뚜렷하다.',
      'Sold SRTA 64,690 shares (ARKQ) + 12,758 shares (ARKX), totaling 77,448 shares. After selling SRTA heavily on 3/31, this marks a 2nd consecutive day of position reduction. Clear rebalancing away from medical devices toward AI, autonomous driving, and genomics.',
      '연속매도', 90);

    RAISE NOTICE '✅ 4/1 인사이트 3개 입력 완료 (investor: %)', inv_id;
  ELSE
    RAISE NOTICE '❌ cathie 투자자를 찾을 수 없습니다';
  END IF;
END $$;

-- ========== 3. 뉴스 기사 (news_articles) ==========

DELETE FROM news_articles WHERE id = 'cathie-wood-april-01-trades';

INSERT INTO news_articles (id, date, category, category_en, category_color, title, title_en, summary, summary_en, tickers, read_time, content, content_en)
VALUES (
  'cathie-wood-april-01-trades',
  '2026-04-01',
  '일별 매매',
  'DAILY TRADES',
  'green',
  '캐시 우드 4월 1일 매매 — KDK 9.1만주 대량 매수, AI 인프라+바이오 집중',
  'Cathie Wood April 1 Trades — KDK 91K Bulk Buy, AI Infra & Bio Focus',
  '4월 첫 거래일, ARK는 5종목 매수·2종목 매도를 단행했습니다. KDK(Kodiak AI) 91,027주가 단일 최대 매수이며, CoreWeave·GeneDx·Oklo·Arcturus 등 AI 인프라와 바이오에 집중. SRTA 7.7만주 연속 매도.',
  'On April''s first trading day, ARK made 5 buys and 2 sells. KDK (Kodiak AI) led with 91K shares, plus CoreWeave, GeneDx, Oklo, and Arcturus — focusing on AI infrastructure and biotech. SRTA sold 77K shares for 2nd straight day.',
  ARRAY['KDK', 'CRWV', 'WGS', 'OKLO', 'ARCT', 'VCYT', 'SRTA'],
  '3 min',
  E'캐시 우드가 4월 첫 거래일에 매수 우위의 적극적인 매매를 단행했습니다. 4개 펀드에서 5종목을 매수하고 2종목을 매도했습니다.\n\n■ 매수 종목\n\nKDK (Kodiak AI) — ARKQ 91,027주 (비중 0.0352%)\n자율주행 트럭 AI 기업. 3/31에 이어 이틀 연속 매수로, 캐시 우드가 Tesla 외 자율주행 대안주로 KDK에 대한 확신을 키우고 있습니다.\n\nCRWV (CoreWeave) — ARKK 15,419주 (비중 0.0203%)\nAI 클라우드 인프라 기업. 3/31 첫 편입 이후 이틀 연속 추가 매수. OpenAI 편입에 이어 AI 밸류체인 인프라 확보 전략의 일환.\n\nWGS (GeneDx) — ARKK 5,943주 + ARKG 5,162주 (합산 11,105주)\n유전체 진단 기업. 2개 펀드 동시 매수로 유전체학 테마 지속 강화.\n\nOKLO — ARKQ 11,062주 (비중 0.0304%)\n소형 원자로 기업. AI 데이터센터 전력 수요 증가에 대응하는 차세대 에너지 포지션.\n\nARCT (Arcturus Therapeutics) — ARKG 7,182주 (비중 0.0054%)\nmRNA 치료제 기업. ARKG에서 바이오테크 비중 확대.\n\n■ 매도 종목\n\nSRTA (Strata Critical Medical) — ARKQ 64,690주 + ARKX 12,758주 (합산 77,448주)\n이틀 연속 대량 매도. 의료기기 섹터에서의 포지션을 빠르게 줄이고 있습니다.\n\nVCYT (Veracyte) — ARKK 1,886주 + ARKG 2,729주 (합산 4,615주)\n소량 매도. 진단 섹터 내 종목 간 리밸런싱 성격.\n\n■ 핵심 인사이트: 3월 현금 확보 → 4월 적극 재투자\n\n3월에 NVDA·META·ARKB 등 핵심 보유종목을 대량 매도하며 현금을 확보했던 캐시 우드가, 4월 첫날부터 AI 인프라(KDK·CRWV·OKLO)와 바이오(WGS·ARCT)에 적극 재투자하고 있습니다. ''현금 확보 후 저점매수'' 전략이 본격 가동되는 신호입니다.\n\n※ 본 기사는 ARK Invest 공개 매매 데이터 기반이며, 투자 권유가 아닙니다.',
  E'Cathie Wood made aggressive buy-heavy trades on April''s first trading day, with 5 buys and 2 sells across 4 funds.\n\n■ Buys\n\nKDK (Kodiak AI) — ARKQ 91,027 shares (0.0352%)\nAutonomous trucking AI company. Second consecutive day of buying, signaling growing conviction in KDK as an alternative autonomous driving play beyond Tesla.\n\nCRWV (CoreWeave) — ARKK 15,419 shares (0.0203%)\nAI cloud infrastructure. Second consecutive day of buying after first entry on 3/31. Part of AI value chain infrastructure strategy following OpenAI addition.\n\nWGS (GeneDx) — ARKK 5,943 + ARKG 5,162 shares (11,105 total)\nGenomic diagnostics. Simultaneous buying across 2 funds, continuing genomics theme.\n\nOKLO — ARKQ 11,062 shares (0.0304%)\nSmall modular reactor company. Next-gen energy position for AI datacenter power demand.\n\nARCT (Arcturus Therapeutics) — ARKG 7,182 shares (0.0054%)\nmRNA therapeutics. Expanding biotech weight in ARKG.\n\n■ Sells\n\nSRTA (Strata Critical Medical) — ARKQ 64,690 + ARKX 12,758 shares (77,448 total)\nSecond consecutive day of heavy selling. Rapidly reducing medical device exposure.\n\nVCYT (Veracyte) — ARKK 1,886 + ARKG 2,729 shares (4,615 total)\nSmall sell. Intra-sector rebalancing within diagnostics.\n\n■ Key Insight: March Cash Raising → April Aggressive Redeployment\n\nAfter raising cash through heavy selling of NVDA, META, ARKB in March, Cathie Wood is aggressively redeploying into AI infrastructure (KDK, CRWV, OKLO) and biotech (WGS, ARCT) from April''s very first day. The ''raise cash then buy the dip'' strategy is now fully activated.\n\n※ Based on publicly available ARK Invest trade data. Not investment advice.'
);

-- ========== 완료 확인 ==========
SELECT '✅ trades' AS section, count(*) AS cnt FROM ark_daily_trades WHERE trade_date = '2026-04-01'
UNION ALL
SELECT '✅ insights', count(*) FROM ai_insights WHERE quarter = '2026Q2-0401'
UNION ALL
SELECT '✅ news', count(*) FROM news_articles WHERE id = 'cathie-wood-april-01-trades';
