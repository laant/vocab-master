"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentSession, setCurrentSession } from "@/lib/storage";
import { getAudioUrl, getFirstDefinition, getFirstExample } from "@/lib/dictionary-api";
import { StudySession } from "@/types";

export default function PreviewPage() {
  const router = useRouter();
  const [session, setSession] = useState<StudySession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [passedWords, setPassedWords] = useState<string[]>([]);

  useEffect(() => {
    const s = getCurrentSession();
    if (!s) {
      router.push("/study/input");
      return;
    }
    setSession(s);
    setPassedWords(s.passedWords || []);
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
  const example = getFirstExample(word);

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const finishStep1 = (finalPassed: string[]) => {
    const updated = { ...session, currentStep: 2, passedWords: finalPassed };
    setCurrentSession(updated);
    router.push("/study/quiz");
  };

  const handlePass = () => {
    const newPassed = passedWords.includes(word.word)
      ? passedWords
      : [...passedWords, word.word];
    setPassedWords(newPassed);
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finishStep1(newPassed);
    }
  };

  const handleCheck = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finishStep1(passedWords);
    }
  };

  // 예문에서 단어를 하이라이트
  const highlightWord = (text: string, target: string) => {
    const regex = new RegExp(`(${target})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="text-primary font-bold">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div className="relative flex min-h-[calc(100dvh-60px)] w-full flex-col">
      {/* Progress Section */}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex gap-6 justify-between items-center">
          <p className="text-sm font-medium">Step 1: 노출 및 탐색</p>
          <p className="text-primary text-sm font-bold">{currentIndex + 1} / {total}</p>
        </div>
        <div className="rounded-full bg-slate-200 h-2 w-full overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Word Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 sm:py-12">
        <div className="w-full text-center space-y-6">
          {/* 단어 + 발음기호 */}
          <div className="space-y-2">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight">{word.word}</h1>
            <div className="flex items-center justify-center gap-3">
              <span className="text-slate-500 text-lg font-medium">{word.phonetic}</span>
              {audioUrl && (
                <button
                  onClick={playAudio}
                  className="bg-primary/10 p-2 rounded-full text-primary hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-2xl">volume_up</span>
                </button>
              )}
            </div>
          </div>

          {/* 한글 뜻 */}
          {word.korean && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 w-full max-w-sm mx-auto">
              <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">Meaning</p>
              <p className="text-2xl font-bold leading-tight">{word.korean}</p>
            </div>
          )}

          {/* 영어 정의 */}
          {word.meanings.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 w-full max-w-sm mx-auto">
              <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">
                {word.meanings[0]?.partOfSpeech || "Definition"}
              </p>
              <p className="text-slate-700 leading-relaxed">{getFirstDefinition(word)}</p>
            </div>
          )}

          {/* 예문 */}
          {example && (
            <div className="max-w-sm mx-auto text-center space-y-3 pt-2">
              <p className="text-primary text-xs font-bold uppercase tracking-widest">Example Sentence</p>
              <p className="text-slate-700 text-lg italic leading-relaxed">
                &ldquo;{highlightWord(example, word.word)}&rdquo;
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Navigation Buttons */}
      <footer className="p-4 sm:p-6 flex gap-4 bg-background/95 backdrop-blur-sm sticky bottom-0 border-t border-slate-200 mb-16 md:mb-0">
        <button
          onClick={handlePass}
          className="flex-1 py-4 px-6 rounded-xl font-bold text-green-600 bg-green-50 border-2 border-green-200 hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">check_circle</span>
          <span>Pass</span>
        </button>
        <button
          onClick={handleCheck}
          className="flex-[2] py-4 px-6 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
        >
          <span>Check</span>
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </footer>
    </div>
  );
}
