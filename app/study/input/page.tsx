"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchMultipleWords, translateMultipleWords, getFirstDefinition } from "@/lib/dictionary-api";
import { saveSession, setCurrentSession, generateSessionId, getAllProgress } from "@/lib/storage";
import { fetchReadyGroups, WordGroup } from "@/lib/admin";
import { WordData } from "@/types";

export default function InputPage() {
  const router = useRouter();
  const [words, setWords] = useState<string[]>(Array(10).fill(""));
  const [loading, setLoading] = useState(false);
  const [fetchedWords, setFetchedWords] = useState<Map<string, WordData | null> | null>(null);
  const [koreanMeanings, setKoreanMeanings] = useState<Map<string, string>>(new Map());
  const [step, setStep] = useState<"input" | "confirm">("input");
  const [groupName, setGroupName] = useState("");
  const [reviewWords, setReviewWords] = useState<string[]>([]);
  const [tab, setTab] = useState<"manual" | "library">("manual");
  const [wordGroups, setWordGroups] = useState<WordGroup[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);

  // 이전 오답 단어 로드 + 단어장 목록 로드
  useEffect(() => {
    const progress = getAllProgress();
    const unmastered = progress
      .filter((p) => !p.mastered && p.wrongCount > 0)
      .sort((a, b) => b.wrongCount - a.wrongCount)
      .map((p) => p.word);
    setReviewWords(unmastered);

    fetchReadyGroups().then(setWordGroups);
  }, []);

  // 단어장에서 바로 학습 시작
  const handleStartFromLibrary = (group: WordGroup) => {
    setLibraryLoading(true);
    const session = {
      id: generateSessionId(),
      name: group.name,
      words: group.words,
      currentStep: 1,
      wrongWords: [],
      createdAt: new Date().toISOString(),
    };
    saveSession(session);
    setCurrentSession(session);
    router.push("/study/preview");
  };

  const handleAddReviewWords = () => {
    const next = [...words];
    let idx = 0;
    for (const rw of reviewWords) {
      // 이미 입력된 단어는 건너뛰기
      if (next.some((w) => w.trim().toLowerCase() === rw.toLowerCase())) continue;
      // 빈 칸 찾기
      while (idx < 10 && next[idx].trim().length > 0) idx++;
      if (idx >= 10) break;
      next[idx] = rw;
      idx++;
    }
    setWords(next);
  };

  const validWords = words.filter((w) => w.trim().length > 0);

  const handleWordChange = (index: number, value: string) => {
    const next = [...words];
    next[index] = value;
    setWords(next);
  };

  // 단어 데이터 수집 + 한글 번역
  const handleFetch = async () => {
    if (validWords.length === 0) return;
    setLoading(true);
    try {
      const [results, translations] = await Promise.all([
        fetchMultipleWords(validWords),
        translateMultipleWords(validWords),
      ]);
      setFetchedWords(results);
      // 번역 결과를 한글 뜻 초기값으로 세팅
      const meanings = new Map<string, string>();
      translations.forEach((translated, word) => {
        if (translated) meanings.set(word, translated);
      });
      setKoreanMeanings(meanings);
      setStep("confirm");
    } catch {
      alert("단어 데이터를 가져오는데 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  // 한글 뜻 입력
  const handleKoreanChange = (word: string, value: string) => {
    setKoreanMeanings((prev) => {
      const next = new Map(prev);
      next.set(word, value);
      return next;
    });
  };

  // 학습 시작
  const handleStart = () => {
    if (!fetchedWords) return;

    const wordDataList: WordData[] = [];
    fetchedWords.forEach((data, word) => {
      if (data) {
        wordDataList.push({
          ...data,
          korean: koreanMeanings.get(word) || "",
        });
      }
    });

    if (wordDataList.length === 0) {
      alert("유효한 단어가 없습니다.");
      return;
    }

    const session = {
      id: generateSessionId(),
      name: groupName.trim() || undefined,
      words: wordDataList,
      currentStep: 1,
      wrongWords: [],
      createdAt: new Date().toISOString(),
    };

    saveSession(session);
    setCurrentSession(session);
    router.push("/study/preview");
  };

  // Step 1: 단어 입력
  if (step === "input") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <span className="material-symbols-outlined text-4xl text-primary">
              edit_note
            </span>
          </div>
          <h2 className="text-2xl font-bold mb-2">학습할 단어</h2>
          <p className="text-slate-500">
            직접 입력하거나 단어장에서 선택하세요
          </p>
        </div>

        {/* 탭 전환 */}
        {wordGroups.length > 0 && (
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
            <button
              onClick={() => setTab("manual")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === "manual" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              직접 입력
            </button>
            <button
              onClick={() => setTab("library")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === "library" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              단어장 선택
            </button>
          </div>
        )}

        {/* 단어장 라이브러리 */}
        {tab === "library" && (
          <div className="space-y-3 mb-6">
            {wordGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => handleStartFromLibrary(group)}
                disabled={libraryLoading}
                className="w-full flex items-center justify-between bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:border-primary hover:shadow-md transition-all group text-left disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined">menu_book</span>
                  </div>
                  <div>
                    <h3 className="font-bold">{group.name}</h3>
                    <p className="text-sm text-slate-500">
                      {group.words.length}단어 · {group.words.slice(0, 4).map((w) => w.word).join(", ")}
                      {group.words.length > 4 && "..."}
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">
                  play_arrow
                </span>
              </button>
            ))}
          </div>
        )}

        {tab === "manual" && <>
        {/* 이전 오답 단어 포함 배너 */}
        {reviewWords.length > 0 && (
          <div className="bg-red-50 rounded-xl p-4 border border-red-200 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-red-400">auto_stories</span>
              <div>
                <p className="text-sm font-bold text-slate-700">
                  복습 단어 {reviewWords.length}개
                </p>
                <p className="text-xs text-slate-500">
                  {reviewWords.slice(0, 3).join(", ")}
                  {reviewWords.length > 3 && ` 외 ${reviewWords.length - 3}개`}
                </p>
              </div>
            </div>
            <button
              onClick={handleAddReviewWords}
              className="px-4 py-2 rounded-lg bg-red-400 text-white text-sm font-bold hover:bg-red-500 transition-colors"
            >
              추가
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          {/* 그룹명 입력 */}
          <div className="mb-5 pb-5 border-b border-slate-100">
            <label className="text-sm font-medium text-slate-500 mb-1.5 block">그룹명 (선택)</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="예: 중2 영어 3과, TOEIC Day1"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
            />
          </div>

          <div className="space-y-3">
            {words.map((word, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={word}
                  onChange={(e) => handleWordChange(i, e.target.value)}
                  placeholder={`영단어 ${i + 1}`}
                  className="flex-1 px-4 py-3.5 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && i < 9) {
                      const next = document.querySelector<HTMLInputElement>(
                        `input[data-index="${i + 1}"]`
                      );
                      next?.focus();
                    }
                  }}
                  data-index={i}
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              입력된 단어:{" "}
              <span className="font-bold text-primary">{validWords.length}</span>개
            </p>
            <button
              onClick={handleFetch}
              disabled={validWords.length === 0 || loading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">
                    progress_activity
                  </span>
                  데이터 수집 중...
                </>
              ) : (
                <>
                  다음
                  <span className="material-symbols-outlined text-lg">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </>}
      </div>
    );
  }

  // Step 2: 수집 결과 확인 + 한글 뜻 입력
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
          <span className="material-symbols-outlined text-4xl text-green-500">
            check_circle
          </span>
        </div>
        <h2 className="text-2xl font-bold mb-2">단어 데이터 확인</h2>
        <p className="text-slate-500">
          수집된 데이터를 확인하고, 한글 뜻을 입력하세요
        </p>
      </div>

      <div className="space-y-4">
        {fetchedWords &&
          Array.from(fetchedWords.entries()).map(([word, data]) => (
            <div
              key={word}
              className={`bg-white rounded-xl p-5 shadow-sm border ${
                data ? "border-slate-200" : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">{word}</h3>
                  {data && (
                    <p className="text-slate-400 text-sm">{data.phonetic}</p>
                  )}
                </div>
                {data ? (
                  <span className="material-symbols-outlined text-green-500">
                    check_circle
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-red-400">
                    error
                  </span>
                )}
              </div>

              {data ? (
                <>
                  <p className="text-sm text-slate-600 mb-3">
                    <span className="font-medium text-slate-500">영어 뜻: </span>
                    {getFirstDefinition(data)}
                  </p>
                  <input
                    type="text"
                    value={koreanMeanings.get(word) || ""}
                    onChange={(e) => handleKoreanChange(word, e.target.value)}
                    placeholder="한글 뜻을 입력하세요 (예: 사과)"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />
                </>
              ) : (
                <p className="text-sm text-red-500">
                  이 단어의 데이터를 찾을 수 없습니다. 철자를 확인해주세요.
                </p>
              )}
            </div>
          ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={() => setStep("input")}
          className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-medium"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          다시 입력
        </button>
        <button
          onClick={handleStart}
          className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
        >
          학습 시작
          <span className="material-symbols-outlined">play_arrow</span>
        </button>
      </div>
    </div>
  );
}
