"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentSession, setCurrentSession } from "@/lib/storage";
import { getAudioUrl } from "@/lib/dictionary-api";
import { StudySession, WordData } from "@/types";
import { playCorrectSound, playWrongSound } from "@/lib/sound";

interface LetterSlot {
  letter: string;
  revealed: boolean;
  isBlank: boolean;
}

export default function RecallPage() {
  const router = useRouter();
  const [session, setSession] = useState<StudySession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slots, setSlots] = useState<LetterSlot[]>([]);
  const [letterBank, setLetterBank] = useState<{ letter: string; used: boolean }[]>([]);
  const [currentBlankIdx, setCurrentBlankIdx] = useState(0);
  const [answerState, setAnswerState] = useState<"idle" | "correct" | "wrong">("idle");
  const [wrongWords, setWrongWords] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleKeyRef = useRef<(key: string) => void>(() => {});

  const playAudio = useCallback((word: WordData) => {
    const url = getAudioUrl(word);
    if (url) {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play().catch(() => {});
    }
  }, []);

  const setupWord = useCallback((word: string) => {
    const letters = word.split("");
    const blankCount = Math.max(1, Math.ceil(letters.length * 0.4));
    const indices = Array.from({ length: letters.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const blankIndices = new Set(indices.slice(0, blankCount));

    const newSlots: LetterSlot[] = letters.map((letter, i) => ({
      letter,
      revealed: !blankIndices.has(i),
      isBlank: blankIndices.has(i),
    }));

    const blankLetters = newSlots
      .filter((s) => s.isBlank)
      .map((s) => s.letter);
    const extraLetters = "abcdefghijklmnopqrstuvwxyz"
      .split("")
      .filter((l) => !blankLetters.includes(l))
      .slice(0, Math.min(2, 4 - blankLetters.length));
    const bank = [...blankLetters, ...extraLetters]
      .sort(() => Math.random() - 0.5)
      .map((letter) => ({ letter, used: false }));

    setSlots(newSlots);
    setLetterBank(bank);
    setCurrentBlankIdx(0);
    setAnswerState("idle");
  }, []);

  const goNextAuto = useCallback((sess: StudySession, idx: number, wrongs: string[]) => {
    if (idx < sess.words.length - 1) {
      const nextIdx = idx + 1;
      setCurrentIndex(nextIdx);
      setupWord(sess.words[nextIdx].word);
    } else {
      const updated = { ...sess, currentStep: 4, wrongWords: wrongs };
      setCurrentSession(updated);
      router.push("/study/listening");
    }
  }, [setupWord, router]);

  useEffect(() => {
    const s = getCurrentSession();
    if (!s) {
      router.push("/study/input");
      return;
    }
    setSession(s);
    setWrongWords(s.wrongWords || []);
    setupWord(s.words[0].word);
  }, [router, setupWord]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // 키보드 알파벳으로 글자 선택
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        handleKeyRef.current(e.key.toLowerCase());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!session) return null;

  const currentWord = session.words[currentIndex];
  const total = session.words.length;

  const blankSlots = slots
    .map((s, i) => ({ ...s, index: i }))
    .filter((s) => s.isBlank);

  const scheduleNext = (newWrongs: string[]) => {
    timerRef.current = setTimeout(() => {
      goNextAuto(session, currentIndex, newWrongs);
    }, 1000);
  };

  const handleLetterClick = (bankIdx: number) => {
    if (answerState !== "idle") return;
    if (letterBank[bankIdx].used) return;
    if (currentBlankIdx >= blankSlots.length) return;

    const targetSlot = blankSlots[currentBlankIdx];
    const clickedLetter = letterBank[bankIdx].letter;

    const newSlots = [...slots];
    newSlots[targetSlot.index] = {
      ...newSlots[targetSlot.index],
      revealed: true,
    };
    setSlots(newSlots);

    const newBank = [...letterBank];
    newBank[bankIdx] = { ...newBank[bankIdx], used: true };
    setLetterBank(newBank);

    if (clickedLetter !== targetSlot.letter) {
      setAnswerState("wrong");
      playWrongSound();
      if (!wrongWords.includes(currentWord.word)) {
        setWrongWords((prev) => [...prev, currentWord.word]);
      }
      setSlots(slots.map((s) => ({ ...s, revealed: true })));
      timerRef.current = setTimeout(() => {
        setupWord(currentWord.word);
      }, 3000);
      return;
    }

    const nextBlankIdx = currentBlankIdx + 1;
    setCurrentBlankIdx(nextBlankIdx);

    if (nextBlankIdx >= blankSlots.length) {
      setAnswerState("correct");
      playCorrectSound();
      scheduleNext(wrongWords);
    }
  };

  const handleHint = () => {
    if (answerState !== "idle") return;
    playAudio(currentWord);
  };

  // 키보드 알파벳 → letterBank에서 미사용 첫 매치 클릭
  handleKeyRef.current = (key: string) => {
    if (answerState !== "idle") return;
    const bankIdx = letterBank.findIndex((item) => !item.used && item.letter === key);
    if (bankIdx !== -1) {
      handleLetterClick(bankIdx);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100dvh-60px)] w-full flex-col">
      {/* Progress Section */}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex gap-6 justify-between items-center">
          <p className="text-sm font-medium">Step 3: 스펠링 맞히기</p>
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
        <div className="relative w-full max-w-lg text-center space-y-8">
          {/* 한글 뜻 */}
          <div className="space-y-2">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 w-full max-w-sm mx-auto">
              <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">Meaning</p>
              <p className="text-2xl sm:text-3xl font-bold leading-tight">
                {currentWord.korean || "?"}
              </p>
            </div>
            <p className="text-slate-400 text-sm pt-2">빈칸의 알파벳을 클릭하세요</p>
          </div>

          {/* 스펠링 슬롯 */}
          <div className="flex flex-wrap justify-center gap-2">
            {slots.map((slot, i) => {
              const blankOrder = blankSlots.findIndex((b) => b.index === i);
              const isCurrentTarget =
                slot.isBlank && blankOrder === currentBlankIdx && answerState === "idle";

              return (
                <div
                  key={i}
                  className={`w-12 h-14 md:w-14 md:h-16 flex items-center justify-center rounded-lg border-2 text-2xl font-bold transition-all ${
                    slot.isBlank && !slot.revealed
                      ? isCurrentTarget
                        ? "border-dashed border-primary bg-primary/5 text-primary animate-pulse"
                        : "border-slate-200 text-slate-300"
                      : slot.isBlank && slot.revealed
                      ? answerState === "wrong"
                        ? "border-red-300 bg-red-50 text-red-500"
                        : "border-green-300 bg-green-50 text-green-600"
                      : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  {slot.revealed ? slot.letter : "_"}
                </div>
              );
            })}
          </div>

          {/* 글자 뱅크 */}
          {answerState === "idle" && (
            <div className="flex justify-center gap-3 flex-wrap">
              {letterBank.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleLetterClick(i)}
                  disabled={item.used}
                  className={`w-14 h-14 rounded-xl border-2 shadow-sm flex items-center justify-center text-xl font-bold transition-all ${
                    item.used
                      ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                      : "border-slate-200 bg-white hover:border-primary hover:text-primary"
                  }`}
                >
                  {item.letter}
                </button>
              ))}
            </div>
          )}

          {/* 힌트 (발음 듣기) */}
          {answerState === "idle" && (
            <button
              onClick={handleHint}
              className="bg-primary/10 px-6 py-3 rounded-xl text-primary font-bold hover:bg-primary/20 transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <span className="material-symbols-outlined text-2xl">volume_up</span>
              발음 듣기
            </button>
          )}

          {/* 정답 오버레이 */}
          {answerState === "correct" && (
            <div className="absolute inset-0 flex items-center justify-center animate-[fadeIn_0.2s_ease-out] pointer-events-none">
              <span className="text-green-400 text-[120px] font-bold leading-none select-none" style={{ textShadow: "0 2px 12px rgba(74,222,128,0.3)" }}>O</span>
            </div>
          )}

          {/* 오답 메시지 */}
          {answerState === "wrong" && (
            <div className="text-center animate-[fadeIn_0.2s_ease-out]">
              <p className="text-red-500 font-bold">단어를 확인하세요</p>
              <p className="text-slate-400 text-sm mt-1">3초 후 다시 풀어보세요</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
