import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";

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
      <body className="bg-background min-h-screen text-slate-900 antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <DataSourceFooter />
        <ServiceWorkerRegister />
      </body>
    </html>
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
