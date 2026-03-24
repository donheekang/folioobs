#!/usr/bin/env node
/**
 * 3/23 캐시 우드 매매 데이터 + 인사이트 Supabase 업로드
 *
 * 사용법:
 *   SUPABASE_SERVICE_KEY="eyJ..." node scripts/upload-march23.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://mghfgcjcbpizjmfrtozi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY 환경변수가 필요합니다.');
  console.error('   실행: SUPABASE_SERVICE_KEY="eyJ..." node scripts/upload-march23.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('🚀 3/23 캐시 우드 매매 데이터 업로드 시작...\n');

  // ===== 1. 기존 3/23 데이터 삭제 (중복 방지) =====
  const { error: delError } = await supabase
    .from('ark_daily_trades')
    .delete()
    .eq('trade_date', '2026-03-23');

  if (delError) {
    console.warn('⚠️ 기존 데이터 삭제 실패:', delError.message);
  } else {
    console.log('✅ 기존 3/23 데이터 삭제 완료');
  }

  // ===== 2. 매매 데이터 삽입 =====
  const trades = [
    {
      trade_date: '2026-03-23',
      ticker: 'TXG',
      company: '10X GENOMICS INC',
      direction: 'buy',
      shares_change: 98722,
      funds: 'ARKK,ARKG',
      is_new: false,
      is_exit: false,
    },
    {
      trade_date: '2026-03-23',
      ticker: 'BLSH',
      company: 'BULLISH',
      direction: 'sell',
      shares_change: -39362,
      funds: 'ARKK,ARKW',
      is_new: false,
      is_exit: false,
    },
  ];

  const { error: insertError } = await supabase
    .from('ark_daily_trades')
    .insert(trades);

  if (insertError) {
    console.error('❌ 매매 데이터 삽입 실패:', insertError.message);
  } else {
    console.log(`✅ 매매 데이터 ${trades.length}건 삽입 완료`);
    trades.forEach(t => {
      console.log(`   ${t.direction === 'buy' ? '🟢 매수' : '🔴 매도'} ${t.ticker} ${Math.abs(t.shares_change).toLocaleString()}주 (${t.funds})`);
    });
  }

  // ===== 3. 인사이트 업로드 =====
  const insightsRaw = readFileSync(new URL('./data/march23-insights.json', import.meta.url), 'utf-8');
  const insights = JSON.parse(insightsRaw);

  // 캐시 우드 investor_id 조회
  const { data: cathie } = await supabase
    .from('investors')
    .select('id')
    .or('name.ilike.%cathie%,name.ilike.%캐시%,name.ilike.%ark%')
    .limit(1)
    .single();

  if (!cathie) {
    console.warn('⚠️ 캐시 우드 investor 레코드를 찾을 수 없습니다. 인사이트 건너뜀.');
  } else {
    const quarter = '2026Q1-0323'; // 일별 인사이트 키

    const { error: insightError } = await supabase
      .from('ai_insights')
      .upsert({
        investor_id: cathie.id,
        quarter: quarter,
        insights: insights,
        model: 'manual-entry',
        generated_at: new Date().toISOString(),
      }, {
        onConflict: 'investor_id,quarter',
      });

    if (insightError) {
      console.error('❌ 인사이트 업로드 실패:', insightError.message);
    } else {
      console.log(`\n✅ 인사이트 ${insights.length}건 업로드 완료 (${quarter})`);
      insights.forEach(i => {
        console.log(`   📊 [${i.tag}] ${i.title}`);
      });
    }
  }

  console.log('\n🎉 완료!');
}

main().catch(console.error);
