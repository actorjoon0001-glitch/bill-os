// 세움os 로그인 — 세움 플랫폼의 Supabase Auth(이메일+비밀번호)로 인증하고,
// employees 테이블의 team/status 로 접근 권한(정산/경영팀 + 관리자)을 판단한다.

export const AUTH_COOKIE = "seum_session";

// 세션 서명 키. 운영 시 AUTH_SECRET 로 교체 권장.
export const SESSION_SECRET =
  process.env.AUTH_SECRET || "seeum-settlement-os-session-v1";

// 쿠키 유효기간(초): 기본 12시간
export const SESSION_MAX_AGE = 60 * 60 * 12;
// 자동 로그인(로그인 상태 유지) 시: 30일
export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;

// 로그인 허용 팀(employees.team). 기본: 정산 + 경영.
export const ALLOWED_TEAMS = (process.env.ALLOWED_TEAMS || "정산,경영")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// 팀과 무관하게 항상 허용하는 관리자 이메일.
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "harold0001@naver.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// 세움os Supabase 접속 정보는 전자계약서 연동과 동일한 환경변수를 재사용한다.
//   ECONTRACT_API_URL = https://xxxx.supabase.co/rest/v1
//   ECONTRACT_API_KEY = publishable/anon key
export function supabaseRest(): string {
  return (process.env.ECONTRACT_API_URL || "").replace(/\/+$/, "");
}
export function supabaseAuthBase(): string {
  // /rest/v1 을 떼어 프로젝트 베이스 URL 을 얻는다.
  return supabaseRest().replace(/\/rest\/v1$/, "");
}
export function supabaseKey(): string {
  return process.env.ECONTRACT_API_KEY || "";
}
export function authConfigured(): boolean {
  return Boolean(supabaseAuthBase() && supabaseKey());
}
