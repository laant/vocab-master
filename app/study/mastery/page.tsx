"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCurrentSession, saveSession, clearCurrentSession, getWordProgress, updateWordProgress, getReviewLevel, setReviewLevel } from "@/lib/storage";
import { adjustReviewLevel } from "@/lib/review";
import { calcNextReview } from "@/lib/spaced-repetition";
import { StudySession, WordData } from "@/types";

export default function MasteryPage() {
  const router = useRouter();
  const [session, setSession] = useState<StudySession | null>(null);
  const [wrongWordData, setWrongWordData] = useState<WordData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [answerState, setAnswerState] = useState<"idle" | "correct" | "wrong">("idle");
  const [masteredCount, setMasteredCount] = useState(0);
  const [masteredInStep5, setMasteredInStep5] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);
  const [isReviewSession, setIsReviewSession] = useState(false);

  // 세션 완료 시 단어별 진도 저장
  // masteredWords: Step 5에서 맞힌 단어 목록
  const saveWordProgressForSession = useCallback((s: StudySession, masteredWords: string[]) => {
    for (const word of s.words) {
      const existing = getWordProgress(word.word);
      const wasWrongInSteps = s.wrongWords.includes(word.word);
      const recoveredInStep5 = masteredWords.includes(word.word);
      // Step 2~4에서 틀리지 않았거나, Step 5에서 맞혔으면 정답 처리
      const isCorrectOverall = !wasWrongInSteps || recoveredInStep5;
      const newCorrectCount = (existing?.correctCount || 0) + (isCorrectOverall ? 1 : 0);
      updateWordProgress({
        word: word.word,
        correctCount: newCorrectCount,
        wrongCount: (existing?.wrongCount || 0) + (isCorrectOverall ? 0 : 1),
        wrongAtSteps: isCorrectOverall
          ? (existing?.wrongAtSteps || [])
          : [...(existing?.wrongAtSteps || []), s.currentStep],
        lastStudied: new Date().toISOString(),
        nextReview: calcNextReview(newCorrectCount, isCorrectOverall),
        mastered: isCorrectOverall,
      });
    }
  }, []);

  useEffect(() => {
    const s = getCurrentSession();
    if (!s) {
      router.push("/study/input");
      return;
    }
    setSession(s);
    const isReview = !!(s.name && s.name.startsWith("복습"));
    setIsReviewSession(isReview);

    // 틀린 단어들 찾기
    const wrongs = s.words.filter((w) => s.wrongWords.includes(w.word));
    if (wrongs.length === 0) {
      // 틀린 단어가 없으면 바로 완료 (모든 단어 정답)
      setCompleted(true);
      setMasteredCount(s.words.length);
      // 진도 저장 — 오답 없으므로 모든 단어가 mastered
      const updated = { ...s, currentStep: 5 };
      saveSession(updated);
      clearCurrentSession();
      saveWordProgressForSession(updated, s.words.map((w) => w.word));
      // 복습 세션이면 레벨 조정 (정답률 100%)
      if (isReview) {
        const newLevel = adjustReviewLevel(getReviewLevel(), 100);
        setReviewLevel(newLevel);
      }
    } else {
      setWrongWordData(wrongs);
    }
  }, [router, saveWordProgressForSession]);

  const handleCheck = useCallback(() => {
    if (!wrongWordData[currentIndex]) return;

    const correct = wrongWordData[currentIndex].word.toLowerCase();
    if (userInput.trim().toLowerCase() === correct) {
      setAnswerState("correct");
      setMasteredCount((prev) => prev + 1);
      setMasteredInStep5((prev) => [...prev, wrongWordData[currentIndex].word]);
    } else {
      setAnswerState("wrong");
    }
  }, [userInput, wrongWordData, currentIndex]);

  if (!session) return null;

  const handleNext = () => {
    setUserInput("");
    setAnswerState("idle");

    if (currentIndex < wrongWordData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCompleted(true);
      // 세션 저장 + 단어별 진도 저장
      const updated = { ...session, currentStep: 5 };
      saveSession(updated);
      clearCurrentSession();
      saveWordProgressForSession(updated, masteredInStep5);
      // 복습 세션이면 레벨 조정
      if (isReviewSession) {
        const totalWords = session.words.length;
        const wrongInSteps = session.wrongWords.length;
        const recoveredInStep5 = masteredInStep5.length;
        const correctOverall = totalWords - wrongInSteps + recoveredInStep5;
        const accuracy = Math.round((correctOverall / totalWords) * 100);
        const newLevel = adjustReviewLevel(getReviewLevel(), accuracy);
        setReviewLevel(newLevel);
      }
    }
  };

  // 완료 화면
  if (completed) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="flex flex-col items-center text-center">
          {/* 트로피 */}
          <div className="w-40 h-40 bg-gradient-to-tr from-yellow-300 via-yellow-500 to-amber-600 rounded-full flex items-center justify-center shadow-2xl shadow-yellow-500/20 mb-8">
            <span
              className="material-symbols-outlined text-white text-7xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              emoji_events
            </span>
          </div>

          <h1 className="text-4xl font-extrabold mb-3">Level Up!</h1>
          <p className="text-slate-500 text-lg mb-8">
            훌륭해요! 이번 학습을 완료했습니다.
          </p>

          {/* 통계 */}
          <div className="grid grid-cols-2 gap-4 w-full mb-8">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-400 text-sm font-semibold uppercase mb-1">학습 단어</p>
              <p className="text-3xl font-bold">{session.words.length}개</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <p className="text-slate-400 text-sm font-semibold uppercase mb-1">마스터</p>
              <p className="text-3xl font-bold text-green-500">
                {session.words.length - session.wrongWords.length + masteredCount}개
              </p>
            </div>
          </div>

          {/* 틀린 단어 목록 (Step 5에서 맞힌 건 제외) */}
          {(() => {
            const stillWrong = session.wrongWords.filter((w) => !masteredInStep5.includes(w));
            return stillWrong.length > 0 ? (
              <div className="bg-primary/5 rounded-xl p-6 border border-primary/20 w-full mb-8">
                <h3 className="font-bold mb-2">오답 단어</h3>
                <div className="flex flex-wrap gap-2">
                  {stillWrong.map((word) => (
                    <span
                      key={word}
                      className="px-3 py-1 bg-white rounded-full text-sm font-medium text-primary border border-primary/20"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {/* 액션 버튼 */}
          <div className="flex flex-col gap-3 w-full">
            {isReviewSession && (
              <button
                onClick={() => router.push("/study/review")}
                className="w-full py-4 rounded-xl bg-amber-500 text-white font-bold text-lg shadow-lg shadow-amber-500/20 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                다른 단어 복습 계속하기
                <span className="material-symbols-outlined">replay</span>
              </button>
            )}
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

  // 오답 복습 퀴즈
  const currentWord = wrongWordData[currentIndex];

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold">Step 5: 최종 확인</h2>
          <p className="text-sm text-slate-500">틀린 단어를 모두 맞혀보세요</p>
        </div>
        <div className="text-sm font-bold text-slate-500">
          {currentIndex + 1} / {wrongWordData.length}
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-8">
        <div
          className="bg-primary h-full transition-all duration-300"
          style={{
            width: `${((currentIndex + 1) / wrongWordData.length) * 100}%`,
          }}
        />
      </div>

      {/* 문제 카드 */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 md:p-12 flex flex-col items-center">
        <p className="text-slate-400 text-sm mb-4">이 뜻의 영단어를 입력하세요</p>

        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-primary">
          {currentWord.korean || currentWord.meanings[0]?.definitions[0]?.definition}
        </h1>
        <p className="text-slate-400 text-sm mb-8">{currentWord.phonetic}</p>

        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && answerState === "idle") handleCheck();
            if (e.key === "Enter" && answerState !== "idle") handleNext();
          }}
          placeholder="영단어를 입력하세요"
          disabled={answerState !== "idle"}
          className="w-full max-w-sm px-6 py-4 rounded-xl border-2 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-center text-xl font-bold transition-all disabled:bg-slate-50"
          autoFocus
        />

        {answerState === "idle" && (
          <button
            onClick={handleCheck}
            disabled={userInput.trim().length === 0}
            className="mt-6 px-8 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            확인
          </button>
        )}

        {answerState !== "idle" && (
          <div className="mt-6 text-center">
            {answerState === "correct" ? (
              <p className="text-green-500 font-bold text-lg mb-4">정답!</p>
            ) : (
              <p className="text-red-500 font-bold text-lg mb-4">
                정답: <span className="text-xl">{currentWord.word}</span>
              </p>
            )}
            <button
              onClick={handleNext}
              className="px-8 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
            >
              {currentIndex < wrongWordData.length - 1 ? "다음" : "결과 보기"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
