import { WordData, WordProgress } from '@/types';
import { getAllProgress, getSessions } from './storage';

// 간격 반복 스케줄 (correctCount → 일 수)
const INTERVALS = [1, 3, 7, 14, 30];

/**
 * 다음 복습 날짜 계산
 * - 정답: correctCount에 따라 간격 증가
 * - 오답: 1일 후 재복습
 */
export function calcNextReview(correctCount: number, isCorrect: boolean): string {
  const now = new Date();

  if (!isCorrect) {
    // 오답 시 1일 후
    now.setDate(now.getDate() + 1);
    return now.toISOString();
  }

  // 정답 시 correctCount 기반 간격
  const idx = Math.min(correctCount - 1, INTERVALS.length - 1);
  const days = idx >= 0 ? INTERVALS[idx] : 1;
  now.setDate(now.getDate() + days);
  return now.toISOString();
}

/**
 * 오늘 복습해야 할 단어 목록 조회
 * nextReview <= 오늘인 단어를 날짜 오래된 순으로 반환
 */
export function getDueWords(): { wordData: WordData; progress: WordProgress }[] {
  const progress = getAllProgress();
  const sessions = getSessions();

  // 세션에서 최신 WordData 매핑
  const wordDataMap = new Map<string, WordData>();
  for (const s of sessions) {
    for (const w of s.words) {
      wordDataMap.set(w.word, w);
    }
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999); // 오늘 끝까지 포함

  const dueWords: { wordData: WordData; progress: WordProgress }[] = [];

  for (const p of progress) {
    if (!p.nextReview) continue;
    const reviewDate = new Date(p.nextReview);
    if (reviewDate <= today) {
      const wordData = wordDataMap.get(p.word);
      if (wordData) {
        dueWords.push({ wordData, progress: p });
      }
    }
  }

  // 날짜 오래된 순 정렬 (가장 급한 것 먼저)
  dueWords.sort((a, b) =>
    new Date(a.progress.nextReview!).getTime() - new Date(b.progress.nextReview!).getTime()
  );

  return dueWords;
}
