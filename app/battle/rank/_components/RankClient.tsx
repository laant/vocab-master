"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getIndividualRanking,
  getGroupRanking,
  BattleRankEntry,
  GroupRankEntry,
  GradeTier,
  GRADE_TIER_LABELS,
} from "@/lib/battle";
import { getUserProfile } from "@/lib/leaderboard";

function RankContent() {
  const searchParams = useSearchParams();
  const initialTier = (searchParams.get("tier") || "middle_only") as GradeTier;

  const [tier, setTier] = useState<GradeTier>(initialTier);
  const [tab, setTab] = useState<"individual" | "group">("individual");
  const [individuals, setIndividuals] = useState<BattleRankEntry[]>([]);
  const [groups, setGroups] = useState<GroupRankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [myGroup, setMyGroup] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        getUserProfile(user.id).then((p) => {
          if (p?.user_group) setMyGroup(p.user_group);
        });
      }
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getIndividualRanking(tier),
      getGroupRanking(tier),
    ]).then(([ind, grp]) => {
      setIndividuals(ind);
      setGroups(grp);
      setLoading(false);
    });
  }, [tier]);

  const tiers: GradeTier[] = ["middle_only", "high_below", "all"];

  const rankBadge = (rank: number) => {
    if (rank === 1) return "bg-yellow-100 text-yellow-700 border-yellow-300";
    if (rank === 2) return "bg-slate-100 text-slate-600 border-slate-300";
    if (rank === 3) return "bg-orange-100 text-orange-700 border-orange-300";
    return "bg-slate-50 text-slate-500 border-slate-200";
  };

  return (
    <>
      {/* 등급 탭 */}
      <div className="flex gap-2 mb-4">
        {tiers.map((t) => (
          <button
            key={t}
            onClick={() => setTier(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
              tier === t
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {GRADE_TIER_LABELS[t]}
          </button>
        ))}
      </div>

      {/* 개인/그룹 탭 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("individual")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${
            tab === "individual"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          <span className="material-symbols-outlined text-lg">person</span>
          개인 랭킹
        </button>
        <button
          onClick={() => setTab("group")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${
            tab === "group"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          <span className="material-symbols-outlined text-lg">groups</span>
          그룹 랭킹
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
        </div>
      ) : tab === "individual" ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm divide-y divide-slate-50">
          {individuals.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2">swords</span>
              <p className="font-medium">아직 참여자가 없습니다</p>
              <p className="text-sm">첫 번째 도전자가 되어보세요!</p>
            </div>
          ) : (
            individuals.map((entry, i) => {
              const rank = i + 1;
              const isMe = entry.user_id === userId;
              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-3 px-5 py-4 ${isMe ? "bg-primary/5" : ""}`}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border text-sm font-bold ${rankBadge(rank)}`}>
                    {rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">
                      {entry.nickname}
                      {isMe && <span className="text-primary ml-1">(나)</span>}
                    </p>
                    {entry.user_group && (
                      <p className="text-[10px] text-slate-400 truncate">{entry.user_group}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-black text-primary">{entry.score}</p>
                    <p className="text-[10px] text-slate-400">
                      {entry.correct_count}/{entry.total_count} · {entry.max_combo}콤보
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm divide-y divide-slate-50">
          {groups.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2">groups</span>
              <p className="font-medium">그룹 랭킹 데이터가 없습니다</p>
              <p className="text-sm">프로필에서 소속을 설정하고 배틀에 참여하세요!</p>
            </div>
          ) : (
            groups.map((entry, i) => {
              const rank = i + 1;
              const isMyGroup = entry.group_name === myGroup;
              return (
                <div
                  key={entry.group_name}
                  className={`flex items-center gap-3 px-5 py-4 ${isMyGroup ? "bg-primary/5" : ""}`}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border text-sm font-bold ${rankBadge(rank)}`}>
                    {rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">
                      {entry.group_name}
                      {isMyGroup && <span className="text-primary ml-1">(내 그룹)</span>}
                    </p>
                    <p className="text-[10px] text-slate-400">{entry.member_count}명 참여</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-primary">{entry.total_score}</p>
                    <p className="text-[10px] text-slate-400">합산 점수</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
}

export default function RankClient() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
      </div>
    }>
      <RankContent />
    </Suspense>
  );
}
