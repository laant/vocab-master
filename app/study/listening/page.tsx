"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentSession, setCurrentSession } from "@/lib/storage";
import { getFirstDefinition, playWordAudio } from "@/lib/dictionary-api";
import { StudySession, WordData } from "@/types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type AnswerState = "idle" | "correct" | "wrong";

export default function ListeningPage() {
  const router = useRouter();
  const [session, setSession] = useState<StudySession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [choices, setChoices] = useState<{ word: WordData; label: string }[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [wrongWords, setWrongWords] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generateChoices = useCallback(
    (s: StudySession, idx: number) => {
      const currentWord = s.words[idx];
      const correctLabel = currentWord.korean || getFirstDefinition(currentWord);

      const others = s.words
        .filter((_, i) => i !== idx)
        .map((w) => ({
          word: w,
          label: w.korean || getFirstDefinition(w),
        }));
      const wrongChoices = shuffle(others).slice(0, 3);

      const allChoices = shuffle([
        { word: currentWord, label: correctLabel },
        ...wrongChoices,
      ]);
      setChoices(allChoices);
    },
    []
  );

  const playAudio = useCallback((word: WordData) => {
    playWordAudio(word, audioRef);
  }, []);

  useEffect(() => {
    const s = getCurrentSession();
    if (!s) {
      router.push("/study/input");
      return;
    }
    setSession(s);
    setWrongWords(s.wrongWords || []);
    generateChoices(s, 0);
    playAudio(s.words[0]);
  }, [router, generateChoices, playAudio]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!session) return null;

  const currentWord = session.words[currentIndex];
  const total = session.words.length;

  const resetCurrent = () => {
    setSelected(null);
    setAnswerState("idle");
    generateChoices(session, currentIndex);
    playAudio(currentWord);
  };

  const handleSelect = (index: number) => {
    if (answerState !== "idle") return;
    setSelected(index);

    const selectedChoice = choices[index];
    const isCorrect = selectedChoice.word.word === currentWord.word;

    if (isCorrect) {
      setAnswerState("correct");
      // 2초 후 다음 문제
      timerRef.current = setTimeout(() => {
        setSelected(null);
        setAnswerState("idle");
        if (currentIndex < total - 1) {
          const nextIdx = currentIndex + 1;
          setCurrentIndex(nextIdx);
          generateChoices(session, nextIdx);
          playAudio(session.words[nextIdx]);
        } else {
          const updated = { ...session, currentStep: 5, wrongWords };
          setCurrentSession(updated);
          router.push("/study/mastery");
        }
      }, 2000);
    } else {
      setAnswerState("wrong");
      if (!wrongWords.includes(currentWord.word)) {
        setWrongWords((prev) => [...prev, currentWord.word]);
      }
      // 3초 후 같은 문제 다시
      timerRef.current = setTimeout(() => {
        resetCurrent();
      }, 3000);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold">Step 4: 듣기 퀴즈</h2>
          <p className="text-sm text-slate-500">발음을 듣고 올바른 뜻을 고르세요</p>
        </div>
        <div className="text-sm font-bold text-slate-500">
          {currentIndex + 1} / {total}
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-8">
        <div
          className="bg-primary h-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
        />
      </div>

      {/* 문제 카드 — 스피커 아이콘 */}
      <div className="relative bg-white rounded-2xl shadow-lg border border-slate-200 p-5 sm:p-8 md:p-12 text-center mb-8">
        <p className="text-slate-400 text-sm mb-6">발음을 듣고 뜻을 맞혀보세요</p>

        <button
          onClick={() => playAudio(currentWord)}
          className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-xl shadow-primary/30 hover:scale-105 transition-transform mb-6"
        >
          <span
            className="material-symbols-outlined text-white text-5xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            volume_up
          </span>
        </button>

        <button
          onClick={() => playAudio(currentWord)}
          className="text-primary text-sm font-medium hover:underline"
        >
          다시 듣기
        </button>

        {/* 정답 시 단어 공개 */}
        {answerState === "correct" && (
          <div className="mt-4 animate-[fadeIn_0.3s_ease-out]">
            <p className="text-2xl sm:text-3xl font-bold">{currentWord.word}</p>
            <p className="text-slate-400 text-sm">{currentWord.phonetic}</p>
          </div>
        )}

        {/* O/X 오버레이 */}
        {answerState !== "idle" && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl animate-[fadeIn_0.2s_ease-out] pointer-events-none">
            {answerState === "correct" ? (
              <span className="text-green-400 text-[120px] font-bold leading-none select-none" style={{ textShadow: "0 2px 12px rgba(74,222,128,0.3)" }}>O</span>
            ) : (
              <span className="text-red-400 text-[120px] font-bold leading-none select-none" style={{ textShadow: "0 2px 12px rgba(248,113,113,0.3)" }}>X</span>
            )}
          </div>
        )}
      </div>

      {/* 오답 메시지 */}
      {answerState === "wrong" && (
        <div className="text-center mb-4 animate-[fadeIn_0.2s_ease-out]">
          <p className="text-red-500 font-bold text-lg">다시 들어보세요</p>
          <p className="text-slate-400 text-sm mt-1">3초 후 다시 풀어보세요</p>
        </div>
      )}

      {/* 선택지 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {choices.map((choice, i) => {
          const isCorrectChoice = choice.word.word === currentWord.word;
          let borderClass = "border-slate-200 hover:border-primary";
          let bgClass = "bg-white";

          if (answerState !== "idle") {
            if (answerState === "correct" && isCorrectChoice) {
              borderClass = "border-green-400";
              bgClass = "bg-green-50";
            } else if (i === selected && !isCorrectChoice) {
              // 오답: 선택한 것만 빨간색, 정답 표시 안 함
              borderClass = "border-red-400";
              bgClass = "bg-red-50";
            } else {
              borderClass = "border-slate-100";
              bgClass = "bg-slate-50 opacity-50";
            }
          } else if (i === selected) {
            borderClass = "border-primary";
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={answerState !== "idle"}
              className={`${bgClass} rounded-xl p-5 border-2 ${borderClass} text-left transition-all`}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                  {i + 1}
                </span>
                <span className="font-medium">{choice.label}</span>
                {answerState === "correct" && isCorrectChoice && (
                  <span className="material-symbols-outlined text-green-500 ml-auto">
                    check_circle
                  </span>
                )}
                {answerState === "wrong" && i === selected && !isCorrectChoice && (
                  <span className="material-symbols-outlined text-red-400 ml-auto">
                    cancel
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
