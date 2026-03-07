import { supabase } from './supabase';
import { fetchWordData, translateToKorean } from './dictionary-api';
import { WordData } from '@/types';

export const ADMIN_EMAIL = 'lee.junghoon@gmail.com';

export function isAdmin(email: string | undefined): boolean {
  return email === ADMIN_EMAIL;
}

export interface WordGroup {
  id: string;
  name: string;
  words: WordData[];
  raw_words: string[];
  status: 'pending' | 'ready';
  category?: string;
  created_at: string;
}

export interface CategoryMeta {
  id: string;
  name: string;
  is_public: boolean;
  allowed_emails: string[];
  created_at: string;
}

export interface CategoryInfo {
  name: string;
  is_public: boolean;
  groupCount: number;
  totalWords: number;
}

export async function fetchAllGroups(): Promise<WordGroup[]> {
  const { data, error } = await supabase
    .from('word_groups')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as WordGroup[];
}

export async function fetchReadyGroups(): Promise<WordGroup[]> {
  const { data, error } = await supabase
    .from('word_groups')
    .select('*')
    .eq('status', 'ready')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as WordGroup[];
}

// 카테고리 메타데이터 CRUD
export async function fetchAllCategoryMetas(): Promise<CategoryMeta[]> {
  const { data, error } = await supabase
    .from('word_group_categories')
    .select('*')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data as CategoryMeta[];
}

export async function createCategory(name: string, isPublic: boolean, allowedEmails: string[]): Promise<CategoryMeta | null> {
  const { data, error } = await supabase
    .from('word_group_categories')
    .insert({ name, is_public: isPublic, allowed_emails: allowedEmails })
    .select()
    .single();
  if (error) {
    console.error('createCategory error:', error.message);
    return null;
  }
  return data as CategoryMeta;
}

export async function updateCategory(id: string, updates: { is_public?: boolean; allowed_emails?: string[] }): Promise<boolean> {
  const { error } = await supabase
    .from('word_group_categories')
    .update(updates)
    .eq('id', id);
  return !error;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('word_group_categories')
    .delete()
    .eq('id', id);
  return !error;
}

// 사용자에게 보이는 카테고리 목록 (공개 + 권한 있는 비공개)
export async function fetchVisibleCategories(userEmail?: string | null): Promise<CategoryInfo[]> {
  // 1. 카테고리 메타 조회
  const metas = await fetchAllCategoryMetas();

  // 2. 비공개 카테고리 접근 권한 확인
  let teacherEmails: string[] = [];
  if (userEmail) {
    const { data } = await supabase
      .from('teacher_students')
      .select('teacher_email')
      .eq('student_email', userEmail);
    teacherEmails = (data || []).map((d: { teacher_email: string }) => d.teacher_email);
  }

  const visibleCategoryNames: string[] = [];
  const categoryPublicMap = new Map<string, boolean>();

  for (const meta of metas) {
    if (meta.is_public) {
      visibleCategoryNames.push(meta.name);
      categoryPublicMap.set(meta.name, true);
    } else if (userEmail) {
      // 관리자이거나, 허용 이메일에 포함되거나, 허용된 선생님의 학생인 경우
      const isAdminUser = isAdmin(userEmail);
      const isAllowed = meta.allowed_emails.includes(userEmail);
      const hasAllowedTeacher = teacherEmails.some((te) => meta.allowed_emails.includes(te));

      if (isAdminUser || isAllowed || hasAllowedTeacher) {
        visibleCategoryNames.push(meta.name);
        categoryPublicMap.set(meta.name, false);
      }
    }
  }

  // 3. 해당 카테고리의 그룹 수/단어 수 집계
  const groups = await fetchReadyGroups();
  const categoryMap = new Map<string, { groupCount: number; totalWords: number }>();

  for (const group of groups) {
    const cat = group.category;
    if (!cat || !visibleCategoryNames.includes(cat)) continue;
    const existing = categoryMap.get(cat) || { groupCount: 0, totalWords: 0 };
    existing.groupCount++;
    existing.totalWords += group.words?.length || 0;
    categoryMap.set(cat, existing);
  }

  return visibleCategoryNames
    .filter((name) => categoryMap.has(name))
    .map((name) => ({
      name,
      is_public: categoryPublicMap.get(name) ?? true,
      groupCount: categoryMap.get(name)!.groupCount,
      totalWords: categoryMap.get(name)!.totalWords,
    }));
}

export async function fetchGroupsByCategory(category: string): Promise<WordGroup[]> {
  const { data, error } = await supabase
    .from('word_groups')
    .select('*')
    .eq('status', 'ready')
    .eq('category', category)
    .order('name', { ascending: true });
  if (error || !data) return [];
  // 자연 정렬 (Middle Day 1, 2, ... 10, 11)
  return (data as WordGroup[]).sort((a, b) => {
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });
}

export async function createWordGroup(name: string, rawWords: string[], category?: string): Promise<WordGroup | null> {
  const { data, error } = await supabase
    .from('word_groups')
    .insert({ name, raw_words: rawWords, status: 'pending', ...(category ? { category } : {}) })
    .select()
    .single();
  if (error || !data) return null;
  return data as WordGroup;
}

export async function processWordGroup(
  groupId: string,
  onProgress?: (current: number, total: number) => void
): Promise<boolean> {
  // 그룹 조회
  const { data: group, error } = await supabase
    .from('word_groups')
    .select('*')
    .eq('id', groupId)
    .single();
  if (error || !group) return false;

  const rawWords: string[] = group.raw_words;
  const wordDataList: WordData[] = [];

  for (let i = 0; i < rawWords.length; i++) {
    const word = rawWords[i].trim();
    if (!word) continue;

    onProgress?.(i + 1, rawWords.length);

    // Dictionary API + 번역
    const [data, korean] = await Promise.all([
      fetchWordData(word),
      translateToKorean(word),
    ]);

    if (data) {
      wordDataList.push({ ...data, korean });
    } else {
      // API에서 못 찾은 단어는 기본 구조로 추가
      wordDataList.push({
        word,
        phonetic: '',
        phonetics: [],
        meanings: [],
        korean,
      });
    }

    // API rate limit 방지 (200ms 딜레이)
    await new Promise((r) => setTimeout(r, 200));
  }

  // Supabase 업데이트
  const { error: updateError } = await supabase
    .from('word_groups')
    .update({ words: wordDataList, status: 'ready' })
    .eq('id', groupId);

  return !updateError;
}

export async function fetchWordGroup(groupId: string): Promise<WordGroup | null> {
  const { data, error } = await supabase
    .from('word_groups')
    .select('*')
    .eq('id', groupId)
    .single();
  if (error || !data) return null;
  return data as WordGroup;
}

export async function updateWordGroupWords(groupId: string, words: WordData[]): Promise<boolean> {
  const { error } = await supabase
    .from('word_groups')
    .update({ words })
    .eq('id', groupId);
  return !error;
}

export async function deleteWordGroup(groupId: string): Promise<boolean> {
  const { error } = await supabase
    .from('word_groups')
    .delete()
    .eq('id', groupId);
  return !error;
}
