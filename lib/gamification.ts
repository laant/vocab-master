import { GameProfile, Badge, StudySession } from '@/types';
import { getSessions } from './storage';
import { debouncedSync } from './sync';

const STORAGE_KEY = 'vocab_game_profile';

const DEFAULT_PROFILE: GameProfile = {
  xp: 0,
  level: 1,
  streak: 0,
  lastStudyDate: '',
  badges: [],
};

// 배지 정의
export const BADGES: Badge[] = [
  { id: 'first_study', name: '첫 학습', description: '첫 세션 완료', icon: 'star' },
  { id: 'streak_3', name: '3일 연속', description: '3일 연속 학습 달성', icon: 'local_fire_department' },
  { id: 'streak_7', name: '7일 연속', description: '7일 연속 학습 달성', icon: 'whatshot' },
  { id: 'streak_30', name: '30일 연속', description: '30일 연속 학습 달성', icon: 'military_tech' },
  { id: 'words_50', name: '50단어', description: '누적 50단어 학습', icon: 'dictionary' },
  { id: 'words_100', name: '100단어', description: '누적 100단어 학습', icon: 'menu_book' },
  { id: 'perfect', name: '퍼펙트', description: '세션 정답률 100% 달성', icon: 'workspace_premium' },
  { id: 'level_5', name: '레벨 5', description: '레벨 5 달성', icon: 'trending_up' },
  { id: 'level_10', name: '마스터', description: '레벨 10 달성', icon: 'emoji_events' },
];

// 레벨 칭호
export function getLevelTitle(level: number): string {
  if (level >= 10) return '마스터';
  if (level >= 7) return '고수';
  if (level >= 4) return '중수';
  return '초보';
}

// 프로필 로드/저장
export function getGameProfile(): GameProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : { ...DEFAULT_PROFILE };
}

export function saveGameProfile(profile: GameProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  debouncedSync();
}

// XP → 레벨 계산
export function calcLevel(xp: number): { level: number; currentXp: number; requiredXp: number } {
  let level = 1;
  let remaining = xp;

  while (remaining >= level * 100) {
    remaining -= level * 100;
    level++;
  }

  return {
    level,
    currentXp: remaining,
    requiredXp: level * 100,
  };
}

// 오늘 날짜 (YYYY-MM-DD)
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

// 어제 날짜
function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// 스트릭 업데이트
function updateStreak(profile: GameProfile): number {
  const today = getToday();
  if (profile.lastStudyDate === today) {
    return profile.streak; // 같은 날 중복 X
  }
  if (profile.lastStudyDate === getYesterday()) {
    return profile.streak + 1; // 연속
  }
  return 1; // 리셋
}

// 세션 완료 시 게이미피케이션 처리
export function processSessionComplete(
  session: StudySession,
  accuracy: number
): {
  xpGained: number;
  newLevel: number;
  oldLevel: number;
  levelUp: boolean;
  newBadges: Badge[];
  streak: number;
} {
  const profile = getGameProfile();
  const oldLevel = calcLevel(profile.xp).level;

  // 스트릭 업데이트
  const newStreak = updateStreak(profile);
  profile.streak = newStreak;
  profile.lastStudyDate = getToday();

  // XP 계산
  let xpGained = 50; // 기본
  if (accuracy >= 100) xpGained += 30;
  else if (accuracy >= 80) xpGained += 20;
  else if (accuracy >= 60) xpGained += 10;
  xpGained += Math.min(newStreak * 5, 50); // 스트릭 보너스

  profile.xp += xpGained;
  const { level: newLevel } = calcLevel(profile.xp);
  profile.level = newLevel;

  // 배지 체크
  const sessions = getSessions();
  const completedCount = sessions.filter((s) => s.currentStep >= 5).length;
  const totalWords = new Set(sessions.flatMap((s) => s.words.map((w) => w.word))).size;

  const newBadges: Badge[] = [];
  const earned = new Set(profile.badges);

  const checks: [string, boolean][] = [
    ['first_study', completedCount >= 1],
    ['streak_3', newStreak >= 3],
    ['streak_7', newStreak >= 7],
    ['streak_30', newStreak >= 30],
    ['words_50', totalWords >= 50],
    ['words_100', totalWords >= 100],
    ['perfect', accuracy >= 100],
    ['level_5', newLevel >= 5],
    ['level_10', newLevel >= 10],
  ];

  for (const [id, condition] of checks) {
    if (condition && !earned.has(id)) {
      earned.add(id);
      const badge = BADGES.find((b) => b.id === id);
      if (badge) newBadges.push(badge);
    }
  }

  profile.badges = [...earned];
  saveGameProfile(profile);

  return {
    xpGained,
    newLevel,
    oldLevel,
    levelUp: newLevel > oldLevel,
    newBadges,
    streak: newStreak,
  };
}
