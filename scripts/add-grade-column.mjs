// word_group_categories 테이블에 grade 컬럼 추가 + 기존 카테고리를 middle로 설정
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// .env.local에서 환경변수 로드
const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach((line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) env[key.trim()] = val.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  // grade 컬럼은 Supabase Dashboard에서 이미 추가됨

  // 2. 기존 모든 카테고리를 middle로 설정
  const { data: categories, error: fetchErr } = await supabase
    .from('word_group_categories')
    .select('id, name, grade');

  if (fetchErr) {
    console.error('카테고리 조회 실패:', fetchErr.message);
    process.exit(1);
  }

  console.log(`카테고리 ${categories.length}개 발견`);

  for (const cat of categories) {
    const { error } = await supabase
      .from('word_group_categories')
      .update({ grade: 'middle' })
      .eq('id', cat.id);

    if (error) {
      console.error(`  ✗ ${cat.name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${cat.name} → middle`);
    }
  }

  console.log('\n완료!');
}

main();
