"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentSession, setCurrentSession } from "@/lib/storage";
import { getFirstDefinition, getAudioUrl } from "@/lib/dictionary-api";
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
    const url = getAudioUrl(word);
    if (url) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play().catch(() => {});
    }
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
    // 첫 단어 자동 재생
    playAudio(s.words[0]);
  }, [router, generateChoices, playAudio]);

  if (!session) return null;

  const currentWord = session.words[currentIndex];
  const total = session.words.length;

  const handleSelect = (index: number) => {
    if (answerState !== "idle") return;
    setSelected(index);

    const selectedChoice = choices[index];
    const isCorrect = selectedChoice.word.word === currentWord.word;

    if (isCorrect) {
      setAnswerState("correct");
    } else {
      setAnswerState("wrong");
      if (!wrongWords.includes(currentWord.word)) {
        setWrongWords((prev) => [...prev, currentWord.word]);
      }
    }
  };

  const goNext = () => {
    setSelected(null);
    setAnswerState("idle");

    if (currentIndex < total - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      generateChoices(session, nextIdx);
      // 다음 단어 자동 재생
      playAudio(session.words[nextIdx]);
    } else {
      const updated = { ...session, currentStep: 5, wrongWords };
      setCurrentSession(updated);
      router.push("/study/mastery");
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

      {/* 문제 카드 — 스피커 아이콘 + 다시 듣기 */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 sm:p-8 md:p-12 text-center mb-8">
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

        {/* 정답/오답 시 단어 공개 */}
        {answerState !== "idle" && (
          <div className="mt-4 animate-[fadeIn_0.3s_ease-out]">
            <p className="text-2xl sm:text-3xl font-bold">{currentWord.word}</p>
            <p className="text-slate-400 text-sm">{currentWord.phonetic}</p>
          </div>
        )}
      </div>

      {/* 선택지 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {choices.map((choice, i) => {
          const isCorrectChoice = choice.word.word === currentWord.word;
          let borderClass = "border-slate-200 hover:border-primary";
          let bgClass = "bg-white";

          if (answerState !== "idle") {
            if (isCorrectChoice) {
              borderClass = "border-green-400";
              bgClass = "bg-green-50";
            } else if (i === selected && !isCorrectChoice) {
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
                {answerState !== "idle" && isCorrectChoice && (
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

      {/* 피드백 & 다음 */}
      {answerState !== "idle" && (
        <div className="text-center">
          {answerState === "correct" ? (
            <p className="text-green-500 font-bold text-lg mb-4">정답!</p>
          ) : (
            <p className="text-red-500 font-bold text-lg mb-4">
              오답! 정답은 &ldquo;{currentWord.korean || getFirstDefinition(currentWord)}&rdquo;
            </p>
          )}
          <button
            onClick={goNext}
            className="px-8 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
          >
            {currentIndex < total - 1 ? "다음 문제" : "최종 확인으로"}
          </button>
        </div>
      )}
    </div>
  );
}
