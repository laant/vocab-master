import type { Metadata } from "next";
import WrongWordsClient from "./_components/WrongWordsClient";

export const metadata: Metadata = {
  title: "오답 노트",
  description: "배틀과 학습에서 틀린 영단어를 모아 복습하세요. 오답 빈도 분석, 출처별 분류, 간격 반복 학습으로 완벽하게 마스터하세요.",
  openGraph: {
    title: "오답 노트 | VocabMaster",
    description: "틀린 영단어를 모아 복습하세요. 오답 빈도 분석으로 약점을 파악하세요.",
  },
  alternates: { canonical: "/wrong-words" },
};

export default function WrongWordsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* 헤더 — 서버 렌더링 (SEO) */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
          <span className="material-symbols-outlined text-4xl text-red-400">
            auto_stories
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-2">오답 노트</h1>
        <p className="text-slate-500">
          배틀과 학습에서 틀린 단어를 모아봤어요. 복습하면 완벽해질 거예요!
        </p>
      </div>
      <WrongWordsClient />
    </div>
  );
}
