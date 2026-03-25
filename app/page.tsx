import type { Metadata } from "next";
import HomeClient from "./_components/HomeClient";

export const metadata: Metadata = {
  title: "VocabMaster - 영단어 배틀 & 학습",
  description: "목숨 3개로 도전하는 영단어 배틀! 중등·고등 필수 영단어를 스피드 퀴즈로 마스터하세요. 랭킹 경쟁, 오답 복습, 간격 반복 학습까지.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 lg:px-8">
      {/* SEO용 숨김 콘텐츠 — 크롤러가 읽을 수 있는 정적 텍스트 */}
      <h1 className="sr-only">VocabMaster - 영단어 배틀 학습 플랫폼</h1>
      <section className="sr-only">
        <h2>영단어 배틀이란?</h2>
        <p>VocabMaster의 영단어 배틀은 목숨 3개로 도전하는 스피드 영어 단어 퀴즈입니다. 중등 필수 영단어, 고등 영단어, 전체 통합 모드에서 10초 안에 정답을 입력하세요. 빠르게 맞출수록 콤보 점수가 올라갑니다.</p>
        <h2>주요 기능</h2>
        <ul>
          <li>영단어 배틀 - 목숨 3개, 10초 제한 스피드 퀴즈</li>
          <li>중등/고등/통합 난이도 선택</li>
          <li>실시간 랭킹 경쟁</li>
          <li>틀린 단어 자동 오답 노트</li>
          <li>간격 반복 복습 시스템</li>
          <li>5단계 체계적 단어 학습</li>
        </ul>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <HomeClient />
      </div>
    </div>
  );
}
