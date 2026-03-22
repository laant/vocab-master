'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { syncFromSupabase } from '@/lib/sync';
import { getUserProfile } from '@/lib/leaderboard';
import { submitBattleScore } from '@/lib/battle';

type Mode = 'login' | 'signup';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess('가입 완료! 이메일을 확인해주세요.');
      } else {
        const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // 로그인 성공 → Supabase에서 데이터 동기화
        await syncFromSupabase();

        // 배틀 점수 pending이 있으면 저장
        const pendingBattle = sessionStorage.getItem('vocab_battle_pending');
        if (pendingBattle) {
          try {
            const b = JSON.parse(pendingBattle);
            await submitBattleScore(b.tier, b.score, b.maxCombo, b.correctCount, b.totalCount, b.timeSeconds);
          } catch { /* ignore */ }
          sessionStorage.removeItem('vocab_battle_pending');
        }

        // 닉네임 미설정 시 프로필 페이지로 이동
        if (authData.user) {
          const profile = await getUserProfile(authData.user.id);
          if (!profile || !profile.nickname) {
            router.push('/profile');
            return;
          }
        }
        router.push(redirectTo || '/');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '오류가 발생했습니다';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 pt-12 sm:pt-20">
      <div className="text-center mb-8">
        <span className="material-symbols-outlined text-5xl text-primary">school</span>
        <h2 className="text-2xl font-bold mt-2">VocabMaster</h2>
        <p className="text-slate-500 text-sm mt-1">로그인하면 여러 기기에서 학습 데이터를 동기화할 수 있어요</p>
      </div>

      {/* 탭 전환 */}
      <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
        <button
          onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          로그인
        </button>
        <button
          onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          회원가입
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6자 이상"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-600">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary py-3.5 text-white font-semibold text-base hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>
      </form>

      <div className="text-center mt-6">
        <a href="/" className="text-sm text-slate-500 hover:text-slate-700">
          로그인 없이 사용하기 →
        </a>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
