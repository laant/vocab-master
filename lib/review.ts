import { WordData, ReviewLevel } from '@/types';
import { getAllProgress, getSessions } from './storage';

interface GroupedWord {
  wordData: WordData;
  accuracy: number;
  group: ReviewLevel;
}

// 정답률 계산
function calcAccuracy(correct: number, wrong: number): number {
  const total = correct + wrong;
  if (total === 0) return 0;
  return (correct / total) * 100;
}

// 정답률로 그룹 분류
function classifyGroup(accuracy: number): ReviewLevel {
  if (accuracy <= 30) return 'hard';
  if (accuracy >= 70) return 'easy';
  return 'medium';
}

// 그룹 채우기 우선순위 (현재 레벨 → 인접 → 나머지)
function getFillOrder(level: ReviewLevel): ReviewLevel[] {
  switch (level) {
    case 'hard': return ['hard', 'medium', 'easy'];
    case 'medium': return ['medium', 'hard', 'easy'];
    case 'easy': return ['easy', 'medium', 'hard'];
  }
}

// 모든 학습된 단어를 그룹별로 분류
export function getGroupedWords(): GroupedWord[] {
  const progress = getAllProgress();
  const sessions = getSessions();

  // 세션에서 최신 WordData 매핑
  const wordDataMap = new Map<string, WordData>();
  for (const s of sessions) {
    for (const w of s.words) {
      wordDataMap.set(w.word, w);
    }
  }

  const grouped: GroupedWord[] = [];
  for (const p of progress) {
    const wordData = wordDataMap.get(p.word);
    if (!wordData) continue;
    const accuracy = calcAccuracy(p.correctCount, p.wrongCount);
    grouped.push({
      wordData,
      accuracy,
      group: classifyGroup(accuracy),
    });
  }

  return grouped;
}

// 복습 단어 10개 선정
export function selectReviewWords(level: ReviewLevel): WordData[] {
  const allGrouped = getGroupedWords();
  if (allGrouped.length < 10) return [];

  const fillOrder = getFillOrder(level);
  const selected: WordData[] = [];
  const usedWords = new Set<string>();

  for (const group of fillOrder) {
    if (selected.length >= 10) break;

    // 해당 그룹의 단어를 셔플해서 추가
    const groupWords = allGrouped
      .filter((w) => w.group === group && !usedWords.has(w.wordData.word))
      .sort(() => Math.random() - 0.5);

    for (const w of groupWords) {
      if (selected.length >= 10) break;
      selected.push(w.wordData);
      usedWords.add(w.wordData.word);
    }
  }

  return selected;
}

// 각 그룹별 단어 수 조회
export function getGroupCounts(): Record<ReviewLevel, number> {
  const allGrouped = getGroupedWords();
  const counts: Record<ReviewLevel, number> = { hard: 0, medium: 0, easy: 0 };
  for (const w of allGrouped) {
    counts[w.group]++;
  }
  return counts;
}

// 복습 정답률에 따라 레벨 조정
export function adjustReviewLevel(currentLevel: ReviewLevel, accuracy: number): ReviewLevel {
  if (accuracy < 50) {
    // 레벨 다운 (어려운 → 쉬운)
    if (currentLevel === 'hard') return 'medium';
    if (currentLevel === 'medium') return 'easy';
    return 'easy';
  }
  if (accuracy >= 90) {
    // 레벨 업 (쉬운 → 어려운)
    if (currentLevel === 'easy') return 'medium';
    if (currentLevel === 'medium') return 'hard';
    return 'hard';
  }
  return currentLevel;
}
