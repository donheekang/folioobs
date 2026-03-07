#!/usr/bin/env node
/**
 * SEC EDGAR 13F XML 구조 진단 스크립트
 * 사용법: node scripts/debug-xml.mjs
 */

const USER_AGENT = 'FolioObs ehsgml12345@gmail.com';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchSEC(url) {
  await sleep(200);
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': '*/*' },
  });
  if (!res.ok) throw new Error(`${res.status}: ${url}`);
  return await res.text();
}

async function debugInvestor(name, cik, accession) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${name} (CIK: ${cik})`);
  console.log(`${'='.repeat(60)}`);

  const accClean = accession.replace(/-/g, '');
  const cikClean = cik.replace(/^0+/, '');
  const baseUrl = `https://www.sec.gov/Archives/edgar/data/${cikClean}/${accClean}`;

  // 파일 목록 조회
  try {
    const indexRes = await fetch(`${baseUrl}/index.json`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (indexRes.ok) {
      const indexData = await indexRes.json();
      const items = indexData?.directory?.item || [];
      console.log(`\n📁 파일 목록 (${items.length}개):`);
      items.forEach(f => console.log(`   ${f.name} (${f.size || '?'} bytes)`));
    }
  } catch (e) {
    console.log('index.json 조회 실패:', e.message);
  }

  // infotable.xml 또는 모든 XML 파일 분석
  const xmlFiles = ['infotable.xml', 'InfoTable.xml'];

  // HTML 인덱스에서 XML 파일 찾기
  try {
    const html = await fetchSEC(`${baseUrl}/`);
    const regex = /href="([^"]*\.xml[^"]*)"/gi;
    let m;
    while ((m = regex.exec(html)) !== null) {
      const fn = m[1].split('/').pop();
      if (!xmlFiles.includes(fn)) xmlFiles.push(fn);
    }
  } catch (e) {}

  console.log(`\n🔍 XML 파일 분석:`);

  for (const xmlFile of xmlFiles) {
    try {
      const xml = await fetchSEC(`${baseUrl}/${xmlFile}`);
      console.log(`\n--- ${xmlFile} (${xml.length} bytes) ---`);

      // 루트 태그
      const rootMatch = xml.match(/<([a-zA-Z0-9_:]+)[^>]*>/);
      if (rootMatch) console.log(`  루트 태그: <${rootMatch[1]}>`);

      // 네임스페이스
      const nsMatches = xml.match(/xmlns[^=]*="[^"]*"/g);
      if (nsMatches) {
        console.log(`  네임스페이스:`);
        nsMatches.forEach(ns => console.log(`    ${ns}`));
      }

      // infoTable 관련 태그 패턴 찾기
      const tagPatterns = [
        /<\/(?:[\w]+:)?infoTable>/gi,
        /<\/(?:[\w]+:)?informationTable>/gi,
        /nameOfIssuer/gi,
        /cusip/gi,
        /<\/(?:[\w]+:)?value>/gi,
        /sshPrnamt/gi,
        /sshPrnAmt/gi,
      ];

      const labels = ['</infoTable>', '</informationTable>', 'nameOfIssuer', 'cusip', '</value>', 'sshPrnamt', 'sshPrnAmt'];

      labels.forEach((label, i) => {
        const count = (xml.match(tagPatterns[i]) || []).length;
        if (count > 0) console.log(`  ${label}: ${count}개`);
      });

      // 첫 번째 엔트리 전체 출력 (처음 2000자)
      console.log(`\n  [처음 2000자]:`);
      console.log(xml.slice(0, 2000));

      // 실제 분리 테스트
      const splits1 = xml.split(/<\/infoTable>/i);
      const splits2 = xml.split(/<\/(?:[\w]+:)?infoTable>/i);
      const splits3 = xml.split(/<\/[^>]*infoTable>/i);
      console.log(`\n  split(</infoTable>): ${splits1.length - 1}개 항목`);
      console.log(`  split(</ns:infoTable>): ${splits2.length - 1}개 항목`);
      console.log(`  split(</...infoTable>): ${splits3.length - 1}개 항목`);

    } catch (e) {
      // skip
    }
  }
}

async function main() {
  console.log('SEC EDGAR 13F XML 구조 진단');
  console.log('═'.repeat(60));

  await debugInvestor('Ray Dalio (Bridgewater)', '0001350694', '0001350694-26-000001');
  await sleep(500);
  await debugInvestor('George Soros', '0001061768', '0001061768-26-000005');
}

main().catch(console.error);
