"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getBattleWordCounts, GradeTier, GRADE_TIER_LABELS, getMyBestScore, loadBattleSave, clearBattleSave, BattleSaveState, GRADE_ORDER, GRADE_LABELS } from "@/lib/battle";

const TIER_INFO: { tier: GradeTier; icon: string; gradient: string }[] = [
  { tier: "middle_only", icon: "school", gradient: "from-blue-500 to-blue-600" },
  { tier: "high_below", icon: "auto_stories", gradient: "from-violet-500 to-violet-600" },
  { tier: "all", icon: "military_tech", gradient: "from-red-500 to-orange-500" },
];

export default function BattleClient() {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<GradeTier, number> | null>(null);
  const [bestScores, setBestScores] = useState<Record<GradeTier, number>>({ all: 0, high_below: 0, middle_only: 0 });
  const [selectedTier, setSelectedTier] = useState<GradeTier | null>(null);
  const [savedGame, setSavedGame] = useState<BattleSaveState | null>(null);

  useEffect(() => {
    const saved = loadBattleSave();
    if (saved) setSavedGame(saved);

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        Promise.all([
          getMyBestScore(user.id, "all").catch(() => 0),
          getMyBestScore(user.id, "high_below").catch(() => 0),
          getMyBestScore(user.id, "middle_only").catch(() => 0),
        ]).then(([all, hb, mo]) => {
          setBestScores({ all, high_below: hb, middle_only: mo });
        });
      }
      getBattleWordCounts().then(setCounts).catch(() => {});
    });
  }, [router]);

  return (
    <>
      {/* 저장된 게임 이어하기 */}
      {savedGame && (
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100">
              <span className="material-symbols-outlined text-orange-600">bookmark</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900">저장된 배틀이 있어요!</h3>
              <p className="text-xs text-slate-500">{GRADE_TIER_LABELS[savedGame.tier]} &middot; {GRADE_LABELS[GRADE_ORDER[savedGame.gradeIndex || 0]]} 단어 &middot; {savedGame.questionOffset || savedGame.correctCount}문제 진행 &middot; {savedGame.score}점</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/battle/play?tier=${savedGame.tier}&resume=1`)}
              className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-bold hover:from-orange-600 hover:to-yellow-600 transition-all"
            >
              이어서 도전하기
            </button>
            <button
              onClick={() => { clearBattleSave(); setSavedGame(null); }}
              className="px-4 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-bold hover:bg-slate-50 transition-colors text-sm"
            >
              삭제
            </button>
          </div>
        </div>
      )}

      {/* 난이도 선택 + 시작 */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
        <div className="text-center mb-6">
          <p className="text-2xl mb-2">&#x1F525;</p>
          <h2 className="text-xl font-bold mb-1">준비되었나요?</h2>
          <p className="text-sm text-slate-400">지금 바로 배틀을 시작하세요.</p>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          {TIER_INFO.map(({ tier, icon, gradient }) => {
            const isSelected = selectedTier === tier;
            return (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`flex items-center gap-4 p-4 rounded-xl transition-all text-left ${
                  isSelected
                    ? "bg-white/15 border-2 border-white/40 shadow-lg"
                    : "bg-white/5 border-2 border-white/10 hover:bg-white/10"
                }`}
              >
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
                  <span className="material-symbols-outlined text-2xl">{icon}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{GRADE_TIER_LABELS[tier]}</h3>
                    <span className="text-xs text-slate-400">
                      {counts ? `${counts[tier]}단어` : "..."}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {tier === "middle_only" && "중등 필수 단어"}
                    {tier === "high_below" && "중등 + 고등 단어"}
                    {tier === "all" && "전체 단어 통합"}
                  </p>
                  {bestScores[tier] > 0 && (
                    <p className="text-xs font-bold text-yellow-400 mt-1">
                      최고점수: {bestScores[tier]}점
                    </p>
                  )}
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected ? "border-white bg-white" : "border-white/30"
                }`}>
                  {isSelected && (
                    <span className="material-symbols-outlined text-slate-900 text-base">check</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => selectedTier && router.push(`/battle/play?tier=${selectedTier}`)}
          disabled={!selectedTier}
          className="w-full py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-black text-lg hover:from-red-600 hover:to-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-500/25"
        >
          배틀 시작하기
        </button>

        <div className="mt-4 text-center">
          <button
            onClick={() => router.push("/battle/rank")}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-sm">emoji_events</span>
            랭킹 보기
          </button>
        </div>
      </div>
    </>
  );
}
