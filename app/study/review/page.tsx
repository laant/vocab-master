"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getReviewLevel, saveSession, setCurrentSession, generateSessionId } from "@/lib/storage";
import { selectReviewWords, getGroupCounts } from "@/lib/review";
import { WordData, ReviewLevel } from "@/types";

const LEVEL_LABELS: Record<ReviewLevel, { label: string; color: string; bgColor: string; description: string }> = {
  hard: { label: "Hard", color: "text-red-500", bgColor: "bg-red-50 border-red-200", description: "정답률 30% 이하 단어 중심" },
  medium: { label: "Medium", color: "text-amber-500", bgColor: "bg-amber-50 border-amber-200", description: "정답률 30~70% 단어 중심" },
  easy: { label: "Easy", color: "text-green-500", bgColor: "bg-green-50 border-green-200", description: "정답률 70% 이상 단어 중심" },
};

export default function ReviewPage() {
  const router = useRouter();
  const [level, setLevel] = useState<ReviewLevel>("hard");
  const [words, setWords] = useState<WordData[]>([]);
  const [counts, setCounts] = useState<Record<ReviewLevel, number>>({ hard: 0, medium: 0, easy: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const currentLevel = getReviewLevel();
    setLevel(currentLevel);
    setCounts(getGroupCounts());

    const selected = selectReviewWords(currentLevel);
    setWords(selected);
    setReady(true);
  }, []);

  const handleStart = () => {
    if (words.length === 0) return;

    const levelInfo = LEVEL_LABELS[level];
    const session = {
      id: generateSessionId(),
      name: `복습 - ${levelInfo.label}`,
      words,
      currentStep: 1,
      wrongWords: [],
      createdAt: new Date().toISOString(),
    };

    saveSession(session);
    setCurrentSession(session);
    router.push("/study/preview");
  };

  if (!ready) return null;

  const levelInfo = LEVEL_LABELS[level];
  const totalWords = counts.hard + counts.medium + counts.easy;

  if (totalWords < 10) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <span className="material-symbols-outlined text-4xl text-slate-400">info</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">복습할 단어가 부족해요</h2>
          <p className="text-slate-500 mb-6">
            학습 완료한 단어가 10개 이상이어야 복습을 시작할 수 있어요.
            <br />현재 {totalWords}개의 단어가 기록되어 있습니다.
          </p>
          <button
            onClick={() => router.push("/study/input")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-opacity"
          >
            새 학습 시작
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <span className="material-symbols-outlined text-4xl text-primary">replay</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">복습</h2>
        <p className="text-slate-500">기존 학습 단어에서 10개를 자동 선정했어요</p>
      </div>

      {/* 현재 레벨 & 그룹 통계 */}
      <div className={`rounded-xl p-5 border mb-6 ${levelInfo.bgColor}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">trending_up</span>
            <span className="font-bold">복습 레벨</span>
          </div>
          <span className={`font-bold text-lg ${levelInfo.color}`}>{levelInfo.label}</span>
        </div>
        <p className="text-sm text-slate-600 mb-3">{levelInfo.description}</p>
        <div className="flex flex-wrap gap-2 sm:gap-3 text-xs">
          <span className="px-2 py-1 bg-white/70 rounded-full">
            <span className="text-red-500 font-bold">Hard</span> {counts.hard}개
          </span>
          <span className="px-2 py-1 bg-white/70 rounded-full">
            <span className="text-amber-500 font-bold">Medium</span> {counts.medium}개
          </span>
          <span className="px-2 py-1 bg-white/70 rounded-full">
            <span className="text-green-500 font-bold">Easy</span> {counts.easy}개
          </span>
        </div>
      </div>

      {/* 선정된 단어 미리보기 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
        <h3 className="font-bold mb-4">선정된 단어 ({words.length}개)</h3>
        <div className="flex flex-wrap gap-2">
          {words.map((w) => (
            <span
              key={w.word}
              className="px-3 py-1.5 bg-slate-50 rounded-lg text-sm font-medium border border-slate-200"
            >
              {w.word}
              {w.korean && <span className="text-slate-400 ml-1">{w.korean}</span>}
            </span>
          ))}
        </div>
      </div>

      {/* 액션 */}
      <button
        onClick={handleStart}
        disabled={words.length === 0}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        복습 시작
        <span className="material-symbols-outlined">play_arrow</span>
      </button>

      <button
        onClick={() => router.push("/")}
        className="w-full mt-3 py-3 text-slate-500 font-medium hover:text-slate-700 transition-colors"
      >
        돌아가기
      </button>
    </div>
  );
}
