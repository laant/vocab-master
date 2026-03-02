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
// service_role key (RLS 우회)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// CSV 파싱
const csvPath = resolve(__dirname, '../doc/middle_step.csv');
const csvText = readFileSync(csvPath, 'utf-8');
const lines = csvText.split('\n').slice(1); // 헤더 스킵

const meaningMap = new Map();
for (const line of lines) {
  if (!line.trim()) continue;
  // CSV 파싱: "word,meaning" 또는 "word,"meaning with comma""
  const match = line.match(/^(.+?),(".*"|.*)$/);
  if (!match) continue;
  const word = match[1].trim().toLowerCase();
  let meaning = match[2].trim();
  // 따옴표 제거
  if (meaning.startsWith('"') && meaning.endsWith('"')) {
    meaning = meaning.slice(1, -1);
  }
  meaningMap.set(word, meaning);
}

console.log(`CSV에서 ${meaningMap.size}개 단어-뜻 매핑 로드 완료`);

// 모든 ready 그룹 가져오기
const { data: groups, error: fetchError } = await supabase
  .from('word_groups')
  .select('*')
  .eq('status', 'ready');

if (fetchError) {
  console.error('그룹 조회 실패:', fetchError.message);
  process.exit(1);
}

console.log(`${groups.length}개 ready 그룹 발견\n`);

let totalUpdated = 0;
let totalWords = 0;

for (const group of groups) {
  const words = group.words || [];
  let updatedCount = 0;

  const updatedWords = words.map((w) => {
    totalWords++;
    const csvMeaning = meaningMap.get(w.word.toLowerCase());
    if (csvMeaning && csvMeaning !== w.korean) {
      updatedCount++;
      totalUpdated++;
      console.log(`  [${group.name}] ${w.word}: "${w.korean}" → "${csvMeaning}"`);
      return { ...w, korean: csvMeaning };
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
      console.log(`  ${group.name}: ${updatedCount}개 단어 뜻 업데이트 완료\n`);
    }
  } else {
    console.log(`  ${group.name}: 변경 없음\n`);
  }
}

console.log(`\n완료! 전체 ${totalWords}개 단어 중 ${totalUpdated}개 뜻 업데이트됨`);
