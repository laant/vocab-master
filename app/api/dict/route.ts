import { NextRequest, NextResponse } from 'next/server';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

export async function GET(req: NextRequest) {
  const word = req.nextUrl.searchParams.get('q');
  if (!word) {
    return NextResponse.json({ meaning: '', phonetic: '', phonetics: [], examples: [] });
  }

  try {
    // 네이버 사전 Search API (옥스퍼드 영한사전 기반)
    const url = `https://dict.naver.com/api3/enko/search?query=${encodeURIComponent(word)}&m=pc&range=word`;
    const res = await fetch(url, {
      headers: { 'Referer': 'https://dict.naver.com/' },
    });

    if (!res.ok) {
      return NextResponse.json({ meaning: '', phonetic: '', phonetics: [], examples: [] });
    }

    const data = await res.json();
    const items = data?.searchResultMap?.searchResultListMap?.WORD?.items;
    if (!items || items.length === 0) {
      return NextResponse.json({ meaning: '', phonetic: '', phonetics: [], examples: [] });
    }

    // 정확히 일치하는 단어 찾기
    const entry = items.find(
      (item: { expEntry: string }) => item.expEntry?.toLowerCase() === word.toLowerCase()
    ) || items[0];

    // 발음기호 + 오디오
    const phoneticList = entry.searchPhoneticSymbolList || [];
    const phonetics = phoneticList.map((p: { symbolValue?: string; symbolFile?: string }) => ({
      text: p.symbolValue || '',
      audio: p.symbolFile || '',
    }));
    const phonetic = phonetics[0]?.text || '';

    // 한글 뜻 (첫 번째 뜻)
    const meansCollector = entry.meansCollector || [];
    let meaning = '';
    for (const mc of meansCollector) {
      for (const m of mc.means || []) {
        if (m.value) {
          meaning = stripHtml(m.value);
          break;
        }
      }
      if (meaning) break;
    }

    // 예문 수집 (최대 3개)
    const examples: { en: string; ko: string }[] = [];
    for (const mc of meansCollector) {
      for (const m of mc.means || []) {
        if (m.exampleOri && examples.length < 3) {
          examples.push({
            en: stripHtml(m.exampleOri),
            ko: m.exampleTrans ? stripHtml(m.exampleTrans) : '',
          });
        }
      }
    }

    return NextResponse.json({ meaning, phonetic, phonetics, examples });
  } catch {
    return NextResponse.json({ meaning: '', phonetic: '', phonetics: [], examples: [] });
  }
}
