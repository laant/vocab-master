"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAllProgress, getSessions, saveSession, setCurrentSession, generateSessionId } from "@/lib/storage";
import { WordData, WordProgress } from "@/types";

interface WrongWordItem {
  progress: WordProgress;
  korean: string;
  wordData: WordData | null;
}

export default function WrongWordsPage() {
  const router = useRouter();
  const [items, setItems] = useState<WrongWordItem[]>([]);

  useEffect(() => {
    const allProgress = getAllProgress();
    const sessions = getSessions();

    // 세션에서 한글 뜻 + WordData 매핑
    const koreanMap = new Map<string, string>();
    const wordDataMap = new Map<string, WordData>();
    for (const s of sessions) {
      for (const w of s.words) {
        if (w.korean && !koreanMap.has(w.word)) koreanMap.set(w.word, w.korean);
        if (!wordDataMap.has(w.word)) wordDataMap.set(w.word, w);
      }
    }

    // 오답이 있는 단어만 필터, wrongCount 높은 순 정렬
    const wrongItems = allProgress
      .filter((p) => p.wrongCount > 0)
      .sort((a, b) => b.wrongCount - a.wrongCount)
      .map((p) => ({
        progress: p,
        korean: koreanMap.get(p.word) || "",
        wordData: wordDataMap.get(p.word) || null,
      }));

    setItems(wrongItems);
  }, []);

  const handleStartReview = () => {
    const wordDataList = items
      .filter((item) => item.wordData)
      .slice(0, 10)
      .map((item) => item.wordData!);

    if (wordDataList.length === 0) return;

    const session = {
      id: generateSessionId(),
      words: wordDataList,
      currentStep: 1,
      wrongWords: [],
      createdAt: new Date().toISOString(),
    };

    saveSession(session);
    setCurrentSession(session);
    router.push("/study/preview");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* 헤더 */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
          <span className="material-symbols-outlined text-4xl text-red-400">
            auto_stories
          </span>
        </div>
        <h2 className="text-2xl font-bold mb-2">오답 노트</h2>
        <p className="text-slate-500">
          틀렸던 단어들을 모아봤어요. 복습하면 완벽해질 거예요!
        </p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">
            sentiment_satisfied
          </span>
          <p className="text-slate-400 text-lg mb-2">오답 단어가 없어요!</p>
          <p className="text-slate-400 text-sm mb-6">학습을 완료하면 여기에 기록됩니다.</p>
          <Link
            href="/study/input"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-opacity"
          >
            학습 시작하기
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      ) : (
        <>
        {/* 학습 시작 버튼 */}
        <button
          onClick={handleStartReview}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity mb-6"
        >
          오답 단어로 학습 시작
          <span className="material-symbols-outlined">play_arrow</span>
        </button>

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.progress.word}
              className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 text-red-400">
                  <span className="text-sm font-bold">{item.progress.wrongCount}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{item.progress.word}</h3>
                    {item.progress.mastered && (
                      <span className="px-2 py-0.5 bg-green-50 text-green-600 text-xs font-bold rounded-full">
                        mastered
                      </span>
                    )}
                  </div>
                  {item.korean && (
                    <p className="text-slate-500 text-sm">{item.korean}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">
                  {item.progress.lastStudied
                    ? new Date(item.progress.lastStudied).toLocaleDateString("ko-KR")
                    : ""}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-green-500">{item.progress.correctCount}회 정답</span>
                  <span className="text-xs text-slate-300">|</span>
                  <span className="text-xs text-red-400">{item.progress.wrongCount}회 오답</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
}
