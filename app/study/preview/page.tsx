"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentSession, setCurrentSession } from "@/lib/storage";
import { getAudioUrl, getFirstDefinition, getFirstExample } from "@/lib/dictionary-api";
import { StudySession, WordData } from "@/types";

export default function PreviewPage() {
  const router = useRouter();
  const [session, setSession] = useState<StudySession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const s = getCurrentSession();
    if (!s) {
      router.push("/study/input");
      return;
    }
    setSession(s);
  }, [router]);

  // 카드가 바뀔 때마다 발음 자동 재생
  useEffect(() => {
    if (!session) return;
    const word = session.words[currentIndex];
    const url = getAudioUrl(word);
    if (url) {
      const audio = new Audio(url);
      audio.play().catch(() => {});
    }
  }, [session, currentIndex]);

  if (!session) return null;

  const word = session.words[currentIndex];
  const total = session.words.length;
  const audioUrl = getAudioUrl(word);

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const goNext = () => {
    setFlipped(false);
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 모든 카드를 봤으면 Step 2로 이동
      const updated = { ...session, currentStep: 2 };
      setCurrentSession(updated);
      router.push("/study/quiz");
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setFlipped(false);
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold">Step 1: 노출 및 탐색</h2>
          <p className="text-sm text-slate-500">카드를 넘기며 가볍게 읽어보세요</p>
        </div>
        <div className="text-sm font-bold text-slate-500">
          {currentIndex + 1} / {total}
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-8">
        <div
          className="bg-primary h-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
        />
      </div>

      {/* 플래시카드 */}
      <div
        onClick={() => setFlipped(!flipped)}
        className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 md:p-12 min-h-[400px] flex flex-col items-center pt-16 cursor-pointer select-none transition-all hover:shadow-xl relative"
      >
        {/* 오디오 버튼 */}
        {audioUrl && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              playAudio();
            }}
            className="absolute top-6 right-6 p-3 rounded-full bg-slate-50 text-slate-500 hover:bg-primary/10 hover:text-primary transition-all"
          >
            <span className="material-symbols-outlined text-2xl">volume_up</span>
          </button>
        )}

        {/* 단어 & 발음기호: 항상 같은 위치 */}
        <div className="text-center mb-4">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">{word.word}</h1>
          <p className="text-slate-400 text-lg">{word.phonetic}</p>
        </div>

        {!flipped ? (
          <p className="text-slate-300 text-sm mt-8">탭해서 뜻 보기</p>
        ) : (
          // 아래로 뜻/예문이 펼쳐짐
          <div className="w-full mt-6 space-y-4 animate-[fadeIn_0.3s_ease-out]">
            {word.korean && (
              <div className="bg-primary/5 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-primary">{word.korean}</p>
              </div>
            )}

            <div className="bg-slate-50 rounded-xl p-4 text-left">
              <p className="text-sm text-slate-500 font-medium mb-1">
                {word.meanings[0]?.partOfSpeech}
              </p>
              <p className="text-slate-700">{getFirstDefinition(word)}</p>
            </div>

            {getFirstExample(word) && (
              <div className="bg-slate-50 rounded-xl p-4 text-left">
                <p className="text-sm text-slate-500 font-medium mb-1">예문</p>
                <p className="text-slate-700 italic">
                  &ldquo;{getFirstExample(word)}&rdquo;
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 네비게이션 */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-medium disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          이전
        </button>

        {/* 페이지 인디케이터 */}
        <div className="flex items-center gap-1.5">
          {session.words.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === currentIndex ? "w-6 bg-primary" : "w-2 bg-slate-300"
              }`}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
        >
          {currentIndex < total - 1 ? "다음" : "퀴즈 시작"}
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
