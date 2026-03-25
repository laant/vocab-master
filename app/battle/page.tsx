import type { Metadata } from "next";
import BattleClient from "./_components/BattleClient";

export const metadata: Metadata = {
  title: "영단어 배틀",
  description: "목숨 3개로 도전하는 영단어 스피드 배틀! 중등·고등 필수 영단어 DB에서 랜덤 출제. 10초 안에 정답을 입력하고 콤보 점수를 쌓으세요.",
  openGraph: {
    title: "영단어 배틀 | VocabMaster",
    description: "목숨 3개로 도전하는 영단어 스피드 배틀! 10초 안에 정답을 입력하고 콤보 점수를 쌓으세요.",
  },
  alternates: { canonical: "/battle" },
};

export default function BattlePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* 히어로 — 서버 렌더링 (SEO) */}
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

      {/* 게임 규칙 — 서버 렌더링 (SEO) */}
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

      {/* 랭킹 소개 — 서버 렌더링 (SEO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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

      {/* 클라이언트 인터랙티브 영역 */}
      <BattleClient />
    </div>
  );
}
