'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getXpLeaderboard, getStreakLeaderboard, getWeeklyLeaderboard, LeaderboardEntry } from '@/lib/leaderboard';
import { getLevelTitle } from '@/lib/gamification';

type Tab = 'xp' | 'streak' | 'weekly';

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('xp');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setMyUserId(data.user?.id || null);
    });
  }, []);

  useEffect(() => {
    loadLeaderboard(tab);
  }, [tab]);

  async function loadLeaderboard(t: Tab) {
    setLoading(true);
    let data: LeaderboardEntry[] = [];
    if (t === 'xp') data = await getXpLeaderboard();
    else if (t === 'streak') data = await getStreakLeaderboard();
    else data = await getWeeklyLeaderboard();
    setEntries(data);
    setLoading(false);
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'xp', label: 'XP', icon: 'star' },
    { key: 'streak', label: '스트릭', icon: 'local_fire_department' },
    { key: 'weekly', label: '이번 주', icon: 'calendar_today' },
  ];

  function getRankStyle(rank: number) {
    if (rank === 1) return 'bg-amber-400 text-white';
    if (rank === 2) return 'bg-slate-300 text-white';
    if (rank === 3) return 'bg-amber-600 text-white';
    return 'bg-slate-100 text-slate-500';
  }

  function getMainValue(entry: LeaderboardEntry): string {
    if (tab === 'xp') return `${entry.xp.toLocaleString()} XP`;
    if (tab === 'streak') return `${entry.streak}일`;
    return `${entry.weeklyWords || 0}단어`;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 mb-4">
          <span className="material-symbols-outlined text-4xl text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>
            emoji_events
          </span>
        </div>
        <h2 className="text-2xl font-bold mb-2">랭킹</h2>
        <p className="text-slate-500">학습 성과를 비교해보세요</p>
      </div>

      {/* 탭 */}
      <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            <span className="material-symbols-outlined text-base" style={tab === t.key ? { fontVariationSettings: "'FILL' 1" } : undefined}>
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </div>

      {/* 리더보드 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">leaderboard</span>
          <p className="text-slate-400">아직 랭킹 데이터가 없어요</p>
          <p className="text-slate-400 text-sm mt-1">학습을 시작하면 여기에 표시됩니다</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {entries.map((entry, i) => {
            const rank = i + 1;
            const isMe = entry.user_id === myUserId;
            return (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 last:border-0 ${
                  isMe ? 'bg-primary/5' : ''
                }`}
              >
                {/* 순위 */}
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 ${getRankStyle(rank)}`}>
                  {rank}
                </div>

                {/* 사용자 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold text-sm truncate ${isMe ? 'text-primary' : ''}`}>
                      {entry.nickname}
                      {isMe && <span className="text-xs font-normal text-primary ml-1">(나)</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">
                      Lv.{entry.level} {getLevelTitle(entry.level)}
                    </span>
                    {entry.badges.length > 0 && (
                      <span className="text-xs text-emerald-500">
                        배지 {entry.badges.length}개
                      </span>
                    )}
                  </div>
                </div>

                {/* 메인 값 */}
                <div className="text-right shrink-0">
                  <p className={`font-bold text-sm ${
                    tab === 'xp' ? 'text-violet-600' :
                    tab === 'streak' ? 'text-orange-500' : 'text-primary'
                  }`}>
                    {getMainValue(entry)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 로그인 유도 */}
      {!myUserId && (
        <div className="text-center mt-6">
          <a href="/auth" className="text-sm text-primary font-medium hover:underline">
            로그인하면 내 순위를 확인할 수 있어요 →
          </a>
        </div>
      )}
    </div>
  );
}
