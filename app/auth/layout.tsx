import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인",
  description: "VocabMaster에 로그인하여 학습 데이터를 동기화하고 랭킹에 참여하세요.",
  alternates: { canonical: "/auth" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
