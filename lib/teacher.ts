import { supabase } from './supabase';
import { GameProfile, StudySession, WordProgress } from '@/types';
import { calcLevel, getLevelTitle } from './gamification';
import { GradeTier, BattleWrongWord, GRADE_TIER_LABELS } from './battle';

export interface StudentBattleInfo {
  totalBattles: number;
  bestScores: Record<GradeTier, number>;
  recentBattles: {
    grade_tier: GradeTier;
    score: number;
    correct_count: number;
    total_count: number;
    wrong_words: BattleWrongWord[];
    created_at: string;
  }[];
  battleWrongWords: { word: string; korean: string; count: number }[];
}

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
    completed: boolean;
  }[];
  lastStudyDate: string | null;
  wrongWords: {
    word: string;
    wrongCount: number;
    correctCount: number;
  }[];
  battle: StudentBattleInfo;
}

// 내가 등록한 선생님 이메일 목록 조회
export async function getMyTeachers(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('teacher_students')
    .select('teacher_email')
    .eq('student_id', user.id);

  if (error || !data) return [];
  return data.map((d: { teacher_email: string }) => d.teacher_email);
}

// 선생님 등록 (여러 명 가능)
export async function registerTeacher(teacherEmail: string): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return '로그인이 필요합니다';

  const { error } = await supabase
    .from('teacher_students')
    .insert({
      student_id: user.id,
      student_email: user.email || '',
      teacher_email: teacherEmail.trim().toLowerCase(),
    });

  if (error) {
    if (error.message.includes('duplicate')) {
      return '이미 등록된 선생님입니다';
    }
    console.error('선생님 등록 실패:', error);
    return error.message;
  }
  return null; // 성공
}

// 선생님 1명 등록 해제
export async function removeTeacher(teacherEmail: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('teacher_students')
    .delete()
    .eq('student_id', user.id)
    .eq('teacher_email', teacherEmail);

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

  // 1. 나를 등록한 학생 ID + 이메일 목록
  const { data: relations, error: relError } = await supabase
    .from('teacher_students')
    .select('student_id, student_email')
    .eq('teacher_email', user.email.toLowerCase());

  if (relError || !relations || relations.length === 0) return [];

  const studentIds = relations.map((r: { student_id: string }) => r.student_id);
  const emailMap = new Map<string, string>();
  relations.forEach((r: { student_id: string; student_email: string }) => {
    emailMap.set(r.student_id, r.student_email || '');
  });

  // 2. 학생들의 학습 데이터 조회 (없을 수 있음)
  const { data: userData } = await supabase
    .from('user_data')
    .select('user_id, game_profile, sessions, progress')
    .in('user_id', studentIds);

  const userDataMap = new Map<string, {
    game_profile: GameProfile;
    sessions: StudySession[];
    progress: WordProgress[];
  }>();
  ((userData || []) as unknown as {
    user_id: string;
    game_profile: GameProfile;
    sessions: StudySession[];
    progress: WordProgress[];
  }[]).forEach((row) => {
    userDataMap.set(row.user_id, row);
  });

  // 3. 닉네임 별도 조회
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, nickname')
    .in('user_id', studentIds);

  const nicknameMap = new Map<string, string>();
  (profiles || []).forEach((p: { user_id: string; nickname: string }) => {
    nicknameMap.set(p.user_id, p.nickname);
  });

  // 4. 배틀 데이터 조회
  const { data: battleData } = await supabase
    .from('battle_scores')
    .select('user_id, grade_tier, score, max_combo, correct_count, total_count, wrong_words, created_at')
    .in('user_id', studentIds)
    .order('created_at', { ascending: false });

  interface BattleRow {
    user_id: string;
    grade_tier: string;
    score: number;
    max_combo: number;
    correct_count: number;
    total_count: number;
    wrong_words: unknown;
    created_at: string;
  }
  const battleMap = new Map<string, BattleRow[]>();
  for (const row of (battleData || []) as BattleRow[]) {
    const existing = battleMap.get(row.user_id) || [];
    existing.push(row);
    battleMap.set(row.user_id, existing);
  }

  // 5. 모든 학생 ID 기준으로 결과 생성 (user_data 없어도 포함)
  return studentIds.map((studentId: string) => {
    const row = userDataMap.get(studentId);
    const gp = row?.game_profile || { xp: 0, level: 1, streak: 0, badges: [] };
    const levelInfo = calcLevel(gp.xp);

    // 전체 세션, 최근순 정렬
    const allSessions = (row?.sessions || [])
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((s) => ({
        name: s.name || s.words.slice(0, 3).map((w) => w.word).join(', ') + '...',
        date: s.createdAt,
        wordCount: s.words.length,
        wrongCount: s.wrongWords.length,
        accuracy: s.words.length > 0
          ? Math.round(((s.words.length - s.wrongWords.length) / s.words.length) * 100)
          : 0,
        completed: s.currentStep >= 5,
      }));

    const lastStudyDate = allSessions.length > 0 ? allSessions[0].date : null;

    // 오답 단어 (wrongCount > 0), 오답 많은 순
    const wrongWords = (row?.progress || [])
      .filter((p) => p.wrongCount > 0)
      .sort((a, b) => b.wrongCount - a.wrongCount)
      .slice(0, 30)
      .map((p) => ({
        word: p.word,
        wrongCount: p.wrongCount,
        correctCount: p.correctCount,
      }));

    // 배틀 데이터 처리
    const studentBattles = battleMap.get(studentId) || [];
    const bestScores: Record<GradeTier, number> = { all: 0, high_below: 0, middle_only: 0 };
    const battleWrongFreq = new Map<string, { korean: string; count: number }>();

    for (const b of studentBattles) {
      const tier = b.grade_tier as GradeTier;
      if (b.score > (bestScores[tier] || 0)) bestScores[tier] = b.score;
      const ww = b.wrong_words as BattleWrongWord[] | null;
      if (ww) {
        for (const w of ww) {
          const key = w.word.toLowerCase();
          const e = battleWrongFreq.get(key);
          if (e) e.count++; else battleWrongFreq.set(key, { korean: w.korean, count: 1 });
        }
      }
    }

    const battleInfo: StudentBattleInfo = {
      totalBattles: studentBattles.length,
      bestScores,
      recentBattles: studentBattles.slice(0, 5).map(b => ({
        grade_tier: b.grade_tier as GradeTier,
        score: b.score,
        correct_count: b.correct_count,
        total_count: b.total_count,
        wrong_words: (b.wrong_words as BattleWrongWord[] | null) || [],
        created_at: b.created_at,
      })),
      battleWrongWords: Array.from(battleWrongFreq.entries())
        .map(([word, { korean, count }]) => ({ word, korean, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
    };

    return {
      user_id: studentId,
      nickname: nicknameMap.get(studentId) || emailMap.get(studentId)?.split('@')[0] || '익명',
      level: levelInfo.level,
      levelTitle: getLevelTitle(levelInfo.level),
      xp: gp.xp,
      streak: gp.streak,
      badgeCount: (gp.badges || []).length,
      sessions: allSessions,
      lastStudyDate,
      wrongWords,
      battle: battleInfo,
    };
  });
}
