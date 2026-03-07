'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isAdmin, fetchAllGroups, createWordGroup, processWordGroup, deleteWordGroup, fetchCategories, WordGroup, CategoryInfo } from '@/lib/admin';

export default function AdminPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<WordGroup[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [uploadResult, setUploadResult] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [existingCategories, setExistingCategories] = useState<CategoryInfo[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdmin(user.email)) {
      router.push('/');
      return;
    }
    setAuthorized(true);
    setLoading(false);
    loadGroups();
  }

  async function loadGroups() {
    const data = await fetchAllGroups();
    setGroups(data);
    const cats = await fetchCategories();
    setExistingCategories(cats);
  }

  async function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').filter((l) => l.trim());
    let created = 0;

    for (const line of lines) {
      const parts = line.split(',').map((s) => s.trim()).filter(Boolean);
      if (parts.length < 2) continue;

      const name = parts[0];
      const rawWords = parts.slice(1);
      const result = await createWordGroup(name, rawWords, categoryInput || undefined);
      if (result) created++;
    }

    setUploadResult(`${created}개 그룹이 등록되었습니다.`);
    await loadGroups();
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleProcess(groupId: string) {
    setProcessing(groupId);
    setProgress({ current: 0, total: 0 });

    const success = await processWordGroup(groupId, (current, total) => {
      setProgress({ current, total });
    });

    setProcessing(null);
    if (success) {
      await loadGroups();
    } else {
      alert('API 가져오기에 실패했습니다.');
    }
  }

  async function handleDelete(groupId: string) {
    if (!confirm('이 그룹을 삭제할까요?')) return;
    await deleteWordGroup(groupId);
    await loadGroups();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <span className="material-symbols-outlined text-4xl text-primary">admin_panel_settings</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">단어장 관리</h2>
        <p className="text-slate-500">CSV 파일로 단어 그룹을 일괄 등록하세요</p>
      </div>

      {/* CSV 업로드 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
        <h3 className="font-bold mb-3">CSV 업로드</h3>
        <p className="text-sm text-slate-500 mb-4">
          형식: <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">그룹명,단어1,단어2,단어3,...</code> (한 줄에 한 그룹)
        </p>
        <div className="mb-4">
          <label className="text-sm font-medium text-slate-500 mb-1.5 block">카테고리</label>
          <div className="flex items-center gap-2">
            <select
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-primary outline-none"
            >
              <option value="">카테고리 없음</option>
              {existingCategories.map((cat) => (
                <option key={cat.name} value={cat.name}>{cat.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="새 카테고리"
              value={existingCategories.some((c) => c.name === categoryInput) ? "" : categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-primary outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleCSVUpload}
            className="flex-1 text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:font-semibold file:cursor-pointer hover:file:bg-primary/90"
          />
        </div>
        {uploadResult && (
          <p className="text-sm text-green-600 mt-3 font-medium">{uploadResult}</p>
        )}
      </div>

      {/* 그룹 목록 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h3 className="font-bold mb-4">등록된 단어장 ({groups.length}개)</h3>
        {groups.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">등록된 단어장이 없습니다</p>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`flex items-center justify-between p-4 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors ${
                  group.status === 'ready' ? 'cursor-pointer hover:bg-slate-50' : ''
                }`}
                onClick={() => group.status === 'ready' && router.push(`/admin/group?id=${group.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                      group.status === 'ready'
                        ? 'bg-green-50 text-green-600 border border-green-200'
                        : 'bg-amber-50 text-amber-600 border border-amber-200'
                    }`}>
                      {group.status === 'ready' ? '준비완료' : '대기중'}
                    </span>
                    <h4 className="font-bold text-sm truncate">{group.name}</h4>
                    {group.status === 'ready' && (
                      <span className="material-symbols-outlined text-sm text-slate-400">edit</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {group.raw_words.length}단어 · {new Date(group.created_at).toLocaleDateString('ko-KR')}
                    {group.category && <span className="ml-1 text-primary">· {group.category}</span>}
                  </p>
                  {group.status === 'ready' && group.words.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      {group.words.slice(0, 5).map((w) => w.word).join(', ')}
                      {group.words.length > 5 && ` 외 ${group.words.length - 5}개`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-3">
                  {group.status === 'pending' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleProcess(group.id); }}
                      disabled={processing !== null}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 disabled:opacity-50"
                    >
                      {processing === group.id ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                          {progress.current}/{progress.total}
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">download</span>
                          API 가져오기
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(group.id); }}
                    disabled={processing !== null}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
