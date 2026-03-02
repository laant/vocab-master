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
  created_at: string;
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

export async function createWordGroup(name: string, rawWords: string[]): Promise<WordGroup | null> {
  const { data, error } = await supabase
    .from('word_groups')
    .insert({ name, raw_words: rawWords, status: 'pending' })
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
