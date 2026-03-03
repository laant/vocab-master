'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getMyStudents, StudentStats } from '@/lib/teacher';

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
            return (
              <div key={student.user_id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* 학생 요약 (클릭 시 펼침) */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : student.user_id)}
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-teal-100 text-teal-600 shrink-0">
                    <span className="font-bold text-sm">Lv.{student.level}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{student.nickname}</p>
                    <p className="text-xs text-slate-400">{student.levelTitle}</p>
                  </div>
                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div>
                      <p className="text-sm font-bold text-violet-600">{student.xp.toLocaleString()} XP</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-orange-500">{student.streak}일</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">
                        배지 {student.badgeCount}
                      </p>
                    </div>
                    <span className={`material-symbols-outlined text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </div>
                </button>

                {/* 상세 통계 (아코디언) */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 pb-5">
                    {/* 학습 이력 */}
                    <div className="mt-4">
                      <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base text-primary">history</span>
                        최근 학습 이력
                      </h4>
                      {student.sessions.length === 0 ? (
                        <p className="text-xs text-slate-400 pl-6">완료된 학습이 없습니다</p>
                      ) : (
                        <div className="space-y-2">
                          {student.sessions.map((s, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 text-sm">
                              <span className="text-xs text-slate-400 shrink-0 w-20">
                                {new Date(s.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                              </span>
                              <span className="flex-1 truncate text-slate-600">{s.name}</span>
                              <span className="text-xs text-slate-500 shrink-0">{s.wordCount}단어</span>
                              <span className={`text-xs font-bold shrink-0 ${
                                s.accuracy >= 90 ? 'text-green-500' :
                                s.accuracy >= 70 ? 'text-amber-500' : 'text-red-500'
                              }`}>
                                {s.accuracy}%
                              </span>
                              {s.wrongCount > 0 && (
                                <span className="text-xs text-red-400 shrink-0">오답 {s.wrongCount}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 오답 단어 */}
                    <div className="mt-5">
                      <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base text-red-400">close</span>
                        오답 단어
                      </h4>
                      {student.wrongWords.length === 0 ? (
                        <p className="text-xs text-slate-400 pl-6">오답 단어가 없습니다</p>
                      ) : (
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
                      )}
                    </div>
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
