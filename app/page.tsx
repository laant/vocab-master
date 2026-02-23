"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSessions } from "@/lib/storage";
import { StudySession, STEP_INFO } from "@/types";

export default function HomePage() {
  const [sessions, setSessions] = useState<StudySession[]>([]);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
          <span className="material-symbols-outlined text-5xl text-primary">
            school
          </span>
        </div>
        <h2 className="text-3xl font-bold mb-3">영단어 마스터</h2>
        <p className="text-slate-500 text-lg">
          5단계 학습법으로 영단어를 완벽하게 외워보세요
        </p>
      </div>

      {/* 새 학습 시작 */}
      <Link
        href="/study/input"
        className="flex items-center justify-between bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:border-primary hover:shadow-md transition-all mb-8 group"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
            <span className="material-symbols-outlined text-2xl">add</span>
          </div>
          <div>
            <h3 className="font-bold text-lg">새 학습 시작</h3>
            <p className="text-slate-500 text-sm">단어 10개를 입력하고 학습을 시작하세요</p>
          </div>
        </div>
        <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">
          arrow_forward
        </span>
      </Link>

      {/* 학습 단계 소개 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
        <h3 className="font-bold text-lg mb-4">5단계 학습법</h3>
        <div className="space-y-3">
          {([1, 2, 3, 4, 5] as const).map((step) => (
            <div key={step} className="flex items-center gap-3 py-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                {step}
              </div>
              <div className="flex-1">
                <span className="font-medium">{STEP_INFO[step].title}</span>
                <span className="text-slate-400 text-sm ml-2">
                  {STEP_INFO[step].description}
                </span>
              </div>
              <span className="material-symbols-outlined text-slate-300">
                {STEP_INFO[step].icon}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 최근 학습 이력 */}
      {sessions.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="font-bold text-lg mb-4">최근 학습</h3>
          <div className="space-y-3">
            {sessions.slice(-5).reverse().map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
              >
                <div>
                  <p className="font-medium text-sm">
                    {session.words.slice(0, 3).map((w) => w.word).join(", ")}
                    {session.words.length > 3 && ` 외 ${session.words.length - 3}개`}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(session.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-500">
                  <span className="material-symbols-outlined text-sm">
                    {STEP_INFO[session.currentStep as keyof typeof STEP_INFO]?.icon}
                  </span>
                  Step {session.currentStep}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
