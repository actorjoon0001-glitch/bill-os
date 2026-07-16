// 관리자 단일 비밀번호 인증 (정산팀 내부용).
// 실제 운영 시에는 .env 의 ADMIN_PASSWORD / AUTH_SECRET 를 반드시 변경하세요.

export const AUTH_COOKIE = "seeum_session";

// 로그인 비밀번호. 환경변수로 덮어쓸 수 있으며, 기본값은 요청된 초기 비밀번호.
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "931122";

// 세션 쿠키에 저장되는 토큰. 비밀번호와 분리해 노출을 최소화한다.
export const SESSION_TOKEN =
  process.env.AUTH_SECRET || "seeum-settlement-os-session-v1";

// 쿠키 유효기간 (초): 12시간
export const SESSION_MAX_AGE = 60 * 60 * 12;
