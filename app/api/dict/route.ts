import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const word = req.nextUrl.searchParams.get('q');
  if (!word) {
    return NextResponse.json({ meaning: '' });
  }

  try {
    // 네이버 사전 자동완성 API (옥스퍼드 영한사전 기반)
    const url = `https://ac-dict.naver.com/enko/ac?q=${encodeURIComponent(word)}&q_enc=utf-8&st=11001&r_format=json&r_enc=utf-8&r_lt=11001&r_unicode=0&r_escape=1`;
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ meaning: '' });
    }

    const data = await res.json();
    const items = data.items?.[0];
    if (items && items.length > 0) {
      // 정확히 일치하는 단어 찾기
      const exact = items.find(
        (item: string[][]) => item[0]?.[0]?.toLowerCase() === word.toLowerCase()
      );
      if (exact && exact[2]?.[0]) {
        return NextResponse.json({ meaning: exact[2][0] });
      }
      // 정확한 매치 없으면 첫 번째 결과 사용
      if (items[0]?.[2]?.[0]) {
        return NextResponse.json({ meaning: items[0][2][0] });
      }
    }

    return NextResponse.json({ meaning: '' });
  } catch {
    return NextResponse.json({ meaning: '' });
  }
}
