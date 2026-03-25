"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAllProgress, getSessions, saveSession, setCurrentSession, generateSessionId, getBattleWrongWords } from "@/lib/storage";
import { getMyBattleWrongWords } from "@/lib/battle";
import { supabase } from "@/lib/supabase";
import { WordData } from "@/types";

interface WrongWordItem {
  word: string;
  korean: string;
  wrongCount: number;
  correctCount: number;
  lastStudied: string;
  mastered: boolean;
  sources: ("battle" | "study")[];
  wordData: WordData | null;
}

export default function WrongWordsClient() {
  const router = useRouter();
  const [items, setItems] = useState<WrongWordItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const allProgress = getAllProgress();
      const sessions = getSessions();

      const koreanMap = new Map<string, string>();
      const wordDataMap = new Map<string, WordData>();
      for (const s of sessions) {
        for (const w of s.words) {
          if (w.korean && !koreanMap.has(w.word)) koreanMap.set(w.word, w.korean);
          if (!wordDataMap.has(w.word)) wordDataMap.set(w.word, w);
        }
      }

      const mergedMap = new Map<string, WrongWordItem>();
      for (const p of allProgress) {
        if (p.wrongCount > 0) {
          mergedMap.set(p.word.toLowerCase(), {
            word: p.word,
            korean: koreanMap.get(p.word) || "",
            wrongCount: p.wrongCount,
            correctCount: p.correctCount,
            lastStudied: p.lastStudied,
            mastered: p.mastered,
            sources: ["study"],
            wordData: wordDataMap.get(p.word) || null,
          });
        }
      }

      let battleWrongWords: { word: string; korean: string; count: number }[] = [];
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        battleWrongWords = await getMyBattleWrongWords(user.id).catch(() => []);
      }

      const localBattleWrong = getBattleWrongWords();
      const battleMap = new Map<string, { korean: string; count: number }>();
      for (const w of battleWrongWords) {
        battleMap.set(w.word.toLowerCase(), { korean: w.korean, count: w.count });
      }
      for (const w of localBattleWrong) {
        const key = w.word.toLowerCase();
        const existing = battleMap.get(key);
        if (existing) {
          existing.count = Math.max(existing.count, w.count);
        } else {
          battleMap.set(key, { korean: w.korean, count: w.count });
        }
      }

      for (const [key, bw] of battleMap) {
        const existing = mergedMap.get(key);
        if (existing) {
          existing.wrongCount += bw.count;
          if (!existing.korean && bw.korean) existing.korean = bw.korean;
          if (!existing.sources.includes("battle")) existing.sources.push("battle");
        } else {
          mergedMap.set(key, {
            word: key,
            korean: bw.korean,
            wrongCount: bw.count,
            correctCount: 0,
            lastStudied: "",
            mastered: false,
            sources: ["battle"],
            wordData: null,
          });
        }
      }

      const sorted = Array.from(mergedMap.values()).sort((a, b) => b.wrongCount - a.wrongCount);
      setItems(sorted);
      setLoading(false);
    }

    load();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
        <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">
          sentiment_satisfied
        </span>
        <p className="text-slate-400 text-lg mb-2">오답 단어가 없어요!</p>
        <p className="text-slate-400 text-sm mb-6">배틀이나 학습을 완료하면 여기에 기록됩니다.</p>
        <Link
          href="/battle"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold hover:opacity-90 transition-opacity"
        >
          배틀 시작하기
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      {items.some(item => item.wordData) && (
        <button
          onClick={handleStartReview}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity mb-6"
        >
          오답 단어로 학습 시작
          <span className="material-symbols-outlined">play_arrow</span>
        </button>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.word}
            className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 text-red-400">
                <span className="text-sm font-bold">{item.wrongCount}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">{item.word}</h3>
                  {item.mastered && (
                    <span className="px-2 py-0.5 bg-green-50 text-green-600 text-xs font-bold rounded-full">
                      mastered
                    </span>
                  )}
                  {item.sources.map(src => (
                    <span
                      key={src}
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                        src === "battle"
                          ? "bg-orange-100 text-orange-600"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {src === "battle" ? "배틀" : "학습"}
                    </span>
                  ))}
                </div>
                {item.korean && (
                  <p className="text-slate-500 text-sm">{item.korean}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">
                {item.lastStudied
                  ? new Date(item.lastStudied).toLocaleDateString("ko-KR")
                  : ""}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-green-500">{item.correctCount}회 정답</span>
                <span className="text-xs text-slate-300">|</span>
                <span className="text-xs text-red-400">{item.wrongCount}회 오답</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
