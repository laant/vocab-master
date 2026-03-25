"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  fetchWordsForGrade, submitBattleScore, getMyBestScore,
  saveBattleState, loadBattleSave, clearBattleSave,
  BattleWord, BattleWrongWord, GradeTier, GRADE_TIER_LABELS,
  GRADE_ORDER, GRADE_LABELS,
} from "@/lib/battle";
import { Grade } from "@/lib/admin";
import { appendBattleWrongWords, mergeBattleWrongWordsIntoProgress } from "@/lib/storage";
import { playCorrectSound, playWrongSound } from "@/lib/sound";

const TIME_LIMIT = 10;
const COMBO_THRESHOLD = 5;
const CHECKPOINT_INTERVAL = 100;
const MAX_LIVES = 3;

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
  const [prevElapsed, setPrevElapsed] = useState(0);

  // 3목숨 시스템
  const [lives, setLives] = useState(MAX_LIVES);
  const [wrongWords, setWrongWords] = useState<BattleWrongWord[]>([]);

  // 등급별 배치 로딩 상태
  const [gradeIndex, setGradeIndex] = useState(0);
  const [questionOffset, setQuestionOffset] = useState(0);
  const [loadingNext, setLoadingNext] = useState(false);
  const [allCleared, setAllCleared] = useState(false);
  const usedWordsRef = useRef<Set<string>>(new Set());

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef(0);

  // 초기화
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        getMyBestScore(user.id, tier).then(setBestScore).catch(() => {});
      }

      // 이어하기
      if (isResume) {
        const saved = loadBattleSave();
        if (saved && saved.tier === tier && Array.isArray(saved.usedWords)) {
          setWords(saved.words);
          setCurrentIndex(0);
          setScore(saved.score);
          setCombo(saved.combo);
          setMaxCombo(saved.maxCombo);
          setCorrectCount(saved.correctCount);
          setPrevElapsed(saved.elapsedSeconds);
          setComboDisplay(saved.combo);
          setGradeIndex(saved.gradeIndex);
          setQuestionOffset(saved.questionOffset);
          setLives(saved.lives ?? MAX_LIVES);
          setWrongWords(saved.wrongWords ?? []);
          usedWordsRef.current = new Set(saved.usedWords);
          clearBattleSave();
          setPhase("countdown");
          return;
        }
      }

      // 새 게임: 첫 등급 단어 로드
      let gi = 0;
      let gradeWords: BattleWord[] = [];
      while (gradeWords.length === 0 && gi < GRADE_ORDER.length) {
        gradeWords = await fetchWordsForGrade(GRADE_ORDER[gi], new Set());
        if (gradeWords.length === 0) gi++;
      }

      gradeWords.forEach(w => usedWordsRef.current.add(w.word.toLowerCase()));
      setWords(gradeWords);
      setGradeIndex(gi);
      setPhase("countdown");
    }

    init();
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

  const finishBattle = useCallback((
    cleared = false,
    finalWrongWords?: BattleWrongWord[],
    finalCorrectCount?: number,
    finalScore?: number,
    finalMaxCombo?: number
  ) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const elapsed = getElapsed();
    setTotalTime(elapsed);
    setAllCleared(cleared);
    setPhase("result");
    clearBattleSave();

    const ww = finalWrongWords ?? wrongWords;
    const cc = finalCorrectCount ?? correctCount;
    const sc = finalScore ?? score;
    const mc = finalMaxCombo ?? maxCombo;
    const total = questionOffset + currentIndex + (cleared ? 0 : 1);

    // 로컬 저장 + WordProgress 변환
    if (ww.length > 0) {
      appendBattleWrongWords(ww);
      mergeBattleWrongWordsIntoProgress(ww);
    }

    if (userId && sc > 0) {
      submitBattleScore(tier, sc, mc, cc, total, elapsed, ww);
    }
  }, [getElapsed, score, maxCombo, correctCount, currentIndex, questionOffset, userId, tier, wrongWords]);

  const handleWrongAnswer = useCallback((userAnswer?: string) => {
    playWrongSound();
    setAnswerState("wrong");

    const currentWord = words[currentIndex];
    const newWrongWord: BattleWrongWord = {
      word: currentWord.word,
      korean: currentWord.korean,
      userAnswer,
    };

    setWrongWords(prev => {
      const updated = [...prev, newWrongWord];

      setLives(prevLives => {
        const newLives = prevLives - 1;
        if (newLives <= 0) {
          // 목숨 소진 → 게임 종료
          setTimeout(() => finishBattle(false, updated), 1500);
        } else {
          // 목숨 남아있음 → 콤보 리셋, 다음 문제
          setCombo(0);
          setComboDisplay(0);
          setTimeout(() => moveNext(), 1500);
        }
        return newLives;
      });

      return updated;
    });
  }, [words, currentIndex, finishBattle]);

  const handleTimeout = useCallback(() => {
    handleWrongAnswer('시간초과');
  }, [handleWrongAnswer]);

  const moveNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    const globalQ = questionOffset + nextIndex;

    // 현재 배치 소진 OR 100문제 체크포인트
    const batchEnd = nextIndex >= words.length;
    const regularCheckpoint = globalQ > 0 && globalQ % CHECKPOINT_INTERVAL === 0;

    if (batchEnd || regularCheckpoint) {
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
  }, [currentIndex, questionOffset, words.length]);

  const handleContinueFromCheckpoint = async () => {
    // 현재 배치에 남은 단어가 있으면 바로 재개
    if (currentIndex < words.length) {
      setPhase("playing");
      questionStartRef.current = Date.now();
      return;
    }

    // 현재 등급 소진 → 다음 등급 로드
    setLoadingNext(true);
    let gi = gradeIndex;
    let newWords: BattleWord[] = [];

    while (newWords.length === 0 && gi < GRADE_ORDER.length - 1) {
      gi++;
      newWords = await fetchWordsForGrade(GRADE_ORDER[gi], usedWordsRef.current);
    }

    setLoadingNext(false);

    if (newWords.length === 0) {
      finishBattle(true);
      return;
    }

    newWords.forEach(w => usedWordsRef.current.add(w.word.toLowerCase()));
    setWords(prev => [...prev, ...newWords]);
    setGradeIndex(gi);
    setPhase("playing");
    questionStartRef.current = Date.now();
  };

  const handlePauseAndSave = () => {
    const elapsed = getElapsed();
    const globalQ = questionOffset + currentIndex;
    saveBattleState({
      tier,
      score, combo, maxCombo, correctCount,
      words: words.slice(currentIndex),
      gradeIndex,
      usedWords: [...usedWordsRef.current],
      questionOffset: globalQ,
      elapsedSeconds: elapsed,
      savedAt: new Date().toISOString(),
      wrongWords,
      lives,
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
      handleWrongAnswer(input.trim() || undefined);
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

  const handleRestart = async () => {
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
    setQuestionOffset(0);
    setAllCleared(false);
    setLives(MAX_LIVES);
    setWrongWords([]);
    usedWordsRef.current = new Set();

    let gi = 0;
    let gradeWords: BattleWord[] = [];
    while (gradeWords.length === 0 && gi < GRADE_ORDER.length) {
      gradeWords = await fetchWordsForGrade(GRADE_ORDER[gi], new Set());
      if (gradeWords.length === 0) gi++;
    }

    gradeWords.forEach(w => usedWordsRef.current.add(w.word.toLowerCase()));
    setWords(gradeWords);
    setGradeIndex(gi);
    setPhase("countdown");
  };

  // 하트 렌더링
  const renderLives = () => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: MAX_LIVES }, (_, i) => (
        <span
          key={i}
          className={`text-lg ${i < lives ? "text-red-500" : "text-slate-300"}`}
        >
          {i < lives ? "\u2665" : "\u2661"}
        </span>
      ))}
    </div>
  );

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
        {isResume && questionOffset > 0 && (
          <p className="text-sm text-orange-500 font-bold mb-2">
            #{questionOffset + 1}부터 이어서 시작!
          </p>
        )}
        <div className="text-8xl font-black text-primary animate-pulse">
          {countdownNum || "GO!"}
        </div>
      </div>
    );
  }

  // 체크포인트
  if (phase === "checkpoint") {
    const globalQ = questionOffset + currentIndex;
    const gradeExhausted = currentIndex >= words.length;
    const allGradesExhausted = gradeExhausted && gradeIndex >= GRADE_ORDER.length - 1;
    const nextGrade = gradeIndex < GRADE_ORDER.length - 1 ? GRADE_ORDER[gradeIndex + 1] : null;

    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 text-white mb-4">
            <span className="material-symbols-outlined text-4xl">flag</span>
          </div>
          <h2 className="text-2xl font-bold mb-1">{globalQ}문제 돌파!</h2>

          {/* 등급 전환 안내 */}
          {gradeExhausted && nextGrade && !allGradesExhausted && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 mb-4 mt-3">
              <p className="text-sm font-bold text-violet-800">
                {GRADE_LABELS[GRADE_ORDER[gradeIndex]]} 단어를 모두 풀었어요!
              </p>
              <p className="text-xs text-violet-600 mt-0.5">
                다음은 <span className="font-bold">{GRADE_LABELS[nextGrade]}</span> 단어로 넘어갑니다
              </p>
            </div>
          )}

          {allGradesExhausted && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 mt-3">
              <p className="text-sm font-bold text-green-800">
                모든 단어를 풀었어요! 대단합니다!
              </p>
            </div>
          )}

          {!gradeExhausted && (
            <p className="text-slate-500 text-sm mb-4 mt-2">
              현재 <span className="font-bold text-slate-700">{GRADE_LABELS[GRADE_ORDER[gradeIndex]]}</span> 단어 진행 중
            </p>
          )}

          <div className="grid grid-cols-4 gap-3 mb-8">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-primary">{score}<span className="text-sm text-slate-400">점</span></p>
              <p className="text-[10px] text-slate-500">현재 점수</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-2xl font-bold">{correctCount}<span className="text-sm text-slate-400">개</span></p>
              <p className="text-[10px] text-slate-500">정답</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-2xl font-bold">{combo > 0 ? `${combo}x` : "-"}</p>
              <p className="text-[10px] text-slate-500">현재 콤보</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-2xl font-bold">{renderLives()}</div>
              <p className="text-[10px] text-slate-500">
                {wrongWords.length > 0 ? `오답 ${wrongWords.length}개` : "오답 없음"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {!allGradesExhausted ? (
              <>
                <button
                  onClick={handleContinueFromCheckpoint}
                  disabled={loadingNext}
                  className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-bold text-lg hover:from-red-600 hover:to-orange-600 transition-all disabled:opacity-50"
                >
                  {loadingNext ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                      단어 불러오는 중...
                    </span>
                  ) : (
                    "계속 도전하기"
                  )}
                </button>
                <button
                  onClick={handlePauseAndSave}
                  disabled={loadingNext}
                  className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  저장하고 나중에 이어하기
                </button>
              </>
            ) : (
              <button
                onClick={() => finishBattle(true)}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-600 transition-all"
              >
                배틀 완료!
              </button>
            )}
          </div>

          {!allGradesExhausted && (
            <p className="text-xs text-slate-400 mt-4">
              저장하면 현재 점수와 콤보가 그대로 유지됩니다
            </p>
          )}
        </div>
      </div>
    );
  }

  // 결과 (오답/시간초과/전체완료)
  if (phase === "result") {
    const isNewBest = score > bestScore;
    const globalQ = questionOffset + currentIndex;

    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-8 text-center">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-white mb-4 ${
            allCleared
              ? "bg-gradient-to-br from-green-500 to-emerald-500"
              : "bg-gradient-to-br from-red-500 to-orange-500"
          }`}>
            <span className="material-symbols-outlined text-4xl">
              {allCleared ? "emoji_events" : "swords"}
            </span>
          </div>
          <h2 className="text-2xl font-bold mb-1">
            {allCleared ? "모든 단어 정복!" : "배틀 종료!"}
          </h2>
          <p className="text-slate-500 text-sm mb-6">{GRADE_TIER_LABELS[tier]}</p>

          {isNewBest && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 mb-6 inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
              <span className="font-bold text-yellow-700">새로운 최고점수!</span>
            </div>
          )}

          <div className="text-5xl font-black text-primary mb-6">{score}<span className="text-lg text-slate-400">점</span></div>

          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-2xl font-bold">{correctCount}<span className="text-sm text-slate-400">개</span></p>
              <p className="text-[10px] text-slate-500">정답</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-2xl font-bold text-red-500">{wrongWords.length}<span className="text-sm text-slate-400">개</span></p>
              <p className="text-[10px] text-slate-500">오답</p>
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

          {/* 틀린 단어 목록 */}
          {wrongWords.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-left">
              <h3 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">close</span>
                틀린 단어 ({wrongWords.length}개)
              </h3>
              <div className="space-y-1.5">
                {wrongWords.map((w, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-bold text-red-800">{w.word}</span>
                      <span className="text-red-500 ml-2">{w.korean}</span>
                    </div>
                    {w.userAnswer && w.userAnswer !== '시간초과' && (
                      <span className="text-xs text-red-400 line-through">{w.userAnswer}</span>
                    )}
                    {w.userAnswer === '시간초과' && (
                      <span className="text-xs text-orange-400">시간초과</span>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => router.push("/wrong-words")}
                className="w-full mt-3 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
              >
                틀린 단어로 학습하기
              </button>
            </div>
          )}

          {/* 비로그인 유저: 기록 저장 유도 */}
          {!userId && score > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <p className="text-sm font-bold text-blue-800 mb-1">기록을 저장하시겠어요?</p>
              <p className="text-xs text-blue-600 mb-3">로그인하면 점수가 랭킹에 등록됩니다.</p>
              <button
                onClick={() => {
                  sessionStorage.setItem("vocab_battle_pending", JSON.stringify({
                    tier, score, maxCombo, correctCount,
                    totalCount: globalQ + (allCleared ? 0 : 1),
                    timeSeconds: totalTime,
                    wrongWords,
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
              onClick={handleRestart}
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
  const displayNum = questionOffset + currentIndex + 1;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* 상단 정보 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-500">#{displayNum}</span>
          {renderLives()}
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
