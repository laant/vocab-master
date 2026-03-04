"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getFirstExample } from "@/lib/dictionary-api";
import { processBonusComplete } from "@/lib/gamification";
import { StudySession } from "@/types";

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

  useEffect(() => {
    // 보너스 세션 데이터에서 읽기
    const raw = localStorage.getItem("vocab_bonus_session");
    if (!raw) {
      router.push("/");
      return;
    }
    const s: StudySession = JSON.parse(raw);
    setSession(s);
    buildQuestions(s);
  }, [router, buildQuestions]);

  if (!session || questions.length === 0) return null;

  const total = questions.length;
  const q = questions[currentIndex];

  const handleSelect = (choice: string) => {
    if (answerState !== "idle") return;
    setSelected(choice);

    if (choice === q.answer) {
      setAnswerState("correct");
      setCorrectCount((prev) => prev + 1);
    } else {
      // 오답이지만 기록하지 않음 (보너스 단계)
      setAnswerState("wrong");
    }
  };

  const goNext = () => {
    setSelected(null);
    setAnswerState("idle");

    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 보너스 완료 — XP 지급
      const result = processBonusComplete(correctCount);
      setBonusXp(result.xpGained);
      setCompleted(true);
      localStorage.removeItem("vocab_bonus_session");
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
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 sm:p-8 md:p-12 mb-8">
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
                  {answerState !== "idle" ? q.answer : selected || "?"}
                </span>
              )}
            </span>
          ))}
        </p>
      </div>

      {/* 선택지 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {q.choices.map((choice) => {
          const isCorrect = choice === q.answer;
          let style = "border-slate-200 bg-white hover:border-amber-400";

          if (answerState !== "idle") {
            if (isCorrect) {
              style = "border-green-400 bg-green-50";
            } else if (choice === selected) {
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
              {answerState !== "idle" && isCorrect && (
                <span className="material-symbols-outlined text-green-500 ml-2 text-sm align-middle">
                  check_circle
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 피드백 */}
      {answerState !== "idle" && (
        <div className="text-center">
          {answerState === "correct" ? (
            <p className="text-green-500 font-bold text-lg mb-4">정답! +10 XP</p>
          ) : (
            <p className="text-red-500 font-bold text-lg mb-4">
              정답: {q.answer}
            </p>
          )}
          <button
            onClick={goNext}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold shadow-lg shadow-orange-500/20 hover:opacity-90 transition-opacity"
          >
            {currentIndex < total - 1 ? "다음 문제" : "결과 보기"}
          </button>
        </div>
      )}
    </div>
  );
}
