"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSessions, getAllProgress, getReviewLevel, saveSession, setCurrentSession, generateSessionId } from "@/lib/storage";
import { fetchGroupsByCategory, fetchVisibleCategories, WordGroup, CategoryInfo } from "@/lib/admin";
import { getSelectedCategory, setSelectedCategory as saveSelectedCategory } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { getDueWords } from "@/lib/spaced-repetition";
import { getGameProfile, calcLevel, getLevelTitle } from "@/lib/gamification";
import { StudySession, WordProgress, WordData, GameProfile, ReviewLevel } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [dueWords, setDueWords] = useState<{ wordData: WordData; progress: WordProgress }[]>([]);
  const [gameProfile, setGameProfile] = useState<GameProfile | null>(null);
  const [wordGroups, setWordGroups] = useState<WordGroup[]>([]);
  const [selectedCategory, setSelectedCategoryState] = useState<string | null>(null);
  const [visibleCategories, setVisibleCategories] = useState<CategoryInfo[]>([]);
  const [completedGroupNames, setCompletedGroupNames] = useState<Set<string>>(new Set());
  const [nextGroup, setNextGroup] = useState<WordGroup | null>(null);
  const [upcomingGroups, setUpcomingGroups] = useState<WordGroup[]>([]);
  const [allDone, setAllDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const allSessions = getSessions();
    setSessions(allSessions);

    const completedNames = new Set<string>();
    for (const s of allSessions) {
      if (s.name && s.currentStep >= 5) completedNames.add(s.name);
    }
    setCompletedGroupNames(completedNames);

    setDueWords(getDueWords());
    setGameProfile(getGameProfile());

    const cat = getSelectedCategory();
    setSelectedCategoryState(cat);

    async function loadGroups(categoryName: string) {
      const groups = await fetchGroupsByCategory(categoryName);
      setWordGroups(groups);
      const next = groups.find((g) => !completedNames.has(g.name)) || null;
      setNextGroup(next);
      setAllDone(groups.length > 0 && groups.every((g) => completedNames.has(g.name)));
      setUpcomingGroups(
        groups.filter((g) => !completedNames.has(g.name) && g.id !== next?.id).slice(0, 2)
      );
      setLoading(false);
    }

    if (cat) {
      loadGroups(cat);
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      fetchVisibleCategories(user?.email).then((cats) => {
        setVisibleCategories(cats);
        if (!cat && cats.length === 1) {
          const autoCategory = cats[0].name;
          setSelectedCategoryState(autoCategory);
          saveSelectedCategory(autoCategory);
          loadGroups(autoCategory);
        } else if (!cat) {
          setLoading(false);
        }
      });
    });
  }, []);

  const levelInfo = gameProfile && gameProfile.xp > 0 ? calcLevel(gameProfile.xp) : null;

  function startGroup(group: WordGroup) {
    const s = {
      id: generateSessionId(),
      name: group.name,
      words: group.words,
      currentStep: 1,
      wrongWords: [],
      createdAt: new Date().toISOString(),
    };
    saveSession(s);
    setCurrentSession(s);
    router.push("/study/preview");
  }

  function startDueReview() {
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
  }

  // 진행 중인 세션 (미완료)
  const inProgressSession = sessions.filter((s) => s.currentStep < 5).slice(-1)[0] || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* 레벨 + 스트릭 요약 */}
      <div className="flex items-center gap-4 mb-6">
        {levelInfo ? (
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center w-11 h-11 rounded-full bg-primary/10">
              <span className="text-sm font-black text-primary">Lv.{levelInfo.level}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">{getLevelTitle(levelInfo.level)}</p>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: `${(levelInfo.currentXp / levelInfo.requiredXp) * 100}%` }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center w-11 h-11 rounded-full bg-slate-100">
              <span className="material-symbols-outlined text-slate-400">school</span>
            </div>
            <p className="text-sm font-bold text-slate-500">학습을 시작하세요!</p>
          </div>
        )}
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50">
          <span className="material-symbols-outlined text-orange-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
          <span className="text-lg font-black">{gameProfile?.streak || 0}</span>
          <span className="text-xs text-slate-400">일</span>
        </div>
      </div>

      {/* 진행 중인 세션이 있으면 우선 표시 */}
      {inProgressSession && (
        <button
          onClick={() => {
            setCurrentSession(inProgressSession);
            const stepRoutes: Record<number, string> = { 1: "/study/preview", 2: "/study/quiz", 3: "/study/recall", 4: "/study/listening", 5: "/study/mastery" };
            router.push(stepRoutes[inProgressSession.currentStep] || "/study/preview");
          }}
          className="w-full mb-4 flex items-center gap-4 p-4 rounded-xl bg-amber-50 border-2 border-amber-200 hover:border-amber-400 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-amber-500 text-white">
            <span className="material-symbols-outlined text-2xl">play_arrow</span>
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-amber-600 mb-0.5">이어서 학습하기</p>
            <p className="font-bold">{inProgressSession.name || inProgressSession.words.slice(0, 3).map((w) => w.word).join(", ")}</p>
            <p className="text-xs text-slate-400">Step {inProgressSession.currentStep} 진행중 · {inProgressSession.words.length}단어</p>
          </div>
          <span className="material-symbols-outlined text-amber-500">arrow_forward</span>
        </button>
      )}

      {/* 오늘의 복습 (있으면 표시) */}
      {dueWords.length > 0 && (
        <button
          onClick={startDueReview}
          className="w-full mb-4 flex items-center gap-4 p-4 rounded-xl bg-violet-50 border-2 border-violet-200 hover:border-violet-400 hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-violet-600 text-white">
            <span className="material-symbols-outlined text-2xl">replay</span>
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-violet-600 mb-0.5">오늘의 복습</p>
            <p className="font-bold">복습할 단어 {dueWords.length}개</p>
            <p className="text-xs text-slate-400">잊기 전에 다시 한번!</p>
          </div>
          <span className="material-symbols-outlined text-violet-500">arrow_forward</span>
        </button>
      )}

      {/* ===== 메인: 다음 추천 학습 ===== */}
      {selectedCategory && !allDone && nextGroup && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">menu_book</span>
              {selectedCategory}
            </h2>
            <Link href="/study/input?tab=library" className="text-primary text-sm font-semibold hover:underline">
              전체보기
            </Link>
          </div>

          {/* 다음 추천 그룹 — 큰 카드 */}
          <button
            onClick={() => startGroup(nextGroup)}
            className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-blue-500 p-6 text-white shadow-lg shadow-primary/20 hover:shadow-xl transition-all text-left"
          >
            <div className="relative z-10">
              <span className="inline-block px-2.5 py-1 rounded-full bg-white/20 text-xs font-bold mb-3">다음 추천</span>
              <h3 className="font-bold text-xl mb-1">{nextGroup.name}</h3>
              <p className="text-white/70 text-sm">{nextGroup.words.length}단어</p>
            </div>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 z-10">
              <span className="material-symbols-outlined text-5xl text-white/40">arrow_forward</span>
            </div>
            <div className="absolute -right-10 -bottom-10 size-32 bg-white/10 rounded-full blur-2xl"></div>
          </button>

          {/* 그 다음 그룹들 */}
          {upcomingGroups.length > 0 && (
            <div className="mt-2 space-y-1">
              {upcomingGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => startGroup(group)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-left"
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
      )}

      {/* 모든 Day 완료 */}
      {selectedCategory && allDone && (
        <div className="text-center py-8 mb-4">
          <span className="material-symbols-outlined text-5xl text-green-400 mb-3 block">celebration</span>
          <p className="font-bold text-xl text-green-600 mb-1">모든 Day를 완료했어요!</p>
          <p className="text-sm text-slate-400">대단해요! 복습하면서 완벽하게 마스터하세요.</p>
        </div>
      )}

      {/* 카테고리 미선택 */}
      {!selectedCategory && (
        <Link
          href="/study/input?tab=library"
          className="flex items-center gap-4 p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 hover:border-blue-400 hover:shadow-md transition-all group mb-4"
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-3xl">library_books</span>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">단어장을 선택하세요</h3>
            <p className="text-slate-500 text-sm">학습할 단어장을 선택해서 시작해보세요</p>
          </div>
          <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-600 transition-colors">arrow_forward</span>
        </Link>
      )}

      {/* 퀵 액션 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          href="/battle"
          className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all"
        >
          <span className="material-symbols-outlined text-2xl text-red-500">swords</span>
          <div>
            <p className="font-bold text-sm">워드 배틀</p>
            <p className="text-[10px] text-slate-400">타임어택</p>
          </div>
        </Link>
        <Link
          href="/wrong-words"
          className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all"
        >
          <span className="material-symbols-outlined text-2xl text-orange-500">error_outline</span>
          <div>
            <p className="font-bold text-sm">오답 노트</p>
            <p className="text-[10px] text-slate-400">틀린 단어 복습</p>
          </div>
        </Link>
      </div>

      {/* 최근 학습 이력 (간결하게) */}
      {sessions.filter((s) => s.currentStep >= 5).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-500">최근 완료</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {sessions.filter((s) => s.currentStep >= 5).slice(-3).reverse().map((session) => {
              const wrongCount = session.wrongWords.length;
              const totalCount = session.words.length;
              const accuracy = totalCount > 0 ? Math.round(((totalCount - wrongCount) / totalCount) * 100) : 0;
              return (
                <div key={session.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                    <p className="font-medium text-sm">
                      {session.name || session.words.slice(0, 3).map((w) => w.word).join(", ")}
                    </p>
                  </div>
                  <span className={`text-xs font-bold ${accuracy >= 90 ? "text-green-600" : accuracy >= 70 ? "text-blue-600" : "text-orange-600"}`}>
                    {accuracy}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
