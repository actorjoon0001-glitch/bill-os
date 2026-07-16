import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "세움 정산 OS",
  description: "계약·수납·매출·비용·부가세를 한 곳에서 관리하는 정산팀 전용 시스템",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="flex min-h-screen">
          <Nav />
          <main className="flex-1 min-w-0">
            <div className="mx-auto max-w-6xl px-5 py-6 md:px-8 md:py-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
