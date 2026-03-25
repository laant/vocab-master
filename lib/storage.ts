import { StudySession, WordProgress, ReviewLevel } from '@/types';
import { debouncedSync } from './sync';

const STORAGE_KEYS = {
  SESSIONS: 'vocab_sessions',
  PROGRESS: 'vocab_progress',
  CURRENT_SESSION: 'vocab_current_session',
  REVIEW_LEVEL: 'vocab_review_level',
  GAME_PROFILE: 'vocab_game_profile',
  SELECTED_CATEGORY: 'vocab_selected_category',
  BATTLE_WRONG_WORDS: 'vocab_battle_wrong_words',
} as const;

// 세션 관련
export function saveSession(session: StudySession): void {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
  }
  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  debouncedSync();
}

export function getSessions(): StudySession[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
  return data ? JSON.parse(data) : [];
}

export function getCurrentSession(): StudySession | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
  return data ? JSON.parse(data) : null;
}

export function setCurrentSession(session: StudySession): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));
}

export function clearCurrentSession(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
}

// 단어 진도 관련
export function getWordProgress(word: string): WordProgress | null {
  const all = getAllProgress();
  return all.find((p) => p.word === word) || null;
}

export function getAllProgress(): WordProgress[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.PROGRESS);
  return data ? JSON.parse(data) : [];
}

export function updateWordProgress(progress: WordProgress): void {
  const all = getAllProgress();
  const idx = all.findIndex((p) => p.word === progress.word);
  if (idx >= 0) {
    all[idx] = progress;
  } else {
    all.push(progress);
  }
  localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(all));
  debouncedSync();
}

// 복습 레벨 관련
export function getReviewLevel(): ReviewLevel {
  if (typeof window === 'undefined') return 'hard';
  const data = localStorage.getItem(STORAGE_KEYS.REVIEW_LEVEL);
  return (data as ReviewLevel) || 'hard';
}

export function setReviewLevel(level: ReviewLevel): void {
  localStorage.setItem(STORAGE_KEYS.REVIEW_LEVEL, level);
  debouncedSync();
}

// 선택된 카테고리
export function getSelectedCategory(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.SELECTED_CATEGORY);
}

export function setSelectedCategory(category: string): void {
  localStorage.setItem(STORAGE_KEYS.SELECTED_CATEGORY, category);
  debouncedSync();
}

// 배틀 틀린 단어 로컬 캐시
interface BattleWrongWordLocal {
  word: string;
  korean: string;
  count: number;
}

export function appendBattleWrongWords(newWords: { word: string; korean: string }[]): void {
  const existing = getBattleWrongWords();
  const map = new Map<string, BattleWrongWordLocal>();
  for (const w of existing) map.set(w.word.toLowerCase(), w);
  for (const w of newWords) {
    const key = w.word.toLowerCase();
    const e = map.get(key);
    if (e) {
      e.count++;
    } else {
      map.set(key, { word: w.word, korean: w.korean, count: 1 });
    }
  }
  localStorage.setItem(STORAGE_KEYS.BATTLE_WRONG_WORDS, JSON.stringify(Array.from(map.values())));
  debouncedSync();
}

export function getBattleWrongWords(): BattleWrongWordLocal[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.BATTLE_WRONG_WORDS);
  return data ? JSON.parse(data) : [];
}

// 배틀 틀린 단어 → WordProgress로 변환 (기존 복습 시스템 자동 연동)
export function mergeBattleWrongWordsIntoProgress(wrongWords: { word: string; korean: string }[]): void {
  for (const w of wrongWords) {
    const existing = getWordProgress(w.word);
    if (existing) {
      updateWordProgress({
        ...existing,
        wrongCount: existing.wrongCount + 1,
        lastStudied: new Date().toISOString(),
        mastered: false,
      });
    } else {
      updateWordProgress({
        word: w.word,
        correctCount: 0,
        wrongCount: 1,
        wrongAtSteps: [],
        lastStudied: new Date().toISOString(),
        mastered: false,
      });
    }
  }
}

// 유틸리티
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
