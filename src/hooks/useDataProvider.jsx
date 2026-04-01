import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { INVESTORS as MOCK_INVESTORS, HOLDINGS as MOCK_HOLDINGS, QUARTERLY_HISTORY as MOCK_QUARTERLY_HISTORY, QUARTERLY_ACTIVITY as MOCK_QUARTERLY_ACTIVITY } from '../data';

// ============================================================
// DB → 프론트엔드 형식 변환 유틸
// ============================================================

// DB name → string slug 매핑
const NAME_TO_SLUG = {
  'Warren Buffett': 'buffett',
  'Cathie Wood': 'cathie',
  'Stanley Druckenmiller': 'druckenmiller',
  'Ray Dalio': 'dalio',
  'Bill Ackman': 'ackman',
  'George Soros': 'soros',
  'National Pension Service': 'nps',
};

const SLUG_TO_DBID = {}; // 런타임에 채워짐

function investorSlug(name) {
  return NAME_TO_SLUG[name] || name.toLowerCase().replace(/\s+/g, '_');
}

// "2024Q1" → "Q1'24" 변환
function formatQuarterLabel(q) {
  // 월간 인사이트 형식: mon-2026-03 → "26년 3월"
  const monthly = q.match(/^mon-(\d{4})-(\d{2})$/);
  if (monthly) {
    const yr = monthly[1].slice(2);
    const mm = parseInt(monthly[2]);
    return `${yr}년 ${mm}월`;
  }
  // 주간 인사이트 형식: weekly-0327 → "Q1'26 (3/27)" (일별과 동일 포맷)
  const weekly = q.match(/^weekly-(\d{2})(\d{2})$/);
  if (weekly) {
    const mm = parseInt(weekly[1]);
    const dd = parseInt(weekly[2]);
    const qNum = Math.ceil(mm / 3);
    const yr = new Date().getFullYear().toString().slice(2);
    return `Q${qNum}'${yr} (${mm}/${dd})`;
  }
  // 일별 인사이트 형식: 2026Q1-0306 → "Q1'26 (3/6)"
  const daily = q.match(/^(\d{4})Q(\d)-(\d{2})(\d{2})$/);
  if (daily) return `Q${daily[2]}'${daily[1].slice(2)} (${parseInt(daily[3])}/${parseInt(daily[4])})`;
  // 일별 인사이트 형식 (Q 없음): 202601-0324 → "Q1'26 (3/24)"
  const daily2 = q.match(/^(\d{4})(\d{2})-(\d{2})(\d{2})$/);
  if (daily2) return `Q${parseInt(daily2[2])}'${daily2[1].slice(2)} (${parseInt(daily2[3])}/${parseInt(daily2[4])})`;
  // 분기별 형식: 2026Q1 → "Q1'26"
  const m = q.match(/^(\d{4})Q(\d)$/);
  if (!m) return q;
  return `Q${m[2]}'${m[1].slice(2)}`;
}

// 정적 데이터에서 bioEn 가져오기 (DB에 bio_en이 없을 때 fallback)
const MOCK_BIO_EN = {};
MOCK_INVESTORS.forEach(inv => { if (inv.bioEn) MOCK_BIO_EN[inv.id] = inv.bioEn; });

// DB에 섹터 정보가 없는 종목을 위한 fallback 섹터 매핑
const SECTOR_FALLBACK = {
  // 헬스케어
  NTRA: '헬스케어', TEM: '헬스케어', EXAS: '헬스케어', TDOC: '헬스케어', VEEV: '헬스케어',
  ISRG: '헬스케어', DXCM: '헬스케어', ILMN: '헬스케어', NVTA: '헬스케어', BEAM: '헬스케어',
  CRSP: '헬스케어', TWST: '헬스케어', FATE: '헬스케어', PACB: '헬스케어', RPTX: '헬스케어',
  LLY: '헬스케어', UNH: '헬스케어', JNJ: '헬스케어', PFE: '헬스케어', ABBV: '헬스케어',
  TMO: '헬스케어', ABT: '헬스케어', MRK: '헬스케어', AMGN: '헬스케어', BMY: '헬스케어',
  // 기술
  AAPL: '기술', MSFT: '기술', GOOGL: '기술', GOOG: '기술', META: '기술',
  AMZN: '기술', NVDA: '기술', TSM: '기술', TSLA: '기술', AVGO: '기술',
  ORCL: '기술', CRM: '기술', AMD: '기술', ADBE: '기술', INTC: '기술',
  QCOM: '기술', NOW: '기술', SHOP: '기술', SQ: '기술', ROKU: '기술',
  SNOW: '기술', PLTR: '기술', PATH: '기술', U: '기술', TWLO: '기술',
  COIN: '기술', HOOD: '기술', NET: '기술', DDOG: '기술', ZS: '기술',
  // 금융
  BRK: '금융', JPM: '금융', V: '금융', MA: '금융', BAC: '금융',
  WFC: '금융', GS: '금융', MS: '금융', AXP: '금융', BLK: '금융',
  SCHW: '금융', C: '금융', USB: '금융', PNC: '금융', COF: '금융',
  // 경기소비재
  NKE: '경기소비재', MCD: '경기소비재', SBUX: '경기소비재', HD: '경기소비재', LOW: '경기소비재',
  TJX: '경기소비재', BKNG: '경기소비재', CMG: '경기소비재', ABNB: '경기소비재', LULU: '경기소비재',
  // 필수소비재
  KO: '필수소비재', PG: '필수소비재', PEP: '필수소비재', WMT: '필수소비재', COST: '필수소비재',
  PM: '필수소비재', MO: '필수소비재', KHC: '필수소비재', CL: '필수소비재',
  // 산업
  CAT: '산업', DE: '산업', UPS: '산업', RTX: '산업', HON: '산업',
  BA: '산업', LMT: '산업', GE: '산업', MMM: '산업', UNP: '산업',
  // 에너지
  XOM: '에너지', CVX: '에너지', COP: '에너지', SLB: '에너지', EOG: '에너지',
  OXY: '에너지', PSX: '에너지', MPC: '에너지', VLO: '에너지',
  // 통신
  DIS: '통신', NFLX: '통신', CMCSA: '통신', T: '통신', VZ: '통신', TMUS: '통신',
  // 유틸리티
  NEE: '유틸리티', DUK: '유틸리티', SO: '유틸리티', D: '유틸리티',
  // 부동산
  AMT: '부동산', PLD: '부동산', CCI: '부동산', EQIX: '부동산', SPG: '부동산',
  // 원자재
  LIN: '원자재', APD: '원자재', FCX: '원자재', NEM: '원자재',
};

// DB에 name_ko가 없는 종목을 위한 한글명 fallback 매핑
const KO_NAME_FALLBACK = {
  // ===== A =====
  A:'애질런트 테크놀로지', AA:'알코아', AAL:'아메리칸 에어라인스', AAP:'어드밴스 오토파츠',
  AAOI:'어플라이드 옵토일렉트로닉스', AAPL:'애플', ABBV:'애브비', ABG:'애즈베리 오토모티브',
  ABM:'ABM 인더스트리즈', ABNB:'에어비앤비', ABT:'애보트', ACAD:'아카디아 파마슈티컬스',
  ACGL:'아치 캐피탈 그룹', ACHC:'아카디아 헬스케어', ACI:'앨버트슨스', ACLX:'아셀엑스',
  ACM:'에이컴', ACN:'액센츄어', ADBE:'어도비', ADI:'아날로그 디바이시스', ADMA:'ADMA 바이올로직스',
  ADNT:'에이디언트', ADPI:'ADP', ADPT:'어댑티브 바이오테크', ADSK:'오토데스크', ADT:'ADT',
  AEE:'아메렌', AEIS:'어드밴스드 에너지', AEM:'아그니코 이글 마인스', AEO:'아메리칸 이글',
  AER:'에어캡 홀딩스', AES:'AES', AEVA:'에바 테크놀로지스', AFG:'아메리칸 파이낸셜',
  AFL:'애플락', AG:'퍼스트 마제스틱 실버', AGCO:'AGCO', AGI:'알라모스 골드',
  AGO:'어슈어드 개런티', AGX:'아건', AIG:'AIG', AII:'아메리칸 인테그리티 인슈어런스',
  AIP:'아르테리스', AIT:'어플라이드 인더스트리얼 테크', AIZ:'아슈리온',
  AL:'에어리스', ALAB:'아셀라 테크놀로지스', ALGN:'얼라인 테크놀로지', ALIT:'알라이트',
  ALK:'알래스카 에어그룹', ALKS:'앨커메스', ALL:'올스테이트', ALLE:'알레지온',
  ALLY:'앨라이 파이낸셜', ALNT:'앨리언트', ALNY:'앨나일람 파마슈티컬스',
  ALRM:'알람닷컴', ALSN:'앨리슨 트랜스미션', ALTR:'알테어 엔지니어링', ALV:'오토리브',
  AM:'앤테로 미드스트림', AMAT:'어플라이드 머티어리얼즈', AMCR:'앰코', AMD:'AMD',
  AME:'아메텍', AMEN:'아멘텀 홀딩스', AMG:'아필리에이티드 매니저스', AMGN:'암젠',
  AMKR:'앰코 테크놀로지', AMR:'알파 메탈러지컬 리소시스', AMT:'아메리칸타워',
  AMWD:'아메리칸 우드마크', AMZN:'아마존', ANET:'아리스타 네트웍스', ANF:'아베크롬비 앤 피치',
  AON:'에이온', APAM:'아르티잔 파트너스', APH:'앰페놀', API:'아고라',
  APLS:'아펠리스 파마슈티컬스', APP:'앱러빈', APPF:'앱폴리오', APPN:'아피안',
  APTV:'앱티브', AR:'앤테로 리소시스', ARCT:'아크투루스 테라퓨틱스', ARES:'아레스 매니지먼트',
  ARM:'ARM 홀딩스', ARW:'애로우 일렉트로닉스', AS:'아머 스포츠',
  ASB:'어소시에이티드 뱅코프', ASGN:'ASGN', ASML:'ASML 홀딩스', ASO:'아카데미 스포츠',
  ATGE:'어데탈프 에듀케이션', AU:'앵글로골드 아샨티', AVGO:'브로드컴', AVNT:'아반트',
  AVT:'아브넷', AVY:'에이버리 데니슨', AWI:'암스트롱 월드', AWK:'아메리칸 워터웍스',
  AWR:'아메리칸 스테이츠 워터', AXP:'아메리칸 익스프레스', AXS:'액시스 캐피탈',
  AXSM:'악소섬 테라퓨틱스', AXTA:'악살타 코팅', AZTA:'아즈타 바이오사이언스',
  // ===== B =====
  BA:'보잉', BAC:'뱅크오브아메리카', BAH:'부즈앨런 해밀턴', BATRK:'리버티 브레이브스',
  BAX:'백스터 인터내셔널', BBIO:'브리지바이오 파마', BBWI:'바스 앤 바디 웍스',
  BBY:'베스트바이', BC:'브런스윅', BCE:'BCE', BCO:'브링크스',
  BCPC:'발켐', BCRX:'바이오크리스트 파마', BDX:'벡턴디킨슨', BE:'블룸에너지',
  BEAM:'빔 테라퓨틱스', BEN:'프랭클린 리소시스', BFAM:'브라이트 호라이즌스',
  BFH:'브레드 파이낸셜', BG:'번지', BHC:'보슈 헬스', BILL:'빌닷컴',
  BJ:'BJ홀세일', BK:'뱅크오브뉴욕멜론', BKNG:'부킹홀딩스', BKR:'베이커휴즈',
  BKU:'뱅크유나이티드', BL:'블랙라인', BLAC:'벨라그룹', BLK:'블랙록',
  BMO:'몬트리올은행', BMRN:'바이오마린 파마슈티컬스', BMY:'브리스톨마이어스',
  BN:'브룩필드', BNS:'노바스코샤은행', BNTX:'바이오엔텍', BOKF:'BOK파이낸셜',
  BOOT:'부트반 홀딩스', BOX:'박스', BP:'BP', BPOP:'파퓰러',
  BR:'브로드리지 파이낸셜', BRBR:'벨링 브랜즈', BRC:'브래디', BROS:'더치브로스',
  BRK:'버크셔 해서웨이', BRX:'브릭스모어 프로퍼티', BSX:'보스턴 사이언티픽', BTG:'B2골드',
  BTI:'브리티시 아메리칸 토바코', BTU:'피바디 에너지', BWA:'보그워너',
  // ===== C =====
  C:'씨티그룹', CACC:'크레딧 억셉턴스', CACI:'CACI', CALM:'칼메인 푸즈',
  CART:'인스타카트', CAT:'캐터필러', CB:'처브', CBOE:'시카고옵션거래소',
  CBRE:'CBRE 그룹', CBT:'카봇', CBZ:'CBIZ', CCI:'크라운캐슬',
  CCJ:'카메코', CCK:'크라운 홀딩스', CCL:'카니발', CCRN:'크로스 컨트리 헬스케어',
  CCSI:'컨센서스 클라우드', CDNS:'케이던스 디자인', CDW:'CDW', CE:'셀러니즈',
  CEG:'컨스텔레이션 에너지', CF:'CF 인더스트리즈', CFG:'시티즌스 파이낸셜',
  CFR:'컬런프로스트 뱅커스', CIEN:'시에나', CINF:'신시내티 파이낸셜',
  CIVI:'시비타스 리소시스', CL:'콜게이트-파몰리브', CLF:'클리블랜드-클리프스',
  CLS:'셀레스티카', CLSK:'클린스파크', CLVT:'클래리베이트', CLX:'클로록스',
  CM:'캐나디안 임페리얼은행', CMC:'커머셜 메탈스', CMCSA:'컴캐스트', CMG:'치폴레',
  CMI:'커민스', CMS:'CMS 에너지', CNA:'CNA 파이낸셜', CNC:'센틴', CNI:'캐나디안 내셔널 레일웨이',
  CNO:'CNO 파이낸셜', CNX:'CNX 리소시스', CNXC:'컨센트릭스', COF:'캐피탈원',
  COGT:'코전트 바이오사이언스', COHR:'코히런트', COKE:'코카콜라 컨솔리데이티드',
  COLB:'컬럼비아 뱅킹', COLM:'컬럼비아 스포츠웨어', COO:'쿠퍼', COR:'센코라',
  CORT:'코셉트 테라퓨틱스', COST:'코스트코', COTY:'코티', CP:'CPKC',
  CPA:'코파 홀딩스', CPAY:'코페이', CPNG:'쿠팡', CPRI:'카프리 홀딩스',
  CPRT:'코파트', CR:'크레인', CRBG:'코어브릿지 파이낸셜', CRC:'캘리포니아 리소시스',
  CRDO:'크레도 테크놀로지', CRH:'CRH', CRL:'찰스리버 래보러토리스',
  CRM:'세일즈포스', CRSP:'크리스퍼 테라퓨틱스', CRWD:'크라우드스트라이크',
  CSGP:'코스타그룹', CSGS:'CSG 시스템즈', CSL:'칼라일', CSWI:'CSW 인더스트리얼즈',
  CTAS:'신타스', CTLT:'카탈렌트', CTRA:'코테라 에너지', CTS:'CTS',
  CTSH:'코그니전트', CTVA:'코르테바', CUBE:'큐브스마트', CUK:'카니발',
  CURI:'큐리오시티 스트림', CVS:'CVS 헬스', CVX:'셰브론', CW:'커티스라이트',
  CWST:'캐스케이드 서비스', CXM:'스프린클러', CYBR:'사이버아크', CYH:'커뮤니티 헬스',
  // ===== D =====
  D:'도미니언에너지', DAL:'델타항공', DASH:'도어대시', DDOG:'데이터독', DE:'디어앤컴퍼니',
  DELL:'델 테크놀로지스', DFS:'디스커버 파이낸셜', DG:'달러제너럴', DGX:'퀘스트 다이어그노스틱스',
  DHI:'D.R. 호튼', DHR:'다나허', DIS:'월트 디즈니', DKNG:'드래프트킹스',
  DKS:'딕스 스포팅 굿즈', DLTR:'달러트리', DOCN:'디지털오션', DOCS:'도시메트리',
  DOV:'도버', DOW:'다우', DOX:'어매닥스', DPZ:'도미노피자',
  DRI:'다든 레스토랑', DT:'다이나트레이스', DUK:'듀크에너지', DVA:'다비타',
  DVN:'데번 에너지', DXCM:'덱스콤',
  // ===== E =====
  EA:'일렉트로닉아츠', EBAY:'이베이', ECL:'에코랩', ED:'컨솔리데이티드 에디슨',
  EFX:'에퀴팩스', EG:'에버레스트 그룹', EHC:'앤컴패스 헬스', EIX:'에디슨 인터내셔널',
  EL:'에스티로더', ELAN:'엘란코 애니멀 헬스', ELF:'e.l.f. 뷰티', ELS:'에퀴티 라이프스타일',
  EME:'에미코', EMN:'이스트만 케미컬', EMR:'에머슨 일렉트릭', ENPH:'엔페이즈 에너지',
  ENTG:'엔테그리스', EOG:'EOG리소시스', EPAM:'EPAM 시스템즈', EPD:'엔터프라이즈 프로덕츠',
  EQIX:'에퀴닉스', EQR:'에퀴티 레지덴셜', EQNR:'에퀴노르', EQT:'EQT',
  ES:'에버소스 에너지', ESI:'엘리먼트 솔루션스', ESNT:'에센트 그룹',
  ETN:'이튼', ETR:'엔터지', ETRN:'에퀴트랜스 미드스트림',
  EVR:'에버코어', EVRG:'에버지', EW:'에드워즈 라이프사이언스',
  EWBC:'이스트 웨스트 뱅코프', EXAS:'이그잭트 사이언스', EXP:'이글 머티어리얼즈',
  EXPD:'익스페디터스', EXPE:'익스피디아', EXR:'엑스트라 스페이스 스토리지',
  // ===== F =====
  FANG:'다이아몬드백 에너지', FBIN:'포춘 브랜즈', FBRT:'프랭클린 BSP',
  FCNCA:'퍼스트 시티즌스', FCX:'프리포트맥모란', FDS:'팩트셋', FDX:'페덱스',
  FE:'퍼스트에너지', FFIV:'F5 네트웍스', FHN:'퍼스트 호라이즌',
  FI:'피델리티 내셔널 인포', FICO:'페어 아이작', FIS:'FIS',
  FIVE:'파이브 빌로우', FIX:'컴포트 시스템즈', FLEX:'플렉스',
  FLR:'플루어', FLS:'플로우서브', FMC:'FMC', FN:'패브리넷',
  FND:'플로어 앤 데코', FNF:'피델리티 내셔널 파이낸셜', FOUR:'시프트4 페이먼츠',
  FOXF:'폭스 팩토리', FR:'퍼스트 인더스트리얼', FROG:'제이프로그',
  FRPT:'프레시펫', FRSH:'프레시웍스', FSS:'페더럴 시그널', FTNT:'포티넷',
  FTV:'포티브', FUBO:'푸보TV',
  // ===== G =====
  GD:'제너럴 다이내믹스', GDDY:'고대디', GE:'GE에어로스페이스', GEHC:'GE 헬스케어',
  GEN:'젠 디지털', GENT:'젠텍스', GEO:'지오 그룹', GEV:'GE 버노바',
  GFI:'골드 필드', GGG:'그라코', GH:'가던트 헬스', GHC:'그래함 홀딩스',
  GHTI:'G-H-3 인터내셔널', GIL:'길단 액티브웨어', GILD:'길리어드 사이언스',
  GIS:'제너럴 밀스', GL:'글로브 라이프', GLBE:'글로벌-E', GLNG:'골라 LNG',
  GLO:'클라우 글로벌 기회 펀드', GLOB:'글로반트', GLPI:'게이밍 앤 레저', GLW:'코닝',
  GM:'제너럴 모터스', GMED:'글로버스 메디컬', GMH:'코전트 커뮤니케이션스',
  GNW:'젠워스 파이낸셜', GOLD:'배릭 골드', GOOG:'알파벳(구글)', GOOGL:'알파벳(구글)',
  GPC:'제뉴인 파츠', GPI:'그룹1 오토모티브', GPK:'그래픽 패키징', GPN:'글로벌 페이먼츠',
  GPOR:'걸프포트 에너지', GRAB:'그랩', GRMN:'가민', GS:'골드만삭스',
  GSK:'GSK', GTES:'게이츠 인더스트리얼', GTLB:'깃랩', GTLS:'차트 인더스트리즈',
  GWRE:'가이드와이어', GXF:'글로벌X 펀드',
  // ===== H =====
  HAFN:'하프니아', HAL:'핼리버튼', HALO:'할로자임', HBAN:'헌팅턴 뱅크셰어즈',
  HCA:'HCA 헬스케어', HCKT:'해킷 그룹', HD:'홈디포', HEIA:'하이네켄',
  HEI:'헤이코', HES:'헤스', HIG:'하트포드 파이낸셜', HII:'헌팅턴 잉걸스',
  HIMS:'힘스 앤 허스', HLF:'허벌라이프', HLNE:'해밀턴 레인',
  HLT:'힐튼', HON:'하니웰', HP:'헬머리치 앤 페인', HPE:'HPE',
  HPQ:'HP', HR:'헬스케어 리얼티', HRB:'H&R 블록', HRI:'하이드라이드 솔루션스',
  HRMY:'하모니 바이오사이언스', HSBC:'HSBC', HSIC:'헨리 샤인',
  HSY:'허쉬', HUBB:'허벨', HUBS:'허브스팟', HUM:'휴마나',
  HWM:'하우멧 에어로스페이스',
  // ===== I =====
  IBM:'IBM', IBN:'ICICI 은행', ICE:'인터컨티넨탈 익스체인지', IDXX:'아이덱스',
  IEX:'아이덱스', IFF:'IFF', IGSB:'iShares 단기 투자등급 회사채', ILMN:'일루미나',
  INCY:'인사이트', INFA:'인포매티카', INGR:'인그리디언', INSM:'인스메드',
  INSP:'인스파이어 메디컬', INTC:'인텔', INTU:'인튜이트', INVH:'인비테이션 홈즈',
  IOT:'삼사라', IP:'인터내셔널 페이퍼', IPG:'인터퍼블릭', IQV:'IQVIA',
  IR:'잉거솔랜드', IRM:'아이언 마운틴', IRON:'디스크 매이커', ISRG:'인튜이티브 서지컬',
  IT:'가트너', ITCI:'이트라 오일렉트로닉스', ITT:'ITT', ITW:'일리노이 툴 웍스',
  IVZ:'인베스코',
  // ===== J =====
  J:'제이콥스 엔지니어링', JAZZ:'재즈 파마슈티컬스', JBHT:'J.B. 헌트',
  JBL:'자빌', JCI:'존슨컨트롤즈', JEF:'제프리스', JKHY:'잭 헨리',
  JLL:'존스랭라살', JNJ:'존슨앤드존슨', JNPR:'주니퍼 네트웍스',
  JPM:'JP모건',
  // ===== K =====
  K:'켈라노바', KBH:'KB홈', KBR:'KBR', KD:'킨드릴',
  KEY:'키코프', KGC:'킨로스 골드', KHC:'크래프트하인즈', KKR:'KKR',
  KLAC:'KLA', KMB:'킴벌리-클라크', KMI:'킨더 모건', KMX:'카맥스',
  KNSL:'킨슬 캐피탈', KNX:'나이트-스위프트', KO:'코카콜라', KR:'크로거',
  KRC:'킬로이 리얼티', KRG:'킷레이트 리얼티', KSS:'콜스',
  // ===== L =====
  LANC:'랭커스터 콜로니', LBRT:'리버티 에너지', LBRDK:'리버티 브로드밴드',
  LDOS:'레이도스', LFST:'라이프스탠스', LH:'래보코프', LHX:'L3해리스',
  LII:'레녹스', LIN:'린데', LITE:'루멘텀 홀딩스', LKQ:'LKQ', LLY:'일라이 릴리',
  LMAT:'르마이트르 바스큘라', LMT:'록히드마틴', LNC:'링컨 내셔널',
  LNG:'쉐니에르 에너지', LNT:'앨리언트 에너지', LNW:'라이트 앤 원더',
  LOCO:'엘폴로로코', LOPE:'그랜드 캐니언 에듀케이션', LOW:'로우스',
  LPLA:'LPL 파이낸셜', LRCX:'램리서치', LSCC:'래티스 세미컨덕터',
  LSTR:'랜드스타 시스템', LTCH:'래치', LULU:'룰루레몬', LVS:'라스베이거스 샌즈',
  LW:'램 웨스톤', LYB:'리온델바젤', LYFT:'리프트', LYV:'라이브네이션',
  // ===== M =====
  MA:'마스터카드', MAA:'미드 아메리카 아파트먼트', MARA:'마라톤 디지털',
  MAS:'마스코', MAXI:'맥시온 솔라', MCD:'맥도날드', MCHP:'마이크로칩 테크놀로지',
  MCK:'맥케슨', MCO:'무디스', MCY:'머큐리 제너럴', MDB:'몽고DB',
  MDGL:'매드리갈 파마슈티컬스', MDLZ:'몬델리즈', MDT:'메드트로닉',
  MEDP:'메드페이스', MELI:'메르카도리브레', MERI:'코메리카', MET:'메트라이프',
  META:'메타(페이스북)', MFC:'매뉴라이프', MGA:'마그나 인터내셔널',
  MGNI:'매그나이트', MGRC:'맥그래스 렌트코프', MHK:'모호크 인더스트리즈',
  MHO:'M/I 홈즈', MIR:'미리온 테크놀로지스', MKC:'맥코믹', MKL:'마켈 그룹',
  MKTX:'마켓액세스', MLI:'뮬러 인더스트리즈', MMC:'마시 앤 맥레넌',
  MMM:'3M', MMS:'맥시머스', MNDY:'먼데이닷컴', MNST:'몬스터 비버리지',
  'MOG.A':'무그', MOH:'몰리나 헬스케어', MOS:'모자이크', MP:'MP 머티어리얼즈',
  MPC:'마라톤 페트롤리엄', MPH:'컴스코프', MPWR:'모놀리식 파워', MQ:'마르케타',
  MRCY:'머큐리 시스템즈', MRK:'머크', MRNA:'모더나', MRVL:'마벨 테크놀로지',
  MS:'모건스탠리', MSCI:'MSCI', MSFT:'마이크로소프트', MSM:'MSC 인더스트리얼',
  MTB:'M&T 뱅크', MTCH:'매치 그룹', MTD:'메틀러-톨레도', MTG:'MGIC 인베스트먼트',
  MTSI:'MACOM 테크놀로지', MTZ:'마스텍', MU:'마이크론 테크놀로지',
  MUR:'머피 오일', MUSA:'머피 USA',
  // ===== N =====
  NBIX:'뉴로크린 바이오사이언스', NCLH:'노르웨이전 크루즈', NDAQ:'나스닥',
  NDSN:'노드슨', NE:'노블', NEE:'넥스트에라 에너지', NEM:'뉴몬트',
  NET:'클라우드플레어', NFLX:'넷플릭스', NI:'니소스', NKE:'나이키',
  NNN:'NNN REIT', NOC:'노스롭 그러먼', NOG:'노던 오일 앤 가스', NOV:'NOV',
  NOW:'서비스나우', NRG:'NRG 에너지', NSC:'노퍽 서던', NTNX:'뉴타닉스',
  NTRA:'나테라', NTRS:'노던 트러스트', NU:'누 홀딩스', NUE:'뉴코어',
  NVDA:'엔비디아', NVR:'NVR', NVS:'노바티스', NVST:'엔비스타',
  NVTA:'인비태', NWS:'뉴스코프', NXPI:'NXP', NXST:'넥스타 미디어',
  // ===== O =====
  ODFL:'올드 도미니언 프레이트', OGN:'오가논', OKE:'ONEOK', OLPX:'올라플렉스',
  OMC:'옴니콤', ON:'온세미컨덕터', ONTO:'온투 이노베이션', ORCL:'오라클',
  ORI:'올드 리퍼블릭', ORLY:'오라일리 오토파츠', OSCR:'오스카 헬스',
  OSK:'오시코시', OTEX:'오픈텍스트', OTIS:'오티스', OVV:'오비빈티브',
  OWL:'블루아울 캐피탈', OXY:'옥시덴탈 페트롤리엄',
  // ===== P =====
  PACS:'PACS 그룹', PANW:'팔로알토 네트웍스', PATH:'유아이패스',
  PAYC:'페이컴', PAYX:'페이첵스', PB:'프로스페리티 뱅크셰어즈',
  PBF:'PBF 에너지', PCOR:'프로코어 테크놀로지', PCVX:'백시니티',
  PDD:'핀둬둬', PDFS:'PDF 솔루션스', PEAK:'헬스피크', PEG:'퍼블릭 서비스 엔터프라이즈',
  PEN:'페넘브라', PEP:'펩시코', PFE:'화이자', PFG:'프린시펄 파이낸셜',
  PG:'P&G', PGR:'프로그레시브', PH:'파커 해니핀', PHG:'필립스',
  PHM:'풀테그룹', PINS:'핀터레스트', PKG:'패키징 코프', PLD:'프로로지스',
  PLTR:'팔란티어', PLUG:'플러그파워', PM:'필립모리스', PMT:'펜니맥 모기지',
  PNC:'PNC파이낸셜', PNR:'펜테어', PNW:'피나클 웨스트', POOL:'풀',
  POST:'포스트 홀딩스', PPG:'PPG 인더스트리즈', PPL:'PPL', PR:'퍼미안 리소시스',
  PRI:'프라이메리카', PRU:'프루덴셜', PSA:'퍼블릭 스토리지', PSN:'파슨스',
  PSTG:'퓨어 스토리지', PSX:'필립스66', PTC:'PTC', PTEN:'패터슨-UTI 에너지',
  PTGX:'프로타고니스트 테라퓨틱스', PVH:'PVH', PYPL:'페이팔',
  // ===== Q =====
  QCOM:'퀄컴', QQQ:'나스닥100 ETF', QTWO:'Q2 홀딩스',
  // ===== R =====
  RBA:'리치 브라더스', RBLX:'로블록스', RDDT:'레딧', RDY:'닥터 레디스',
  REGN:'리제네론', RES:'RPC', REXR:'렉스포드 인더스트리얼', RF:'리전스 파이낸셜',
  RGA:'리인슈어런스 그룹', RGLD:'로얄 골드', RH:'RH', RHI:'로버트 하프',
  RIG:'트랜스오션', RIO:'리오 틴토', RIOT:'라이엇 플랫폼스', RJF:'레이먼드 제임스',
  RKLB:'로켓랩', RKT:'로켓 컴퍼니즈', RL:'랄프 로렌', RMD:'리즈메드',
  RNG:'링센트럴', RNR:'르네상스리', ROCK:'지브롤터 인더스트리즈',
  ROK:'록웰 오토메이션', ROKU:'로쿠', ROL:'롤린스', RPD:'래피드7',
  RPM:'RPM 인터내셔널', RRC:'레인지 리소시스', RRR:'레드록 리조트',
  RS:'릴라이언스', RSP:'인베스코 ETF', RUSHA:'러시 엔터프라이즈',
  RY:'로얄은행', RYAAY:'라이언에어',
  // ===== S =====
  SAIC:'SAIC', SAM:'보스턴 비어', SANM:'산미나', SATS:'에코스타',
  SCCO:'서던 코퍼', SCHD:'슈왑 배당 ETF', SCHW:'찰스슈왑', SE:'씨리미티드',
  SEG:'시포트 엔터테인먼트', SHOO:'스티브 매든', SIRI:'시리우스XM',
  SLB:'슐룸베르거', SMCI:'슈퍼마이크로 컴퓨터', SMG:'스콧 미라클그로',
  SN:'샤크닌자', SNAP:'스냅', SNDR:'슈나이더 내셔널', SNOW:'스노우플레이크',
  SNPS:'시놉시스', SNV:'시노버스 파이낸셜', SO:'서던컴퍼니', SOFI:'소파이',
  SON:'소노코', SPA:'스포츠레이더', SPG:'사이먼프로퍼티', SPGI:'S&P 글로벌',
  SPOT:'스포티파이', SPY:'S&P500 ETF', SQ:'블록(스퀘어)',
  SRPT:'사렙타 테라퓨틱스', SSNC:'SS&C', STM:'ST마이크로일렉트로닉스',
  STNG:'스콜피오 탱커스', STUB:'스텁허브', STZ:'컨스텔레이션 브랜즈',
  SUI:'선 커뮤니티즈', SWK:'스탠리 블랙 앤 데커', SWKS:'스카이웍스',
  SYF:'싱크로니 파이낸셜', SYK:'스트라이커', SYY:'시스코(식품유통)',
  // ===== T =====
  T:'AT&T', TAP:'몰슨 쿠어스', TBBB:'BBB 푸드', TEAM:'아틀라시안',
  TECH:'바이오테크니', TEL:'TE 커넥티비티', TER:'테라다인', TEVA:'테바 파마슈티컬',
  TFC:'트루이스트 파이낸셜', TFX:'텔레플렉스', TGT:'타겟', THC:'테넷 헬스케어',
  TJX:'TJX', TKO:'TKO 그룹', TLN:'탈렌 에너지', TMO:'써모피셔 사이언티픽',
  TMUS:'T모바일', TNDM:'탄뎀 다이아베츠', TOL:'톨 브라더스', TPG:'TPG',
  TPH:'트리포인트 홈즈', TPL:'텍사스 퍼시픽 랜드', TPR:'태피스트리',
  TRGP:'타르가 리소시스', TRI:'톰슨 로이터', TRIP:'트립어드바이저',
  TRMB:'트림블', TROX:'트로녹스', TRV:'트래블러스', TSCO:'트랙터 서플라이',
  TSM:'TSMC(대만반도체)', TSN:'타이슨 푸즈', TTWO:'테이크투', TW:'트레이드웹',
  TWLO:'트윌리오', TXN:'텍사스 인스트루먼트', TXT:'텍스트론', TYL:'타일러 테크놀로지',
  // ===== U =====
  U:'유니티', UAL:'유나이티드 에어라인', UBER:'우버', UBS:'UBS',
  UDR:'UDR', UGI:'UGI', UHS:'유니버설 헬스', ULTA:'울타 뷰티',
  UNH:'유나이티드헬스', UNIT:'유니티 소프트웨어', UNM:'유넘', UNP:'유니언퍼시픽',
  UPS:'UPS', URBN:'어반 아웃피터스', URI:'유나이티드 렌탈스', USB:'US뱅코프',
  USFD:'US 푸즈',
  // ===== V =====
  V:'비자', VALE:'발레', VCEL:'베리셀', VDX:'넥서스 AG',
  VEEV:'비바 시스템즈', VFC:'VF', VFH:'뱅가드 금융 ETF', VICI:'비시 프로퍼티스',
  VIER:'테이텍 커뮤니케이션스', VIR:'비르 바이오테크놀로지', VIRT:'비르투 파이낸셜',
  VLO:'발레로 에너지', VMC:'벌칸 머티어리얼즈', VNDA:'반다 파마슈티컬스',
  VNO:'보나도 리얼티', VNOM:'바이퍼 에너지', VOO:'뱅가드 S&P500',
  VRNS:'바로니스 시스템즈', VRNT:'베린트', VRSK:'버리스크', VRSN:'베리사인', VSA:'비전시스 AI',
  VRTX:'버텍스 파마슈티컬스', VTI:'뱅가드 토탈마켓', VTRS:'비아트리스',
  VVV:'밸볼린', VZ:'버라이즌',
  // ===== W =====
  WAB:'웨스팅하우스 에어 브레이크', WAL:'웨스턴 얼라이언스', WAT:'워터스', WBD:'워너브라더스',
  WBS:'웹스터 파이낸셜', WCC:'와스코', WDAY:'워크데이', WEC:'WEC 에너지',
  WELL:'웰타워', WEN:'웬디스', WES:'웨스턴 미드스트림', WEX:'WEX',
  WFC:'웰스파고', WFRD:'웨더포드', WH:'윈덤 호텔즈', WHR:'월풀',
  WING:'윙스톱', WIT:'위프로', WLK:'웨스트레이크', WM:'웨이스트 매니지먼트',
  WMB:'윌리엄스', WMT:'월마트', WMS:'어드밴스드 드레이니지', WPC:'W.P. 캐리',
  WPM:'위턴 프레셔스 메탈스', WRB:'W.R. 버클리', WSM:'윌리엄스 소노마',
  WSO:'와초 인더스트리즈', WST:'웨스트 파마슈티컬', WTRG:'에센셜 유틸리티즈',
  WTW:'윌리스 타워스 왓슨', WWD:'우드워드', WWW:'울버린 월드와이드',
  // ===== X =====
  X:'유나이티드 스테이츠 스틸', XEL:'엑셀 에너지', XLE:'에너지 섹터 ETF',
  XLF:'금융 섹터 ETF', XLK:'기술 섹터 ETF', XOM:'엑슨모빌',
  XPO:'XPO 로지스틱스', XPOF:'엑스포넨트 피트니스', XRAY:'덴츠플라이 시로나',
  XYL:'자일럼',
  // ===== Y =====
  YPF:'YPF', YUMC:'얌차이나',
  // ===== Z =====
  ZBH:'짐머 바이오메트', ZBRA:'지브라 테크놀로지스', ZI:'줌인포',
  ZION:'자이언스 뱅코프', ZM:'줌', ZS:'지스케일러', ZTS:'조에티스',
  // 추가 특수 티커
  'BF/B':'브라운포먼', 'RMBS*':'램버스', 'A4S':'아메리프라이즈', 'MOG.A':'무그',
  COIN:'코인베이스', HOOD:'로빈후드', TDOC:'텔라닥 헬스', DKNG:'드래프트킹스',
  MO:'알트리아', BKNG:'부킹홀딩스', ROST:'로스스토어즈', DLTR:'달러트리',
  DG:'달러제너럴', EL:'에스티로더', KHC:'크래프트하인즈', PM:'필립모리스',
  LULU:'룰루레몬', CMG:'치폴레', ABNB:'에어비앤비', TJX:'TJX', TGT:'타겟',
  NKE:'나이키', SBUX:'스타벅스', MCD:'맥도날드', HD:'홈디포', LOW:'로우스',
  DIS:'월트 디즈니', NFLX:'넷플릭스', SPOT:'스포티파이', ROKU:'로쿠',
  RBLX:'로블록스', TTWO:'테이크투', EA:'일렉트로닉아츠', WBD:'워너브라더스',
  DASH:'도어대시', GRAB:'그랩', PG:'P&G', WMT:'월마트', COST:'코스트코',
  KO:'코카콜라', PEP:'펩시코', CL:'콜게이트-파몰리브',
  APD:'에어프로덕츠', EQNR:'에퀴노르', PBF:'PBF 에너지', PTEN:'패터슨-UTI 에너지',
  LBRT:'리버티 에너지', DOCN:'디지털오션',
  // ===== 추가 종목 (269개) =====
  AMTB:'아메란트 뱅코프', BWXT:'BWX 테크놀로지스', BYD:'보이드 게이밍',
  CADE:'케이던스 뱅크', CAG:'코나그라 브랜즈', CAH:'카디널 헬스', CALX:'캘릭스',
  CAR:'에이비스 버짓 그룹', CARG:'카구루스', CASY:'케이시스 제너럴 스토어즈',
  CAVA:'카바 그룹', CC:'케무어스', CCCS:'CCC 인텔리전트 솔루션스',
  CDE:'쿠어 마이닝', CDTX:'시다라 테라퓨틱스', CELH:'셀시우스 홀딩스',
  CENX:'센추리 알루미늄', CFB:'컬런 프로스트 뱅커스', CFLT:'컨플루언트',
  CHD:'처치 앤 드와이트', CHE:'케메드', CHH:'초이스 호텔스',
  CHKP:'체크포인트 소프트웨어', CHRW:'C.H. 로빈슨', CHTR:'차터 커뮤니케이션스',
  CRML:'크리티컬 메탈즈', CROX:'크록스', CRS:'카펜터 테크놀로지',
  CRUS:'시러스 로직', CS:'사이버아크', CSCO:'시스코 시스템즈', CSX:'CSX',
  CVCO:'캐브코 인더스트리즈', CVE:'세노버스 에너지', CWEN:'클리어웨이 에너지',
  DAKT:'닥트로닉스', DAR:'달링 인그리디언츠', DBX:'드롭박스',
  DCI:'도널드슨', DD:'듀폰', DDS:'딜라드', DECK:'데커스 아웃도어',
  DEI:'더글러스 에밋', DEO:'디아지오', DINO:'HF 싱클레어',
  DLB:'돌비 래버러토리스', DLR:'디지털 리얼티', DNN:'데니슨 마인스',
  DOCU:'도큐사인', DORM:'도먼 프로덕츠', DTE:'DTE 에너지',
  DTM:'DT 미드스트림', DUOL:'듀오링고', DXC:'DXC 테크놀로지', DY:'다이컴 인더스트리즈',
  EAT:'브링커 인터내셔널', EBC:'이스턴 뱅크셰어즈', ECG:'에버커밋',
  EEFT:'유로넷 월드와이드', ENR:'에너자이저', ENS:'에너시스', ENSI:'인사이트',
  EQH:'에퀴터블 홀딩스', ERIE:'이리 인뎀니티', ERO:'에로 코퍼',
  ESAB:'이삽', ESE:'에스코 테크놀로지스', ESTC:'일래스틱',
  ETSY:'엣시', EXC:'엑셀론', EXE:'엑스팬 에너지', EXEL:'엑셀릭시스', EXLS:'엑셀 서비스',
  EYE:'내셔널 비전', EZU:'iShares MSCI 유로존 ETF',
  F5:'F5', F:'포드', FAF:'퍼스트 아메리칸', FAST:'패스널',
  FBNA:'퍼스트 뱅크셰어즈', FBPR:'퍼스트 뱅코프', FCBD:'프론티어 코어 채권 ETF',
  FCFS:'퍼스트캐쉬 홀딩스', FCN:'FTI 컨설팅',
  FELE:'프랭클린 일렉트릭', FERG:'퍼거슨', FHI:'페더레이티드 허미스',
  FIBK:'글래시어 뱅코프', FIVN:'파이브9',
  FLUT:'플러터 엔터테인먼트', FNB:'FNB', FOLD:'에이미리스',
  FORM:'폼팩터', FSLR:'퍼스트솔라', FTAI:'FTAI 에이비에이션',
  FULT:'풀턴 파이낸셜', FWONK:'리버티 미디어', FYBR:'프론티어 커뮤니케이션스',
  G:'젠팩트', HBHI:'하모니 바이오사이언스', HBM:'허드베이 미네랄스',
  'HEI/A':'하이코', HESM:'헤스 미드스트림', HHH:'하워드 휴즈 홀딩스',
  HL:'헤클라 마이닝', HLI:'훌리한 로키', HMY:'하모니 골드',
  HOG:'할리데이비슨', HOLX:'홀로직', HOPE:'호프 뱅코프',
  HOUS:'애니웨어 리얼에스테이트', HQY:'헬스에퀴티', HRL:'호멜 푸즈',
  HTZ:'허츠', HWC:'핸콕 휘트니',
  IAC:'IAC', IBKR:'인터랙티브 브로커스', IBP:'인스톨드 빌딩 프로덕츠',
  IDA:'아이다코프', IDCC:'인터디지털', IDR:'아이다호 스트래티직 리소시스',
  IE:'이반호 일렉트릭', IEI:'iShares 3-7년 국채 ETF', IESC:'IES 홀딩스',
  IMCR:'이뮤노코어', INTE:'앵테르파팡', IONS:'아이오니스 파마슈티컬스',
  IRDM:'이리듐 커뮤니케이션스', IREN:'아이렌', IRTC:'아이리듬 테크놀로지스',
  ITGR:'인티저 홀딩스', ITRI:'아이트론',
  IVV:'iShares S&P500 ETF', JJSF:'J&J 스낵 푸즈', JXN:'잭슨 파이낸셜',
  KBAL:'킴볼 인터내셔널', KDP:'큐리그 닥터페퍼', KFRC:'킨포스',
  KLG:'WK 켈로그', KMPR:'켐퍼', KNTK:'키네틱스',
  KRNY:'케어니 파이낸셜', KTOS:'크라토스 디펜스', KTB:'코투이트 뱅코프',
  KVUE:'큐뷰', LAUR:'로레이트 에듀케이션',
  LB:'랜드브리지', LCII:'LCI 인더스트리즈', LEA:'레어',
  LFUS:'리텔퓨즈', LHCG:'LHC 그룹', LMND:'레모네이드',
  LNTH:'란테우스 홀딩스', LPRO:'오픈 렌딩',
  LSXMA:'리버티 시리우스XM', LTHM:'리벤트', LUMN:'루멘 테크놀로지스',
  MASI:'마시모', MAX:'미디어알파', MBUU:'말리부 보트',
  MCRI:'모나크 카지노', MEG:'몬트로즈 환경', MFGP:'마이크로 포커스',
  MGM:'MGM 리조츠', MKSI:'MKS 인스트루먼츠', MMSI:'메리트 메디컬',
  MORN:'모닝스타', MOV:'무바도 그룹', MRTX:'미라티 테라퓨틱스',
  MSGE:'MSG 엔터테인먼트', MSGS:'MSG 스포츠', MSI:'모토로라 솔루션스',
  MTDR:'매터도어 리소시스', MTTR:'매터포트',
  NAMS:'뉴암스테르담 파마', NBHC:'내셔널 웨스턴',
  NCR:'NCR 보이직스', NDSN:'노드슨', NE:'노블',
  NFBK:'노스이스트 뱅크', NFE:'뉴 포트리스 에너지', NHI:'내셔널 헬스 인베스터',
  NIH:'넵튠 인슈어런스', NLY:'아날리 캐피탈', NOVA:'선노바 에너지',
  NSIT:'인사이트', NWE:'노스웨스턴 에너지', NWSA:'뉴스코프',
  NXT:'넥스트래커', NYT:'뉴욕타임즈',
  OCH:'옵션 케어 헬스', OFG:'OFG 뱅코프', OGE:'OGE 에너지',
  OGS:'원가스', OHI:'오메가 헬스케어', OII:'오세아니어링',
  OIS:'오일 스테이츠', OLED:'유니버설 디스플레이', ONON:'온',
  OPA:'매그넘 옵터스', OPCH:'옵션 케어', ORN:'오리온',
  OSCR:'오스카 헬스', OUT:'아웃프론트 미디어', OZK:'뱅크 OZK',
  PATK:'패트릭 인더스트리즈', PAYO:'페이오니어', PCAR:'팩카',
  PCT:'퓨어사이클 테크놀로지스', PDD:'핀둬둬',
  PGNY:'프로지니', PII:'폴라리스', PLNT:'플래닛 피트니스',
  PNM:'PNM 리소시스', PODD:'인슐렛', POR:'포틀랜드 제너럴',
  PRCT:'프로코어', PRGS:'프로그레스 소프트웨어', PROG:'프로지니',
  PTC:'PTC', PTCT:'PTC 테라퓨틱스', PTVE:'포인티브',
  PXD:'파이오니어 내추럴 리소시스',
  QSR:'레스토랑 브랜즈 인터내셔널', RAMP:'라이브램프',
  RCM:'R1 RCM', RCUS:'아르쿠스 바이오사이언스', REG:'리전시 센터스',
  RGEN:'레프리젠', RHP:'라이먼 호스피탈리티', RIVN:'리비안',
  RLI:'RLI', RMBS:'램버스', RNST:'르네상트',
  ROIV:'로이반트 사이언스', ROP:'로퍼 테크놀로지스',
  RVMD:'레볼루션 메디슨', RVTY:'레비티', RYNE:'라인 테라퓨틱스',
  SBAC:'SBA 커뮤니케이션스', SBLK:'스타벌크 캐리어스', SBSW:'시바니 스틸워터',
  SDGR:'슈뢰딩거', SEDG:'솔라엣지', SGEN:'시젠',
  SILK:'실크 로드 메디컬', SKX:'스케쳐스', SLG:'SL 그린 리얼티',
  SMMT:'서밋 테라퓨틱스', SNA:'스냅온', SNEX:'스톤엑스',
  SPB:'스펙트럼 브랜즈', SRC:'스피릿 리얼티', SRRK:'스칼라 록',
  SSB:'사우스스테이트', STAA:'STAAR 서지컬', STE:'스테리스',
  STEP:'스텝스톤 그룹', STLD:'스틸 다이내믹스', STRA:'스트래틱 에듀케이션',
  SUI:'선 커뮤니티즈', SWN:'사우스웨스턴 에너지', SXT:'센셴트 테크놀로지스',
  TBBB:'BBB 푸드', TCBI:'텍사스 캐피탈 뱅크셰어즈', TDOC:'텔라닥 헬스',
  TDY:'텔레다인 테크놀로지스', TDS:'텔레폰 앤 데이터 시스템즈',
  TENB:'테너블', TGTX:'TG 테라퓨틱스', TNET:'트라이넷 그룹',
  TNXT:'토넥스 테크놀로지', TOTS:'토스트', TPC:'투터 퍼킨스',
  TRN:'트리니티 인더스트리즈', TTEC:'TTEC', TTD:'더 트레이드 데스크',
  TTGT:'테크타겟', TWNK:'호스티스 브랜즈', TXRH:'텍사스 로드하우스',
  UHAL:'유홀', UMC:'UMC', USAC:'USA 컴프레션 파트너스',
  VCIT:'뱅가드 중기 회사채 ETF', VCYT:'베라사이트', VET:'버밀리온 에너지',
  VICI:'비시 프로퍼티스', VLTO:'벨로시토',
  VOYA:'보야 파이낸셜', VRT:'버티브 홀딩스',
  VSH:'비세이', VST:'비스트라 에너지', VTLE:'바이탈 에너지',
  VTR:'벤타스', VTRS:'비아트리스', VVV:'밸볼린',
  W:'웨이페어', WDFC:'WD-40', WEC:'WEC 에너지',
  WGO:'위네바고', WHD:'캐치마크 에너지', WOLF:'울프스피드',
  WPC:'W.P. 캐리', WPP:'WPP', WRBY:'워비 파커',
  WRK:'웨스트록', WSC:'윌스콧 모바일 미니', WVE:'웨이브 라이프사이언스',
  XP:'XP', XPEV:'샤오펑 자동차', XRX:'제록스',
  YEXT:'예스트', YMM:'풀트럭 얼라이언스',
  Z:'질로우', ZEN:'젠데스크', ZLAB:'자이 랩', ZTO:'중통 익스프레스',
  ZWS:'즈언 워터 솔루션스',
  // ETF 추가
  EEM:'iShares 이머징마켓 ETF', IWM:'iShares 러셀2000 ETF', GXF:'글로벌X 펀드',
  VFH:'뱅가드 금융 ETF', IGSB:'iShares 단기 투자등급 회사채 ETF',
  // === 추가 매핑 (2차) ===
  '8LP1':'바이탈 에너지', '9KG':'넥스티어 오일필드', A4S:'아메리프라이즈 파이낸셜',
  ACIC:'아메리칸 코스탈 보험', AJG:'아서 J. 갤러거', AKAM:'아카마이 테크놀로지스',
  ALB:'앨버말', ALGT:'얼리전트 트래블', AMCX:'AMC 네트웍스',
  AMP:'아메리프라이즈 파이낸셜', AMRC:'아메레스코', ANGI:'앤지 홈서비스',
  ANSS:'앤시스', AOS:'A.O. 스미스', APG:'APi 그룹',
  APO:'아폴로 글로벌 매니지먼트', ARC1:'ARC 도큐먼트 솔루션스', ARCH:'아치 리소시스',
  ARE:'알렉산드리아 리얼에스테이트', ARGX:'아르젠엑스', ARI:'아폴로 커머셜 리얼에스테이트',
  AROC:'아치록', ASH:'애쉬랜드', ASTE:'아스텍 인더스트리스',
  ATMU:'앳머스 필트레이션', ATOS:'아토사 테라퓨틱스', ATRA:'아타라 바이오테라퓨틱스',
  ATSG:'에어 트랜스포트 서비스스', AVAV:'에어로바이런먼트', AVB:'아발론베이 커뮤니티스',
  AVYA:'아바야', AXON:'액손 엔터프라이즈', AZO:'오토존',
  BABA:'알리바바', BALY:'밸리스', BAM:'브룩필드 에셋 매니지먼트',
  BAND:'밴드위드스', BECN:'비컨 루핑 서플라이', BHP:'BHP 그룹',
  BHR:'브레이머 호텔스', BIDU:'바이두', BIMI:'비미 인터내셔널 푸드',
  BLKB:'블랙보드', BLUE:'블루버드 바이오', BOH:'뱅크 오브 하와이',
  'BRK.B':'버크셔 해서웨이', BRSP:'브라이트스파이어 캐피탈', BSIG:'브라이트스피어 인베스트먼트',
  BSY:'벤틀리 시스템즈', BTDR:'비트디어', BUR:'버포드 캐피탈',
  BURL:'벌링턴 스토어스', BX:'블랙스톤', BXP:'BXP',
  BY:'바이라인 밴코프', BYND:'비욘드 미트', CANO:'카노 헬스',
  CCOI:'코전트 커뮤니케이션스', CDNA:'케어디엑스', CHGG:'체그',
  CHK:'체서피크 에너지', CHWY:'츄이', CI:'시그나 그룹',
  CIBC:'캐나다 임페리얼 은행', CLH:'클린 하버스', CLOV:'클로버 헬스',
  CLR:'컨티넨탈 리소시스', CLXT:'캘릭스트', CMA:'코메리카',
  CME:'CME 그룹', CNH:'CNH 인더스트리얼', CNHI:'CNH 인더스트리얼',
  CNP:'센터포인트 에너지', COLD:'아메리콜드 리얼티', COP:'코노코필립스',
  COUR:'코세라', CPB:'캠벨 수프', CQP:'셔니어 에너지 파트너스',
  CRI:'카터스', CRVL:'코벨', CRWV:'코어위브',
  CVNA:'카바나', CZR:'시저스 엔터테인먼트', DAVA:'엔다바',
  DBRG:'디지털브릿지', DNLI:'데날리 테라퓨틱스', DOC:'헬스피크',
  DTML:'DT 미드스트림', ENVX:'에노빅스', ESS:'에섹스 프로퍼티 트러스트',
  EURN:'유로나브', EXCL:'셀라니즈', FITB:'피프스 써드 밴코프',
  FL:'풋 로커', FLT:'코르페이', FOX:'폭스',
  FOXA:'폭스', FSK:'FS KKR 캐피탈', GBTC:'그레이스케일 비트코인 트러스트',
  GENI:'지니어스 스포츠', GFL:'GFL 인바이런먼탈', GMRE:'글로벌 메디컬 리츠',
  GNRC:'제너랙', GRND:'그라인더', GRPN:'그루폰',
  GWW:'W.W. 그레인저', GXO:'GXO 로지스틱스', H:'하얏트 호텔스',
  HASI:'HA 서스테이너블 인프라', HBI:'헤인즈브랜즈', HBUS:'허츠 글로벌',
  HCSG:'헬스케어 서비시스 그룹', 'HEI/A':'헤이코', HST:'호스트 호텔스 & 리조트',
  HTLF:'하트랜드 파이낸셜', IART:'인테그라 라이프사이언시스', IMVT:'이뮤노반트',
  INOD:'이노데이터', INSW:'인터내셔널 시웨이즈', IONQ:'아이온큐',
  IPGP:'IPG 포토닉스', IRBT:'아이로봇', JD:'징둥닷컴',
  JOBY:'조비 에비에이션', KEYS:'키사이트 테크놀로지스', KIM:'킴코 리얼티',
  KN:'노울즈', KRTX:'카루나 테라퓨틱스', KWR:'퀘이커 케미컬',
  L:'뢰브스', LAMR:'라마 애드버타이징', LBPH:'롱보드 파마슈티컬스',
  LECO:'링컨 일렉트릭', LEN:'레나', LI:'리 오토',
  LILA:'리버티 라틴 아메리카', LILAK:'리버티 라틴 아메리카', LIVN:'리바노바',
  LLYVA:'리버티 라이브 홀딩스', LLYVK:'리버티 라이브 홀딩스', LOGI:'로지텍',
  LPX:'루이지애나 퍼시픽', LUV:'사우스웨스트 항공', LXP:'LXP 인더스트리얼 트러스트',
  MAT:'마텔', MBLY:'모빌아이', MDU:'MDU 리소시스 그룹',
  ME:'23앤드미', MFST:'마이텍 스포츠', MIDD:'미들비',
  MLM:'마틴 마리에타', MMPL:'마젤란 미드스트림 파트너스', MOD:'모딘 매뉴팩처링',
  MSA:'MSA 세이프티', MTH:'메리티지 홈즈', MTN:'베일 리조트',
  MTRN:'마테리온', NAVI:'나비엔트', NEWR:'뉴 렐릭',
  NKLA:'니콜라', NSP:'인스페리티', NTAP:'넷앱',
  NTLA:'인텔리아 테라퓨틱스', NTR:'뉴트리엔', O:'리얼티 인컴',
  OBDC:'블루 아울 캐피탈', OBIC:'오브콤', OCSL:'옥트리 스페셜티 렌딩',
  OLN:'올린', OMER:'오메로스', PAG:'펜스키 오토모티브',
  PCTY:'페이로시티', PLTK:'플레이티카', PPC:'필그림스 프라이드',
  PRMW:'프리모 워터', PSEC:'프로스펙트 캐피탈', PSNL:'퍼서널리스',
  PWSC:'파워스쿨', QLYS:'퀄리스', QRVO:'코르보',
  QS:'퀀텀스케이프', R:'라이더 시스템', RBC:'RBC 베어링스',
  RCL:'로열 캐리비안', RE:'에버레스트 그룹', REGI:'리뉴어블 에너지 그룹',
  REYN:'레이놀즈 컨슈머', RLMD:'렐마다 테라퓨틱스', RPAY:'리페이',
  RPRX:'로열티 파마', RSG:'리퍼블릭 서비시스', RXRX:'리커전 파마슈티컬스',
  S:'센티넬원', SANA:'사나 바이오테크놀로지', SBS:'사베스프',
  SBYAY:'소니 그룹', SCI:'서비스 코퍼레이션 인터내셔널', SEE:'실드 에어',
  SFM:'스프라우츠 파머스 마켓', SGHC:'슈퍼 그룹', SGMO:'상가모 테라퓨틱스',
  SHAK:'쉐이크 쉑', SHW:'셔윈 윌리엄스', SIG:'시그넷 주얼러스',
  SITE:'사이트원 랜드스케이프', SIVB:'SVB 파이낸셜 그룹', SJM:'J.M. 스머커',
  SLVM:'실바모', SLY:'실바코 그룹', SM:'SM 에너지',
  SMLR:'셈러 사이언티픽', SPLK:'스플렁크', SPR:'스피릿 에어로시스템즈',
  SPSC:'SPS 커머스', SPT:'스프라우트 소셜', SPWR:'선파워',
  SRE:'셈프라', SSD:'심슨 매뉴팩처링', SSP:'E.W. 스크립스',
  ST:'센사타 테크놀로지스', STN:'스탠텍', STNE:'스톤코',
  STT:'스테이트 스트리트', SUN:'수노코', TBN:'탬보란 리소시스',
  TD:'토론토 도미니언 은행', TDG:'트랜스디그 그룹', TOELY:'도쿄 일렉트론',
  TOST:'토스트', TROW:'T. 로우 프라이스', TRP:'TC 에너지',
  TRU:'트랜스유니온', TRUEBL:'트루블루', TT:'트레인 테크놀로지스',
  TTC:'토로', TTEK:'테트라 테크', TTMI:'TTM 테크놀로지스',
  TWKS:'소트웍스', VNT:'본티어', VOD:'보다폰',
  VRNA:'베로나 파마', VSCO:'빅토리아 시크릿', WBA:'월그린스 부츠 얼라이언스',
  WDC:'웨스턴 디지털', WGS:'제네디엑스', WIX:'윅스',
  WMG:'워너 뮤직 그룹', WULF:'테라울프', WY:'웨이어하우저',
  WYND:'윈덤 호텔스', XYZ:'블록', YETI:'예티', YUM:'얌! 브랜즈',
  // === 추가 매핑 (3차 — 신규 상장/소형주) ===
  CRCL:'서클', RBRK:'루브릭', OKLO:'오클로', ETOR:'이토로',
  PONY:'포니AI', LAB:'스탠다드 바이오툴즈', SHOP:'쇼피파이',
  TXG:'10X 지노믹스', SYM:'심보틱', AUR:'오로라 이노베이션',
  SRTA:'스트라타 크리티컬 메디컬', KLAR:'클라르나', KDK:'코디악 AI',
  FUTU:'푸투 홀딩스', TEM:'템퍼스 AI', TWST:'트위스트 바이오사이언스',
  BMNR:'비트마인 이머전', ACHR:'아처 에비에이션', BLSH:'불리시',
  KMTUY:'코마츠', PACB:'퍼시픽 바이오사이언시스', ESLT:'엘빗 시스템즈',
  LUNR:'인튜이티브 머신즈', CERS:'세러스', ADYEN:'아디옌',
  ABSI:'앱사이', NRIX:'누릭스 테라퓨틱스', WRD:'위라이드',
  CMPS:'컴파스 패스웨이즈', BYDDY:'BYD', BFLY:'버터플라이 네트워크',
  PRME:'프라임 메디신', GENI:'지니어스 스포츠', ATAI:'아타이벡클리',
  DSY:'디스커버리', 'ETHQ/U':'3iQ 이더 스테이킹 ETF', LY:'LY',
  MASS:'908 디바이시스', KSPI:'카스피', SLMT:'브레라 홀딩스',
  'SOLQ/U':'3iQ 솔라나 스테이킹 ETF', QSI:'퀀텀-Si', GENB:'제너레이트 바이오메디슨',
  NXDR:'넥스트도어',
};

// DB investor → 프론트엔드 형식
function mapInvestor(dbInv, metrics, holdingsAum) {
  const slug = investorSlug(dbInv.name);
  SLUG_TO_DBID[slug] = dbInv.id;

  // metrics에서 실제 값 가져오기
  const m = metrics[dbInv.id] || {};

  // AUM: holdings 데이터에서 직접 계산 (없으면 investor_metrics fallback)
  // SEC 13F filing에 따라 value가 $1000 단위 또는 실제 달러 단위일 수 있음
  // 합산값이 10억($1000 단위로 $1T) 이상이면 실제 달러 단위로 판단
  const aumFromHoldings = holdingsAum[dbInv.id] || 0;
  let aumB;
  if (aumFromHoldings > 0) {
    const isActualDollars = aumFromHoldings > 1_000_000_000;
    aumB = isActualDollars
      ? aumFromHoldings / 1_000_000_000  // 실제 달러 → $B
      : aumFromHoldings / 1_000_000;     // $1000 단위 → $B
  } else {
    // Phase A 렌더링: holdings 로드 전 metrics AUM 사용
    aumB = m.total_aum || 0;
  }

  return {
    id: slug,
    dbId: dbInv.id,
    name: dbInv.name,
    nameKo: dbInv.name_ko,
    fund: dbInv.fund_name,
    fundKo: dbInv.fund_name_ko,
    style: dbInv.style,
    color: dbInv.color,
    gradient: dbInv.gradient,
    avatar: dbInv.avatar,
    bio: dbInv.bio || '',
    bioEn: dbInv.bio_en || MOCK_BIO_EN[slug] || '',
    founded: dbInv.founded_year,
    aum: Math.round(aumB * 10) / 10, // 소수점 1자리
    metrics: {
      concentration: m.concentration || 0,
      sectorCount: m.sector_count || 0,
      holdingCount: m.holding_count || 0,
      topHoldingPct: m.top_holding_pct || 0,
      qoqChange: m.qoq_change || 0,
    },
  };
}

// HTML 엔티티 디코딩 (&amp; → &, &lt; → < 등)
function decodeHtmlEntities(str) {
  if (!str) return str;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// DB holding → 프론트엔드 형식
// isActualDollars: 해당 투자자의 value가 실제 달러 단위인지 여부
function mapHolding(dbHolding, isActualDollars) {
  const sec = dbHolding.securities || {};
  // ticker가 없거나 CUSIP 형태(6자리+숫자)인 경우 이름에서 약어 생성
  let ticker = sec.ticker || '';
  if (!ticker || /^\d{5,}/.test(ticker)) {
    // ticker가 없으면 이름의 첫 4글자를 대문자로
    const name = sec.name || dbHolding.issuer_name || 'N/A';
    ticker = name.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'N/A';
  }
  const divisor = isActualDollars ? 1_000_000_000 : 1_000_000;
  return {
    ticker,
    name: decodeHtmlEntities(
      sec.name_ko && /[가-힣]/.test(sec.name_ko)
        ? sec.name_ko
        : (KO_NAME_FALLBACK[ticker] || sec.name_ko || sec.name || 'Unknown')
    ),
    nameEn: decodeHtmlEntities(sec.name || 'Unknown'),
    shares: dbHolding.shares || 0,
    value: dbHolding.value ? dbHolding.value / divisor : 0, // → $B 단위
    pct: dbHolding.pct_of_portfolio || 0,
    sector: (() => {
      const dbSector = (sec.sector_ko && sec.sector_ko.trim()) || (sec.sector && sec.sector.trim()) || '';
      // DB에 "기타"/"Other"로 들어있거나 비어있으면 fallback 사용
      if (!dbSector || dbSector === '기타' || dbSector === 'Other') {
        return SECTOR_FALLBACK[ticker] || dbSector || '기타';
      }
      return dbSector;
    })(),
    change: 0, // 변동은 별도 쿼리 필요
  };
}

// ============================================================
// DataContext
// ============================================================
const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [investors, setInvestors] = useState(null);
  const [holdings, setHoldings] = useState(null);
  const [quarterlyHistory, setQuarterlyHistory] = useState(null);
  const [quarterlyActivity, setQuarterlyActivity] = useState(null);
  const [latestQuarter, setLatestQuarter] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');
  const [arkDailyTrades, setArkDailyTrades] = useState([]);
  const [aiInsights, setAiInsights] = useState({});
  const [stockPrices, setStockPrices] = useState({});  // { ticker: { current, quarterEnd, changePct } }
  const [marketStatus, setMarketStatus] = useState('unknown'); // 'open' | 'closed' | 'pre-market' | 'after-hours' | 'unknown'
  const [lastTradeDate, setLastTradeDate] = useState(null); // 'YYYY-MM-DD'
  const [loading, setLoading] = useState(true);        // Phase A: 코어 데이터 로딩
  const [detailLoading, setDetailLoading] = useState(true); // Phase B: 디테일 데이터 로딩
  const [error, setError] = useState(null);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        // ========== PHASE A: 코어 데이터 (3개 API 병렬) ==========
        console.time('[DataProvider] Phase A');
        const [invRes, metRes, filRes] = await Promise.all([
          supabase.from('investors').select('*').eq('is_active', true).order('id'),
          supabase.from('investor_metrics').select('*').order('quarter', { ascending: true }),
          supabase.from('filings').select('id, investor_id, quarter, parsed_at, accession_no').order('report_date', { ascending: false }),
        ]);

        const dbInvestors = invRes.data;
        const dbMetrics = metRes.data;
        const allFilings = filRes.data;

        if (cancelled) return;
        if (invRes.error) throw invRes.error;
        if (!dbInvestors || dbInvestors.length === 0) throw new Error('No investors');

        // ID → slug 맵 미리 구축
        const idToSlug = {};
        dbInvestors.forEach(inv => {
          idToSlug[inv.id] = investorSlug(inv.name);
        });

        // 투자자별 최신 메트릭만 추출
        const metricsMap = {};
        (dbMetrics || []).forEach(m => {
          metricsMap[m.investor_id] = m; // 오름차순이므로 마지막이 최신
        });

        const latestFilingByInvestor = {};
        let maxQuarter = '';
        let maxParsedAt = '';
        (allFilings || []).forEach(f => {
          if (!latestFilingByInvestor[f.investor_id]) {
            latestFilingByInvestor[f.investor_id] = f;
          }
          // ARK 일별 데이터(캐시 우드)는 최신 분기 계산에서 제외 — 13F 기준만 사용
          const isArkDaily = f.accession_no && f.accession_no.startsWith('ARK-');
          if (!isArkDaily && f.quarter > maxQuarter) maxQuarter = f.quarter;
          if (f.parsed_at && f.parsed_at > maxParsedAt) maxParsedAt = f.parsed_at;
        });

        setLatestQuarter(maxQuarter);
        setLastUpdatedAt(maxParsedAt);

        // Phase A 투자자 매핑 (metrics AUM 사용 — holdings 로드 전 임시)
        const coreInvestors = dbInvestors.map(inv => mapInvestor(inv, metricsMap, {}));

        // Quarterly History 빌드 (metrics에서 — 추가 API 불필요)
        const qHistoryRaw = {};
        (dbMetrics || []).forEach(m => {
          const slug = idToSlug[m.investor_id];
          if (!slug || !m.total_aum) return;
          if (!qHistoryRaw[slug]) qHistoryRaw[slug] = [];
          // 분기별로 개별 단위 감지: total_aum이 10억 이상이면 실제 달러
          const isActual = m.total_aum > 1_000_000_000;
          const divisor = isActual ? 1_000_000_000 : 1_000_000;
          qHistoryRaw[slug].push({
            q: formatQuarterLabel(m.quarter),
            value: Math.round(m.total_aum / divisor * 10) / 10, // → $B
          });
        });
        const qHistory = {};
        Object.entries(qHistoryRaw).forEach(([slug, arr]) => {
          if (arr.length < 3) { qHistory[slug] = arr; return; }
          const sorted = arr.map(a => a.value).sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          const lowThreshold = median * 0.1;
          const highThreshold = median * 3;
          qHistory[slug] = arr.filter(a => a.value >= lowThreshold && a.value <= highThreshold);
        });

        if (cancelled) return;

        // ★ Phase A 완료 — 즉시 렌더링!
        setInvestors(coreInvestors);
        setQuarterlyHistory(qHistory);
        setLoading(false);
        console.timeEnd('[DataProvider] Phase A');
        console.log(`[DataProvider] Phase A 완료: ${coreInvestors.length}명 투자자 렌더링`);

        // ========== PHASE B: 디테일 데이터 (백그라운드) ==========
        console.time('[DataProvider] Phase B');

        // B1. 투자자별로 개별 holdings 쿼리 (Supabase 1000행 기본 제한 우회)
        const allDbHoldings = [];
        const holdingsAum = {};
        const investorDollarUnit = {}; // 투자자별 단위 감지

        for (const inv of dbInvestors) {
          const filing = latestFilingByInvestor[inv.id];
          if (!filing) continue;

          // Supabase REST API 기본 max rows = 1000이므로 pagination 필요
          let invHoldings = [];
          let from = 0;
          const PAGE_SIZE = 1000;
          let hErr = null;
          while (true) {
            const { data: page, error: pageErr } = await supabase
              .from('holdings')
              .select(`
                *,
                securities (ticker, name, name_ko, sector, sector_ko)
              `)
              .eq('filing_id', filing.id)
              .order('value', { ascending: false })
              .range(from, from + PAGE_SIZE - 1);
            if (pageErr) { hErr = pageErr; break; }
            invHoldings.push(...(page || []));
            if (!page || page.length < PAGE_SIZE) break; // 마지막 페이지
            from += PAGE_SIZE;
          }

          if (hErr) { console.warn(`holdings 쿼리 실패 (${inv.name}):`, hErr.message); continue; }

          let aumSum = 0;
          (invHoldings || []).forEach(h => { aumSum += (h.value || 0); });
          holdingsAum[inv.id] = aumSum;
          // 합산값이 10억 이상이면 실제 달러 단위로 판단 ($1000 단위로 $1T 이상은 비현실적)
          const isActual = aumSum > 1_000_000_000;
          investorDollarUnit[inv.id] = isActual;
          allDbHoldings.push(...(invHoldings || []).map(h => ({ ...h, _isActualDollars: isActual })));

          const divisor = isActual ? 1_000_000_000 : 1_000_000;
          console.log(`[DataProvider] ${inv.name}: ${invHoldings?.length || 0}종목, rawAum=${aumSum}, aumB=${(aumSum / divisor).toFixed(1)}, unit=${isActual ? '$' : '$K'}`);
        }

        // 5. 투자자 변환
        const mappedInvestors = dbInvestors.map(inv => mapInvestor(inv, metricsMap, holdingsAum));

        // 5-1. Holdings 매핑 + 같은 ticker 통합 (share class dedup)
        const rawMappedHoldings = {};
        mappedInvestors.forEach(inv => { rawMappedHoldings[inv.id] = []; });
        allDbHoldings.forEach(h => {
          const inv = mappedInvestors.find(i => i.dbId === h.investor_id);
          if (inv) rawMappedHoldings[inv.id].push(mapHolding(h, h._isActualDollars));
        });

        const mappedHoldings = {};
        Object.entries(rawMappedHoldings).forEach(([invId, holdings]) => {
          const dedupMap = new Map();
          holdings.forEach(h => {
            if (dedupMap.has(h.ticker)) {
              const ex = dedupMap.get(h.ticker);
              ex.value += h.value;
              ex.shares += h.shares;
              ex.pct = Math.round((ex.pct + h.pct) * 100) / 100;
              if (h.change && h.change !== 0) ex.change = h.change;
            } else {
              dedupMap.set(h.ticker, { ...h });
            }
          });
          mappedHoldings[invId] = [...dedupMap.values()];
        });

        // 5-2. 투자자 metrics도 dedup된 실제 holdings 기준으로 업데이트
        mappedInvestors.forEach(inv => {
          const h = mappedHoldings[inv.id] || [];
          inv.metrics.holdingCount = h.length;
          // topHoldingPct: 실제 holdings의 최대 비중으로 재계산 (DB 메트릭 오류 방지)
          if (h.length > 0) {
            const maxPct = Math.max(...h.map(x => x.pct || 0));
            if (maxPct > 0) inv.metrics.topHoldingPct = Math.round(maxPct * 10) / 10;
          }
        });

        // ★ Phase B1 완료 — holdings 기반 AUM으로 투자자 업데이트
        if (cancelled) return;
        setInvestors(mappedInvestors);
        setHoldings(mappedHoldings);
        console.log('[DataProvider] Phase B1 완료: holdings 로드 + 투자자 AUM 업데이트');

        // (Quarterly History는 Phase A에서 이미 빌드 완료)

        // ========== B2 + B3 + B4 병렬 실행 (서로 의존성 없음) ==========
        console.time('[DataProvider] Phase B2-B4 병렬');

        // --- Task 1: holding_changes RPC + quarterlyActivity 빌드 ---
        const taskHoldingChanges = (async () => {
          let dbChanges = [];
          try {
            const RPC_PAGE = 1000;
            let rpcOffset = 0;
            let allRpcChanges = [];
            while (true) {
              const { data: page, error: rpcErr } = await supabase
                .rpc('get_all_holding_changes')
                .range(rpcOffset, rpcOffset + RPC_PAGE - 1);
              if (rpcErr) throw rpcErr;
              allRpcChanges.push(...(page || []));
              if (!page || page.length < RPC_PAGE) break;
              rpcOffset += RPC_PAGE;
            }
            dbChanges = allRpcChanges.map(r => ({
              investor_id: r.investor_id,
              quarter: r.quarter,
              change_type: r.change_type,
              pct_change: r.pct_change,
              securities: { ticker: r.ticker, name: r.sec_name, name_ko: r.sec_name_ko },
            }));
            console.log(`[DataProvider] holding_changes RPC: ${dbChanges.length}건 로드`);
          } catch (e) {
            console.warn('holding_changes RPC 실패, fallback:', e.message);
            const CH_PAGE_SIZE = 1000;
            for (const inv of dbInvestors) {
              let allInvChanges = [];
              let offset = 0;
              let hasMore = true;
              while (hasMore) {
                const { data: page, error: chErr } = await supabase
                  .from('holding_changes')
                  .select(`investor_id, quarter, change_type, pct_change, securities (ticker, name, name_ko)`)
                  .eq('investor_id', inv.id)
                  .order('quarter', { ascending: false })
                  .range(offset, offset + CH_PAGE_SIZE - 1);
                if (chErr) { hasMore = false; continue; }
                if (page?.length) { allInvChanges.push(...page); offset += page.length; hasMore = page.length === CH_PAGE_SIZE; }
                else { hasMore = false; }
              }
              if (allInvChanges.length) dbChanges.push(...allInvChanges);
            }
          }

          // quarterlyActivity 빌드
          const qActivity = {};
          (dbChanges || []).forEach(c => {
            const slug = idToSlug[c.investor_id];
            if (!slug) return;
            if (!qActivity[slug]) qActivity[slug] = {};
            const qLabel = formatQuarterLabel(c.quarter);
            if (!qActivity[slug][qLabel]) qActivity[slug][qLabel] = [];
            const sec = c.securities || {};
            let ticker = sec.ticker || '';
            if (!ticker || /^\d{5,}/.test(ticker)) {
              ticker = (sec.name || '').replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'N/A';
            }
            const existing = qActivity[slug][qLabel].find(a => a.ticker === ticker);
            if (existing) {
              if (Math.abs(c.pct_change || 0) > Math.abs(existing.pctChange)) {
                existing.pctChange = c.pct_change || 0;
                existing.type = c.change_type;
              }
            } else {
              qActivity[slug][qLabel].push({
                ticker,
                name: decodeHtmlEntities(
                  sec.name_ko && /[가-힣]/.test(sec.name_ko)
                    ? sec.name_ko
                    : (KO_NAME_FALLBACK[ticker] || sec.name_ko || sec.name || 'Unknown')
                ),
                nameEn: decodeHtmlEntities(sec.name || 'Unknown'),
                type: c.change_type,
                pctChange: c.pct_change || 0,
              });
            }
          });

          const qActivityFormatted = {};
          Object.keys(qActivity).forEach(slug => {
            qActivityFormatted[slug] = Object.entries(qActivity[slug])
              .map(([q, actions]) => ({
                q,
                actions: actions.sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange)),
              }));
          });

          // holdings에 change 값 주입
          const latestChangeByInvestor = {};
          (dbChanges || []).forEach(c => {
            const slug = idToSlug[c.investor_id];
            if (!slug) return;
            const sec = c.securities || {};
            let ticker = sec.ticker || '';
            if (!ticker || /^\d{5,}/.test(ticker)) return;
            const qLabel = formatQuarterLabel(c.quarter);
            if (!latestChangeByInvestor[slug]) latestChangeByInvestor[slug] = { q: '', changes: {} };
            const inv = latestChangeByInvestor[slug];
            if (qLabel > inv.q) { inv.q = qLabel; inv.changes = {}; }
            if (qLabel === inv.q) {
              if (!inv.changes[ticker] || Math.abs(c.pct_change || 0) > Math.abs(inv.changes[ticker])) {
                inv.changes[ticker] = c.pct_change || 0;
              }
            }
          });

          Object.entries(mappedHoldings).forEach(([invId, holdings]) => {
            const inv = mappedInvestors.find(i => i.id === invId);
            const slug = inv?.id;
            const changeMap = latestChangeByInvestor[slug]?.changes || {};
            holdings.forEach(h => {
              if (changeMap[h.ticker] !== undefined) h.change = changeMap[h.ticker];
            });
          });

          return { qActivityFormatted, dbChanges };
        })();

        // --- Task 2: ARK 일별 매매 + AI 인사이트 (소량 API 2개) ---
        const taskArkAndAI = (async () => {
          // ARK trades
          let arkTrades = [];
          try {
            const { data: rawTrades, error: arkErr } = await supabase
              .from('ark_daily_trades')
              .select('*')
              .order('trade_date', { ascending: false })
              .limit(500);

            if (!arkErr && rawTrades?.length) {
              const arkTickers = [...new Set(rawTrades.map(t => t.ticker))];
              let sectorMap = {};
              try {
                const { data: secData } = await supabase
                  .from('securities')
                  .select('ticker, sector, sector_ko')
                  .in('ticker', arkTickers);
                if (secData) {
                  secData.forEach(s => {
                    sectorMap[s.ticker] = (s.sector_ko && s.sector_ko.trim()) || (s.sector && s.sector.trim()) || '';
                  });
                }
              } catch (e) { console.warn('ARK sector lookup 실패:', e.message); }

              const byDate = {};
              rawTrades.forEach(t => {
                const d = t.trade_date;
                if (!byDate[d]) byDate[d] = [];
                byDate[d].push({
                  ticker: t.ticker, company: t.company, direction: t.direction,
                  sharesChange: t.shares_change, weightToday: t.weight_today,
                  weightPrev: t.weight_prev, funds: t.funds,
                  isNew: t.is_new, isExit: t.is_exit, sector: sectorMap[t.ticker] || '',
                });
              });
              arkTrades = Object.entries(byDate)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([date, trades]) => ({
                  date,
                  trades: trades.sort((a, b) => Math.abs(b.sharesChange) - Math.abs(a.sharesChange)),
                }));
              console.log(`[DataProvider] ARK 일별 매매: ${rawTrades.length}건 (${arkTrades.length}일)`);
            }
          } catch (e) { console.warn('ARK 일별 매매 로드 실패:', e.message); }

          // AI insights
          let aiInsightsMap = {};
          try {
            const { data: rawInsights, error: aiErr } = await supabase
              .from('ai_insights')
              .select('investor_id, quarter, insights, generated_at')
              .order('generated_at', { ascending: false });

            if (!aiErr && rawInsights?.length) {
              rawInsights.forEach(row => {
                const slug = idToSlug[row.investor_id];
                if (!slug) return;
                if (!aiInsightsMap[slug]) aiInsightsMap[slug] = {};
                const qKey = row.quarter;
                if (!aiInsightsMap[slug][qKey]) {
                  aiInsightsMap[slug][qKey] = {
                    quarter: formatQuarterLabel(row.quarter),
                    quarterRaw: row.quarter,
                    insights: row.insights || [],
                    generatedAt: row.generated_at,
                  };
                }
              });
              Object.keys(aiInsightsMap).forEach(slug => {
                const entries = Object.values(aiInsightsMap[slug]);
                if (entries.length) {
                  const latest = entries.sort((a, b) =>
                    new Date(b.generatedAt) - new Date(a.generatedAt)
                  )[0];
                  aiInsightsMap[slug]._latest = latest;
                }
              });
              console.log(`[DataProvider] AI 인사이트: ${Object.keys(aiInsightsMap).length}명 로드`);
            }
          } catch (e) { console.warn('AI 인사이트 로드 실패:', e.message); }

          return { arkTrades, aiInsightsMap };
        })();

        // --- Task 3: stock_prices RPC ---
        const taskStockPrices = (async () => {
          // ===== stock_prices: 공시 후 성과 계산 (Phase 3B: RPC 1회 호출) =====
        let stockPricesMap = {};
        try {
          // 최신 분기 말 날짜 계산
          let priceQuarter = maxQuarter;
          const qMatch = priceQuarter.match(/^(\d{4})Q(\d)$/);
          if (qMatch) {
            let qYear = parseInt(qMatch[1]);
            let qNum = parseInt(qMatch[2]);
            let qEndDates = { 1: `${qYear}-03-31`, 2: `${qYear}-06-30`, 3: `${qYear}-09-30`, 4: `${qYear}-12-31` };
            let qEndDate = qEndDates[qNum];

            // 분기 말이 미래면 이전 분기 사용
            const today = new Date().toISOString().split('T')[0];
            if (qEndDate > today) {
              if (qNum === 1) { qYear--; qNum = 4; } else { qNum--; }
              qEndDates = { 1: `${qYear}-03-31`, 2: `${qYear}-06-30`, 3: `${qYear}-09-30`, 4: `${qYear}-12-31` };
              qEndDate = qEndDates[qNum];
              priceQuarter = `${qYear}Q${qNum}`;
              console.log(`[DataProvider] 분기 말이 미래 → 이전 분기 사용: ${priceQuarter} (${qEndDate})`);
            }

            // 모든 보유 종목 티커 수집
            const allTickers = new Set();
            Object.values(mappedHoldings).forEach(arr => arr.forEach(h => allTickers.add(h.ticker)));

            const tickerArr = [...allTickers];
            if (tickerArr.length > 0 && qEndDate) {
              // 분기 말 날짜 범위
              const qDateFrom = (() => { const d = new Date(qEndDate); d.setDate(d.getDate() - 5); return d.toISOString().split('T')[0]; })();
              const qDateTo = (() => { const d = new Date(qEndDate); d.setDate(d.getDate() + 3); return d.toISOString().split('T')[0]; })();

              let rpcSuccess = false;
              try {
                // Phase 3B: RPC 호출로 최신 시세 + 분기말 시세 동시 조회 (페이지네이션)
                const SP_PAGE = 1000;
                let spOffset = 0;
                let allRpcPrices = [];
                while (true) {
                  const { data: page, error: rpcErr } = await supabase
                    .rpc('get_stock_prices_for_tickers', {
                      p_tickers: tickerArr,
                      p_quarter_start: qDateFrom,
                      p_quarter_end: qDateTo,
                    })
                    .range(spOffset, spOffset + SP_PAGE - 1);
                  if (rpcErr) throw rpcErr;
                  allRpcPrices.push(...(page || []));
                  if (!page || page.length < SP_PAGE) break;
                  spOffset += SP_PAGE;
                }

                // RPC 결과를 currentMap / quarterMap으로 분리
                const currentMap = {};
                const quarterMap = {};
                allRpcPrices.forEach(p => {
                  if (p.price_type === 'latest' && !currentMap[p.ticker]) {
                    currentMap[p.ticker] = p;
                  } else if (p.price_type === 'quarter_end' && !quarterMap[p.ticker]) {
                    quarterMap[p.ticker] = p;
                  }
                });

                // 공시 후 성과 계산
                for (const ticker of allTickers) {
                  const curr = currentMap[ticker];
                  const qEnd = quarterMap[ticker];
                  if (curr) {
                    const currentPrice = parseFloat(curr.close_price);
                    const quarterEndPrice = qEnd ? parseFloat(qEnd.close_price) : null;
                    const sinceFiling = quarterEndPrice && quarterEndPrice > 0
                      ? ((currentPrice - quarterEndPrice) / quarterEndPrice) * 100
                      : null;

                    stockPricesMap[ticker] = {
                      current: currentPrice,
                      date: curr.price_date,
                      dailyChange: curr.change_pct ? parseFloat(curr.change_pct) : null,
                      quarterEnd: quarterEndPrice,
                      quarterEndDate: qEnd?.price_date || null,
                      sinceFiling: sinceFiling !== null ? Math.round(sinceFiling * 100) / 100 : null,
                    };
                  }
                }
                rpcSuccess = true;
                console.log(`[DataProvider] stock_prices RPC: ${Object.keys(stockPricesMap).length}개 종목`);
              } catch (rpcE) {
                console.warn('stock_prices RPC 실패, fallback:', rpcE.message);
              }

              // Fallback: RPC 실패 시 기존 배치 방식
              if (!rpcSuccess) {
                const BATCH_SIZE = 200;
                const tickerBatches = [];
                for (let i = 0; i < tickerArr.length; i += BATCH_SIZE) {
                  tickerBatches.push(tickerArr.slice(i, i + BATCH_SIZE));
                }
                const latestPrices = [];
                for (const batch of tickerBatches) {
                  let from = 0; const PAGE = 1000;
                  while (true) {
                    const { data: page } = await supabase.from('stock_prices').select('ticker, close_price, price_date, change_pct').in('ticker', batch).order('price_date', { ascending: false }).range(from, from + PAGE - 1);
                    latestPrices.push(...(page || []));
                    if (!page || page.length < PAGE) break; from += PAGE;
                  }
                }
                const quarterPrices = [];
                for (const batch of tickerBatches) {
                  let from = 0; const PAGE = 1000;
                  while (true) {
                    const { data: page } = await supabase.from('stock_prices').select('ticker, close_price, price_date').in('ticker', batch).gte('price_date', qDateFrom).lte('price_date', qDateTo).order('price_date', { ascending: false }).range(from, from + PAGE - 1);
                    quarterPrices.push(...(page || []));
                    if (!page || page.length < PAGE) break; from += PAGE;
                  }
                }
                const currentMap = {}; (latestPrices || []).forEach(p => { if (!currentMap[p.ticker]) currentMap[p.ticker] = p; });
                const quarterMap = {}; (quarterPrices || []).forEach(p => { if (!quarterMap[p.ticker]) quarterMap[p.ticker] = p; });
                for (const ticker of allTickers) {
                  const curr = currentMap[ticker]; const qEnd = quarterMap[ticker];
                  if (curr) {
                    const currentPrice = parseFloat(curr.close_price);
                    const quarterEndPrice = qEnd ? parseFloat(qEnd.close_price) : null;
                    const sinceFiling = quarterEndPrice && quarterEndPrice > 0 ? ((currentPrice - quarterEndPrice) / quarterEndPrice) * 100 : null;
                    stockPricesMap[ticker] = { current: currentPrice, date: curr.price_date, dailyChange: curr.change_pct ? parseFloat(curr.change_pct) : null, quarterEnd: quarterEndPrice, quarterEndDate: qEnd?.price_date || null, sinceFiling: sinceFiling !== null ? Math.round(sinceFiling * 100) / 100 : null };
                  }
                }
                console.log(`[DataProvider] stock_prices fallback: ${Object.keys(stockPricesMap).length}개 종목`);
              }
            }
          }
          } catch (e) {
            console.warn('시세 데이터 로드 실패:', e.message);
          }
          return stockPricesMap;
        })();

        // ★ B2+B3+B4 병렬 대기
        const [changesResult, arkAiResult, stockResult] = await Promise.all([
          taskHoldingChanges, taskArkAndAI, taskStockPrices,
        ]);
        console.timeEnd('[DataProvider] Phase B2-B4 병렬');

        // ★ Phase B 완료 — 모든 디테일 데이터 최종 반영
        if (cancelled) return;
        setQuarterlyActivity(changesResult.qActivityFormatted);
        setArkDailyTrades(arkAiResult.arkTrades);
        setAiInsights(arkAiResult.aiInsightsMap);
        setStockPrices(stockResult);
        setUsingMock(false);
        setDetailLoading(false);
        console.log('[DataProvider] Phase B 완료 — 전체 로드 완료');

      } catch (err) {
        if (cancelled) return;
        console.error('Supabase 로드 실패, mock 데이터로 전환:', err.message);
        // Supabase 실패 시 mock 데이터로 fallback → 빈 화면 방지
        setInvestors(MOCK_INVESTORS);
        setHoldings(MOCK_HOLDINGS);
        setQuarterlyHistory(MOCK_QUARTERLY_HISTORY);
        setQuarterlyActivity(MOCK_QUARTERLY_ACTIVITY);
        setLatestQuarter('2025Q4');
        setError(err.message);
        setUsingMock(true);
        setLoading(false);
        setDetailLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  // 실시간 시세 업데이트 (live-prices Edge Function)
  useEffect(() => {
    if (loading || !investors?.length || !holdings || Object.keys(holdings).length === 0) return;

    // 모든 보유 종목 티커 수집
    const allTickers = new Set();
    Object.values(holdings).forEach(arr => arr.forEach(h => allTickers.add(h.ticker)));
    if (allTickers.size === 0) return;

    let cancelled = false;
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

    async function fetchLivePrices() {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/live-prices`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tickers: [...allTickers] }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.prices || cancelled) return;

        // 장 상태 메타데이터 업데이트
        if (data.marketStatus) setMarketStatus(data.marketStatus);
        if (data.lastTradeDate) setLastTradeDate(data.lastTradeDate);

        // 기존 stockPrices에 실시간 가격 머지 (quarterEnd는 유지)
        setStockPrices(prev => {
          const merged = { ...prev };
          for (const [ticker, live] of Object.entries(data.prices)) {
            const existing = merged[ticker];
            const currentPrice = live.c;

            // 가격이 0이거나 비정상이면 기존 데이터 유지 (주말/공휴일 방어)
            if (!currentPrice || currentPrice <= 0) continue;

            const quarterEnd = existing?.quarterEnd || null;
            const sinceFiling = quarterEnd && quarterEnd > 0
              ? Math.round(((currentPrice - quarterEnd) / quarterEnd) * 10000) / 100
              : existing?.sinceFiling || null;

            merged[ticker] = {
              current: currentPrice,
              date: data.lastTradeDate || existing?.date || null,
              live: data.live || false,
              source: data.source || 'unknown',
              dailyChange: live.ch,
              volume: live.v || 0,
              vwap: live.vw || 0,
              prevClose: live.pc || 0,
              // 애프터마켓 데이터 (있을 때만)
              afterHoursPrice: live.ah || null,
              afterHoursChange: live.ahCh || null,
              quarterEnd: quarterEnd,
              quarterEndDate: existing?.quarterEndDate || null,
              sinceFiling: sinceFiling,
            };
          }
          console.log(`[DataProvider] 실시간 시세 업데이트: ${Object.keys(data.prices).length}개 종목`);
          return merged;
        });
      } catch (e) {
        console.warn('실시간 시세 로드 실패:', e.message);
      }
    }

    // 초기 로드 (2초 후 — DB 데이터 먼저 표시)
    const initialTimer = setTimeout(fetchLivePrices, 2000);

    // 5분마다 자동 갱신
    // Polygon Starter: 15분 지연 데이터 → 15분마다 갱신
    const interval = setInterval(fetchLivePrices, 15 * 60 * 1000);

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [loading, investors, holdings]);

  const value = useMemo(() => ({
    investors: investors || [],
    holdings: holdings || {},
    quarterlyHistory: quarterlyHistory || {},
    quarterlyActivity: quarterlyActivity || {},
    arkDailyTrades,
    aiInsights,
    stockPrices,
    marketStatus,
    lastTradeDate,
    latestQuarter,
    lastUpdatedAt,
    loading,
    detailLoading,
    error,
    usingMock,
    getDbId: (slug) => SLUG_TO_DBID[slug] || null,
  }), [investors, holdings, quarterlyHistory, quarterlyActivity, arkDailyTrades, aiInsights, stockPrices, marketStatus, lastTradeDate, latestQuarter, lastUpdatedAt, loading, detailLoading, error, usingMock]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

export default DataContext;
