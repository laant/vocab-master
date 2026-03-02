'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin';

export function AdminNavLink() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setShow(isAdmin(data.user?.email ?? undefined));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setShow(isAdmin(session?.user?.email ?? undefined));
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!show) return null;

  return (
    <a
      className="text-sm font-medium text-slate-600 hover:text-primary transition-colors"
      href="/admin"
    >
      관리
    </a>
  );
}

export function AdminTabLink() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setShow(isAdmin(data.user?.email ?? undefined));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setShow(isAdmin(session?.user?.email ?? undefined));
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!show) return null;

  return (
    <a href="/admin" className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-500 active:text-primary">
      <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
      <span className="text-[10px] font-medium">관리</span>
    </a>
  );
}
