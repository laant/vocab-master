import { WordData } from '@/types';

interface DictionaryApiResponse {
  word: string;
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[];
  meanings?: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example?: string;
    }[];
  }[];
}

// Free Dictionary API에서 단어 데이터 가져오기
export async function fetchWordData(word: string): Promise<WordData | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim().toLowerCase())}`
    );

    if (!res.ok) return null;

    const data: DictionaryApiResponse[] = await res.json();
    const entry = data[0];

    if (!entry) return null;

    return {
      word: entry.word,
      phonetic: entry.phonetic || entry.phonetics?.[0]?.text || '',
      phonetics: entry.phonetics || [],
      meanings: entry.meanings || [],
      korean: '', // 한글 뜻은 사용자가 직접 입력
    };
  } catch {
    return null;
  }
}

// 여러 단어를 한번에 가져오기
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
