# FolioObs — SEC EDGAR 데이터 파이프라인

## 빠른 시작 (3단계)

### 1단계: 실행
```bash
# 프로젝트 루트에서
node scripts/edgar-pipeline.mjs
```

이게 끝이야. API 키 발급, 가입, 설정 파일 — 아무것도 필요 없음.

### 2단계: 결과 확인
`src/data/generated/` 폴더에 파일이 생성됨:
- `investors.json` — 투자자 정보 (FolioObs 앱 형식)
- `holdings.json` — 보유종목 데이터 (FolioObs 앱 형식)
- `raw-filings.json` — SEC 원본 전체 데이터
- `meta.json` — 생성 시간, 파일링 날짜 등

### 3단계: 앱에 반영
`src/data/investors.js`와 `src/data/holdings.js`를 생성된 JSON으로 교체하면 실데이터로 전환.

---

## 투자자 추가하기

`scripts/edgar-pipeline.mjs`에서 `TRACKED_INVESTORS` 배열에 추가:

```js
{
  cik: '0001234567',        // SEC CIK 번호
  name: 'Investor Name',
  nameKo: '투자자 이름',
  fund: 'Fund Name',
  fundKo: '펀드명',
  style: '투자스타일',
  color: '#6366F1',
  gradient: 'linear-gradient(135deg, #6366F1, #818CF8)',
  avatar: 'XX',
}
```

**CIK 번호 찾는 법:**
https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=13F 에서 기관명 검색

---

## DB 연동 (프로덕션)

PostgreSQL 스키마:
```bash
psql -d folioobs -f scripts/schema.sql
```

주요 테이블:
- `investors` — 투자자 기본 정보
- `securities` — 종목 (CUSIP, 티커, 섹터)
- `filings` — 13F 제출 기록
- `holdings` — 핵심! 분기별 보유종목
- `holding_changes` — 분기 변동 (신규/매수/매도)
- `investor_metrics` — 분기별 집계

---

## 자주 묻는 질문

**Q: 비용이 드나?**
A: 전혀 안 들어. SEC EDGAR API는 100% 무료.

**Q: 얼마나 자주 실행해야 하나?**
A: 분기 1회. 13F는 분기말 후 45일 이내 제출됨 (2/14, 5/15, 8/14, 11/14 전후).

**Q: 요청 제한이 있나?**
A: 초당 10건 권장. 스크립트가 자동으로 150ms 간격을 둠.

**Q: CUSIP → 티커 매핑이 안 되면?**
A: OpenFIGI API(무료)로 자동 변환. 실패 시 CUSIP이 티커로 표시됨. `.cusip-cache.json`에 캐시됨.
