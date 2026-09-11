import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import { cookies } from "next/headers";
import { AUTH_COOKIE, SESSION_SECRET, ADMIN_EMAILS } from "@/lib/auth";
import { verifySession } from "@/lib/session";

export const metadata: Metadata = {
  title: "세움 정산 OS",
  description: "계약·수납·매출·비용·부가세를 한 곳에서 관리하는 경영지원팀 전용 시스템",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = cookies().get(AUTH_COOKIE)?.value;
  const session = await verifySession(token, SESSION_SECRET);
  const isAdmin =
    Boolean(session?.email) && ADMIN_EMAILS.includes(session!.email.toLowerCase());

  return (
    <html lang="ko">
      <body>
        <div className="flex min-h-screen">
          <Nav isAdmin={isAdmin} />
          <main className="flex-1 min-w-0">
            <div className="w-full px-5 py-6 md:px-8 md:py-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
