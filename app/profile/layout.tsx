import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "내 프로필",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
