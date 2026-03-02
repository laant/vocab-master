'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isAdmin, fetchWordGroup, updateWordGroupWords, WordGroup } from '@/lib/admin';
import { getFirstDefinition, getFirstExample } from '@/lib/dictionary-api';
import { WordData } from '@/types';

export default function GroupEditPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    }>
      <GroupEditContent />
    </Suspense>
  );
}

function GroupEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get('id');

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<WordGroup | null>(null);
  const [words, setWords] = useState<WordData[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, [groupId]);

  async function checkAuthAndLoad() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdmin(user.email)) {
      router.push('/');
      return;
    }
    setAuthorized(true);

    if (!groupId) {
      router.push('/admin');
      return;
    }

    const data = await fetchWordGroup(groupId);
    if (!data) {
      router.push('/admin');
      return;
    }
    setGroup(data);
    setWords(data.words);
    setLoading(false);
  }

  function handleWordChange(index: number, field: keyof WordData, value: string) {
    setWords((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setSaved(false);
  }

  async function handleSave() {
    if (!groupId) return;
    setSaving(true);
    const success = await updateWordGroupWords(groupId, words);
    setSaving(false);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      alert('저장에 실패했습니다.');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  if (!authorized || !group) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{group.name}</h2>
          <p className="text-sm text-slate-400">{words.length}단어 · 한글 뜻과 영어 뜻을 수정할 수 있습니다</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-primary text-white hover:bg-primary/90'
          } disabled:opacity-50`}
        >
          {saving ? (
            <>
              <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              저장 중...
            </>
          ) : saved ? (
            <>
              <span className="material-symbols-outlined text-sm">check</span>
              저장됨!
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">save</span>
              저장
            </>
          )}
        </button>
      </div>

      {/* 단어 목록 */}
      <div className="space-y-4">
        {words.map((word, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {i + 1}
                </span>
                <h3 className="font-bold text-lg">{word.word}</h3>
                {word.phonetic && (
                  <span className="text-slate-400 text-sm">{word.phonetic}</span>
                )}
              </div>
            </div>

            {/* 한글 뜻 */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-500 mb-1">한글 뜻</label>
              <input
                type="text"
                value={word.korean}
                onChange={(e) => handleWordChange(i, 'korean', e.target.value)}
                placeholder="한글 뜻을 입력하세요"
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none text-sm"
              />
            </div>

            {/* 영어 뜻 (참고용 표시) */}
            {word.meanings.length > 0 && (
              <div className="text-xs text-slate-400">
                <span className="font-medium">영어 뜻: </span>
                {getFirstDefinition(word)}
                {getFirstExample(word) && (
                  <span className="italic ml-2">e.g. {getFirstExample(word)}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 하단 저장 버튼 */}
      {words.length > 5 && (
        <div className="mt-6 text-center">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? '저장 중...' : saved ? '저장됨!' : '저장'}
          </button>
        </div>
      )}
    </div>
  );
}
