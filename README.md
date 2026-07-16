# 세움 정산 OS (Seeum Settlement OS)

세움 통합 플랫폼의 **정산팀 전용 정산 관리 시스템**입니다.
수기·전자 계약서를 등록하고 **계약금·중도금·잔금** 수납을 체크하며,
**주 단위·월 단위 매출**과 **비용**, **부가가치세 신고**까지 한 곳에서 관리합니다.

## 주요 기능

| 영역 | 설명 |
| --- | --- |
| 📄 **계약 관리** | 수기/전자 계약서 등록, 계약서 파일 첨부(스캔본·PDF), 계약금/중도금/잔금 회차 구성, 과세유형(과세·영세율·면세) 지정 |
| ✅ **수납 체크** | 회차별 입금 체크(수납일·수납금액), 부분 수납 지정, 전 회차 완납 시 자동 완납 처리, 미수금 자동 집계 |
| 📈 **매출** | 수납 완료 금액 기준(현금주의) 주 단위·월 단위 매출 집계, 공급가액/부가세 분리, 누적 매출 |
| 🧾 **비용** | 지출(매입) 등록, 항목·거래처·계약 연결, 매입세액(공제) 자동 계산 |
| 🏛️ **부가세 신고** | 과세기간(1기/2기 예정·확정·반기)별 매출세액 − 매입세액 = 납부(환급)세액 자동 계산 |
| 📊 **대시보드** | 이번 주/달 매출, 미수금·수납률, 예상 부가세, 다가오는 수납 예정 |

## 기술 스택

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Prisma** ORM + **PostgreSQL (Supabase)**
- **Tailwind CSS**
- 배포: **Netlify** (SSR + 서버리스 함수)

## 데이터 모델

- **Contract(계약)** — 수기/전자, 과세유형, 총 계약금액(부가세 포함), 계약서 파일
- **Installment(납입 회차)** — 계약금/중도금/잔금, 예정금액·예정일, 수납 여부·수납일·수납금액
- **Expense(비용)** — 지출일, 항목, 금액(부가세 포함), 매입 과세유형, 계약 연결

- **Document(계약서 파일)** — 업로드된 계약서(PDF/이미지)를 DB에 바이트로 보관 (서버리스 환경 대응)

> 금액은 모두 **원 단위 정수**로 저장하며(항목당 최대 약 21.4억원), 계약·지출 금액은 **부가세 포함(공급대가)** 기준입니다.
> 과세 건은 `세액 = 금액 ÷ 11`, `공급가액 = 금액 − 세액` 으로 분리합니다.

## 로컬 개발

```bash
# 1) 의존성 설치
npm install

# 2) 환경변수 준비 (.env.example 참고) — DATABASE_URL 에 PostgreSQL(로컬 또는 Supabase) 문자열 입력
cp .env.example .env

# 3) 스키마 반영 + 클라이언트 생성 + 데모 데이터 시드
npm run setup

# 4) 개발 서버 실행
npm run dev
# http://localhost:3000
```

## Netlify + Supabase 배포

1. **Supabase 프로젝트 생성** → Project Settings → Database → Connection string 복사
   (서버리스에서는 **Session/Direct connection** 사용 권장. Transaction 풀러(pgBouncer)는 `prisma db push` 와 호환되지 않습니다.)
2. **Netlify 사이트**를 이 GitHub 저장소에 연결 (Netlify 가 Next.js 를 감지해 자동으로 SSR 런타임 적용)
3. Netlify **Site settings → Environment variables** 에 등록:
   - `DATABASE_URL` = Supabase 연결 문자열
4. 배포하면 빌드 시 `prisma db push` 가 Supabase 스키마를 자동 생성한 뒤 `next build` 가 실행됩니다.
   (스키마는 최초 1회 생성되며, 데모 데이터가 필요하면 로컬에서 `DATABASE_URL` 을 Supabase 로 두고 `npm run db:seed` 실행)

> `DATABASE_URL` 이 아직 없어도 사이트는 열립니다(데이터는 빈 상태로 표시되고 대시보드에 안내 배너가 뜹니다).
> Netlify 함수는 AWS Lambda 위에서 동작하므로 `prisma/schema.prisma` 의 `binaryTargets` 에
> `rhel-openssl-*` 를 포함해 두었습니다.

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 배포용 빌드 (`prisma generate` + `prisma db push` + `next build`) |
| `npm run build:local` | 로컬 빌드 (db push 없이 `prisma generate` + `next build`) |
| `npm run start` | 프로덕션 서버 |
| `npm run setup` | Prisma generate + db push + seed (최초 1회) |
| `npm run db:seed` | 데모 데이터 다시 넣기 |
| `npm run db:reset` | DB 초기화 후 재시드 |

## 세움 통합 플랫폼 통합 메모

- 인증은 현재 단일 관리자 비밀번호 방식입니다. 플랫폼 SSO 연동 시 `middleware.ts`
  와 `lib/auth.ts` 를 플랫폼 세션 검증으로 교체하면 됩니다.
- 매출 인식 기준은 현재 **수납일(현금주의)** 입니다. 세금계산서 발행 기준(발생주의)이
  필요하면 `lib/reports.ts` 의 인식 로직을 조정하세요.
- 계약서 파일은 DB(Document)에 저장합니다(서버리스 대응, 4MB 이하). 대용량이 필요하면
  Supabase Storage 등 오브젝트 스토리지로 전환할 수 있습니다.

> ⚠️ 부가세 계산은 정산 관리용 참고 수치입니다. 실제 신고 시에는 세금계산서 발행
> 기준과 세무 검토가 필요합니다.
