import { supabase } from './supabase';
import { fetchAllCategoryMetas, fetchGroupsByCategory, CategoryMeta, Grade } from './admin';
import { WordData } from '@/types';

export type GradeTier = 'all' | 'high_below' | 'middle_only';

export const GRADE_TIER_LABELS: Record<GradeTier, string> = {
  all: '통합',
  high_below: '고등이하',
  middle_only: '중등이하',
};

export interface BattleWord {
  word: string;
  korean: string;
  phonetic: string;
  audioUrl: string | null;
}

export interface BattleRankEntry {
  user_id: string;
  nickname: string;
  user_group: string;
  score: number;
  max_combo: number;
  correct_count: number;
  total_count: number;
}

export interface GroupRankEntry {
  group_name: string;
  total_score: number;
  member_count: number;
}

// 등급에 해당하는 grade 목록
function gradesForTier(tier: GradeTier): Grade[] {
  switch (tier) {
    case 'all': return ['middle', 'high', 'normal'];
    case 'high_below': return ['middle', 'high'];
    case 'middle_only': return ['middle'];
  }
}

// 해당 등급의 전체 단어 수집, 중복 제거, 셔플
export async function fetchBattleWords(tier: GradeTier): Promise<BattleWord[]> {
  const grades = gradesForTier(tier);
  const metas = await fetchAllCategoryMetas();
  const filtered = metas.filter((m: CategoryMeta) => grades.includes(m.grade));

  const wordMap = new Map<string, BattleWord>();

  for (const meta of filtered) {
    const groups = await fetchGroupsByCategory(meta.name);
    for (const group of groups) {
      for (const w of group.words) {
        if (!w.korean || wordMap.has(w.word.toLowerCase())) continue;
        const audioUrl = w.phonetics?.find((p) => p.audio)?.audio || null;
        wordMap.set(w.word.toLowerCase(), {
          word: w.word,
          korean: w.korean,
          phonetic: w.phonetic || '',
          audioUrl,
        });
      }
    }
  }

  // 셔플 (Fisher-Yates)
  const words = Array.from(wordMap.values());
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  return words;
}

// 등급별 단어 수 조회 (선택 화면용)
export async function getBattleWordCounts(): Promise<Record<GradeTier, number>> {
  const metas = await fetchAllCategoryMetas();
  const counts: Record<GradeTier, number> = { all: 0, high_below: 0, middle_only: 0 };

  // 카테고리별 단어 수 집계
  const gradeWordCounts: Record<Grade, number> = { middle: 0, high: 0, normal: 0 };

  for (const meta of metas) {
    const groups = await fetchGroupsByCategory(meta.name);
    const wordSet = new Set<string>();
    for (const group of groups) {
      for (const w of group.words) {
        if (w.korean) wordSet.add(w.word.toLowerCase());
      }
    }
    gradeWordCounts[meta.grade] = (gradeWordCounts[meta.grade] || 0) + wordSet.size;
  }

  counts.middle_only = gradeWordCounts.middle;
  counts.high_below = gradeWordCounts.middle + gradeWordCounts.high;
  counts.all = gradeWordCounts.middle + gradeWordCounts.high + gradeWordCounts.normal;

  return counts;
}

// 점수 저장
export async function submitBattleScore(
  tier: GradeTier,
  score: number,
  maxCombo: number,
  correctCount: number,
  totalCount: number,
  timeSeconds: number
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('battle_scores')
    .insert({
      user_id: user.id,
      grade_tier: tier,
      score,
      max_combo: maxCombo,
      correct_count: correctCount,
      total_count: totalCount,
      time_seconds: timeSeconds,
    });

  return !error;
}

// 내 최고점수
export async function getMyBestScore(userId: string, tier: GradeTier): Promise<number> {
  const { data, error } = await supabase
    .from('battle_scores')
    .select('score')
    .eq('user_id', userId)
    .eq('grade_tier', tier)
    .order('score', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return 0;
  return data.score;
}

// 개인별 최고점수 랭킹
export async function getIndividualRanking(tier: GradeTier): Promise<BattleRankEntry[]> {
  // 모든 배틀 점수 조회
  const { data: scores, error } = await supabase
    .from('battle_scores')
    .select('user_id, score, max_combo, correct_count, total_count')
    .eq('grade_tier', tier)
    .order('score', { ascending: false });

  if (error || !scores) return [];

  // 유저별 최고점수만
  const bestMap = new Map<string, { score: number; max_combo: number; correct_count: number; total_count: number }>();
  for (const s of scores) {
    const existing = bestMap.get(s.user_id);
    if (!existing || s.score > existing.score) {
      bestMap.set(s.user_id, s);
    }
  }

  // 프로필 조회
  const userIds = Array.from(bestMap.keys());
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, nickname, user_group')
    .in('user_id', userIds);

  const profileMap = new Map<string, { nickname: string; user_group: string }>();
  for (const p of (profiles || [])) {
    profileMap.set(p.user_id, { nickname: p.nickname || '익명', user_group: p.user_group || '' });
  }

  return Array.from(bestMap.entries())
    .map(([userId, s]) => ({
      user_id: userId,
      nickname: profileMap.get(userId)?.nickname || '익명',
      user_group: profileMap.get(userId)?.user_group || '',
      score: s.score,
      max_combo: s.max_combo,
      correct_count: s.correct_count,
      total_count: s.total_count,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);
}

// 그룹별 합산 랭킹
export async function getGroupRanking(tier: GradeTier): Promise<GroupRankEntry[]> {
  const individuals = await getIndividualRanking(tier);

  const groupMap = new Map<string, { total: number; members: number }>();
  for (const entry of individuals) {
    if (!entry.user_group) continue;
    const existing = groupMap.get(entry.user_group) || { total: 0, members: 0 };
    existing.total += entry.score;
    existing.members++;
    groupMap.set(entry.user_group, existing);
  }

  return Array.from(groupMap.entries())
    .map(([name, data]) => ({
      group_name: name,
      total_score: data.total,
      member_count: data.members,
    }))
    .sort((a, b) => b.total_score - a.total_score);
}
