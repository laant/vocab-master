import { supabase } from './supabase';
import { GameProfile, StudySession, WordProgress } from '@/types';
import { calcLevel, getLevelTitle } from './gamification';

export interface StudentStats {
  user_id: string;
  nickname: string;
  level: number;
  levelTitle: string;
  xp: number;
  streak: number;
  badgeCount: number;
  sessions: {
    name: string;
    date: string;
    wordCount: number;
    wrongCount: number;
    accuracy: number;
  }[];
  wrongWords: {
    word: string;
    wrongCount: number;
    correctCount: number;
  }[];
}

// 내가 등록한 선생님 이메일 조회
export async function getMyTeacher(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('teacher_students')
    .select('teacher_email')
    .eq('student_id', user.id)
    .single();

  if (error || !data) return null;
  return data.teacher_email;
}

// 선생님 등록
export async function registerTeacher(teacherEmail: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('teacher_students')
    .upsert(
      { student_id: user.id, teacher_email: teacherEmail.trim().toLowerCase() },
      { onConflict: 'student_id,teacher_email' }
    );

  return !error;
}

// 선생님 등록 해제
export async function removeTeacher(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('teacher_students')
    .delete()
    .eq('student_id', user.id);

  return !error;
}

// 나를 쌤으로 등록한 학생 수 조회 (네비 표시용)
export async function getMyStudentCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return 0;

  const { count, error } = await supabase
    .from('teacher_students')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_email', user.email.toLowerCase());

  if (error) return 0;
  return count || 0;
}

// 나를 쌤으로 등록한 학생 목록 + 통계
export async function getMyStudents(): Promise<StudentStats[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return [];

  // 1. 나를 등록한 학생 ID 목록
  const { data: relations, error: relError } = await supabase
    .from('teacher_students')
    .select('student_id')
    .eq('teacher_email', user.email.toLowerCase());

  if (relError || !relations || relations.length === 0) return [];

  const studentIds = relations.map((r) => r.student_id);

  // 2. 학생들의 프로필 + 학습 데이터 조회
  const { data: userData, error: udError } = await supabase
    .from('user_data')
    .select('user_id, game_profile, sessions, progress, user_profiles(nickname)')
    .in('user_id', studentIds);

  if (udError || !userData) return [];

  return (userData as unknown as {
    user_id: string;
    game_profile: GameProfile;
    sessions: StudySession[];
    progress: WordProgress[];
    user_profiles: { nickname: string } | null;
  }[]).map((row) => {
    const gp = row.game_profile || { xp: 0, level: 1, streak: 0, badges: [] };
    const levelInfo = calcLevel(gp.xp);

    // 완료된 세션만 (currentStep >= 5), 최근 20개
    const completedSessions = (row.sessions || [])
      .filter((s) => s.currentStep >= 5)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20)
      .map((s) => ({
        name: s.name || s.words.slice(0, 3).map((w) => w.word).join(', ') + '...',
        date: s.createdAt,
        wordCount: s.words.length,
        wrongCount: s.wrongWords.length,
        accuracy: s.words.length > 0
          ? Math.round(((s.words.length - s.wrongWords.length) / s.words.length) * 100)
          : 0,
      }));

    // 오답 단어 (wrongCount > 0), 오답 많은 순
    const wrongWords = (row.progress || [])
      .filter((p) => p.wrongCount > 0)
      .sort((a, b) => b.wrongCount - a.wrongCount)
      .slice(0, 30)
      .map((p) => ({
        word: p.word,
        wrongCount: p.wrongCount,
        correctCount: p.correctCount,
      }));

    return {
      user_id: row.user_id,
      nickname: row.user_profiles?.nickname || '익명',
      level: levelInfo.level,
      levelTitle: getLevelTitle(levelInfo.level),
      xp: gp.xp,
      streak: gp.streak,
      badgeCount: (gp.badges || []).length,
      sessions: completedSessions,
      wrongWords,
    };
  });
}
