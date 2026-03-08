"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getFirstExample } from "@/lib/dictionary-api";
import { processBonusComplete } from "@/lib/gamification";
import { StudySession } from "@/types";
import { playCorrectSound, playWrongSound } from "@/lib/sound";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Question {
  sentence: string;
  answer: string;
  choices: string[];
}

export default function ContextPage() {
  const router = useRouter();
  const [session, setSession] = useState<StudySession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<"idle" | "correct" | "wrong">("idle");
  const [correctCount, setCorrectCount] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [bonusXp, setBonusXp] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleKeySelectRef = useRef<(index: number) => void>(() => {});

  const buildQuestions = useCallback((s: StudySession) => {
    const qs: Question[] = s.words.map((word) => {
      const example = getFirstExample(word);
      let sentence: string;

      if (example) {
        const regex = new RegExp(`\\b${word.word}\\b`, "gi");
        sentence = example.replace(regex, "______");
        if (sentence === example) {
          sentence = `The meaning of ______ is "${word.korean || word.meanings[0]?.definitions[0]?.definition || ""}"`;
        }
      } else {
        sentence = `The meaning of ______ is "${word.korean || word.meanings[0]?.definitions[0]?.definition || ""}"`;
      }

      const others = s.words
        .filter((w) => w.word !== word.word)
        .map((w) => w.word);
      const wrongChoices = shuffle(others).slice(0, 3);
      const choices = shuffle([word.word, ...wrongChoices]);

      return { sentence, answer: word.word, choices };
    });
    setQuestions(qs);
  }, []);

  // 같은 문제를 선택지만 다시 섞어서 재출제
  const reshuffleCurrentQuestion = useCallback(() => {
    if (questions.length === 0) return;
    const q = questions[currentIndex];
    const newQuestions = [...questions];
    newQuestions[currentIndex] = { ...q, choices: shuffle(q.choices) };
    setQuestions(newQuestions);
    setSelected(null);
    setAnswerState("idle");
  }, [questions, currentIndex]);

  useEffect(() => {
    const raw = localStorage.getItem("vocab_bonus_session");
    if (!raw) {
      router.push("/");
      return;
    }
    const s: StudySession = JSON.parse(raw);
    setSession(s);
    buildQuestions(s);
  }, [router, buildQuestions]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // 키보드 숫자키 1~4로 선택
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 4) {
        handleKeySelectRef.current(num - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!session || questions.length === 0) return null;

  const total = questions.length;
  const q = questions[currentIndex];

  const goNextQuestion = (currentCorrect: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSelected(null);
    setAnswerState("idle");
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const result = processBonusComplete(currentCorrect);
      setBonusXp(result.xpGained);
      setCompleted(true);
      localStorage.removeItem("vocab_bonus_session");
    }
  };

  const handleSelect = (choice: string) => {
    if (answerState !== "idle") return;
    setSelected(choice);

    if (choice === q.answer) {
      setAnswerState("correct");
      playCorrectSound();
      const newCorrect = correctCount + 1;
      setCorrectCount(newCorrect);
      timerRef.current = setTimeout(() => {
        goNextQuestion(newCorrect);
      }, 1000);
    } else {
      setAnswerState("wrong");
      playWrongSound();
      timerRef.current = setTimeout(() => {
        reshuffleCurrentQuestion();
      }, 3000);
    }
  };

  const handlePass = () => {
    if (answerState !== "idle") return;
    goNextQuestion(correctCount);
  };

  handleKeySelectRef.current = (index: number) => {
    if (index < q.choices.length) {
      handleSelect(q.choices[index]);
    }
  };

  // 보너스 완료 화면
  if (completed) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="flex flex-col items-center text-center">
          <div className="w-32 h-32 bg-gradient-to-tr from-amber-300 via-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-2xl shadow-orange-500/20 mb-8">
            <span
              className="material-symbols-outlined text-white text-6xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              stars
            </span>
          </div>

          <h1 className="text-3xl font-extrabold mb-2">Bonus Clear!</h1>
          <p className="text-slate-500 text-lg mb-8">보너스 문제를 완료했어요!</p>

          <div className="grid grid-cols-2 gap-4 w-full mb-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-400 text-sm font-semibold uppercase mb-1">전체 문제</p>
              <p className="text-3xl font-bold">{total}개</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-400 text-sm font-semibold uppercase mb-1">정답</p>
              <p className="text-3xl font-bold text-green-500">{correctCount}개</p>
            </div>
          </div>

          {bonusXp > 0 && (
            <div className="w-full mb-8 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200 animate-[fadeIn_0.5s_ease-out]">
              <div className="flex items-center justify-center gap-3">
                <span className="material-symbols-outlined text-amber-500 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                <p className="font-bold text-amber-700 text-lg">+{bonusXp} Bonus XP!</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => router.push("/study/input")}
              className="w-full py-4 rounded-xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              새 학습 시작
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 text-slate-500 font-medium hover:text-slate-700 transition-colors"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">Bonus: 문장 완성</h2>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">+XP</span>
          </div>
          <p className="text-sm text-slate-500">빈칸에 알맞은 단어를 넣으세요</p>
        </div>
        <div className="text-sm font-bold text-slate-500">
          {currentIndex + 1} / {total}
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-8">
        <div
          className="bg-amber-400 h-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
        />
      </div>

      {/* 문장 카드 */}
      <div className="relative bg-white rounded-2xl shadow-lg border border-slate-200 p-5 sm:p-8 md:p-12 mb-8">
        <p className="text-slate-400 text-sm mb-6 text-center">빈칸에 들어갈 단어는?</p>
        <p className="text-xl md:text-2xl font-medium text-center leading-relaxed">
          {q.sentence.split("______").map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                <span className={`inline-block min-w-[80px] sm:min-w-[100px] border-b-2 mx-1 px-2 py-1 font-bold ${
                  answerState === "correct"
                    ? "border-green-400 text-green-600"
                    : answerState === "wrong"
                    ? "border-red-400 text-red-500"
                    : "border-amber-400 text-amber-600"
                }`}>
                  {answerState === "correct" ? q.answer : selected || "?"}
                </span>
              )}
            </span>
          ))}
        </p>

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
          <p className="text-red-500 font-bold text-lg">다시 생각해보세요</p>
          <p className="text-slate-400 text-sm mt-1">3초 후 다시 풀어보세요</p>
        </div>
      )}

      {/* PASS 버튼 */}
      {answerState === "idle" && (
        <div className="flex justify-end mb-3">
          <button
            onClick={handlePass}
            className="px-5 py-2 rounded-lg border-2 border-slate-200 text-slate-400 font-bold text-sm hover:border-slate-300 hover:text-slate-500 transition-colors"
          >
            PASS
          </button>
        </div>
      )}

      {/* 선택지 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {q.choices.map((choice) => {
          const isCorrect = choice === q.answer;
          let style = "border-slate-200 bg-white hover:border-amber-400";

          if (answerState !== "idle") {
            if (answerState === "correct" && isCorrect) {
              style = "border-green-400 bg-green-50";
            } else if (choice === selected && !isCorrect) {
              style = "border-red-400 bg-red-50";
            } else {
              style = "border-slate-100 bg-slate-50 opacity-50";
            }
          } else if (choice === selected) {
            style = "border-amber-400 bg-amber-50/50";
          }

          return (
            <button
              key={choice}
              onClick={() => handleSelect(choice)}
              disabled={answerState !== "idle"}
              className={`rounded-xl p-4 border-2 ${style} text-center font-medium transition-all`}
            >
              {choice}
              {answerState === "correct" && isCorrect && (
                <span className="material-symbols-outlined text-green-500 ml-2 text-sm align-middle">
                  check_circle
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
