import type { Metadata } from "next";
import LeaderboardClient from "./_components/LeaderboardClient";

export const metadata: Metadata = {
  title: "학습 리더보드",
  description: "VocabMaster 학습 리더보드. XP, 연속 학습일, 이번 주 학습량으로 순위를 확인하세요. 친구들과 학습 성과를 비교해보세요.",
  openGraph: {
    title: "학습 리더보드 | VocabMaster",
    description: "XP, 연속 학습일, 이번 주 학습량으로 순위를 확인하세요.",
  },
  alternates: { canonical: "/leaderboard" },
};

export default function LeaderboardPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 mb-4">
          <span className="material-symbols-outlined text-4xl text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>
            emoji_events
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-2">학습 리더보드</h1>
        <p className="text-slate-500">학습 성과를 비교해보세요</p>
      </div>
      <LeaderboardClient />
    </div>
  );
}
