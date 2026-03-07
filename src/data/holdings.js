// ========== HOLDINGS DATA ==========
export const HOLDINGS = {
  buffett: [
    { ticker: "AAPL", name: "애플", shares: 915000000, value: 185.5, pct: 28.5, sector: "기술", change: -5.2 },
    { ticker: "BAC", name: "뱅크오브아메리카", shares: 1032852006, value: 35.2, pct: 5.4, sector: "금융", change: 2.1 },
    { ticker: "AXP", name: "아메리칸 익스프레스", shares: 151610700, value: 33.8, pct: 5.2, sector: "금융", change: 0 },
    { ticker: "KO", name: "코카콜라", shares: 400000000, value: 25.0, pct: 3.8, sector: "필수소비재", change: 0 },
    { ticker: "CVX", name: "셰브론", shares: 110248289, value: 18.5, pct: 2.8, sector: "에너지", change: -8.5 },
    { ticker: "OXY", name: "옥시덴탈", shares: 255281524, value: 15.2, pct: 2.3, sector: "에너지", change: 3.2 },
    { ticker: "KHC", name: "크래프트 하인즈", shares: 325634818, value: 12.0, pct: 1.8, sector: "필수소비재", change: 0 },
    { ticker: "MCO", name: "무디스", shares: 24669778, value: 10.5, pct: 1.6, sector: "금융", change: 0 },
    { ticker: "DVA", name: "다비타", shares: 36095570, value: 5.2, pct: 0.8, sector: "헬스케어", change: 1.5 },
    { ticker: "AMZN", name: "아마존", shares: 10000000, value: 4.8, pct: 0.7, sector: "기술", change: 100 },
  ],
  cathie: [
    { ticker: "TSLA", name: "테슬라", shares: 5200000, value: 6.4, pct: 12.8, sector: "기술", change: 5.5 },
    { ticker: "COIN", name: "코인베이스", shares: 8500000, value: 4.8, pct: 9.6, sector: "금융", change: 15.2 },
    { ticker: "ROKU", name: "로쿠", shares: 9200000, value: 3.5, pct: 7.0, sector: "기술", change: -3.8 },
    { ticker: "SQ", name: "블록(스퀘어)", shares: 6300000, value: 3.2, pct: 6.4, sector: "금융", change: 8.2 },
    { ticker: "DKNG", name: "드래프트킹스", shares: 12000000, value: 2.8, pct: 5.6, sector: "경기소비재", change: 2.1 },
    { ticker: "PATH", name: "유아이패스", shares: 15000000, value: 2.5, pct: 5.0, sector: "기술", change: -12.5 },
    { ticker: "CRSP", name: "크리스퍼", shares: 4200000, value: 2.2, pct: 4.4, sector: "헬스케어", change: 0 },
    { ticker: "TWLO", name: "트윌리오", shares: 3800000, value: 2.0, pct: 4.0, sector: "기술", change: 6.8 },
    { ticker: "ZM", name: "줌", shares: 4500000, value: 1.8, pct: 3.6, sector: "기술", change: -5.2 },
    { ticker: "TDOC", name: "텔라닥", shares: 8000000, value: 1.2, pct: 2.4, sector: "헬스케어", change: -18.5 },
  ],
  druckenmiller: [
    { ticker: "NVDA", name: "엔비디아", shares: 2800000, value: 5.3, pct: 15.2, sector: "기술", change: 25.0 },
    { ticker: "MSFT", name: "마이크로소프트", shares: 1200000, value: 4.8, pct: 13.7, sector: "기술", change: 3.5 },
    { ticker: "GOOGL", name: "알파벳", shares: 2500000, value: 3.5, pct: 10.0, sector: "기술", change: 8.2 },
    { ticker: "META", name: "메타", shares: 800000, value: 2.8, pct: 8.0, sector: "기술", change: 12.0 },
    { ticker: "LLY", name: "일라이릴리", shares: 350000, value: 2.5, pct: 7.1, sector: "헬스케어", change: 18.5 },
    { ticker: "AMZN", name: "아마존", shares: 1500000, value: 2.2, pct: 6.3, sector: "기술", change: -5.0 },
    { ticker: "GLD", name: "SPDR 골드", shares: 3000000, value: 1.8, pct: 5.1, sector: "원자재", change: 0 },
    { ticker: "COP", name: "코노코필립스", shares: 1500000, value: 1.5, pct: 4.3, sector: "에너지", change: -10.0 },
    { ticker: "UBER", name: "우버", shares: 2200000, value: 1.2, pct: 3.4, sector: "기술", change: 100 },
    { ticker: "TSM", name: "TSMC", shares: 800000, value: 1.0, pct: 2.9, sector: "기술", change: 15.0 },
    { ticker: "CPNG", name: "쿠팡", shares: 9300000, value: 2.04, pct: 6.8, sector: "경기소비재", change: 100 },
  ],
  dalio: [
    { ticker: "SPY", name: "S&P 500 ETF", shares: 5200000, value: 16.1, pct: 8.2, sector: "지수", change: 1.2 },
    { ticker: "VWO", name: "신흥시장 ETF", shares: 15000000, value: 12.5, pct: 6.4, sector: "지수", change: -2.5 },
    { ticker: "GLD", name: "SPDR 골드", shares: 8500000, value: 10.2, pct: 5.2, sector: "원자재", change: 5.8 },
    { ticker: "TLT", name: "장기국채 ETF", shares: 9200000, value: 9.8, pct: 5.0, sector: "채권", change: 0 },
    { ticker: "PG", name: "P&G", shares: 4500000, value: 7.5, pct: 3.8, sector: "필수소비재", change: 0 },
    { ticker: "JNJ", name: "존슨앤존슨", shares: 3800000, value: 6.2, pct: 3.2, sector: "헬스케어", change: -1.5 },
    { ticker: "COST", name: "코스트코", shares: 900000, value: 5.8, pct: 3.0, sector: "필수소비재", change: 2.0 },
    { ticker: "BABA", name: "알리바바", shares: 5000000, value: 4.5, pct: 2.3, sector: "기술", change: 12.5 },
    { ticker: "EEM", name: "신흥시장 iShares", shares: 12000000, value: 4.2, pct: 2.1, sector: "지수", change: -3.0 },
    { ticker: "WMT", name: "월마트", shares: 2200000, value: 3.8, pct: 1.9, sector: "필수소비재", change: 0 },
  ],
  ackman: [
    { ticker: "HLT", name: "힐튼", shares: 10200000, value: 4.0, pct: 22.0, sector: "경기소비재", change: 0 },
    { ticker: "QSR", name: "레스토랑 브랜즈", shares: 23800000, value: 3.2, pct: 17.8, sector: "경기소비재", change: 5.0 },
    { ticker: "CMG", name: "치폴레", shares: 350000, value: 2.8, pct: 15.6, sector: "경기소비재", change: 0 },
    { ticker: "CP", name: "캐나디안 퍼시픽", shares: 4500000, value: 2.5, pct: 13.9, sector: "산업", change: 0 },
    { ticker: "GOOGL", name: "알파벳", shares: 1200000, value: 2.0, pct: 11.1, sector: "기술", change: 100 },
    { ticker: "LOW", name: "로우스", shares: 950000, value: 1.5, pct: 8.3, sector: "경기소비재", change: -5.0 },
    { ticker: "NFLX", name: "넷플릭스", shares: 250000, value: 1.2, pct: 6.7, sector: "기술", change: 100 },
    { ticker: "UNP", name: "유니온 퍼시픽", shares: 350000, value: 0.8, pct: 4.6, sector: "산업", change: 0 },
  ],
  soros: [
    { ticker: "RIVN", name: "리비안", shares: 8500000, value: 2.4, pct: 9.5, sector: "기술", change: 100 },
    { ticker: "MSFT", name: "마이크로소프트", shares: 500000, value: 2.0, pct: 8.0, sector: "기술", change: 5.0 },
    { ticker: "AMZN", name: "아마존", shares: 1200000, value: 1.8, pct: 7.2, sector: "기술", change: -8.0 },
    { ticker: "LNG", name: "셰니에르에너지", shares: 1000000, value: 1.5, pct: 6.0, sector: "에너지", change: 0 },
    { ticker: "SLB", name: "슐럼버저", shares: 2500000, value: 1.2, pct: 4.8, sector: "에너지", change: -12.0 },
    { ticker: "BABA", name: "알리바바", shares: 3000000, value: 1.1, pct: 4.4, sector: "기술", change: 8.5 },
    { ticker: "UBER", name: "우버", shares: 1800000, value: 1.0, pct: 4.0, sector: "기술", change: 15.0 },
    { ticker: "PYPL", name: "페이팔", shares: 1500000, value: 0.9, pct: 3.6, sector: "금융", change: -20.0 },
    { ticker: "NIO", name: "니오", shares: 12000000, value: 0.8, pct: 3.2, sector: "기술", change: -15.0 },
    { ticker: "VALE", name: "발레", shares: 5000000, value: 0.7, pct: 2.8, sector: "원자재", change: 0 },
  ]
};

export const QUARTERLY_HISTORY = {
  buffett: [ { q: "Q1'23", value: 710 }, { q: "Q2'23", value: 745 }, { q: "Q3'23", value: 780 }, { q: "Q4'23", value: 790 }, { q: "Q1'24", value: 825 } ],
  cathie: [ { q: "Q1'23", value: 42 }, { q: "Q2'23", value: 48 }, { q: "Q3'23", value: 55 }, { q: "Q4'23", value: 51 }, { q: "Q1'24", value: 50 } ],
  druckenmiller: [ { q: "Q1'23", value: 22 }, { q: "Q2'23", value: 26 }, { q: "Q3'23", value: 28 }, { q: "Q4'23", value: 32 }, { q: "Q1'24", value: 35 } ],
  dalio: [ { q: "Q1'23", value: 180 }, { q: "Q2'23", value: 185 }, { q: "Q3'23", value: 188 }, { q: "Q4'23", value: 192 }, { q: "Q1'24", value: 196 } ],
  ackman: [ { q: "Q1'23", value: 12 }, { q: "Q2'23", value: 13 }, { q: "Q3'23", value: 14 }, { q: "Q4'23", value: 16 }, { q: "Q1'24", value: 18 } ],
  soros: [ { q: "Q1'23", value: 28 }, { q: "Q2'23", value: 27 }, { q: "Q3'23", value: 26 }, { q: "Q4'23", value: 25.5 }, { q: "Q1'24", value: 25 } ],
};

export const QUARTERLY_ACTIVITY = {
  buffett: [
    { q: "Q1'24", actions: [
      { ticker: "AAPL", name: "애플", type: "sell", pctChange: -5.2, detail: "일부 매도" },
      { ticker: "AMZN", name: "아마존", type: "new", pctChange: 100, detail: "신규 매수" },
      { ticker: "BAC", name: "뱅크오브아메리카", type: "buy", pctChange: 2.1, detail: "비중 확대" },
      { ticker: "OXY", name: "옥시덴탈", type: "buy", pctChange: 3.2, detail: "비중 확대" },
      { ticker: "CVX", name: "셰브론", type: "sell", pctChange: -8.5, detail: "비중 축소" },
    ]},
    { q: "Q4'23", actions: [
      { ticker: "AAPL", name: "애플", type: "hold", pctChange: 0, detail: "유지" },
      { ticker: "DVA", name: "다비타", type: "buy", pctChange: 5.0, detail: "비중 확대" },
    ]},
    { q: "Q3'23", actions: [
      { ticker: "AAPL", name: "애플", type: "sell", pctChange: -3.0, detail: "일부 매도" },
      { ticker: "KO", name: "코카콜라", type: "hold", pctChange: 0, detail: "유지" },
      { ticker: "BAC", name: "뱅크오브아메리카", type: "buy", pctChange: 1.5, detail: "소폭 확대" },
    ]},
  ],
  cathie: [
    { q: "Q1'24", actions: [
      { ticker: "TSLA", name: "테슬라", type: "buy", pctChange: 5.5, detail: "비중 확대" },
      { ticker: "COIN", name: "코인베이스", type: "buy", pctChange: 15.2, detail: "대폭 확대" },
      { ticker: "TDOC", name: "텔라닥", type: "sell", pctChange: -18.5, detail: "대폭 축소" },
      { ticker: "PATH", name: "유아이패스", type: "sell", pctChange: -12.5, detail: "비중 축소" },
      { ticker: "SQ", name: "블록", type: "buy", pctChange: 8.2, detail: "비중 확대" },
    ]},
    { q: "Q4'23", actions: [
      { ticker: "ROKU", name: "로쿠", type: "sell", pctChange: -5.0, detail: "일부 매도" },
      { ticker: "DKNG", name: "드래프트킹스", type: "buy", pctChange: 3.0, detail: "소폭 확대" },
      { ticker: "TWLO", name: "트윌리오", type: "buy", pctChange: 6.8, detail: "비중 확대" },
    ]},
  ],
  druckenmiller: [
    { q: "Q1'24", actions: [
      { ticker: "NVDA", name: "엔비디아", type: "buy", pctChange: 25.0, detail: "대폭 확대" },
      { ticker: "UBER", name: "우버", type: "new", pctChange: 100, detail: "신규 매수" },
      { ticker: "TSM", name: "TSMC", type: "buy", pctChange: 15.0, detail: "비중 확대" },
      { ticker: "META", name: "메타", type: "buy", pctChange: 12.0, detail: "비중 확대" },
      { ticker: "COP", name: "코노코필립스", type: "sell", pctChange: -10.0, detail: "비중 축소" },
      { ticker: "AMZN", name: "아마존", type: "sell", pctChange: -5.0, detail: "일부 매도" },
    ]},
    { q: "Q4'23", actions: [
      { ticker: "LLY", name: "일라이릴리", type: "buy", pctChange: 18.5, detail: "대폭 확대" },
      { ticker: "GOOGL", name: "알파벳", type: "buy", pctChange: 8.2, detail: "비중 확대" },
    ]},
  ],
  dalio: [
    { q: "Q1'24", actions: [
      { ticker: "GLD", name: "SPDR 골드", type: "buy", pctChange: 5.8, detail: "비중 확대" },
      { ticker: "BABA", name: "알리바바", type: "buy", pctChange: 12.5, detail: "대폭 확대" },
      { ticker: "COST", name: "코스트코", type: "buy", pctChange: 2.0, detail: "소폭 확대" },
      { ticker: "VWO", name: "신흥시장 ETF", type: "sell", pctChange: -2.5, detail: "소폭 축소" },
      { ticker: "JNJ", name: "존슨앤존슨", type: "sell", pctChange: -1.5, detail: "소폭 축소" },
      { ticker: "EEM", name: "신흥시장 iShares", type: "sell", pctChange: -3.0, detail: "비중 축소" },
    ]},
  ],
  ackman: [
    { q: "Q1'24", actions: [
      { ticker: "GOOGL", name: "알파벳", type: "new", pctChange: 100, detail: "신규 매수" },
      { ticker: "NFLX", name: "넷플릭스", type: "new", pctChange: 100, detail: "신규 매수" },
      { ticker: "QSR", name: "레스토랑 브랜즈", type: "buy", pctChange: 5.0, detail: "비중 확대" },
      { ticker: "LOW", name: "로우스", type: "sell", pctChange: -5.0, detail: "비중 축소" },
    ]},
    { q: "Q4'23", actions: [
      { ticker: "HLT", name: "힐튼", type: "hold", pctChange: 0, detail: "유지" },
      { ticker: "CMG", name: "치폴레", type: "hold", pctChange: 0, detail: "유지" },
    ]},
  ],
  soros: [
    { q: "Q1'24", actions: [
      { ticker: "RIVN", name: "리비안", type: "new", pctChange: 100, detail: "신규 매수" },
      { ticker: "UBER", name: "우버", type: "buy", pctChange: 15.0, detail: "비중 확대" },
      { ticker: "BABA", name: "알리바바", type: "buy", pctChange: 8.5, detail: "비중 확대" },
      { ticker: "PYPL", name: "페이팔", type: "sell", pctChange: -20.0, detail: "대폭 축소" },
      { ticker: "NIO", name: "니오", type: "sell", pctChange: -15.0, detail: "비중 축소" },
      { ticker: "SLB", name: "슐럼버저", type: "sell", pctChange: -12.0, detail: "비중 축소" },
    ]},
  ],
};
