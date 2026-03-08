"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getBattleWordCounts, GradeTier, GRADE_TIER_LABELS, getMyBestScore } from "@/lib/battle";

const TIER_INFO: { tier: GradeTier; icon: string; color: string; bg: string; border: string }[] = [
  { tier: "middle_only", icon: "school", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  { tier: "high_below", icon: "auto_stories", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
  { tier: "all", icon: "military_tech", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
];

export default function BattlePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<GradeTier, number> | null>(null);
  const [bestScores, setBestScores] = useState<Record<GradeTier, number>>({ all: 0, high_below: 0, middle_only: 0 });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/auth");
        return;
      }
      setUserId(user.id);
      setLoading(false);

      // 단어 수는 비동기로 로드 (카드는 먼저 표시)
      getBattleWordCounts().then(setCounts).catch(() => {});

      // 각 등급 최고점수 조회 (테이블 없어도 에러 무시)
      Promise.all([
        getMyBestScore(user.id, "all").catch(() => 0),
        getMyBestScore(user.id, "high_below").catch(() => 0),
        getMyBestScore(user.id, "middle_only").catch(() => 0),
      ]).then(([all, hb, mo]) => {
        setBestScores({ all, high_below: hb, middle_only: mo });
      });
    });
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-white mb-4">
          <span className="material-symbols-outlined text-4xl">swords</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">마스터 워드 배틀</h1>
        <p className="text-slate-500">한글 뜻과 발음을 보고 영어 단어를 입력하세요!</p>
      </div>

      <div className="flex flex-col gap-4">
        {TIER_INFO.map(({ tier, icon, color, bg, border }) => (
          <button
            key={tier}
            onClick={() => router.push(`/battle/play?tier=${tier}`)}
            className={`flex items-center gap-4 p-5 rounded-xl ${bg} border ${border} hover:shadow-md transition-all text-left group`}
          >
            <div className={`flex items-center justify-center w-14 h-14 rounded-xl ${color} bg-white shadow-sm`}>
              <span className="material-symbols-outlined text-3xl">{icon}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">{GRADE_TIER_LABELS[tier]}</h3>
                <span className="text-xs font-medium text-slate-400">
                  {counts ? `${counts[tier]}단어` : "..."}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {tier === "middle_only" && "중등 필수 단어"}
                {tier === "high_below" && "중등 + 고등 단어"}
                {tier === "all" && "전체 단어 통합"}
              </p>
              {bestScores[tier] > 0 && (
                <p className="text-xs font-bold text-primary mt-1">
                  최고점수: {bestScores[tier]}점
                </p>
              )}
            </div>
            <span className="material-symbols-outlined text-slate-300 group-hover:text-slate-500 transition-colors">
              arrow_forward
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={() => router.push("/battle/rank")}
          className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
        >
          <span className="material-symbols-outlined text-sm">emoji_events</span>
          랭킹 보기
        </button>
      </div>
    </div>
  );
}
