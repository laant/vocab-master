"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCurrentSession, setCurrentSession } from "@/lib/storage";
import { getFirstExample } from "@/lib/dictionary-api";
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
  sentence: string; // 빈칸이 포함된 문장
  answer: string;   // 정답 단어
  choices: string[]; // 선택지
}

export default function ContextPage() {
  const router = useRouter();
  const [session, setSession] = useState<StudySession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<"idle" | "correct" | "wrong">("idle");
  const [wrongWords, setWrongWords] = useState<string[]>([]);

  const buildQuestions = useCallback((s: StudySession) => {
    const qs: Question[] = s.words.map((word) => {
      const example = getFirstExample(word);
      let sentence: string;

      if (example) {
        // 예문에서 해당 단어를 ___로 치환
        const regex = new RegExp(`\\b${word.word}\\b`, "gi");
        sentence = example.replace(regex, "______");
        if (sentence === example) {
          // 단어가 예문에 없으면 직접 만듦
          sentence = `The meaning of ______ is "${word.korean || word.meanings[0]?.definitions[0]?.definition || ""}"`;
        }
      } else {
        sentence = `The meaning of ______ is "${word.korean || word.meanings[0]?.definitions[0]?.definition || ""}"`;
      }

      // 선택지: 정답 + 랜덤 3개
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
    const s = getCurrentSession();
    if (!s) {
      router.push("/study/input");
      return;
    }
    setSession(s);
    setWrongWords(s.wrongWords || []);
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
    } else {
      setAnswerState("wrong");
      if (!wrongWords.includes(q.answer)) {
        setWrongWords((prev) => [...prev, q.answer]);
      }
    }
  };

  const goNext = () => {
    setSelected(null);
    setAnswerState("idle");

    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
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
          <h2 className="text-xl font-bold">Step 4: 문장 완성</h2>
          <p className="text-sm text-slate-500">빈칸에 알맞은 단어를 넣으세요</p>
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
                    : "border-primary text-primary"
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
          let style = "border-slate-200 bg-white hover:border-primary";

          if (answerState !== "idle") {
            if (isCorrect) {
              style = "border-green-400 bg-green-50";
            } else if (choice === selected) {
              style = "border-red-400 bg-red-50";
            } else {
              style = "border-slate-100 bg-slate-50 opacity-50";
            }
          } else if (choice === selected) {
            style = "border-primary bg-primary/5";
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
            <p className="text-green-500 font-bold text-lg mb-4">정답!</p>
          ) : (
            <p className="text-red-500 font-bold text-lg mb-4">
              정답: {q.answer}
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
