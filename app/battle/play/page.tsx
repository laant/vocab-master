"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  fetchBattleWords, submitBattleScore, getMyBestScore,
  saveBattleState, loadBattleSave, clearBattleSave,
  BattleWord, GradeTier, GRADE_TIER_LABELS,
} from "@/lib/battle";
import { playCorrectSound, playWrongSound } from "@/lib/sound";

const TIME_LIMIT = 10;
const COMBO_THRESHOLD = 5;
const CHECKPOINT_INTERVAL = 100;

function BattlePlayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tier = (searchParams.get("tier") || "middle_only") as GradeTier;
  const isResume = searchParams.get("resume") === "1";

  const [userId, setUserId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "countdown" | "playing" | "checkpoint" | "result">("loading");
  const [words, setWords] = useState<BattleWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [answerState, setAnswerState] = useState<"idle" | "correct" | "wrong">("idle");
  const [startTime, setStartTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [countdownNum, setCountdownNum] = useState(3);
  const [comboDisplay, setComboDisplay] = useState(0);
  const [prevElapsed, setPrevElapsed] = useState(0); // 이전 세션 누적 시간

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef(0);

  // 초기화
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        getMyBestScore(user.id, tier).then(setBestScore).catch(() => {});
      }

      // 이어하기
      if (isResume) {
        const saved = loadBattleSave();
        if (saved && saved.tier === tier) {
          setWords(saved.words);
          setCurrentIndex(saved.currentIndex);
          setScore(saved.score);
          setCombo(saved.combo);
          setMaxCombo(saved.maxCombo);
          setCorrectCount(saved.correctCount);
          setPrevElapsed(saved.elapsedSeconds);
          setComboDisplay(saved.combo);
          clearBattleSave();
          setPhase("countdown");
          return;
        }
      }

      // 새 게임
      fetchBattleWords(tier).then((w) => {
        setWords(w);
        setPhase("countdown");
      });
    });
  }, [router, tier, isResume]);

  // 카운트다운
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdownNum <= 0) {
      setPhase("playing");
      setStartTime(Date.now());
      questionStartRef.current = Date.now();
      return;
    }
    const t = setTimeout(() => setCountdownNum((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdownNum]);

  // 타이머
  useEffect(() => {
    if (phase !== "playing" || answerState !== "idle") return;
    setTimeLeft(TIME_LIMIT);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 0.1) {
          clearInterval(timerRef.current!);
          handleTimeout();
          return 0;
        }
        return t - 0.1;
      });
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, currentIndex, answerState]);

  // 발음 자동 재생
  useEffect(() => {
    if (phase !== "playing" || answerState !== "idle") return;
    const w = words[currentIndex];
    if (w?.audioUrl) {
      const audio = new Audio(w.audioUrl);
      audio.play().catch(() => {});
    }
  }, [phase, currentIndex, answerState, words]);

  // 자동 포커스
  useEffect(() => {
    if (phase === "playing" && answerState === "idle") {
      inputRef.current?.focus();
    }
  }, [phase, currentIndex, answerState]);

  const getElapsed = useCallback(() => {
    return prevElapsed + Math.round((Date.now() - startTime) / 1000);
  }, [prevElapsed, startTime]);

  const finishBattle = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const elapsed = getElapsed();
    setTotalTime(elapsed);
    setPhase("result");
    clearBattleSave();

    if (userId) {
      submitBattleScore(tier, score, maxCombo, correctCount, currentIndex + 1, elapsed);
    }
  }, [getElapsed, score, maxCombo, correctCount, currentIndex, userId, tier]);

  const handleTimeout = useCallback(() => {
    playWrongSound();
    setAnswerState("wrong");
    setTimeout(() => finishBattle(), 1500);
  }, [finishBattle]);

  const moveNext = useCallback(() => {
    const nextIndex = currentIndex + 1;

    // 100문제마다 체크포인트
    if (nextIndex > 0 && nextIndex % CHECKPOINT_INTERVAL === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      setCurrentIndex(nextIndex);
      setAnswerState("idle");
      setInput("");
      setPhase("checkpoint");
      return;
    }

    setAnswerState("idle");
    setInput("");
    setCurrentIndex(nextIndex);
    questionStartRef.current = Date.now();
  }, [currentIndex]);

  const handleContinueFromCheckpoint = () => {
    setPhase("playing");
    questionStartRef.current = Date.now();
  };

  const handlePauseAndSave = () => {
    const elapsed = getElapsed();
    saveBattleState({
      tier,
      score,
      combo,
      maxCombo,
      correctCount,
      currentIndex,
      words,
      elapsedSeconds: elapsed,
      savedAt: new Date().toISOString(),
    });
    router.push("/battle");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answerState !== "idle" || phase !== "playing") return;
    if (timerRef.current) clearInterval(timerRef.current);

    const currentWord = words[currentIndex];
    const elapsed = (Date.now() - questionStartRef.current) / 1000;
    const isCorrect = input.trim().toLowerCase() === currentWord.word.toLowerCase();

    if (!isCorrect || elapsed > TIME_LIMIT) {
      playWrongSound();
      setAnswerState("wrong");
      setTimeout(() => finishBattle(), 1500);
      return;
    }

    playCorrectSound();
    setCorrectCount((c) => c + 1);

    if (elapsed <= COMBO_THRESHOLD) {
      const newCombo = combo + 1;
      const points = 10 + combo;
      setCombo(newCombo);
      setMaxCombo((m) => Math.max(m, newCombo));
      setScore((s) => s + points);
      setComboDisplay(newCombo);
    } else {
      setScore((s) => s + 10);
      setCombo(0);
      setComboDisplay(0);
    }

    setAnswerState("correct");
    setTimeout(() => moveNext(), 1000);
  };

  // 로딩
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="material-symbols-outlined text-5xl animate-spin text-primary">progress_activity</span>
        <p className="text-slate-500 font-medium">단어를 불러오는 중...</p>
      </div>
    );
  }

  // 카운트다운
  if (phase === "countdown") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-slate-500 font-bold mb-4">{GRADE_TIER_LABELS[tier]}</p>
        {isResume && currentIndex > 0 && (
          <p className="text-sm text-orange-500 font-bold mb-2">
            #{currentIndex + 1}부터 이어서 시작!
          </p>
        )}
        <div className="text-8xl font-black text-primary animate-pulse">
          {countdownNum || "GO!"}
        </div>
      </div>
    );
  }

  // 체크포인트 (100문제마다)
  if (phase === "checkpoint") {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 text-white mb-4">
            <span className="material-symbols-outlined text-4xl">flag</span>
          </div>
          <h2 className="text-2xl font-bold mb-1">{currentIndex}문제 돌파!</h2>
          <p className="text-slate-500 text-sm mb-6">대단해요! 계속 도전하시겠어요?</p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-primary">{score}<span className="text-sm text-slate-400">점</span></p>
              <p className="text-[10px] text-slate-500">현재 점수</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-2xl font-bold">{correctCount}<span className="text-sm text-slate-400">개</span></p>
              <p className="text-[10px] text-slate-500">연속 정답</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-2xl font-bold">{combo > 0 ? `${combo}x` : "-"}</p>
              <p className="text-[10px] text-slate-500">현재 콤보</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleContinueFromCheckpoint}
              className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-bold text-lg hover:from-red-600 hover:to-orange-600 transition-all"
            >
              계속 도전하기
            </button>
            <button
              onClick={handlePauseAndSave}
              className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              저장하고 나중에 이어하기
            </button>
          </div>

          <p className="text-xs text-slate-400 mt-4">
            저장하면 현재 점수와 콤보가 그대로 유지됩니다
          </p>
        </div>
      </div>
    );
  }

  // 결과 (오답/시간초과로 종료)
  if (phase === "result") {
    const isNewBest = score > bestScore;

    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white mb-4">
            <span className="material-symbols-outlined text-4xl">swords</span>
          </div>
          <h2 className="text-2xl font-bold mb-1">배틀 종료!</h2>
          <p className="text-slate-500 text-sm mb-6">{GRADE_TIER_LABELS[tier]}</p>

          {isNewBest && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 mb-6 inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
              <span className="font-bold text-yellow-700">새로운 최고점수!</span>
            </div>
          )}

          <div className="text-5xl font-black text-primary mb-6">{score}<span className="text-lg text-slate-400">점</span></div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-2xl font-bold">{correctCount}<span className="text-sm text-slate-400">개</span></p>
              <p className="text-[10px] text-slate-500">연속 정답</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-2xl font-bold">{maxCombo}</p>
              <p className="text-[10px] text-slate-500">최대 콤보</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-2xl font-bold">{totalTime}<span className="text-sm text-slate-400">초</span></p>
              <p className="text-[10px] text-slate-500">소요 시간</p>
            </div>
          </div>

          {/* 비로그인 유저: 기록 저장 유도 */}
          {!userId && score > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <p className="text-sm font-bold text-blue-800 mb-1">기록을 저장하시겠어요?</p>
              <p className="text-xs text-blue-600 mb-3">로그인하면 점수가 랭킹에 등록됩니다.</p>
              <button
                onClick={() => {
                  sessionStorage.setItem("vocab_battle_pending", JSON.stringify({
                    tier, score, maxCombo, correctCount, totalCount: currentIndex + 1, timeSeconds: totalTime,
                  }));
                  router.push("/auth?redirect=/battle");
                }}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors"
              >
                로그인하고 기록 저장하기
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setPhase("loading");
                setCurrentIndex(0);
                setInput("");
                setScore(0);
                setCombo(0);
                setMaxCombo(0);
                setCorrectCount(0);
                setCountdownNum(3);
                setComboDisplay(0);
                setAnswerState("idle");
                setPrevElapsed(0);
                fetchBattleWords(tier).then((w) => {
                  setWords(w);
                  setPhase("countdown");
                });
              }}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 transition-colors"
            >
              다시 도전
            </button>
            <button
              onClick={() => router.push(`/battle/rank?tier=${tier}`)}
              className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              랭킹 보기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 플레이
  const currentWord = words[currentIndex];
  const timerPercent = (timeLeft / TIME_LIMIT) * 100;
  const timerColor = timeLeft > 5 ? "bg-green-500" : timeLeft > 3 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* 상단 정보 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-500">#{currentIndex + 1}</span>
          {comboDisplay > 0 && (
            <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs font-bold animate-pulse">
              {comboDisplay}x COMBO
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-primary">{score}</span>
          <span className="text-xs text-slate-400 ml-1">점</span>
        </div>
      </div>

      {/* 타이머 바 */}
      <div className="w-full h-2 bg-slate-200 rounded-full mb-8 overflow-hidden">
        <div
          className={`h-full ${timerColor} rounded-full transition-all duration-100`}
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      {/* 문제 카드 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-8 mb-6 relative overflow-hidden">
        {/* O/X 오버레이 */}
        {answerState !== "idle" && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <span
              className={`text-[120px] font-black ${
                answerState === "correct" ? "text-green-400" : "text-red-400"
              }`}
              style={{ textShadow: "0 4px 24px rgba(0,0,0,0.15)" }}
            >
              {answerState === "correct" ? "O" : "X"}
            </span>
          </div>
        )}

        {/* 한글 뜻 */}
        <p className="text-3xl font-bold text-center mb-3">{currentWord.korean}</p>

        {/* 발음 기호 */}
        {currentWord.phonetic && (
          <p className="text-center text-slate-400 text-lg mb-2">{currentWord.phonetic}</p>
        )}

        {/* 발음 듣기 버튼 */}
        {currentWord.audioUrl && (
          <button
            onClick={() => {
              const audio = new Audio(currentWord.audioUrl!);
              audio.play().catch(() => {});
            }}
            className="mx-auto flex items-center gap-1 text-primary text-sm font-medium mb-4"
          >
            <span className="material-symbols-outlined text-lg">volume_up</span>
            다시 듣기
          </button>
        )}

        {/* 오답 시 정답 표시 */}
        {answerState === "wrong" && (
          <p className="text-center text-red-500 font-bold text-xl mt-2">
            {currentWord.word}
          </p>
        )}
      </div>

      {/* 입력 */}
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="영어 단어를 입력하세요"
            disabled={answerState !== "idle"}
            autoComplete="off"
            autoCapitalize="off"
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 text-center"
          />
          <button
            type="submit"
            disabled={answerState !== "idle" || !input.trim()}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            확인
          </button>
        </div>
      </form>
    </div>
  );
}

export default function BattlePlayPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
      </div>
    }>
      <BattlePlayContent />
    </Suspense>
  );
}
