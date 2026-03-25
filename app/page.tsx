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

      {/* 게임 규칙 — 서버 렌더링 (SEO + 설명) */}
      <div className="max-w-3xl mx-auto mt-10">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
            <span className="text-xl">&#x2694;&#xFE0F;</span> Master Words Battle이란?
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-5">
            단순한 단어 암기가 아닙니다. 지금까지 쌓아온 영어 단어 실력을{" "}
            <span className="font-semibold text-slate-700">스피드</span>와{" "}
            <span className="font-semibold text-slate-700">정확성</span>으로 겨루는 배틀 모드입니다.
          </p>

          <h3 className="text-base font-bold flex items-center gap-2 mb-3">
            <span className="text-lg">&#x1F3AF;</span> 게임 규칙
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            발음과 뜻을 보고 <span className="font-bold text-slate-900">10초 안에</span> 정확한 영어 단어를 입력하세요.
            빠르게 맞출수록 <span className="font-bold text-orange-600">Combo</span> 점수가 올라가고,
            Combo가 이어질수록 점수는 더 크게 증가합니다.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 bg-slate-50 rounded-lg p-3">
              <span className="material-symbols-outlined text-primary mt-0.5">shuffle</span>
              <p className="text-sm text-slate-600">선택한 난이도 이하의 <span className="font-semibold text-slate-800">전체 단어 DB</span>에서 랜덤 출제</p>
            </div>
            <div className="flex items-start gap-3 bg-slate-50 rounded-lg p-3">
              <span className="material-symbols-outlined text-red-500 mt-0.5">favorite</span>
              <p className="text-sm text-slate-600">목숨 <span className="font-semibold text-red-600">3개</span> &mdash; 3번 틀리면 종료 (10초 제한)</p>
            </div>
            <div className="flex items-start gap-3 bg-slate-50 rounded-lg p-3">
              <span className="material-symbols-outlined text-orange-500 mt-0.5">bolt</span>
              <p className="text-sm text-slate-600"><span className="font-semibold text-slate-800">5초 이내</span> 정답 &rarr; Combo 점수 증가</p>
            </div>
            <div className="flex items-start gap-3 bg-slate-50 rounded-lg p-3">
              <span className="material-symbols-outlined text-violet-500 mt-0.5">trending_up</span>
              <p className="text-sm text-slate-600">Combo가 이어질수록 <span className="font-semibold text-slate-800">추가 점수 계속 상승</span></p>
            </div>
            <div className="flex items-start gap-3 bg-green-50 rounded-lg p-3">
              <span className="material-symbols-outlined text-green-500 mt-0.5">trending_up</span>
              <p className="text-sm text-slate-600"><span className="font-semibold text-slate-800">중등 단어</span>를 모두 풀면 자동으로 <span className="font-semibold text-slate-800">고등 단어</span>로 승급</p>
            </div>
            <div className="flex items-start gap-3 bg-blue-50 rounded-lg p-3">
              <span className="material-symbols-outlined text-blue-500 mt-0.5">bookmark</span>
              <p className="text-sm text-slate-600"><span className="font-semibold text-slate-800">100문제마다</span> 일시정지 &mdash; 저장 후 <span className="font-semibold text-slate-800">점수와 콤보 유지</span>한 채 이어하기</p>
            </div>
          </div>
        </div>

        {/* 랭킹 소개 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
              <span className="text-xl">&#x1F3C6;</span> 개인 랭킹
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              도전은 언제든지 다시 할 수 있습니다. 하지만 랭킹에는 <span className="font-semibold text-slate-700">가장 높은 점수만</span> 기록됩니다.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
              <span className="text-xl">&#x1F3EB;</span> 그룹 랭킹
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              배틀은 개인전이지만 점수는 <span className="font-semibold text-slate-700">소속 그룹(학교/팀)</span>에도 합산됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
