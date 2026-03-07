import { WordData } from '@/types';

interface DictionaryApiResponse {
  word: string;
  meanings?: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example?: string;
    }[];
  }[];
}

interface NaverDictResponse {
  meaning: string;
  phonetic: string;
  phonetics: { text: string; audio: string }[];
  examples: { en: string; ko: string }[];
}

// Free Dictionary API에서 영어 정의만 가져오기
async function fetchEnglishDefinitions(word: string): Promise<DictionaryApiResponse | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim().toLowerCase())}`
    );
    if (!res.ok) return null;
    const data: DictionaryApiResponse[] = await res.json();
    return data[0] || null;
  } catch {
    return null;
  }
}

// 네이버 사전에서 발음/오디오/한글뜻/예문 가져오기
async function fetchNaverDict(word: string): Promise<NaverDictResponse | null> {
  try {
    const res = await fetch(`/api/dict?q=${encodeURIComponent(word)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

// 네이버 + Free Dictionary 통합 단어 데이터 가져오기
export async function fetchWordData(word: string): Promise<WordData | null> {
  const [naver, freeDictEntry] = await Promise.all([
    fetchNaverDict(word),
    fetchEnglishDefinitions(word),
  ]);

  // 둘 다 실패하면 null
  if (!naver && !freeDictEntry) return null;

  // 영어 정의 (Free Dictionary API)
  const meanings = freeDictEntry?.meanings || [];

  // 네이버 예문을 영어 정의의 example에 매핑
  if (naver?.examples?.length && meanings.length > 0) {
    const firstDef = meanings[0]?.definitions?.[0];
    if (firstDef && !firstDef.example && naver.examples[0]?.en) {
      firstDef.example = naver.examples[0].en;
    }
  }

  return {
    word: word.trim().toLowerCase(),
    phonetic: naver?.phonetic || '',
    phonetics: naver?.phonetics || [],
    meanings,
    korean: naver?.meaning || '',
  };
}

// 여러 단어를 한번에 가져오기 (korean 포함)
export async function fetchMultipleWords(
  words: string[]
): Promise<Map<string, WordData | null>> {
  const results = new Map<string, WordData | null>();
  const promises = words.map(async (word) => {
    const data = await fetchWordData(word);
    results.set(word.trim().toLowerCase(), data);
  });
  await Promise.all(promises);
  return results;
}

// 발음 오디오 URL 찾기
export function getAudioUrl(word: WordData): string | null {
  for (const p of word.phonetics) {
    if (p.audio) return p.audio;
  }
  return null;
}

// 첫 번째 뜻 가져오기
export function getFirstDefinition(word: WordData): string {
  return word.meanings[0]?.definitions[0]?.definition || 'No definition found';
}

// 첫 번째 예문 가져오기
export function getFirstExample(word: WordData): string | null {
  for (const meaning of word.meanings) {
    for (const def of meaning.definitions) {
      if (def.example) return def.example;
    }
  }
  return null;
}
