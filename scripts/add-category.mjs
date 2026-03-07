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

// 1. category 컬럼 추가 (이미 있으면 무시)
console.log('1. category 컬럼 추가 시도...');
const { error: alterError } = await supabase.rpc('exec_sql', {
  sql: `ALTER TABLE word_groups ADD COLUMN IF NOT EXISTS category TEXT;`
});

if (alterError) {
  // rpc가 없을 수 있으므로 직접 SQL 실행 시도 — Supabase에서는 REST API로는 DDL 불가
  // 대신 Supabase Dashboard에서 수동으로 추가하거나, 이미 추가된 상태라고 가정
  console.log('  DDL 자동 실행 불가 — Supabase Dashboard에서 아래 SQL을 실행해주세요:');
  console.log('  ALTER TABLE word_groups ADD COLUMN IF NOT EXISTS category TEXT;');
  console.log('  계속 진행합니다 (이미 추가되었다면 정상)...\n');
}

// 2. 기존 Middle Day 1~60에 카테고리 설정
console.log('2. Middle Day 그룹에 카테고리 설정...');
const { data: groups, error: fetchError } = await supabase
  .from('word_groups')
  .select('id, name')
  .eq('status', 'ready');

if (fetchError) {
  console.error('그룹 조회 실패:', fetchError.message);
  process.exit(1);
}

console.log(`  ${groups.length}개 ready 그룹 발견`);

let updated = 0;
for (const group of groups) {
  // Middle Day로 시작하는 그룹만 업데이트
  if (group.name && group.name.startsWith('Middle Day')) {
    const { error } = await supabase
      .from('word_groups')
      .update({ category: '중등필수 1200' })
      .eq('id', group.id);

    if (error) {
      console.error(`  ${group.name} 업데이트 실패:`, error.message);
    } else {
      updated++;
      console.log(`  ${group.name} → 중등필수 1200`);
    }
  }
}

console.log(`\n완료! ${updated}개 그룹에 카테고리 설정됨`);
