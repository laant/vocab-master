"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAllProgress } from "@/lib/storage";
import { getGameProfile, calcLevel, getLevelTitle, BADGES } from "@/lib/gamification";
import {
  getMyBestScore, getMyBattleWrongWords, getRecentBattleHistory,
  getIndividualRanking, loadBattleSave, clearBattleSave,
  GradeTier, GRADE_TIER_LABELS, BattleWrongWord, BattleSaveState,
} from "@/lib/battle";
import { getBattleWrongWords } from "@/lib/storage";
import { GameProfile, WordProgress } from "@/types";

interface BattleHistory {
  id: string;
  grade_tier: GradeTier;
  score: number;
  max_combo: number;
  correct_count: number;
  total_count: number;
  wrong_words: BattleWrongWord[];
  time_seconds: number;
  created_at: string;
}

const TIERS: GradeTier[] = ["middle_only", "high_below", "all"];
const TIER_PILLS: { tier: GradeTier; label: string; color: string }[] = [
  { tier: "middle_only", label: "중등", color: "bg-blue-500" },
  { tier: "high_below", label: "고등", color: "bg-violet-500" },
  { tier: "all", label: "통합", color: "bg-red-500" },
];

export default function HomeClient() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [gameProfile, setGameProfile] = useState<GameProfile | null>(null);
  const [bestScores, setBestScores] = useState<Record<GradeTier, number>>({ all: 0, high_below: 0, middle_only: 0 });
  const [battleWrongWords, setBattleWrongWords] = useState<{ word: string; korean: string; count: number }[]>([]);
  const [recentBattles, setRecentBattles] = useState<BattleHistory[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [totalBattles, setTotalBattles] = useState(0);
  const [savedGame, setSavedGame] = useState<BattleSaveState | null>(null);
  const [selectedTier, setSelectedTier] = useState<GradeTier>("middle_only");
  const [weakWords, setWeakWords] = useState<(WordProgress & { korean: string })[]>([]);

  useEffect(() => {
    const gp = getGameProfile();
    setGameProfile(gp);

    const progress = getAllProgress();
    const weak = progress
      .filter((p) => p.wrongCount > 0 && !p.mastered)
      .sort((a, b) => b.wrongCount - a.wrongCount)
      .slice(0, 5)
      .map((p) => ({ ...p, korean: "" }));
    setWeakWords(weak);

    const saved = loadBattleSave();
    if (saved) setSavedGame(saved);

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);

      const [bAll, bHb, bMo, wrongWords, history, ranking] = await Promise.all([
        getMyBestScore(user.id, "all").catch(() => 0),
        getMyBestScore(user.id, "high_below").catch(() => 0),
        getMyBestScore(user.id, "middle_only").catch(() => 0),
        getMyBattleWrongWords(user.id).catch(() => []),
        getRecentBattleHistory(user.id, 5).catch(() => []),
        getIndividualRanking("all").catch(() => []),
      ]);

      setBestScores({ all: bAll, high_below: bHb, middle_only: bMo });
      setBattleWrongWords(wrongWords);
      setRecentBattles(history);
      setTotalBattles(history.length);

      const myIdx = ranking.findIndex(r => r.user_id === user.id);
      if (myIdx >= 0) setMyRank(myIdx + 1);
    });
  }, []);

  const levelInfo = gameProfile && gameProfile.xp > 0 ? calcLevel(gameProfile.xp) : null;

  return (
    <>
      {/* 히어로 인터랙티브 영역: 저장 게임 + 티어 선택 + 시작 버튼 */}
      <div className="lg:col-span-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 text-white shadow-2xl">
          <div className="relative z-10">
            <p className="text-4xl mb-3">&#x2694;&#xFE0F;</p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Master Words Battle</h2>
            <p className="text-sm text-slate-400 mb-5">목숨 3개 — 얼마나 오래 살아남을 수 있을까요?</p>

            {savedGame && (
              <div className="bg-white/10 border border-white/20 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">저장된 배틀이 있어요!</p>
                    <p className="text-xs text-slate-400">{GRADE_TIER_LABELS[savedGame.tier]} · {savedGame.questionOffset || savedGame.correctCount}문제 · {savedGame.score}점</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/battle/play?tier=${savedGame.tier}&resume=1`)}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 transition-colors"
                    >
                      이어하기
                    </button>
                    <button
                      onClick={() => { clearBattleSave(); setSavedGame(null); }}
                      className="px-3 py-2 bg-white/10 text-white/60 rounded-lg text-sm hover:bg-white/20 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 mb-4">
              {TIER_PILLS.map(({ tier, label, color }) => (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    selectedTier === tier
                      ? `${color} text-white shadow-lg`
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                >
                  {label}
                  {bestScores[tier] > 0 && (
                    <span className="ml-1.5 text-xs opacity-75">{bestScores[tier]}점</span>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => router.push(`/battle/play?tier=${selectedTier}`)}
              className="w-full py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-black text-lg hover:from-red-600 hover:to-orange-600 transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-red-500/25"
            >
              배틀 시작하기
            </button>
          </div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-20 w-80 h-80 bg-red-500/10 rounded-full blur-3xl"></div>
        </div>
      </div>

      {/* 내 전적 */}
      {userId && (
        <div className="lg:col-span-8">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">bar_chart</span>
              내 전적
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-primary">{totalBattles}</p>
                <p className="text-xs text-slate-500">총 배틀</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-orange-500">
                  {Math.max(bestScores.all, bestScores.high_below, bestScores.middle_only)}
                </p>
                <p className="text-xs text-slate-500">최고점수</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-violet-500">
                  {myRank ? `#${myRank}` : "-"}
                </p>
                <p className="text-xs text-slate-500">랭킹</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="flex justify-center gap-1 text-sm">
                  {TIERS.map(t => (
                    <span key={t} className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                      bestScores[t] > 0 ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                    }`}>
                      {GRADE_TIER_LABELS[t].charAt(0)}{bestScores[t] > 0 ? bestScores[t] : "-"}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">티어별 최고</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 틀린 단어 요약 */}
      {battleWrongWords.length > 0 && (
        <div className="lg:col-span-8">
          <div className="bg-red-50 rounded-xl border border-red-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-red-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">error_outline</span>
                배틀 틀린 단어
                <span className="bg-red-200 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">{battleWrongWords.length}개</span>
              </h3>
              <Link href="/wrong-words" className="text-red-500 text-sm font-semibold hover:underline">
                전체보기
              </Link>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {battleWrongWords.slice(0, 5).map((w) => (
                <div key={w.word} className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-red-200">
                  <span className="text-sm font-bold text-red-800">{w.word}</span>
                  <span className="text-xs text-red-400">x{w.count}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => router.push("/wrong-words")}
              className="w-full py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
            >
              틀린 단어로 학습하기
            </button>
          </div>
        </div>
      )}

      {/* 최근 배틀 */}
      {recentBattles.length > 0 && (
        <div className="lg:col-span-8">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-500">history</span>
                최근 배틀
              </h3>
              <Link href="/battle/rank" className="text-primary text-sm font-semibold hover:underline">
                랭킹 보기
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {recentBattles.map((battle) => {
                const wrongCount = battle.wrong_words?.length || (battle.total_count - battle.correct_count);
                return (
                  <div key={battle.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        battle.grade_tier === "all" ? "bg-red-100 text-red-600" :
                        battle.grade_tier === "high_below" ? "bg-violet-100 text-violet-600" :
                        "bg-blue-100 text-blue-600"
                      }`}>
                        {GRADE_TIER_LABELS[battle.grade_tier]}
                      </span>
                      <div>
                        <span className="font-bold text-sm">{battle.score}점</span>
                        <span className="text-xs text-slate-400 ml-2">
                          {battle.correct_count}정답 / {wrongCount}오답
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(battle.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 사이드바 */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        {/* 레벨 + 스트릭 */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-4 mb-3">
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
                  <p className="text-sm font-bold">배틀로 시작하세요</p>
                  <p className="text-[10px] text-slate-400">단어 실력을 테스트해보세요</p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 rounded-xl">
            <span className="material-symbols-outlined text-orange-500 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            <div>
              <p className="text-2xl font-black">{gameProfile?.streak || 0}<span className="text-sm font-medium text-slate-400 ml-0.5">일</span></p>
              <p className="text-[10px] text-slate-400">연속 학습</p>
            </div>
          </div>
        </div>

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

        {/* 빠른 링크 */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold mb-3">빠른 메뉴</h3>
          <div className="space-y-2">
            <Link href="/wrong-words" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
              <span className="material-symbols-outlined text-red-400">auto_stories</span>
              <span className="text-sm font-medium">오답 노트</span>
              {(battleWrongWords.length > 0 || weakWords.length > 0) && (
                <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  {battleWrongWords.length + weakWords.length}
                </span>
              )}
            </Link>
            <Link href="/battle/rank" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
              <span className="material-symbols-outlined text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
              <span className="text-sm font-medium">랭킹</span>
            </Link>
            <Link href="/study/input" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
              <span className="material-symbols-outlined text-primary">menu_book</span>
              <span className="text-sm font-medium">단어장 학습</span>
            </Link>
            <Link href="/leaderboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
              <span className="material-symbols-outlined text-violet-500">leaderboard</span>
              <span className="text-sm font-medium">학습 리더보드</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
