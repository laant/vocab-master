import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // 요청한 유저의 토큰 검증
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // 관련 데이터 삭제
  await adminClient.from('user_data').delete().eq('user_id', userId);
  await adminClient.from('user_profiles').delete().eq('user_id', userId);
  await adminClient.from('teacher_students').delete().eq('student_email', user.email);
  await adminClient.from('teacher_students').delete().eq('teacher_email', user.email);
  await adminClient.from('battle_scores').delete().eq('user_id', userId);

  // Auth 유저 삭제
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
