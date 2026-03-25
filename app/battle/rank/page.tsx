import type { Metadata } from "next";
import RankClient from "./_components/RankClient";

export const metadata: Metadata = {
  title: "배틀 랭킹",
  description: "VocabMaster 영단어 배틀 랭킹! 중등·고등·통합 티어별 개인 및 그룹 랭킹을 확인하세요. 최고 점수에 도전하고 친구들과 경쟁하세요.",
  openGraph: {
    title: "배틀 랭킹 | VocabMaster",
    description: "영단어 배틀 티어별 개인 및 그룹 랭킹. 최고 점수에 도전하세요!",
  },
  alternates: { canonical: "/battle/rank" },
};

export default function BattleRankPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-orange-500" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
          배틀 랭킹
        </h1>
        <p className="text-sm text-slate-500 mt-1">영단어 배틀 최고 점수를 겨뤄보세요</p>
      </div>
      <RankClient />
    </div>
  );
}
