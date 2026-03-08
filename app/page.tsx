"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSessions, getAllProgress, getReviewLevel, saveSession, setCurrentSession, generateSessionId } from "@/lib/storage";
import { fetchGroupsByCategory, fetchVisibleCategories, WordGroup, CategoryInfo } from "@/lib/admin";
import { getSelectedCategory, setSelectedCategory as saveSelectedCategory } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { getGroupedWords } from "@/lib/review";
import { getDueWords } from "@/lib/spaced-repetition";
import { getDailyStats, DailyStat } from "@/lib/stats";
import { getGameProfile, calcLevel, getLevelTitle, BADGES } from "@/lib/gamification";
import { StudySession, WordProgress, WordData, GameProfile, ReviewLevel, STEP_INFO } from "@/types";

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
  const [gameProfile, setGameProfile] = useState<GameProfile | null>(null);
  const [wordGroups, setWordGroups] = useState<WordGroup[]>([]);
  const [selectedCategory, setSelectedCategoryState] = useState<string | null>(null);
  const [visibleCategories, setVisibleCategories] = useState<CategoryInfo[]>([]);
  const [completedGroupNames, setCompletedGroupNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    const allSessions = getSessions();
    setSessions(allSessions);

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

    const grouped = getGroupedWords();
    setReviewAvailable(grouped.length >= 10);
    setReviewLevel(getReviewLevel());

    setDueWords(getDueWords());
    setDailyStats(getDailyStats(allSessions));
    setGameProfile(getGameProfile());

    const completedNames = new Set<string>();
    for (const s of allSessions) {
      if (s.name && s.currentStep >= 5) completedNames.add(s.name);
    }
    setCompletedGroupNames(completedNames);

    const cat = getSelectedCategory();
    setSelectedCategoryState(cat);
    if (cat) fetchGroupsByCategory(cat).then(setWordGroups);

    supabase.auth.getUser().then(({ data: { user } }) => {
      fetchVisibleCategories(user?.email).then((cats) => {
        setVisibleCategories(cats);
        if (!cat && cats.length === 1) {
          setSelectedCategoryState(cats[0].name);
          saveSelectedCategory(cats[0].name);
          fetchGroupsByCategory(cats[0].name).then(setWordGroups);
        }
      });
    });
  }, []);

  const stats = calcStats(sessions);
  const levelInfo = gameProfile && gameProfile.xp > 0 ? calcLevel(gameProfile.xp) : null;

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===== 메인 영역 ===== */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Hero 배너 */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary to-blue-400 p-6 sm:p-8 text-white shadow-lg shadow-primary/20">
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="max-w-md">
                <span className="inline-block px-2 py-1 rounded-md bg-white/20 text-xs font-semibold mb-3">
                  영단어 마스터까지 도전해보세요
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold mb-6">
                  {levelInfo ? `LEVEL ${levelInfo.level} • ${getLevelTitle(levelInfo.level)}` : "시작해보세요"}
                </h1>
                <Link
                  href="/study/input"
                  className="inline-flex items-center gap-2 rounded-xl bg-white text-primary px-6 py-3 font-bold hover:bg-blue-50 transition-all transform hover:scale-105"
                >
                  <span>새 학습 시작</span>
                  <span className="material-symbols-outlined">rocket_launch</span>
                </Link>
              </div>
              <div className="hidden md:flex w-40 h-40 bg-white/10 rounded-full items-center justify-center backdrop-blur-sm border border-white/20">
                <span className="material-symbols-outlined text-7xl opacity-80">school</span>
              </div>
            </div>
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          </div>

          {/* 통계 + 스트릭 카드 (2열) */}
          <div className="grid grid-cols-2 gap-4">
            {/* 오늘의 복습 / 추천 단어장 */}
            <div className="flex flex-col gap-2 rounded-xl p-5 bg-primary/10 border border-primary/20">
              <p className="text-slate-600 text-sm font-medium">추천 학습</p>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-bold text-primary">
                  {dueWords.length > 0 ? dueWords.length : stats.totalWords}
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  {dueWords.length > 0 ? "복습 단어" : "학습 단어"}
                </p>
              </div>
              {dueWords.length > 0 ? (
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
                  className="flex items-center gap-1 text-primary text-xs font-bold mt-1"
                >
                  <span className="material-symbols-outlined text-xs">play_arrow</span>
                  <span>복습 시작</span>
                </button>
              ) : (
                <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold mt-1">
                  <span className="material-symbols-outlined text-xs">check_circle</span>
                  <span>복습 완료!</span>
                </div>
              )}
            </div>

            {/* 스트릭 */}
            <div className="flex flex-col gap-2 rounded-xl p-5 bg-slate-100 border border-slate-200">
              <p className="text-slate-600 text-sm font-medium">연속 학습</p>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-bold">{gameProfile?.streak || 0}</p>
                <p className="text-xs font-semibold text-slate-500">일</p>
              </div>
              {gameProfile && gameProfile.streak > 0 && (
                <div className="flex items-center gap-1 text-orange-500 text-xs font-bold mt-1">
                  <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                  <span>Keep it up!</span>
                </div>
              )}
            </div>
          </div>

          {/* 카테고리 추천 Day */}
          {selectedCategory && wordGroups.length > 0 && (() => {
            const nextGroup = wordGroups.find((g) => !completedGroupNames.has(g.name));
            const completedCount = wordGroups.filter((g) => completedGroupNames.has(g.name)).length;
            const allDone = completedCount === wordGroups.length;

            return (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">menu_book</span>
                    <h3 className="font-bold text-lg">{selectedCategory}</h3>
                    <span className="text-xs text-slate-400 ml-1">{completedCount}/{wordGroups.length}</span>
                  </div>
                  <Link href="/study/input?tab=library" className="text-primary text-sm font-semibold hover:underline">
                    전체보기
                  </Link>
                </div>
                <div className="p-4">
                  {allDone ? (
                    <div className="text-center py-4">
                      <span className="material-symbols-outlined text-4xl text-green-400 mb-2">celebration</span>
                      <p className="font-bold text-green-600">모든 Day를 완료했어요!</p>
                    </div>
                  ) : nextGroup && (
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          const s = {
                            id: generateSessionId(), name: nextGroup.name, words: nextGroup.words,
                            currentStep: 1, wrongWords: [], createdAt: new Date().toISOString(),
                          };
                          saveSession(s); setCurrentSession(s); router.push("/study/preview");
                        }}
                        className="w-full flex items-center justify-between p-4 rounded-xl bg-primary/5 border-2 border-primary/20 hover:border-primary hover:shadow-md transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-white">
                            <span className="material-symbols-outlined">play_arrow</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold">{nextGroup.name}</p>
                              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">다음 추천</span>
                            </div>
                            <p className="text-xs text-slate-400">{nextGroup.words.length}단어</p>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-primary">arrow_forward</span>
                      </button>
                      {wordGroups
                        .filter((g) => !completedGroupNames.has(g.name) && g.id !== nextGroup.id)
                        .slice(0, 2)
                        .map((group) => (
                          <button
                            key={group.id}
                            onClick={() => {
                              const s = {
                                id: generateSessionId(), name: group.name, words: group.words,
                                currentStep: 1, wrongWords: [], createdAt: new Date().toISOString(),
                              };
                              saveSession(s); setCurrentSession(s); router.push("/study/preview");
                            }}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
                          >
                            <div>
                              <p className="font-medium text-sm">{group.name}</p>
                              <p className="text-xs text-slate-400">{group.words.length}단어</p>
                            </div>
                            <span className="material-symbols-outlined text-slate-300 text-lg">play_arrow</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 첫 방문 카테고리 선택 유도 */}
          {sessions.length === 0 && !selectedCategory && (
            <Link
              href="/study/input?tab=library"
              className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-2xl">library_books</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg">단어장을 선택하세요</h3>
                  <p className="text-slate-500 text-sm">학습할 단어장을 선택해서 시작해보세요</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-600 transition-colors">arrow_forward</span>
            </Link>
          )}

          {/* 학습 추이 차트 (간소화) */}
          {dailyStats.length >= 2 && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-500">trending_up</span>
                  학습 추이
                </h3>
                <span className="text-sm text-slate-400">최근 {dailyStats.length}일</span>
              </div>
              <div className="p-6">
                <div className="flex items-end gap-2 h-32">
                  {dailyStats.slice(-7).map((stat, i) => {
                    const maxWords = Math.max(...dailyStats.slice(-7).map((s) => s.words), 1);
                    const height = (stat.words / maxWords) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <div
                          className="w-full bg-primary rounded-t-md transition-all"
                          style={{ height: `${Math.max(height, 5)}%`, opacity: 0.3 + (height / 100) * 0.7 }}
                        />
                        <span className="text-[10px] font-medium text-slate-400 uppercase">{stat.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 최근 학습 이력 */}
          {sessions.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-lg">최근 학습</h3>
              </div>
              <div className="divide-y divide-slate-50">
                {sessions.slice(-5).reverse().map((session) => {
                  const isCompleted = session.currentStep >= 5;
                  const wrongCount = session.wrongWords.length;
                  const totalCount = session.words.length;
                  const accuracy = totalCount > 0 ? Math.round(((totalCount - wrongCount) / totalCount) * 100) : 0;
                  return (
                    <div key={session.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`size-10 rounded-full flex items-center justify-center ${
                          isCompleted ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                        }`}>
                          <span className="material-symbols-outlined text-xl">
                            {isCompleted ? "check_circle" : "school"}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-sm">
                            {session.name || session.words.slice(0, 3).map((w) => w.word).join(", ")}
                          </p>
                          <p className="text-xs text-slate-500">
                            {isCompleted ? "학습 완료" : `Step ${session.currentStep} 진행중`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{new Date(session.createdAt).toLocaleDateString("ko-KR")}</p>
                        {isCompleted && (
                          <p className={`text-xs font-bold ${accuracy >= 90 ? "text-green-600" : accuracy >= 70 ? "text-blue-600" : "text-orange-600"}`}>
                            {accuracy}% 정답률
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ===== 사이드바 ===== */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* 배틀 배너 */}
          <Link href="/battle" className="block group">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white shadow-lg shadow-red-500/20">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-2xl">swords</span>
                  <span className="text-xs font-bold uppercase tracking-widest opacity-80">워드 배틀</span>
                </div>
                <h4 className="font-bold text-lg mb-1">마스터 워드 배틀</h4>
                <p className="text-white/70 text-xs">타임어택으로 실력을 겨뤄보세요!</p>
              </div>
              <div className="absolute -right-4 -bottom-4 size-24 bg-white/10 rounded-full blur-2xl"></div>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-white/30 text-4xl group-hover:text-white/60 transition-colors">arrow_forward</span>
            </div>
          </Link>

          {/* 학습 진도 */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-lg mb-4">학습 진도</h3>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                {levelInfo && (
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary bg-primary/10">
                    Level {levelInfo.level}
                  </span>
                )}
                <span className="text-xs font-semibold text-primary">
                  {stats.totalWords} 단어
                </span>
              </div>
              {levelInfo && (
                <div className="overflow-hidden h-3 mb-4 flex rounded-full bg-primary/10">
                  <div
                    className="flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary rounded-full"
                    style={{ width: `${(levelInfo.currentXp / levelInfo.requiredXp) * 100}%` }}
                  />
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold">{stats.totalWords}</p>
                  <p className="text-[10px] text-slate-500">학습 단어</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completedSessions}</p>
                  <p className="text-[10px] text-slate-500">완료 세션</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.accuracy}<span className="text-sm text-slate-400">%</span></p>
                  <p className="text-[10px] text-slate-500">정답률</p>
                </div>
              </div>
            </div>
          </div>

          {/* 배지 */}
          {gameProfile && gameProfile.badges.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-lg mb-3">획득한 배지</h3>
              <div className="flex flex-wrap gap-2">
                {gameProfile.badges.map((badgeId) => {
                  const badge = BADGES.find((b) => b.id === badgeId);
                  if (!badge) return null;
                  return (
                    <span
                      key={badgeId}
                      title={`${badge.name}: ${badge.description}`}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200"
                    >
                      <span className="material-symbols-outlined text-emerald-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {badge.icon}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* 오답 단어 */}
          {weakWords.length > 0 && (
            <Link href="/wrong-words" className="block">
              <div className="bg-red-50 p-6 rounded-xl border border-red-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-red-700 flex items-center gap-2">
                    <span className="material-symbols-outlined">error_outline</span>
                    오답 단어
                  </h3>
                  <span className="bg-red-200 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">
                    {weakWords.length}개
                  </span>
                </div>
                <p className="text-sm text-red-600 mb-4">최근 틀린 단어를 복습하세요.</p>
                <div className="flex flex-wrap gap-2">
                  {weakWords.map((w) => (
                    <span
                      key={w.word}
                      className="px-3 py-1 bg-white rounded-lg text-xs font-medium border border-red-200 text-slate-700"
                    >
                      {w.word}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          )}

          {/* 복습 */}
          {reviewAvailable && (
            <Link href="/study/review" className="block">
              <div className="bg-slate-900 text-white p-6 rounded-xl shadow-xl overflow-hidden relative group">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                    <span className="text-yellow-400 text-xs font-bold uppercase tracking-widest">복습 챌린지</span>
                  </div>
                  <h4 className="font-bold text-lg mb-1">단어 복습하기</h4>
                  <p className="text-slate-400 text-xs mb-4">
                    기존 단어로 복습해요 •
                    <span className={`ml-1 font-bold ${
                      reviewLevel === "hard" ? "text-red-400" : reviewLevel === "medium" ? "text-amber-400" : "text-green-400"
                    }`}>
                      {reviewLevel === "hard" ? "Hard" : reviewLevel === "medium" ? "Medium" : "Easy"}
                    </span>
                  </p>
                  <button className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold transition-colors">
                    복습 시작
                  </button>
                </div>
                <div className="absolute -right-4 -bottom-4 size-32 bg-primary/20 rounded-full blur-3xl"></div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
