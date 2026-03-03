'use client';

import { useEffect, useState } from 'react';
import { getMyStudentCount } from '@/lib/teacher';
import { supabase } from '@/lib/supabase';

export function TeacherNavLink() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    checkTeacher();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkTeacher();
    });
    return () => subscription.unsubscribe();
  }, []);

  async function checkTeacher() {
    const count = await getMyStudentCount();
    setShow(count > 0);
  }

  if (!show) return null;

  return (
    <a
      className="text-sm font-medium text-slate-600 hover:text-primary transition-colors"
      href="/teacher"
    >
      내 학생
    </a>
  );
}

export function TeacherTabLink() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    checkTeacher();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkTeacher();
    });
    return () => subscription.unsubscribe();
  }, []);

  async function checkTeacher() {
    const count = await getMyStudentCount();
    setShow(count > 0);
  }

  if (!show) return null;

  return (
    <a href="/teacher" className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-500 active:text-primary">
      <span className="material-symbols-outlined text-2xl">groups</span>
      <span className="text-[10px] font-medium">내 학생</span>
    </a>
  );
}
