import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VocabMaster - 영단어 학습",
  description: "5단계 영단어 마스터 학습 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background min-h-screen text-slate-900 antialiased">
        <Header />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 lg:px-40">
      <div className="flex items-center gap-3">
        <a href="/" className="flex items-center gap-3">
          <span className="material-symbols-outlined text-3xl text-primary">
            school
          </span>
          <h1 className="text-lg font-bold tracking-tight">VocabMaster</h1>
        </a>
      </div>
      <nav className="hidden md:flex items-center gap-9">
        <a
          className="text-sm font-medium text-slate-600 hover:text-primary transition-colors"
          href="/"
        >
          홈
        </a>
        <a
          className="text-sm font-medium text-slate-600 hover:text-primary transition-colors"
          href="/study/input"
        >
          새 학습
        </a>
        <a
          className="text-sm font-medium text-slate-600 hover:text-primary transition-colors"
          href="/wrong-words"
        >
          오답 노트
        </a>
      </nav>
    </header>
  );
}
