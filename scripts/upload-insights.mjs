#!/usr/bin/env node
/**
 * FolioObs — Cowork 인사이트 업로더
 *
 * Claude Cowork 세션에서 생성한 인사이트를 Supabase에 직접 업로드합니다.
 * Claude API 비용 $0 — Cowork 구독으로 이미 지불 중이므로 추가 비용 없음.
 *
 * 사용법:
 *   SUPABASE_SERVICE_KEY="eyJ..." node scripts/upload-insights.mjs \
 *     --investor=cathie \
 *     --daily \
 *     --insights='[{"title":"...","desc":"...","tag":"전략","confidence":85}]'
 *
 * 옵션:
 *   --investor=cathie|buffett|...   투자자 slug
 *   --daily                         일별 인사이트 (캐시우드용, quarter에 날짜 포함)
 *   --insights='[...]'              JSON 배열 문자열
 *   --insights-file=path            JSON 파일 경로 (--insights 대신 사용 가능)
 *   --force                         기존 인사이트 덮어쓰기
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://mghfgcjcbpizjmfrtozi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================
// 인자 파싱
// ============================================================
const args = process.argv.slice(2);
const investorArg = args.find(a => a.startsWith('--investor='))?.split('=')[1];
const dailyFlag = args.includes('--daily');
const forceFlag = args.includes('--force');
const dateArg = args.find(a => a.startsWith('--date='))?.split('=')[1]; // YYYY-MM-DD 형식

// --insights='[...]' 또는 --insights-file=path
let insightsRaw = args.find(a => a.startsWith('--insights='))?.slice('--insights='.length);
const insightsFilePath = args.find(a => a.startsWith('--insights-file='))?.slice('--insights-file='.length);

if (!insightsRaw && insightsFilePath) {
  insightsRaw = readFileSync(insightsFilePath, 'utf-8');
}

// stdin에서도 읽기 가능
if (!insightsRaw && !process.stdin.isTTY) {
  insightsRaw = readFileSync('/dev/stdin', 'utf-8');
}

if (!investorArg) {
  console.error('❌ --investor 필수 (예: --investor=cathie)');
  process.exit(1);
}
if (!insightsRaw) {
  console.error('❌ 인사이트 데이터 필요: --insights=\'[...]\' 또는 --insights-file=path 또는 stdin');
  process.exit(1);
}

// ============================================================
// 메인
// ============================================================
async function main() {
  console.log('═'.repeat(60));
  console.log('FolioObs — Cowork 인사이트 업로더');
  console.log('═'.repeat(60));

  // 1. 투자자 찾기
  const { data: investors } = await supabase
    .from('investors')
    .select('*')
    .eq('is_active', true);

  const investor = investors?.find(inv => {
    const slug = inv.name.toLowerCase().replace(/\s+/g, '_');
    return slug.includes(investorArg) || inv.name_ko === investorArg;
  });

  if (!investor) {
    console.error(`❌ 투자자 '${investorArg}'를 찾을 수 없습니다.`);
    console.error(`   가능한 값: ${investors?.map(i => i.name.toLowerCase().replace(/\s+/g, '_')).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n▶ 투자자: ${investor.name_ko} (${investor.name})`);

  // 2. 최신 분기 확인
  const { data: invFiling } = await supabase
    .from('filings')
    .select('quarter')
    .eq('investor_id', investor.id)
    .order('report_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!invFiling) {
    console.error('❌ 파일링 데이터가 없습니다.');
    process.exit(1);
  }

  const quarter = invFiling.quarter;
  let saveQuarter = quarter;
  if (dailyFlag) {
    const dateStr = dateArg || new Date().toISOString().slice(0, 10); // --date=2026-03-09 또는 오늘
    const mmdd = dateStr.slice(5).replace('-', ''); // "0309"
    saveQuarter = `${quarter}-${mmdd}`;
  }

  console.log(`  📅 분기: ${saveQuarter}`);

  // 3. 기존 인사이트 확인
  if (!forceFlag) {
    const { data: existing } = await supabase
      .from('ai_insights')
      .select('id')
      .eq('investor_id', investor.id)
      .eq('quarter', saveQuarter)
      .maybeSingle();

    if (existing) {
      console.log(`  ⏭️  이미 존재합니다. --force로 덮어쓰기 가능.`);
      process.exit(0);
    }
  }

  // 4. 인사이트 파싱 & 유효성 검사
  let insights;
  try {
    insights = JSON.parse(insightsRaw);
  } catch (e) {
    console.error(`❌ JSON 파싱 실패: ${e.message}`);
    console.error(`   입력값 앞부분: ${insightsRaw.substring(0, 100)}...`);
    process.exit(1);
  }

  if (!Array.isArray(insights) || insights.length === 0) {
    console.error('❌ 인사이트 배열이 비어있습니다.');
    process.exit(1);
  }

  const validInsights = insights
    .filter(ins => ins.title && ins.desc && ins.tag)
    .map(ins => ({
      title: ins.title.slice(0, 60),
      title_en: ins.title_en || null,
      desc: ins.desc,
      desc_en: ins.desc_en || null,
      tag: ins.tag,
      confidence: Math.min(Math.max(ins.confidence || 70, 60), 95),
    }));

  if (validInsights.length === 0) {
    console.error('❌ 유효한 인사이트가 없습니다. (title, desc, tag 필수)');
    process.exit(1);
  }

  // 5. Supabase 저장
  const { error: saveErr } = await supabase
    .from('ai_insights')
    .upsert({
      investor_id: investor.id,
      quarter: saveQuarter,
      insights: validInsights,
      model: 'cowork-claude',
      generated_at: new Date().toISOString(),
    }, { onConflict: 'investor_id,quarter' });

  if (saveErr) {
    console.error(`❌ 저장 실패: ${saveErr.message}`);
    process.exit(1);
  }

  console.log(`\n  ✅ ${validInsights.length}개 인사이트 업로드 완료!`);
  validInsights.forEach((ins, i) => {
    console.log(`     ${i + 1}. [${ins.tag}] ${ins.title} (신뢰도 ${ins.confidence}%)`);
    console.log(`        ${ins.desc.substring(0, 80)}...`);
  });

  console.log('\n' + '═'.repeat(60));
  console.log(`💰 비용: $0 (Cowork 세션에서 생성)`);
  console.log('═'.repeat(60));
}

main().catch(err => { console.error('실패:', err); process.exit(1); });
