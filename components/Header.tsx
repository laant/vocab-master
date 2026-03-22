'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { syncToSupabase } from '@/lib/sync';
import { isAdmin } from '@/lib/admin';
import { getMyStudentCount } from '@/lib/teacher';
import type { User } from '@supabase/supabase-js';

export default function Header() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setShowAdmin(isAdmin(data.user?.email ?? undefined));
    });
    getMyStudentCount().then((c) => setShowTeacher(c > 0));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setShowAdmin(isAdmin(session?.user?.email ?? undefined));
      getMyStudentCount().then((c) => setShowTeacher(c > 0));
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await syncToSupabase();
    await supabase.auth.signOut();
    setUser(null);
    setOpen(false);
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 py-3 lg:px-40">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl text-primary">school</span>
            <h1 className="text-lg font-bold tracking-tight">VocabMaster</h1>
          </a>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="메뉴"
        >
          <span className="material-symbols-outlined text-2xl text-slate-700">
            {open ? 'close' : 'menu'}
          </span>
        </button>
      </header>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} />
      )}

      {/* Slide-in menu */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-white shadow-2xl transform transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <span className="font-bold text-lg">메뉴</span>
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <nav className="flex flex-col h-[calc(100%-65px)] justify-between">
          {/* Main nav */}
          <div className="flex flex-col py-2">
            <MenuItem href="/" icon="home" label="홈" onClick={() => setOpen(false)} />
            <MenuItem href="/study/input" icon="add_circle" label="새 학습" onClick={() => setOpen(false)} />
            <MenuItem href="/wrong-words" icon="error_outline" label="오답 노트" onClick={() => setOpen(false)} />
            <MenuItem href="/leaderboard" icon="emoji_events" label="랭킹" onClick={() => setOpen(false)} />
            <MenuItem href="/battle" icon="swords" label="배틀" onClick={() => setOpen(false)} />
            {showTeacher && (
              <MenuItem href="/teacher" icon="groups" label="내 학생" onClick={() => setOpen(false)} />
            )}
            {showAdmin && (
              <MenuItem href="/admin" icon="admin_panel_settings" label="관리" onClick={() => setOpen(false)} />
            )}
          </div>

          {/* Bottom: Profile & Auth */}
          <div className="border-t border-slate-100 py-3">
            {user ? (
              <>
                <MenuItem href="/profile" icon="person" label="내 정보" onClick={() => setOpen(false)} />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-5 py-3 text-left text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">logout</span>
                  로그아웃
                </button>
              </>
            ) : (
              <MenuItem href="/auth" icon="login" label="로그인" onClick={() => setOpen(false)} />
            )}
          </div>
        </nav>
      </div>
    </>
  );
}

function MenuItem({ href, icon, label, onClick }: { href: string; icon: string; label: string; onClick: () => void }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors"
    >
      <span className="material-symbols-outlined text-xl">{icon}</span>
      {label}
    </a>
  );
}
