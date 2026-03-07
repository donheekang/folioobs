// ========== INVESTOR DATA ==========
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
    style: "분산투자", color: "#10B981", gradient: "linear-gradient(135deg, #10B981, #34D399)",
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
  }
];
