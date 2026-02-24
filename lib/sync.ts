import { supabase } from './supabase';

const isSupabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

const STORAGE_KEYS = {
  SESSIONS: 'vocab_sessions',
  PROGRESS: 'vocab_progress',
  REVIEW_LEVEL: 'vocab_review_level',
  GAME_PROFILE: 'vocab_game_profile',
};

/**
 * localStorage 데이터를 Supabase에 업로드 (fire-and-forget)
 */
export async function syncToSupabase(): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const sessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || '[]');
    const progress = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROGRESS) || '[]');
    const reviewLevel = localStorage.getItem(STORAGE_KEYS.REVIEW_LEVEL) || 'hard';
    const gameProfile = JSON.parse(localStorage.getItem(STORAGE_KEYS.GAME_PROFILE) || '{}');

    await supabase.from('user_data').upsert({
      user_id: user.id,
      sessions,
      progress,
      review_level: reviewLevel,
      game_profile: gameProfile,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // 동기화 실패 시 무시 (오프라인 등)
  }
}

/**
 * Supabase에서 데이터 가져와 localStorage에 저장
 */
export async function syncFromSupabase(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('user_data')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !data) return false;

    if (data.sessions) {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(data.sessions));
    }
    if (data.progress) {
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(data.progress));
    }
    if (data.review_level) {
      localStorage.setItem(STORAGE_KEYS.REVIEW_LEVEL, data.review_level);
    }
    if (data.game_profile && Object.keys(data.game_profile).length > 0) {
      localStorage.setItem(STORAGE_KEYS.GAME_PROFILE, JSON.stringify(data.game_profile));
    }

    return true;
  } catch {
    return false;
  }
}

// 디바운스된 동기화 (빈번한 호출 방지)
let syncTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedSync(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncToSupabase();
  }, 1000);
}
