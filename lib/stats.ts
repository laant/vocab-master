import { StudySession } from '@/types';

export interface DailyStat {
  date: string;       // MM/DD 형식
  words: number;      // 일별 학습 단어 수
  accuracy: number;   // 일별 정답률 (%)
  cumulative: number; // 누적 단어 수
}

/**
 * 완료 세션에서 최근 14일 일별 통계 계산
 */
export function getDailyStats(sessions: StudySession[]): DailyStat[] {
  const completed = sessions.filter((s) => s.currentStep >= 5);
  if (completed.length === 0) return [];

  // 날짜별 그룹핑
  const byDate = new Map<string, { words: number; correct: number; total: number }>();

  for (const s of completed) {
    const dateKey = new Date(s.createdAt).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const existing = byDate.get(dateKey) || { words: 0, correct: 0, total: 0 };
    existing.words += s.words.length;
    existing.total += s.words.length;
    existing.correct += s.words.length - s.wrongWords.length;
    byDate.set(dateKey, existing);
  }

  // 날짜순 정렬 후 최근 14일
  const sortedEntries = [...byDate.entries()].sort(
    (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
  );
  const recent = sortedEntries.slice(-14);

  // 누적 계산
  let cumulative = 0;
  // 최근 14일 이전의 누적분 계산
  const cutoffIdx = sortedEntries.length - recent.length;
  for (let i = 0; i < cutoffIdx; i++) {
    cumulative += sortedEntries[i][1].words;
  }

  return recent.map(([dateStr, data]) => {
    cumulative += data.words;
    const d = new Date(dateStr);
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      words: data.words,
      accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      cumulative,
    };
  });
}
