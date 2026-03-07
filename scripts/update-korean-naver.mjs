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

// 네이버 사전 자동완성 API로 한글 뜻 조회
async function fetchNaverMeaning(word) {
  try {
    const url = `https://ac-dict.naver.com/enko/ac?q=${encodeURIComponent(word)}&q_enc=utf-8&st=11001&r_format=json&r_enc=utf-8&r_lt=11001&r_unicode=0&r_escape=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const items = data.items?.[0];
    if (!items || items.length === 0) return null;

    // 정확히 일치하는 단어 찾기
    const exact = items.find(
      (item) => item[0]?.[0]?.toLowerCase() === word.toLowerCase()
    );
    if (exact && exact[2]?.[0]) return exact[2][0];
    // 없으면 첫 번째 결과
    if (items[0]?.[2]?.[0]) return items[0][2][0];
    return null;
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

// 3. 네이버 사전에서 뜻 일괄 조회
const meaningMap = new Map();
let fetched = 0;
const total = uniqueWords.size;

for (const word of uniqueWords) {
  fetched++;
  const meaning = await fetchNaverMeaning(word);
  if (meaning) {
    meaningMap.set(word, meaning);
  }
  if (fetched % 50 === 0 || fetched === total) {
    process.stdout.write(`\r네이버 사전 조회 중... ${fetched}/${total} (${meaningMap.size}개 뜻 확인)`);
  }
  // rate limit 방지
  await new Promise((r) => setTimeout(r, 100));
}

console.log(`\n네이버 사전에서 ${meaningMap.size}/${total}개 뜻 확인 완료\n`);

// 4. 그룹별 단어 뜻 교체
let totalUpdated = 0;
let groupsUpdated = 0;

for (const group of groups) {
  const words = group.words || [];
  let updatedCount = 0;

  const updatedWords = words.map((w) => {
    const newMeaning = meaningMap.get(w.word.toLowerCase());
    if (newMeaning && newMeaning !== w.korean) {
      updatedCount++;
      totalUpdated++;
      return { ...w, korean: newMeaning };
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
      console.log(`  ${group.name}: ${updatedCount}개 단어 뜻 업데이트`);
    }
  }
}

console.log(`\n완료! ${groupsUpdated}개 그룹에서 총 ${totalUpdated}개 단어 뜻 업데이트됨`);
