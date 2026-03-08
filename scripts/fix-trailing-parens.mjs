import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function stripTrailingParens(text) {
  return text.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

const { data: groups, error } = await supabase
  .from('word_groups')
  .select('*')
  .eq('status', 'ready');

if (error) {
  console.error('조회 실패:', error.message);
  process.exit(1);
}

console.log(`${groups.length}개 그룹 처리 중...\n`);

let totalFixed = 0;
let groupsFixed = 0;

for (const group of groups) {
  const words = group.words || [];
  let fixedCount = 0;

  const updatedWords = words.map((w) => {
    if (!w.korean) return w;
    const cleaned = stripTrailingParens(w.korean);
    if (cleaned !== w.korean) {
      fixedCount++;
      totalFixed++;
      return { ...w, korean: cleaned };
    }
    return w;
  });

  if (fixedCount > 0) {
    const { error: updateError } = await supabase
      .from('word_groups')
      .update({ words: updatedWords })
      .eq('id', group.id);

    if (updateError) {
      console.error(`  ${group.name} 실패:`, updateError.message);
    } else {
      groupsFixed++;
      console.log(`  ${group.name}: ${fixedCount}개 수정`);
    }
  }
}

console.log(`\n완료! ${groupsFixed}개 그룹에서 ${totalFixed}개 단어 뜻 괄호 제거됨`);
