#!/usr/bin/env node
/**
 * FolioObs — 분기별 인사이트 일괄 업로더
 *
 * Cowork에서 생성한 분기별 인사이트를 투자자별로 Supabase에 업로드합니다.
 * quarterly-insights.json 파일을 읽어서 각 투자자별로 upsert 합니다.
 *
 * 사용법:
 *   SUPABASE_SERVICE_KEY="eyJ..." node scripts/upload-quarterly-insights.mjs
 *   SUPABASE_SERVICE_KEY="eyJ..." node scripts/upload-quarterly-insights.mjs --force
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://mghfgcjcbpizjmfrtozi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const forceFlag = process.argv.includes('--force');

// 투자자 slug → DB 매칭
const INVESTOR_MAP = {
  buffett: 'warren_buffett',
  druckenmiller: 'stanley_druckenmiller',
  dalio: 'ray_dalio',
  ackman: 'bill_ackman',
  soros: 'george_soros',
};

async function main() {
  console.log('═'.repeat(60));
  console.log('FolioObs — 분기별 인사이트 일괄 업로더 (Cowork)');
  console.log('═'.repeat(60));

  // 1. 인사이트 JSON 읽기
  const filePath = join(__dirname, 'data', 'quarterly-insights.json');
  let insightsData;
  try {
    insightsData = JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.error(`❌ ${filePath} 읽기 실패: ${e.message}`);
    process.exit(1);
  }

  // 2. 투자자 목록 가져오기
  const { data: investors } = await supabase
    .from('investors')
    .select('*')
    .eq('is_active', true);

  if (!investors?.length) {
    console.error('❌ 투자자 데이터 없음');
    process.exit(1);
  }

  let uploaded = 0;
  let skipped = 0;

  for (const [key, insights] of Object.entries(insightsData)) {
    const dbSlug = INVESTOR_MAP[key] || key;

    // 투자자 찾기
    const investor = investors.find(inv => {
      const slug = inv.name.toLowerCase().replace(/\s+/g, '_');
      return slug === dbSlug || slug.includes(key);
    });

    if (!investor) {
      console.log(`  ⚠️  '${key}' 투자자를 찾을 수 없습니다.`);
      continue;
    }

    // 최신 분기 확인
    const { data: invFiling } = await supabase
      .from('filings')
      .select('quarter')
      .eq('investor_id', investor.id)
      .order('report_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!invFiling) {
      console.log(`  ⚠️  ${investor.name_ko}: 파일링 없음`);
      continue;
    }

    const quarter = invFiling.quarter;

    // 기존 확인
    if (!forceFlag) {
      const { data: existing } = await supabase
        .from('ai_insights')
        .select('id')
        .eq('investor_id', investor.id)
        .eq('quarter', quarter)
        .maybeSingle();

      if (existing) {
        console.log(`  ⏭️  ${investor.name_ko} (${quarter}): 이미 존재`);
        skipped++;
        continue;
      }
    }

    // 유효성 검사
    const validInsights = insights
      .filter(ins => ins.title && ins.desc && ins.tag)
      .map(ins => ({
        title: ins.title.slice(0, 20),
        title_en: ins.title_en || null,
        desc: ins.desc,
        desc_en: ins.desc_en || null,
        tag: ins.tag,
        confidence: Math.min(Math.max(ins.confidence || 70, 60), 95),
      }));

    if (validInsights.length === 0) {
      console.log(`  ⚠️  ${investor.name_ko}: 유효한 인사이트 없음`);
      continue;
    }

    // 저장
    const { error } = await supabase
      .from('ai_insights')
      .upsert({
        investor_id: investor.id,
        quarter,
        insights: validInsights,
        model: 'cowork-claude',
        generated_at: new Date().toISOString(),
      }, { onConflict: 'investor_id,quarter' });

    if (error) {
      console.error(`  ❌ ${investor.name_ko}: ${error.message}`);
      continue;
    }

    console.log(`  ✅ ${investor.name_ko} (${quarter}): ${validInsights.length}개 인사이트`);
    validInsights.forEach((ins, i) => {
      console.log(`     ${i + 1}. [${ins.tag}] ${ins.title} (${ins.confidence}%)`);
    });
    uploaded++;
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`✅ 완료: ${uploaded}명 업로드 / ${skipped}명 스킵`);
  console.log(`💰 비용: $0 (Cowork 세션에서 생성)`);
  console.log('═'.repeat(60));
}

main().catch(err => { console.error('실패:', err); process.exit(1); });
