// 배포 빌드 시 Supabase 스키마를 반영한다.
// DATABASE_URL 이 없거나 연결에 실패해도 빌드를 중단시키지 않는다.
// (스키마가 반영되지 않으면 로그인 화면은 뜨지만 DB 기능은 동작하지 않으므로,
//  Netlify 환경변수에 DATABASE_URL 을 반드시 등록해야 한다.)
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL || "";

if (!url) {
  console.warn(
    "\n⚠️  DATABASE_URL 이 설정되지 않아 prisma db push 를 건너뜁니다.\n" +
      "    Netlify Site settings → Environment variables 에 DATABASE_URL(Supabase) 를 등록하고 다시 배포하세요.\n"
  );
  process.exit(0);
}

try {
  console.log("▶ prisma db push (Supabase 스키마 반영)...");
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: "inherit",
  });
  console.log("✅ 스키마 반영 완료");
} catch (e) {
  console.warn(
    "\n⚠️  prisma db push 실패 - 빌드는 계속 진행합니다.\n" +
      "    DATABASE_URL 이 올바른지(Session/Direct connection 권장) 확인하세요.\n"
  );
  // 빌드를 막지 않는다: 사이트(로그인 화면)는 뜨도록 한다.
  process.exit(0);
}
