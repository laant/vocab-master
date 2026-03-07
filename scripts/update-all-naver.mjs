import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env.local 자동 로드
const envPath = resolve(__dirname, '../.env.local');
if (existsSync(envPath)) {
  const envText = readFileSync(envPath, 'utf-8');
  for (const line of envText.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').trim();
}

// 네이버 사전 api3에서 발음기호, 오디오, 한글 뜻, 예문 조회
async function fetchNaverData(word) {
  try {
    const url = `https://dict.naver.com/api3/enko/search?query=${encodeURIComponent(word)}&m=pc&range=word`;
    const res = await fetch(url, {
      headers: { 'Referer': 'https://dict.naver.com/' },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const items = data?.searchResultMap?.searchResultListMap?.WORD?.items;
    if (!items || items.length === 0) return null;

    // 정확히 일치하는 단어 찾기
    const entry = items.find(
      (item) => item.expEntry?.toLowerCase() === word.toLowerCase()
    ) || items[0];

    // 발음기호 + 오디오
    const phoneticList = entry.searchPhoneticSymbolList || [];
    const phonetics = phoneticList.map((p) => ({
      text: p.symbolValue || '',
      audio: p.symbolFile || '',
    }));
    const phonetic = phonetics[0]?.text || '';

    // 한글 뜻
    const meansCollector = entry.meansCollector || [];
    let meaning = '';
    for (const mc of meansCollector) {
      for (const m of mc.means || []) {
        if (m.value) {
          meaning = stripHtml(m.value);
          break;
        }
      }
      if (meaning) break;
    }

    // 예문 수집 (최대 3개)
    const examples = [];
    for (const mc of meansCollector) {
      for (const m of mc.means || []) {
        if (m.exampleOri && examples.length < 3) {
          examples.push({
            en: stripHtml(m.exampleOri),
            ko: m.exampleTrans ? stripHtml(m.exampleTrans) : '',
          });
        }
      }
    }

    return { meaning, phonetic, phonetics, examples };
  } catch {
    return null;
  }
}

// 1. 모든 ready 그룹 가져오기
const { data: groups, error: fetchError } = await supabase
  .from('word_groups')
  .select('*')
  .eq('status', 'ready');

if (fetchError) {
  console.error('그룹 조회 실패:', fetchError.message);
  process.exit(1);
}

console.log(`${groups.length}개 ready 그룹 발견`);

// 2. 전체 고유 단어 수집
const uniqueWords = new Set();
for (const group of groups) {
  for (const w of (group.words || [])) {
    uniqueWords.add(w.word.toLowerCase());
  }
}
console.log(`고유 단어 ${uniqueWords.size}개 (중복 제거)\n`);

// 3. 네이버 사전에서 전체 데이터 일괄 조회
const dataMap = new Map();
let fetched = 0;
const total = uniqueWords.size;

for (const word of uniqueWords) {
  fetched++;
  const result = await fetchNaverData(word);
  if (result) {
    dataMap.set(word, result);
  }
  if (fetched % 50 === 0 || fetched === total) {
    process.stdout.write(`\r네이버 사전 조회 중... ${fetched}/${total} (${dataMap.size}개 확인)`);
  }
  // rate limit 방지
  await new Promise((r) => setTimeout(r, 150));
}

console.log(`\n네이버 사전에서 ${dataMap.size}/${total}개 데이터 확인 완료\n`);

// 4. 그룹별 단어 데이터 교체 (발음기호, 오디오, 한글 뜻, 예문)
let totalUpdated = 0;
let groupsUpdated = 0;

for (const group of groups) {
  const words = group.words || [];
  let updatedCount = 0;

  const updatedWords = words.map((w) => {
    const naver = dataMap.get(w.word.toLowerCase());
    if (!naver) return w;

    const changes = {};

    // 발음기호
    if (naver.phonetic && naver.phonetic !== w.phonetic) {
      changes.phonetic = naver.phonetic;
    }
    // 발음 오디오
    if (naver.phonetics?.length > 0) {
      changes.phonetics = naver.phonetics;
    }
    // 한글 뜻
    if (naver.meaning && naver.meaning !== w.korean) {
      changes.korean = naver.meaning;
    }

    if (Object.keys(changes).length > 0) {
      updatedCount++;
      totalUpdated++;
      return { ...w, ...changes };
    }
    return w;
  });

  if (updatedCount > 0) {
    const { error: updateError } = await supabase
      .from('word_groups')
      .update({ words: updatedWords })
      .eq('id', group.id);

    if (updateError) {
      console.error(`  ${group.name} 업데이트 실패:`, updateError.message);
    } else {
      groupsUpdated++;
      console.log(`  ${group.name}: ${updatedCount}개 단어 업데이트`);
    }
  }
}

console.log(`\n완료! ${groupsUpdated}개 그룹에서 총 ${totalUpdated}개 단어 업데이트됨`);
console.log('(발음기호, 발음 오디오, 한글 뜻)');
