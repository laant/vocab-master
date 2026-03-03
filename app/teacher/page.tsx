'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getMyStudents, StudentStats } from '@/lib/teacher';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

export default function TeacherPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentStats[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      const data = await getMyStudents();
      setStudents(data);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-50 mb-4">
          <span className="material-symbols-outlined text-4xl text-teal-500" style={{ fontVariationSettings: "'FILL' 1" }}>
            groups
          </span>
        </div>
        <h2 className="text-2xl font-bold mb-2">내 학생</h2>
        <p className="text-slate-500">나를 선생님으로 등록한 학생들의 학습 현황</p>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">person_off</span>
          <p className="text-slate-400">아직 등록한 학생이 없습니다</p>
          <p className="text-slate-400 text-sm mt-1">학생이 프로필에서 선생님 이메일을 등록하면 여기에 표시됩니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          {students.map((student) => {
            const isExpanded = expandedId === student.user_id;
            const lastSession = student.sessions[0];
            return (
              <div key={student.user_id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* 접힌 상태: 프로필 + 연속학습일 + 최근학습 */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : student.user_id)}
                  className="w-full flex items-center gap-3 p-4 sm:p-5 text-left hover:bg-slate-50 transition-colors"
                >
                  {/* 프로필 */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-teal-100 text-teal-600 shrink-0">
                    <span className="font-bold text-sm">Lv.{student.level}</span>
                  </div>
                  <div className="min-w-0 shrink-0">
                    <p className="font-bold text-sm truncate">{student.nickname}</p>
                    <p className="text-xs text-slate-400">{student.levelTitle}</p>
                  </div>

                  {/* 연속 학습일 */}
                  <div className="flex items-center gap-1 shrink-0 ml-auto">
                    <span className="material-symbols-outlined text-base text-orange-400" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                    <span className="text-sm font-bold text-orange-500">{student.streak}일</span>
                  </div>

                  {/* 최근 학습 */}
                  <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 shrink-0">
                    {lastSession ? (
                      <>
                        <span>{timeAgo(lastSession.date)}</span>
                        <span className="text-slate-300">·</span>
                        <span>{lastSession.name}</span>
                        <span className={`font-bold ${lastSession.completed ? 'text-green-500' : 'text-amber-500'}`}>
                          {lastSession.completed ? 'O' : 'X'}
                        </span>
                      </>
                    ) : (
                      <span>학습 이력 없음</span>
                    )}
                  </div>

                  <span className={`material-symbols-outlined text-slate-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>

                {/* 모바일: 접힌 상태에서도 최근 학습 표시 */}
                {!isExpanded && lastSession && (
                  <div className="sm:hidden px-4 pb-3 -mt-1">
                    <p className="text-xs text-slate-400">
                      최근: {timeAgo(lastSession.date)} · {lastSession.name}
                      <span className={`ml-1 font-bold ${lastSession.completed ? 'text-green-500' : 'text-amber-500'}`}>
                        {lastSession.completed ? 'O' : 'X'}
                      </span>
                    </p>
                  </div>
                )}

                {/* 펼친 상태: 전체 회차 리스트 + 오답 */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 sm:px-5 pb-5">
                    {/* 요약 통계 */}
                    <div className="flex items-center gap-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">XP</span>
                        <span className="font-bold text-violet-600">{student.xp.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">배지</span>
                        <span className="font-bold text-emerald-500">{student.badgeCount}개</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">총 학습</span>
                        <span className="font-bold text-primary">{student.sessions.length}회</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">완료</span>
                        <span className="font-bold text-green-500">{student.sessions.filter(s => s.completed).length}회</span>
                      </div>
                    </div>

                    {/* 전체 회차 리스트 */}
                    <div className="mt-2">
                      <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base text-primary">history</span>
                        전체 학습 이력
                      </h4>
                      {student.sessions.length === 0 ? (
                        <p className="text-xs text-slate-400 pl-6">학습 이력이 없습니다</p>
                      ) : (
                        <div className="space-y-1.5">
                          {student.sessions.map((s, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 text-sm">
                              {/* 완료 여부 */}
                              <span className={`font-bold text-base shrink-0 ${s.completed ? 'text-green-500' : 'text-red-400'}`}>
                                {s.completed ? 'O' : 'X'}
                              </span>
                              {/* 날짜 */}
                              <span className="text-xs text-slate-400 shrink-0 w-16">
                                {formatDate(s.date)}
                              </span>
                              {/* 세션명 */}
                              <span className="flex-1 truncate text-slate-600 text-xs sm:text-sm">{s.name}</span>
                              {/* 단어 수 */}
                              <span className="text-xs text-slate-500 shrink-0">{s.wordCount}단어</span>
                              {/* 정답률 (완료된 것만) */}
                              {s.completed && (
                                <span className={`text-xs font-bold shrink-0 ${
                                  s.accuracy >= 90 ? 'text-green-500' :
                                  s.accuracy >= 70 ? 'text-amber-500' : 'text-red-500'
                                }`}>
                                  {s.accuracy}%
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 오답 단어 */}
                    {student.wrongWords.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base text-red-400">close</span>
                          오답 단어
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {student.wrongWords.map((w) => (
                            <div
                              key={w.word}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200"
                            >
                              <span className="text-xs font-medium text-red-700">{w.word}</span>
                              <span className="text-[10px] text-red-400">x{w.wrongCount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
