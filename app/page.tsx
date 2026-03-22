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
        <div className="lg:col-span-8 flex flex-col gap-4">

          {/* 3개 액션 카드 — 학습 시작 / 배틀 / 복습 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 학습 시작 */}
            <Link
              href="/study/input"
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-blue-500 p-5 sm:p-6 text-white shadow-lg shadow-primary/20 group hover:shadow-xl transition-all"
            >
              <div className="relative z-10">
                <span className="material-symbols-outlined text-3xl mb-3 block opacity-90">rocket_launch</span>
                <h3 className="font-bold text-lg mb-1">새 학습</h3>
                <p className="text-white/70 text-xs">단어장을 선택하고 학습을 시작하세요</p>
              </div>
              <div className="absolute -right-6 -bottom-6 size-24 bg-white/10 rounded-full blur-2xl"></div>
            </Link>

            {/* 마스터 워드 배틀 */}
            <Link
              href="/battle"
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500 to-orange-500 p-5 sm:p-6 text-white shadow-lg shadow-red-500/20 group hover:shadow-xl transition-all"
            >
              <div className="relative z-10">
                <span className="material-symbols-outlined text-3xl mb-3 block opacity-90">swords</span>
                <h3 className="font-bold text-lg mb-1">워드 배틀</h3>
                <p className="text-white/70 text-xs">타임어택으로 실력을 겨뤄보세요</p>
              </div>
              <div className="absolute -right-6 -bottom-6 size-24 bg-white/10 rounded-full blur-2xl"></div>
            </Link>

            {/* 복습 챌린지 */}
            <Link
              href={reviewAvailable ? "/study/review" : "/wrong-words"}
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 sm:p-6 text-white shadow-lg shadow-slate-900/20 group hover:shadow-xl transition-all"
            >
              <div className="relative z-10">
                <span className="material-symbols-outlined text-3xl mb-3 block text-yellow-400" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                <h3 className="font-bold text-lg mb-1">복습 챌린지</h3>
                <p className="text-white/60 text-xs">
                  {reviewAvailable ? (
                    <>
                      난이도{" "}
                      <span className={`font-bold ${reviewLevel === "hard" ? "text-red-400" : reviewLevel === "medium" ? "text-amber-400" : "text-green-400"}`}>
                        {reviewLevel === "hard" ? "Hard" : reviewLevel === "medium" ? "Medium" : "Easy"}
                      </span>
                    </>
                  ) : "오답 단어를 복습하세요"}
                </p>
              </div>
              <div className="absolute -right-6 -bottom-6 size-24 bg-primary/15 rounded-full blur-2xl"></div>
            </Link>
          </div>

          {/* 레벨 + 스트릭 요약 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-4 rounded-xl p-4 bg-white border border-slate-100 shadow-sm">
              {levelInfo ? (
                <>
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <span className="text-sm font-black text-primary">Lv.{levelInfo.level}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{getLevelTitle(levelInfo.level)}</p>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${(levelInfo.currentXp / levelInfo.requiredXp) * 100}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{levelInfo.currentXp}/{levelInfo.requiredXp} XP</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100">
                    <span className="material-symbols-outlined text-slate-400">school</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">학습을 시작하세요</p>
                    <p className="text-[10px] text-slate-400">{stats.totalWords}단어 학습</p>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-4 rounded-xl p-4 bg-white border border-slate-100 shadow-sm">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-50">
                <span className="material-symbols-outlined text-orange-500 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
              </div>
              <div>
                <p className="text-2xl font-black">{gameProfile?.streak || 0}<span className="text-sm font-medium text-slate-400 ml-0.5">일</span></p>
                <p className="text-[10px] text-slate-400">연속 학습</p>
              </div>
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

          {/* 학습 추이 차트 */}
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
        <div className="lg:col-span-4 flex flex-col gap-4">

          {/* 학습 통계 */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
            <h3 className="font-bold mb-3">학습 통계</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{stats.totalWords}</p>
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

          {/* 오늘의 복습 */}
          {dueWords.length > 0 && (
            <div className="bg-violet-50 p-5 rounded-xl border border-violet-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-violet-700 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-lg">replay</span>
                  오늘의 복습
                </h3>
                <span className="bg-violet-200 text-violet-700 px-2 py-0.5 rounded-full text-xs font-bold">{dueWords.length}개</span>
              </div>
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
                className="w-full py-2.5 bg-violet-600 text-white rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors"
              >
                복습 시작
              </button>
            </div>
          )}

          {/* 배지 */}
          {gameProfile && gameProfile.badges.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="font-bold mb-3">획득한 배지</h3>
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
              <div className="bg-red-50 p-5 rounded-xl border border-red-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-red-700 flex items-center gap-1.5 text-sm">
                    <span className="material-symbols-outlined text-lg">error_outline</span>
                    오답 단어
                  </h3>
                  <span className="bg-red-200 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">{weakWords.length}개</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {weakWords.map((w) => (
                    <span key={w.word} className="px-2.5 py-1 bg-white rounded-lg text-xs font-medium border border-red-200 text-slate-700">
                      {w.word}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
