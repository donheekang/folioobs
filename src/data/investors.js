// ========== INVESTOR DATA ==========
// Updated: 2026-03-27 - Color scheme refresh
export const INVESTORS = [
  {
    id: "buffett", name: "Warren Buffett", nameKo: "워렌 버핏",
    fund: "Berkshire Hathaway", fundKo: "버크셔 해서웨이",
    style: "가치투자", color: "#6366F1", gradient: "linear-gradient(135deg, #6366F1, #818CF8)",
    aum: 825, bio: "오마하의 현인. 가치투자의 전설적인 인물로, 장기 보유와 내재가치 중심의 투자 철학으로 유명합니다. 1965년부터 버크셔 해서웨이를 이끌며 연평균 약 20%의 수익률을 기록했습니다.",
    bioEn: "The Oracle of Omaha. A legendary value investor known for his long-term holding philosophy and focus on intrinsic value. He has led Berkshire Hathaway since 1965, achieving an average annual return of approximately 20%.",
    founded: 1965, avatar: "WB",
    metrics: { concentration: 0.42, sectorCount: 8, holdingCount: 47, topHoldingPct: 28.5, qoqChange: 4.2 }
  },
  {
    id: "cathie", name: "Cathie Wood", nameKo: "캐시 우드",
    fund: "ARK Invest", fundKo: "ARK 인베스트",
    style: "성장주투자", color: "#06B6D4", gradient: "linear-gradient(135deg, #06B6D4, #22D3EE)",
    aum: 50, bio: "파괴적 혁신 투자의 선구자. 테슬라, AI, 유전체학 등 혁신 기업에 집중 투자하며 높은 리스크-리턴 전략을 추구합니다. 2014년 ARK 인베스트를 설립했습니다.",
    bioEn: "A pioneer of disruptive innovation investing. She focuses on innovative companies in Tesla, AI, and genomics, pursuing a high risk-return strategy. She founded ARK Invest in 2014.",
    founded: 2014, avatar: "CW",
    metrics: { concentration: 0.58, sectorCount: 5, holdingCount: 35, topHoldingPct: 12.8, qoqChange: -2.1 }
  },
  {
    id: "druckenmiller", name: "Stanley Druckenmiller", nameKo: "스탠리 드러켄밀러",
    fund: "Duquesne Family Office", fundKo: "듀케인 패밀리 오피스",
    style: "매크로투자", color: "#F59E0B", gradient: "linear-gradient(135deg, #F59E0B, #FBBF24)",
    aum: 35, bio: "매크로 투자의 거장. 조지 소로스 밑에서 퀀텀 펀드를 운용하며 영국 파운드 숏으로 유명해졌습니다. 30년간 연평균 30% 이상의 경이적인 수익률을 기록했습니다.",
    bioEn: "A macro investing legend. He became famous for shorting the British pound while managing the Quantum Fund under George Soros. He achieved an extraordinary average annual return of over 30% for three decades.",
    founded: 1981, avatar: "SD",
    metrics: { concentration: 0.35, sectorCount: 10, holdingCount: 42, topHoldingPct: 15.2, qoqChange: 8.5 }
  },
  {
    id: "dalio", name: "Ray Dalio", nameKo: "레이 달리오",
    fund: "Bridgewater Associates", fundKo: "브릿지워터 어소시에이츠",
    style: "분산투자", color: "#EC4899", gradient: "linear-gradient(135deg, #EC4899, #F472B6)",
    aum: 196, bio: "세계 최대 헤지펀드 창립자. '올웨더' 포트폴리오 전략으로 유명하며, 리스크 패리티 투자의 선구자입니다.",
    bioEn: "Founder of the world's largest hedge fund. Known for the 'All Weather' portfolio strategy and a pioneer of risk parity investing.",
    founded: 1975, avatar: "RD",
    metrics: { concentration: 0.18, sectorCount: 14, holdingCount: 120, topHoldingPct: 8.2, qoqChange: 1.8 }
  },
  {
    id: "ackman", name: "Bill Ackman", nameKo: "빌 애크먼",
    fund: "Pershing Square", fundKo: "퍼싱 스퀘어",
    style: "행동주의투자", color: "#A855F7", gradient: "linear-gradient(135deg, #A855F7, #C084FC)",
    aum: 18, bio: "행동주의 투자의 대표주자. 기업의 경영에 직접 참여하여 가치를 끌어올리는 전략으로 유명합니다.",
    bioEn: "A leading activist investor. Known for his strategy of directly engaging in corporate management to unlock shareholder value.",
    founded: 2004, avatar: "BA",
    metrics: { concentration: 0.72, sectorCount: 4, holdingCount: 8, topHoldingPct: 22.0, qoqChange: 12.3 }
  },
  {
    id: "soros", name: "George Soros", nameKo: "조지 소로스",
    fund: "Soros Fund Management", fundKo: "소로스 펀드 매니지먼트",
    style: "매크로투자", color: "#EF4444", gradient: "linear-gradient(135deg, #EF4444, #F87171)",
    aum: 25, bio: "영란은행을 무너뜨린 남자. 글로벌 매크로 투자의 전설이며, 반사성 이론으로 유명합니다.",
    bioEn: "The man who broke the Bank of England. A legend of global macro investing, known for his theory of reflexivity.",
    founded: 1970, avatar: "GS",
    metrics: { concentration: 0.28, sectorCount: 12, holdingCount: 85, topHoldingPct: 9.5, qoqChange: -1.5 }
  },
  {
    id: "tepper", name: "David Tepper", nameKo: "데이비드 테퍼",
    fund: "Appaloosa Management", fundKo: "아팔루사 매니지먼트",
    style: "매크로가치투자", color: "#F97316", gradient: "linear-gradient(135deg, #F97316, #FB923C)",
    aum: 7, bio: "매크로와 가치투자를 결합한 헤지펀드 거장. 금융 위기 때 은행주 대량 매수로 역대급 수익을 올렸으며, NFL 캐롤라이나 팬서스 구단주이기도 합니다.",
    bioEn: "A hedge fund legend combining macro and value investing. He made historic returns buying bank stocks during the financial crisis and is also the owner of the NFL's Carolina Panthers.",
    founded: 1993, avatar: "DT",
    metrics: { concentration: 0.35, sectorCount: 8, holdingCount: 45, topHoldingPct: 12.0, qoqChange: 0 }
  },
  {
    id: "coleman", name: "Chase Coleman", nameKo: "체이스 콜먼",
    fund: "Tiger Global Management", fundKo: "타이거 글로벌 매니지먼트",
    style: "테크성장투자", color: "#3B82F6", gradient: "linear-gradient(135deg, #3B82F6, #60A5FA)",
    aum: 30, bio: "줄리안 로버트슨의 제자로 Tiger Global을 설립. 테크 중심 성장주 투자의 대표주자로, 메타·아마존·쿠팡 등에 대규모 투자를 하고 있습니다.",
    bioEn: "A protégé of Julian Robertson who founded Tiger Global. A leading tech-focused growth investor with major positions in Meta, Amazon, Coupang, and other technology companies.",
    founded: 2001, avatar: "CC",
    metrics: { concentration: 0.40, sectorCount: 6, holdingCount: 50, topHoldingPct: 15.0, qoqChange: 0 }
  },
  {
    id: "loeb", name: "Dan Loeb", nameKo: "댄 로엡",
    fund: "Third Point", fundKo: "써드 포인트",
    style: "행동주의투자", color: "#8B5CF6", gradient: "linear-gradient(135deg, #8B5CF6, #A78BFA)",
    aum: 12, bio: "행동주의 헤지펀드의 선두주자. 기업 경영진에 공개 서한을 보내며 변화를 이끌어내는 투자 스타일로 유명합니다. 소니, 디즈니 등에 행동주의 캠페인을 벌였습니다.",
    bioEn: "A leading activist hedge fund manager known for sending public letters to corporate management demanding change. He has run activist campaigns at Sony, Disney, and other major companies.",
    founded: 1995, avatar: "DL",
    metrics: { concentration: 0.30, sectorCount: 8, holdingCount: 40, topHoldingPct: 10.0, qoqChange: 0 }
  },
  {
    id: "klarman", name: "Seth Klarman", nameKo: "세스 클라먼",
    fund: "Baupost Group", fundKo: "바우포스트 그룹",
    style: "가치투자", color: "#64748B", gradient: "linear-gradient(135deg, #64748B, #94A3B8)",
    aum: 25, bio: "워렌 버핏의 후계자로 불리는 가치투자 대가. 저서 '안전마진(Margin of Safety)'은 절판 후 수백만원에 거래되는 투자 바이블입니다. 극도로 보수적이며 현금 비중이 높은 것으로 유명합니다.",
    bioEn: "Often called the successor to Warren Buffett. His book 'Margin of Safety' trades for thousands of dollars out of print. Known for extremely conservative investing with high cash allocations.",
    founded: 1982, avatar: "SK",
    metrics: { concentration: 0.25, sectorCount: 10, holdingCount: 60, topHoldingPct: 8.0, qoqChange: 0 }
  },
  {
    id: "nps", name: "National Pension Service", nameKo: "국민연금",
    fund: "National Pension Service", fundKo: "국민연금공단",
    style: "국가연기금", color: "#DC2626", gradient: "linear-gradient(135deg, #DC2626, #EF4444)",
    aum: 135, bio: "대한민국 국민연금공단. 세계 3위 규모의 공적 연기금으로, 미국 주식 약 560종목에 $135B 이상을 운용합니다.",
    bioEn: "South Korea's National Pension Service. The world's 3rd largest public pension fund, managing over $135B across approximately 560 US equity positions.",
    founded: 1988, avatar: "NP",
    metrics: { concentration: 0.07, sectorCount: 11, holdingCount: 561, topHoldingPct: 6.9, qoqChange: 0 }
  }
];
