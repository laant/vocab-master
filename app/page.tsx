"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSessions, getAllProgress, getReviewLevel, saveSession, setCurrentSession, generateSessionId } from "@/lib/storage";
import { getGroupedWords } from "@/lib/review";
import { getDueWords } from "@/lib/spaced-repetition";
import { getDailyStats, DailyStat } from "@/lib/stats";
import { StudySession, WordProgress, WordData, ReviewLevel, STEP_INFO } from "@/types";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Stats {
  totalWords: number;
  completedSessions: number;
  accuracy: number;
}

function calcStats(sessions: StudySession[]): Stats {
  if (sessions.length === 0) {
    return { totalWords: 0, completedSessions: 0, accuracy: 0 };
  }

  const allWords = new Set(sessions.flatMap((s) => s.words.map((w) => w.word)));
  const completedSessions = sessions.filter((s) => s.currentStep >= 5).length;

  // 정답률: 완료 세션 기준, 전체 단어 중 오답이 아닌 비율
  const completed = sessions.filter((s) => s.currentStep >= 5);
  let totalCount = 0;
  let wrongCount = 0;
  for (const s of completed) {
    totalCount += s.words.length;
    wrongCount += s.wrongWords.length;
  }
  const accuracy = totalCount > 0 ? Math.round(((totalCount - wrongCount) / totalCount) * 100) : 0;

  return { totalWords: allWords.size, completedSessions, accuracy };
}

export default function HomePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [weakWords, setWeakWords] = useState<(WordProgress & { korean: string })[]>([]);
  const [reviewLevel, setReviewLevel] = useState<ReviewLevel>("hard");
  const [reviewAvailable, setReviewAvailable] = useState(false);
  const [dueWords, setDueWords] = useState<{ wordData: WordData; progress: WordProgress }[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);

  useEffect(() => {
    const allSessions = getSessions();
    setSessions(allSessions);

    // 취약 단어 (오답 상위 5개)
    const progress = getAllProgress();
    const koreanMap = new Map<string, string>();
    for (const s of allSessions) {
      for (const w of s.words) {
        if (w.korean && !koreanMap.has(w.word)) koreanMap.set(w.word, w.korean);
      }
    }
    const weak = progress
      .filter((p) => p.wrongCount > 0 && !p.mastered)
      .sort((a, b) => b.wrongCount - a.wrongCount)
      .slice(0, 5)
      .map((p) => ({ ...p, korean: koreanMap.get(p.word) || "" }));
    setWeakWords(weak);

    // 복습 가능 여부
    const grouped = getGroupedWords();
    setReviewAvailable(grouped.length >= 10);
    setReviewLevel(getReviewLevel());

    // 오늘 복습할 단어 (간격 반복)
    setDueWords(getDueWords());

    // 일별 통계
    setDailyStats(getDailyStats(allSessions));
  }, []);

  const stats = calcStats(sessions);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
          <span className="material-symbols-outlined text-5xl text-primary">
            school
          </span>
        </div>
        <h2 className="text-3xl font-bold mb-3">영단어 마스터</h2>
        <p className="text-slate-500 text-lg">
          5단계 학습법으로 영단어를 완벽하게 외워보세요
        </p>
      </div>

      {/* 학습 통계 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-primary mx-auto mb-3">
            <span className="material-symbols-outlined">dictionary</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalWords}</p>
          <p className="text-xs text-slate-500 mt-1">학습한 단어</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-50 text-green-500 mx-auto mb-3">
            <span className="material-symbols-outlined">task_alt</span>
          </div>
          <p className="text-2xl font-bold">{stats.completedSessions}</p>
          <p className="text-xs text-slate-500 mt-1">완료한 세션</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 text-amber-500 mx-auto mb-3">
            <span className="material-symbols-outlined">percent</span>
          </div>
          <p className="text-2xl font-bold">{stats.accuracy}<span className="text-sm font-medium text-slate-400">%</span></p>
          <p className="text-xs text-slate-500 mt-1">정답률</p>
        </div>
      </div>

      {/* 학습 추이 차트 */}
      {dailyStats.length >= 2 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
          <h3 className="font-bold text-lg mb-6">학습 추이</h3>

          {/* 일별 학습량 */}
          <div className="mb-6">
            <p className="text-sm font-medium text-slate-500 mb-2">일별 학습 단어</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" width={30} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 13, border: "1px solid #e2e8f0" }}
                  formatter={(value) => [`${value}개`, "단어"]}
                />
                <Bar dataKey="words" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 정답률 추이 */}
          <div className="mb-6">
            <p className="text-sm font-medium text-slate-500 mb-2">정답률 추이</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" width={30} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 13, border: "1px solid #e2e8f0" }}
                  formatter={(value) => [`${value}%`, "정답률"]}
                />
                <Line type="monotone" dataKey="accuracy" stroke="#22c55e" strokeWidth={2} dot={{ r: 4, fill: "#22c55e" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 누적 단어 */}
          <div>
            <p className="text-sm font-medium text-slate-500 mb-2">누적 학습 단어</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" width={30} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 13, border: "1px solid #e2e8f0" }}
                  formatter={(value) => [`${value}개`, "누적"]}
                />
                <Area type="monotone" dataKey="cumulative" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 오늘의 복습 (간격 반복) */}
      {dueWords.length > 0 && (
        <button
          onClick={() => {
            const wordsToStudy = dueWords.slice(0, 10).map((d) => d.wordData);
            const session = {
              id: generateSessionId(),
              name: `오늘의 복습 (${wordsToStudy.length}개)`,
              words: wordsToStudy,
              currentStep: 1,
              wrongWords: [],
              createdAt: new Date().toISOString(),
            };
            saveSession(session);
            setCurrentSession(session);
            router.push("/study/preview");
          }}
          className="w-full flex items-center justify-between bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-6 shadow-sm border border-violet-200 hover:border-violet-400 hover:shadow-md transition-all mb-8 group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-2xl">calendar_today</span>
            </div>
            <div>
              <h3 className="font-bold text-lg">오늘의 복습</h3>
              <p className="text-slate-500 text-sm">
                복습할 단어 <span className="font-bold text-violet-600">{dueWords.length}개</span>가 있어요
                {dueWords.length > 10 && " (10개씩 진행)"}
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined text-slate-400 group-hover:text-violet-600 transition-colors">
            play_arrow
          </span>
        </button>
      )}

      {/* 새 학습 시작 */}
      <Link
        href="/study/input"
        className="flex items-center justify-between bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:border-primary hover:shadow-md transition-all mb-8 group"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-2xl">add</span>
          </div>
          <div>
            <h3 className="font-bold text-lg">새 학습 시작</h3>
            <p className="text-slate-500 text-sm">단어 10개를 입력하고 학습을 시작하세요</p>
          </div>
        </div>
        <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">
          arrow_forward
        </span>
      </Link>

      {/* 복습 시작 */}
      {reviewAvailable && (
        <Link
          href="/study/review"
          className="flex items-center justify-between bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all mb-8 group"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-2xl">replay</span>
            </div>
            <div>
              <h3 className="font-bold text-lg">복습</h3>
              <p className="text-slate-500 text-sm">
                기존 단어로 복습해요
                <span className={`ml-2 font-bold ${
                  reviewLevel === 'hard' ? 'text-red-500' : reviewLevel === 'medium' ? 'text-amber-500' : 'text-green-500'
                }`}>
                  {reviewLevel === 'hard' ? 'Hard' : reviewLevel === 'medium' ? 'Medium' : 'Easy'}
                </span>
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined text-slate-400 group-hover:text-amber-500 transition-colors">
            arrow_forward
          </span>
        </Link>
      )}

      {/* 취약 단어 미리보기 */}
      {weakWords.length > 0 && (
        <Link
          href="/wrong-words"
          className="block bg-red-50 rounded-xl p-5 border border-red-200 mb-8 hover:border-red-300 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-400">auto_stories</span>
              <h3 className="font-bold text-sm">오답 단어</h3>
            </div>
            <span className="material-symbols-outlined text-slate-400 group-hover:text-red-400 transition-colors text-sm">
              arrow_forward
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {weakWords.map((w) => (
              <span
                key={w.word}
                className="px-3 py-1 bg-white rounded-full text-sm font-medium text-red-500 border border-red-200"
              >
                {w.word}
                {w.korean && <span className="text-slate-400 ml-1">{w.korean}</span>}
              </span>
            ))}
          </div>
        </Link>
      )}

      {/* 최근 학습 이력 */}
      {sessions.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
          <h3 className="font-bold text-lg mb-4">최근 학습</h3>
          <div className="space-y-3">
            {sessions.slice(-5).reverse().map((session) => {
              const isCompleted = session.currentStep >= 5;
              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-lg ${isCompleted ? "text-green-500" : "text-amber-400"}`}>
                      {isCompleted ? "check_circle" : "pending"}
                    </span>
                    <div>
                      <p className="font-medium text-sm">
                        {session.name || (
                          <>
                            {session.words.slice(0, 3).map((w) => w.word).join(", ")}
                            {session.words.length > 3 && ` 외 ${session.words.length - 3}개`}
                          </>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">
                          {new Date(session.createdAt).toLocaleDateString("ko-KR")}
                        </span>
                        {session.wrongWords.length > 0 && (
                          <span className="text-xs text-red-400">
                            오답 {session.wrongWords.length}개
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-slate-500">
                    <span className="material-symbols-outlined text-sm">
                      {STEP_INFO[session.currentStep as keyof typeof STEP_INFO]?.icon}
                    </span>
                    {isCompleted ? (
                      <span className="text-green-500 font-medium">완료</span>
                    ) : (
                      <span>Step {session.currentStep}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5단계 학습법 소개 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h3 className="font-bold text-lg mb-4">5단계 학습법</h3>
        <div className="space-y-3">
          {([1, 2, 3, 4, 5] as const).map((step) => (
            <div key={step} className="flex items-center gap-3 py-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                {step}
              </div>
              <div className="flex-1">
                <span className="font-medium">{STEP_INFO[step].title}</span>
                <span className="text-slate-400 text-sm ml-2">
                  {STEP_INFO[step].description}
                </span>
              </div>
              <span className="material-symbols-outlined text-slate-300">
                {STEP_INFO[step].icon}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
