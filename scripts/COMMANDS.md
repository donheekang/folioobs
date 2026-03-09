# FolioObs 파이프라인 명령어 모음
# 복사해서 터미널에 붙여넣기만 하면 됨

---

## 매일 (평일) — ARK 캐시우드 매매 + 인사이트

```bash
SUPABASE_SERVICE_KEY="eyJ..." ANTHROPIC_API_KEY="sk-..." node scripts/ark-to-supabase.mjs --with-insights
```

ARK만 (인사이트 없이):
```bash
SUPABASE_SERVICE_KEY="eyJ..." node scripts/ark-to-supabase.mjs
```

이미 오늘 데이터 넣었는데 다시 돌리려면:
```bash
SUPABASE_SERVICE_KEY="eyJ..." ANTHROPIC_API_KEY="sk-..." node scripts/ark-to-supabase.mjs --with-insights --force
```

---

## 분기마다 — 13F (버핏, 드러켄밀러, 달리오 등)

```bash
SUPABASE_SERVICE_KEY="eyJ..." node scripts/edgar-to-supabase.mjs
```

13F 넣고 전체 인사이트 재생성:
```bash
SUPABASE_SERVICE_KEY="eyJ..." node scripts/edgar-to-supabase.mjs && \
SUPABASE_SERVICE_KEY="eyJ..." ANTHROPIC_API_KEY="sk-..." node scripts/generate-insights.mjs --force
```

---

## 인사이트만 따로

전체 투자자:
```bash
SUPABASE_SERVICE_KEY="eyJ..." ANTHROPIC_API_KEY="sk-..." node scripts/generate-insights.mjs
```

캐시우드 일별:
```bash
SUPABASE_SERVICE_KEY="eyJ..." ANTHROPIC_API_KEY="sk-..." node scripts/generate-insights.mjs --investor=cathie --daily
```

버핏만:
```bash
SUPABASE_SERVICE_KEY="eyJ..." ANTHROPIC_API_KEY="sk-..." node scripts/generate-insights.mjs --investor=buffett
```

강제 재생성:
```bash
SUPABASE_SERVICE_KEY="eyJ..." ANTHROPIC_API_KEY="sk-..." node scripts/generate-insights.mjs --force
```

---

## 데이터 정비 (필요할 때만)

티커 오류 수정:
```bash
SUPABASE_SERVICE_KEY="eyJ..." node scripts/fix-tickers.mjs
```

섹터 재분류:
```bash
SUPABASE_SERVICE_KEY="eyJ..." node scripts/reclassify-sectors.mjs
```

포트폴리오 데이터 조회 (확인용):
```bash
SUPABASE_SERVICE_KEY="eyJ..." node scripts/fetch-portfolio.mjs --all
```

캐시우드 일별 데이터 조회:
```bash
SUPABASE_SERVICE_KEY="eyJ..." node scripts/fetch-portfolio.mjs --investor=cathie --daily
```

---

## 실행 타이밍 참고

| 작업 | 언제 | 한국 시간 |
|------|------|----------|
| ARK 매매 업데이트 | 미국 장 마감 후 | 오전 9~11시 이후 |
| 13F 분기 업데이트 | 분기말+45일 | 2/14, 5/15, 8/14, 11/14 전후 |
