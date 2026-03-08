"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentSession, setCurrentSession } from "@/lib/storage";
import { getFirstDefinition, getAudioUrl } from "@/lib/dictionary-api";
import { StudySession, WordData } from "@/types";
import { playCorrectSound, playWrongSound } from "@/lib/sound";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type AnswerState = "idle" | "correct" | "wrong";

export default function QuizPage() {
  const router = useRouter();
  const [session, setSession] = useState<StudySession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [choices, setChoices] = useState<{ word: WordData; label: string }[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [wrongWords, setWrongWords] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playAudio = useCallback((word: WordData) => {
    const url = getAudioUrl(word);
    if (url) {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play().catch(() => {});
    }
  }, []);

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

  const goNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSelected(null);
    setAnswerState("idle");

    if (!session) return;

    if (currentIndex < session.words.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      generateChoices(session, nextIdx);
      playAudio(session.words[nextIdx]);
    } else {
      const updated = { ...session, currentStep: 3, wrongWords };
      setCurrentSession(updated);
      router.push("/study/recall");
    }
  }, [session, currentIndex, wrongWords, generateChoices, playAudio, router]);

  useEffect(() => {
    const s = getCurrentSession();
    if (!s) {
      router.push("/study/input");
      return;
    }
    setSession(s);
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
  const audioUrl = getAudioUrl(currentWord);

  const handleSelect = (index: number) => {
    if (answerState !== "idle") return;
    setSelected(index);

    const selectedChoice = choices[index];
    const isCorrect = selectedChoice.word.word === currentWord.word;

    if (isCorrect) {
      setAnswerState("correct");
      playCorrectSound();
      timerRef.current = setTimeout(() => {
        setSelected(null);
        setAnswerState("idle");

        if (currentIndex < total - 1) {
          const nextIdx = currentIndex + 1;
          setCurrentIndex(nextIdx);
          generateChoices(session, nextIdx);
          playAudio(session.words[nextIdx]);
        } else {
          const updated = { ...session, currentStep: 3, wrongWords };
          setCurrentSession(updated);
          router.push("/study/recall");
        }
      }, 1000);
    } else {
      setAnswerState("wrong");
      playWrongSound();
      if (!wrongWords.includes(currentWord.word)) {
        setWrongWords((prev) => [...prev, currentWord.word]);
      }
      timerRef.current = setTimeout(() => {
        setSelected(null);
        setAnswerState("idle");
        generateChoices(session, currentIndex);
        playAudio(currentWord);
      }, 3000);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100dvh-60px)] w-full flex-col">
      {/* Progress Section */}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex gap-6 justify-between items-center">
          <p className="text-sm font-medium">Step 2: 뜻 고르기</p>
          <p className="text-primary text-sm font-bold">{currentIndex + 1} / {total}</p>
        </div>
        <div className="rounded-full bg-slate-200 h-2 w-full overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-lg space-y-6">
          {/* 문제 영역 */}
          <div className="relative text-center space-y-2">
            <p className="text-slate-400 text-sm">이 단어의 뜻은?</p>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight">{currentWord.word}</h1>
            <div className="flex items-center justify-center gap-3">
              <span className="text-slate-500 text-lg font-medium">{currentWord.phonetic}</span>
              {audioUrl && (
                <button
                  onClick={() => playAudio(currentWord)}
                  className="bg-primary/10 p-2 rounded-full text-primary hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-2xl">volume_up</span>
                </button>
              )}
            </div>

            {/* O/X 오버레이 */}
            {answerState !== "idle" && (
              <div className="absolute inset-0 flex items-center justify-center animate-[fadeIn_0.2s_ease-out] pointer-events-none">
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
            <div className="text-center animate-[fadeIn_0.2s_ease-out]">
              <p className="text-red-500 font-bold">다시 생각해보세요</p>
              <p className="text-slate-400 text-sm mt-1">3초 후 다시 풀어보세요</p>
            </div>
          )}

          {/* 선택지 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {choices.map((choice, i) => {
              const isCorrectChoice = choice.word.word === currentWord.word;
              let borderClass = "border-slate-200 hover:border-primary";
              let bgClass = "bg-white";

              if (answerState !== "idle") {
                if (answerState === "correct" && isCorrectChoice) {
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
      </main>
    </div>
  );
}
