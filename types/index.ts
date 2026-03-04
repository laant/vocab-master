// 단어 데이터 (Free Dictionary API에서 수집)
export interface WordData {
  word: string;
  phonetic: string;
  phonetics: { text?: string; audio?: string }[];
  meanings: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example?: string;
    }[];
  }[];
  korean: string; // 한글 뜻 (수동 입력 또는 매핑)
  imageUrl?: string;
}

// 학습 세션
export interface StudySession {
  id: string;
  name?: string; // 그룹명 (미입력 시 단어 요약으로 표시)
  words: WordData[];
  currentStep: number; // 0~5
  wrongWords: string[]; // 틀린 단어 목록
  createdAt: string;
}

// 단어별 학습 진도
export interface WordProgress {
  word: string;
  correctCount: number;
  wrongCount: number;
  wrongAtSteps: number[]; // 어떤 단계에서 틀렸는지
  lastStudied: string;
  nextReview?: string; // 간격 반복용
  mastered: boolean;
}

// 게이미피케이션
export interface GameProfile {
  xp: number;
  level: number;
  streak: number;
  lastStudyDate: string; // YYYY-MM-DD
  badges: string[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// 복습 레벨
export type ReviewLevel = 'hard' | 'medium' | 'easy';

// 학습 단계 정보
export type StudyStep = 0 | 1 | 2 | 3 | 4 | 5;

export const STEP_INFO: Record<StudyStep, { title: string; description: string; icon: string }> = {
  0: { title: '단어 입력', description: '학습할 단어 10개를 입력하세요', icon: 'edit_note' },
  1: { title: '노출 및 탐색', description: '카드를 넘기며 가볍게 읽어보세요', icon: 'visibility' },
  2: { title: '뜻 고르기', description: '4개 보기 중 올바른 뜻을 고르세요', icon: 'quiz' },
  3: { title: '스펠링 맞히기', description: '빈칸에 알맞은 철자를 채우세요', icon: 'spellcheck' },
  4: { title: '듣기 퀴즈', description: '발음을 듣고 올바른 뜻을 고르세요', icon: 'headphones' },
  5: { title: '최종 확인', description: '틀린 단어를 모두 맞힐 때까지!', icon: 'emoji_events' },
};
