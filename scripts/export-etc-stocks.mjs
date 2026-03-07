#!/usr/bin/env node
/**
 * "기타" 섹터 종목 전체 export
 * → 이 결과를 바탕으로 MANUAL_OVERRIDES 매핑 생성
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mghfgcjcbpizjmfrtozi.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_SERVICE_KEY) { console.error('❌ SUPABASE_SERVICE_KEY 필요'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  let all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('securities')
      .select('id, name, ticker, sector_ko')
      .or('sector_ko.eq.기타,sector_ko.is.null')
      .order('name')
      .range(offset, offset + 999);
    if (error) { console.error('에러:', error.message); break; }
    if (!data || data.length === 0) break;
    all.push(...data);
    offset += data.length;
    if (data.length < 1000) break;
  }

  console.log(`총 ${all.length}개 "기타" 종목:\n`);
  all.forEach(s => {
    console.log(`${s.name}`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });
