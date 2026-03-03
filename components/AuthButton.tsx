'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { syncToSupabase } from '@/lib/sync';
import type { User } from '@supabase/supabase-js';

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await syncToSupabase(); // 로그아웃 전 마지막 동기화
    await supabase.auth.signOut();
    setUser(null);
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <a
          href="/profile"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-lg">person</span>
          내 정보
        </a>
        <button
          onClick={handleLogout}
          className="text-sm font-medium text-slate-500 hover:text-red-500 transition-colors"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <a
      href="/auth"
      className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
    >
      로그인
    </a>
  );
}
