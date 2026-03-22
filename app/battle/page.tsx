"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getBattleWordCounts, GradeTier, GRADE_TIER_LABELS, getMyBestScore } from "@/lib/battle";

const TIER_INFO: { tier: GradeTier; icon: string; color: string; bg: string; border: string; gradient: string }[] = [
  { tier: "middle_only", icon: "school", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", gradient: "from-blue-500 to-blue-600" },
  { tier: "high_below", icon: "auto_stories", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", gradient: "from-violet-500 to-violet-600" },
  { tier: "all", icon: "military_tech", color: "text-red-600", bg: "bg-red-50", border: "border-red-200", gradient: "from-red-500 to-orange-500" },
];

export default function BattlePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<GradeTier, number> | null>(null);
  const [bestScores, setBestScores] = useState<Record<GradeTier, number>>({ all: 0, high_below: 0, middle_only: 0 });
  const [selectedTier, setSelectedTier] = useState<GradeTier | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        Promise.all([
          getMyBestScore(user.id, "all").catch(() => 0),
          getMyBestScore(user.id, "high_below").catch(() => 0),
          getMyBestScore(user.id, "middle_only").catch(() => 0),
        ]).then(([all, hb, mo]) => {
          setBestScores({ all, high_below: hb, middle_only: mo });
        });
      }
      setLoading(false);
      getBattleWordCounts().then(setCounts).catch(() => {});
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

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 sm:p-10 text-white mb-8 shadow-2xl">
        <div className="relative z-10 text-center">
          <p className="text-5xl mb-4">&#x2694;&#xFE0F;</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">Master Words Battle</h1>
          <p className="text-lg font-medium text-white/90 mb-4">단어 실력을 시험할 시간입니다.</p>
          <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            Master Words Battle은 단순한 단어 암기가 아닙니다.<br />
            지금까지 쌓아온 영어 단어 실력을 <span className="text-white font-semibold">스피드</span>와 <span className="text-white font-semibold">정확성</span>으로 겨루는 배틀 모드입니다.
          </p>
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-20 w-80 h-80 bg-red-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 -mr-10 -mb-10 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl"></div>
      </div>

      {/* 게임 규칙 */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 sm:p-8 mb-6">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
          <span className="text-xl">&#x1F3AF;</span> 게임 규칙
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          발음과 뜻을 보고 <span className="font-bold text-slate-900">10초 안에</span> 정확한 영어 단어를 입력하세요.<br />
          빠르게 맞출수록 <span className="font-bold text-orange-600">Combo</span> 점수가 올라가고,
          Combo가 이어질수록 점수는 더 크게 증가합니다.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-3 bg-slate-50 rounded-lg p-3">
            <span className="material-symbols-outlined text-primary mt-0.5">shuffle</span>
            <p className="text-sm text-slate-600">선택한 난이도 이하의 <span className="font-semibold text-slate-800">전체 단어 DB</span>에서 랜덤 출제</p>
          </div>
          <div className="flex items-start gap-3 bg-slate-50 rounded-lg p-3">
            <span className="material-symbols-outlined text-red-500 mt-0.5">timer</span>
            <p className="text-sm text-slate-600">각 문제는 <span className="font-semibold text-slate-800">10초 제한</span> &mdash; 틀리면 즉시 종료</p>
          </div>
          <div className="flex items-start gap-3 bg-slate-50 rounded-lg p-3">
            <span className="material-symbols-outlined text-orange-500 mt-0.5">bolt</span>
            <p className="text-sm text-slate-600"><span className="font-semibold text-slate-800">5초 이내</span> 정답 &rarr; Combo 점수 증가</p>
          </div>
          <div className="flex items-start gap-3 bg-slate-50 rounded-lg p-3">
            <span className="material-symbols-outlined text-violet-500 mt-0.5">trending_up</span>
            <p className="text-sm text-slate-600">Combo가 이어질수록 <span className="font-semibold text-slate-800">추가 점수 계속 상승</span></p>
          </div>
        </div>
      </div>

      {/* 개인 랭킹 + 그룹 랭킹 (2열) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
            <span className="text-xl">&#x1F3C6;</span> 개인 랭킹
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            도전은 언제든지 다시 할 수 있습니다. 하지만 랭킹에는 <span className="font-semibold text-slate-700">가장 높은 점수만</span> 기록됩니다.
          </p>
          <div className="flex flex-col gap-1 mt-3 text-xs text-slate-500">
            <span>&#x2022; 최고 기록에 도전하세요</span>
            <span>&#x2022; 더 빠르게, 더 정확하게</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
            <span className="text-xl">&#x1F3EB;</span> 그룹 랭킹
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            배틀은 개인전이지만 점수는 <span className="font-semibold text-slate-700">소속 그룹(학교/팀)</span>에도 합산됩니다. 당신의 도전이 학교의 순위를 바꿀 수도 있습니다.
          </p>
          <div className="flex flex-col gap-1 mt-3 text-xs text-slate-500">
            <span>&#x2022; 친구들과 함께 도전하세요</span>
          </div>
        </div>
      </div>

      {/* 준비되었나요? + 난이도 선택 + 버튼 */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
        <div className="text-center mb-6">
          <p className="text-2xl mb-2">&#x1F525;</p>
          <h2 className="text-xl font-bold mb-1">준비되었나요?</h2>
          <p className="text-sm text-slate-400">지금 바로 배틀을 시작하세요.<br />당신의 단어 실력은 과연 어느 정도일까요?</p>
        </div>

        {/* 난이도 선택 */}
        <div className="flex flex-col gap-3 mb-6">
          {TIER_INFO.map(({ tier, icon, color, bg, border, gradient }) => {
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

        {/* 시작 버튼 */}
        <button
          onClick={() => selectedTier && router.push(`/battle/play?tier=${selectedTier}`)}
          disabled={!selectedTier}
          className="w-full py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-black text-lg hover:from-red-600 hover:to-orange-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-500/25"
        >
          배틀 시작하기
        </button>

        {/* 랭킹 보기 */}
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
    </div>
  );
}
