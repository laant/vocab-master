"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getCurrentSession, setCurrentSession } from "@/lib/storage";
import { getAudioUrl } from "@/lib/dictionary-api";
import { StudySession, WordData } from "@/types";

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

  if (!session) return null;

  const currentWord = session.words[currentIndex];
  const total = session.words.length;

  const blankSlots = slots
    .map((s, i) => ({ ...s, index: i }))
    .filter((s) => s.isBlank);

  const scheduleNext = (newWrongs: string[]) => {
    timerRef.current = setTimeout(() => {
      goNextAuto(session, currentIndex, newWrongs);
    }, 2000);
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
      if (!wrongWords.includes(currentWord.word)) {
        setWrongWords((prev) => [...prev, currentWord.word]);
      }
      // 모든 글자 공개해서 정답 확인
      setSlots(slots.map((s) => ({ ...s, revealed: true })));
      // 3초 후 같은 문제 다시 시작
      timerRef.current = setTimeout(() => {
        setupWord(currentWord.word);
      }, 3000);
      return;
    }

    const nextBlankIdx = currentBlankIdx + 1;
    setCurrentBlankIdx(nextBlankIdx);

    if (nextBlankIdx >= blankSlots.length) {
      setAnswerState("correct");
      scheduleNext(wrongWords);
    }
  };

  const handleHint = () => {
    if (answerState !== "idle") return;
    playAudio(currentWord);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold">Step 3: 스펠링 맞히기</h2>
          <p className="text-sm text-slate-500">빈칸에 알맞은 철자를 채우세요</p>
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

      {/* 메인 카드 */}
      <div className="relative bg-white rounded-2xl shadow-lg border border-slate-200 p-5 sm:p-8 md:p-12 flex flex-col items-center">
        {/* 한글 뜻 */}
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-2">
            {currentWord.korean || "?"}
          </h1>
          <p className="text-slate-400">빈칸의 알파벳을 클릭하세요</p>
        </div>

        {/* 스펠링 슬롯 */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
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
          <div className="flex justify-center gap-3 flex-wrap mb-8">
            {letterBank.map((item, i) => (
              <button
                key={i}
                onClick={() => handleLetterClick(i)}
                disabled={item.used}
                className={`w-14 h-14 rounded-xl border-2 shadow-md flex items-center justify-center text-xl font-bold transition-all ${
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
            className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <span className="material-symbols-outlined">volume_up</span>
            발음 듣기
          </button>
        )}

        {/* 정답 오버레이 */}
        {answerState === "correct" && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl animate-[fadeIn_0.2s_ease-out]">
            <span className="text-green-400 text-[120px] font-bold leading-none select-none" style={{ textShadow: "0 2px 12px rgba(74,222,128,0.3)" }}>O</span>
          </div>
        )}

        {/* 오답 메시지 (오버레이 없이 하단에 표시) */}
        {answerState === "wrong" && (
          <div className="mt-6 text-center animate-[fadeIn_0.2s_ease-out]">
            <p className="text-red-500 font-bold text-lg">단어를 확인하세요</p>
            <p className="text-slate-400 text-sm mt-1">3초 후 다시 풀어보세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
