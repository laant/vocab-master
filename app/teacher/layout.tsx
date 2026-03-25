import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "선생님 대시보드",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
