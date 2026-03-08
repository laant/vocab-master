import { supabase } from './supabase';
import { GameProfile } from '@/types';
import { StudySession } from '@/types';

export interface LeaderboardEntry {
  user_id: string;
  nickname: string;
  xp: number;
  level: number;
  streak: number;
  badges: string[];
  weeklyWords?: number;
}

export interface UserProfile {
  user_id: string;
  nickname: string;
  user_group?: string;
}

// 닉네임 조회
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error || !data) return null;
  return data as UserProfile;
}

// 닉네임 저장
export async function saveUserProfile(nickname: string, userGroup?: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const updates: Record<string, string> = { user_id: user.id, nickname };
  if (userGroup !== undefined) updates.user_group = userGroup;

  const { error } = await supabase
    .from('user_profiles')
    .upsert(updates);
  return !error;
}

// 이번 주 월요일 날짜 (YYYY-MM-DD)
function getMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

interface UserDataRow {
  user_id: string;
  game_profile: GameProfile;
  sessions: StudySession[];
  user_profiles: { nickname: string } | null;
}

// 전체 사용자 데이터 로드 (리더보드용)
async function fetchAllUserData(): Promise<UserDataRow[]> {
  const { data, error } = await supabase
    .from('user_data')
    .select('user_id, game_profile, sessions, user_profiles(nickname)');
  if (error || !data) return [];
  return data as unknown as UserDataRow[];
}

// XP 랭킹
export async function getXpLeaderboard(): Promise<LeaderboardEntry[]> {
  const rows = await fetchAllUserData();
  return rows
    .filter((r) => r.game_profile && r.game_profile.xp > 0)
    .map((r) => ({
      user_id: r.user_id,
      nickname: r.user_profiles?.nickname || '익명',
      xp: r.game_profile.xp,
      level: r.game_profile.level,
      streak: r.game_profile.streak,
      badges: r.game_profile.badges || [],
    }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 50);
}

// 스트릭 랭킹
export async function getStreakLeaderboard(): Promise<LeaderboardEntry[]> {
  const rows = await fetchAllUserData();
  return rows
    .filter((r) => r.game_profile && r.game_profile.streak > 0)
    .map((r) => ({
      user_id: r.user_id,
      nickname: r.user_profiles?.nickname || '익명',
      xp: r.game_profile.xp,
      level: r.game_profile.level,
      streak: r.game_profile.streak,
      badges: r.game_profile.badges || [],
    }))
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 50);
}

// 주간 랭킹 (이번 주 학습 단어 수)
export async function getWeeklyLeaderboard(): Promise<LeaderboardEntry[]> {
  const monday = getMonday();
  const rows = await fetchAllUserData();

  return rows
    .map((r) => {
      const sessions: StudySession[] = r.sessions || [];
      const weeklyWords = sessions
        .filter((s) => s.currentStep >= 5 && s.createdAt >= monday)
        .reduce((sum, s) => sum + s.words.length, 0);

      return {
        user_id: r.user_id,
        nickname: r.user_profiles?.nickname || '익명',
        xp: r.game_profile?.xp || 0,
        level: r.game_profile?.level || 1,
        streak: r.game_profile?.streak || 0,
        badges: r.game_profile?.badges || [],
        weeklyWords,
      };
    })
    .filter((r) => r.weeklyWords > 0)
    .sort((a, b) => (b.weeklyWords || 0) - (a.weeklyWords || 0))
    .slice(0, 50);
}
