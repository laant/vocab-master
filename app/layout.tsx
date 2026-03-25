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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vocabmaster.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "VocabMaster - 영단어 배틀 & 학습",
    template: "%s | VocabMaster",
  },
  description: "목숨 3개로 도전하는 영단어 배틀! 중등·고등 필수 영단어를 스피드 퀴즈로 마스터하세요. 랭킹 경쟁, 오답 복습, 간격 반복 학습까지.",
  keywords: ["영단어", "영어 단어", "영단어 암기", "영단어 퀴즈", "중등 영단어", "고등 영단어", "영어 학습", "단어 배틀", "보카", "VocabMaster"],
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "VocabMaster",
    title: "VocabMaster - 영단어 배틀 & 학습",
    description: "목숨 3개로 도전하는 영단어 배틀! 중등·고등 필수 영단어를 스피드 퀴즈로 마스터하세요.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "VocabMaster 영단어 배틀" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "VocabMaster - 영단어 배틀 & 학습",
    description: "목숨 3개로 도전하는 영단어 배틀! 중등·고등 필수 영단어를 스피드 퀴즈로 마스터하세요.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: siteUrl,
  },
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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "VocabMaster",
  description: "목숨 3개로 도전하는 영단어 배틀! 중등·고등 필수 영단어를 스피드 퀴즈로 마스터하세요.",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "KRW",
  },
  inLanguage: "ko",
  audience: {
    "@type": "EducationalAudience",
    educationalRole: "student",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
          href="/battle"
        >
          배틀
        </a>
        <a
          className="text-sm font-medium text-slate-600 hover:text-primary transition-colors"
          href="/wrong-words"
        >
          오답 노트
        </a>
        <a
          className="text-sm font-medium text-slate-600 hover:text-primary transition-colors"
          href="/battle/rank"
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
      <a href="/battle" className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-500 active:text-primary">
        <span className="material-symbols-outlined text-2xl">swords</span>
        <span className="text-[10px] font-medium">배틀</span>
      </a>
      <a href="/wrong-words" className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-500 active:text-primary">
        <span className="material-symbols-outlined text-2xl">auto_stories</span>
        <span className="text-[10px] font-medium">오답노트</span>
      </a>
      <a href="/battle/rank" className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-500 active:text-primary">
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
