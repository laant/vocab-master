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

// 기존 카테고리를 word_group_categories 테이블에 등록
console.log('기존 카테고리를 word_group_categories에 등록...');

const { data: existing, error: checkError } = await supabase
  .from('word_group_categories')
  .select('name')
  .eq('name', '중등필수 1200')
  .maybeSingle();

if (checkError && checkError.code !== 'PGRST116') {
  // 테이블이 없으면 안내
  console.error('word_group_categories 테이블이 없습니다.');
  console.log('Supabase Dashboard에서 아래 SQL을 실행해주세요:\n');
  console.log(`CREATE TABLE word_group_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  is_public BOOLEAN DEFAULT true,
  allowed_emails TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화
ALTER TABLE word_group_categories ENABLE ROW LEVEL SECURITY;

-- 모든 인증 사용자가 읽기 가능 (필터링은 앱 레벨)
CREATE POLICY "Anyone can read categories" ON word_group_categories
  FOR SELECT USING (true);

-- 관리자만 쓰기 (서비스 키로 우회)
`);
  process.exit(1);
}

if (existing) {
  console.log('  "중등필수 1200" 이미 존재합니다.');
} else {
  const { error: insertError } = await supabase
    .from('word_group_categories')
    .insert({ name: '중등필수 1200', is_public: true, allowed_emails: [] });

  if (insertError) {
    console.error('  등록 실패:', insertError.message);
  } else {
    console.log('  "중등필수 1200" (공개) 등록 완료');
  }
}

console.log('\n완료!');
