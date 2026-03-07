import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthButton from "@/components/AuthButton";
import { AdminNavLink, AdminTabLink } from "@/components/AdminLink";
import { TeacherNavLink, TeacherTabLink } from "@/components/TeacherLink";

export const viewport: Viewport = {
  themeColor: "#137fec",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "VocabMaster - 영단어 학습",
  description: "5단계 영단어 마스터 학습 플랫폼",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VocabMaster",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/apple-touch-icon.png",
  },
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
      <body className="bg-background min-h-screen text-slate-900 antialiased pb-20 md:pb-0">
        <Header />
        <main className="flex-1">{children}</main>
        <DataSourceFooter />
        <MobileTabBar />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 py-3 lg:px-40">
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
        <a
          className="text-sm font-medium text-slate-600 hover:text-primary transition-colors"
          href="/leaderboard"
        >
          랭킹
        </a>
        <TeacherNavLink />
        <AdminNavLink />
        <AuthButton />
      </nav>
    </header>
  );
}

function ServiceWorkerRegister() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        `,
      }}
    />
  );
}

function DataSourceFooter() {
  return (
    <footer className="mt-16 mb-4 px-4 text-center text-[11px] text-slate-300 leading-relaxed">
      <span>발음·뜻: 네이버 사전(옥스퍼드 영한사전)</span>
      <span className="mx-1.5">|</span>
      <span>영어 정의: Free Dictionary API</span>
    </footer>
  );
}

function MobileTabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around py-2 md:hidden z-50">
      <a href="/" className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-500 active:text-primary">
        <span className="material-symbols-outlined text-2xl">home</span>
        <span className="text-[10px] font-medium">홈</span>
      </a>
      <a href="/study/input" className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-500 active:text-primary">
        <span className="material-symbols-outlined text-2xl">add_circle</span>
        <span className="text-[10px] font-medium">새 학습</span>
      </a>
      <a href="/leaderboard" className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-500 active:text-primary">
        <span className="material-symbols-outlined text-2xl">emoji_events</span>
        <span className="text-[10px] font-medium">랭킹</span>
      </a>
      <a href="/profile" className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-500 active:text-primary">
        <span className="material-symbols-outlined text-2xl">person</span>
        <span className="text-[10px] font-medium">프로필</span>
      </a>
      <TeacherTabLink />
      <AdminTabLink />
    </nav>
  );
}
