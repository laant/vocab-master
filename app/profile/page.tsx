'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserProfile, saveUserProfile } from '@/lib/leaderboard';
import { getGameProfile, calcLevel, getLevelTitle, BADGES } from '@/lib/gamification';
import { getMyTeachers, registerTeacher, removeTeacher } from '@/lib/teacher';
import { GameProfile } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [gameProfile, setGameProfile] = useState<GameProfile | null>(null);
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teachers, setTeachers] = useState<string[]>([]);
  const [teacherSaving, setTeacherSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUserId(user.id);
      setEmail(user.email || '');

      const profile = await getUserProfile(user.id);
      if (profile) setNickname(profile.nickname);

      setGameProfile(getGameProfile());

      const myTeachers = await getMyTeachers();
      setTeachers(myTeachers);

      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) return;
    setSaving(true);
    const success = await saveUserProfile(nickname.trim());
    setSaving(false);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  const levelInfo = gameProfile ? calcLevel(gameProfile.xp) : null;
  const title = levelInfo ? getLevelTitle(levelInfo.level) : '';

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <span className="material-symbols-outlined text-4xl text-primary">person</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">내 프로필</h2>
      </div>

      {/* 닉네임 설정 */}
      <form onSubmit={handleSave} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">닉네임</label>
        <p className="text-xs text-slate-400 mb-3">리더보드에 표시될 이름입니다</p>
        <div className="flex gap-3">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={email.split('@')[0]}
            maxLength={20}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
          <button
            type="submit"
            disabled={saving || !nickname.trim()}
            className="px-5 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? '저장 중...' : saved ? '저장됨!' : '저장'}
          </button>
        </div>
      </form>

      {/* 게임 프로필 */}
      {gameProfile && levelInfo && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
          <h3 className="font-bold mb-4">학습 현황</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-violet-100 text-violet-600 mx-auto mb-2">
                <span className="font-bold text-sm">Lv.{levelInfo.level}</span>
              </div>
              <p className="text-xs text-slate-500">{title}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{gameProfile.xp}</p>
              <p className="text-xs text-slate-500">총 XP</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">{gameProfile.streak}</p>
              <p className="text-xs text-slate-500">연속일</p>
            </div>
          </div>

          {/* XP 프로그레스 바 */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Lv.{levelInfo.level}</span>
              <span>{levelInfo.currentXp} / {levelInfo.requiredXp} XP</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-violet-500 h-full rounded-full transition-all"
                style={{ width: `${(levelInfo.currentXp / levelInfo.requiredXp) * 100}%` }}
              />
            </div>
          </div>

          {/* 배지 */}
          {gameProfile.badges.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">획득 배지</p>
              <div className="flex flex-wrap gap-2">
                {gameProfile.badges.map((badgeId) => {
                  const badge = BADGES.find((b) => b.id === badgeId);
                  if (!badge) return null;
                  return (
                    <div
                      key={badgeId}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200"
                    >
                      <span className="material-symbols-outlined text-emerald-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {badge.icon}
                      </span>
                      <span className="text-xs font-medium text-emerald-700">{badge.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 내 선생님 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-xl text-teal-500">school</span>
          <h3 className="font-bold">내 선생님</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">선생님을 등록하면 선생님이 학습 현황을 확인할 수 있어요</p>

        {/* 등록된 선생님 목록 */}
        {teachers.length > 0 && (
          <div className="space-y-2 mb-4">
            {teachers.map((t) => (
              <div key={t} className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-50 border border-teal-200">
                  <span className="material-symbols-outlined text-teal-500 text-lg">mail</span>
                  <span className="text-sm font-medium text-teal-700">{t}</span>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm(`${t} 선생님을 해제할까요?`)) return;
                    const success = await removeTeacher(t);
                    if (success) {
                      setTeachers((prev) => prev.filter((e) => e !== t));
                    }
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 선생님 추가 */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!teacherEmail.trim()) return;
            setTeacherSaving(true);
            const errorMsg = await registerTeacher(teacherEmail.trim());
            setTeacherSaving(false);
            if (!errorMsg) {
              setTeachers((prev) => [...prev, teacherEmail.trim().toLowerCase()]);
              setTeacherEmail('');
            } else {
              alert(errorMsg);
            }
          }}
          className="flex gap-3"
        >
          <input
            type="email"
            value={teacherEmail}
            onChange={(e) => setTeacherEmail(e.target.value)}
            placeholder="선생님 이메일 주소"
            required
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 outline-none"
          />
          <button
            type="submit"
            disabled={teacherSaving || !teacherEmail.trim()}
            className="px-5 py-3 rounded-xl bg-teal-500 text-white font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50"
          >
            {teacherSaving ? '등록 중...' : '추가'}
          </button>
        </form>
      </div>

      {/* 계정 정보 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h3 className="font-bold mb-3">계정 정보</h3>
        <p className="text-sm text-slate-500">
          <span className="text-slate-400">이메일:</span> {email}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          <span className="text-slate-400">ID:</span> {userId.slice(0, 8)}...
        </p>
      </div>
    </div>
  );
}
