# 치과 임플란트 중계 플랫폼 (Next.js)

환자와 치과를 연결하는 임플란트 견적 비교 플랫폼. Vercel 풀스택 배포 대상.

> 기존 Spring Boot + Vue 3 (`dental-platform-svc`) 를 Vercel 환경으로 풀스택 마이그레이션한 프로젝트.

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js 14 (App Router) + React 18 + TypeScript |
| UI | shadcn/ui (Radix UI + Tailwind CSS) + lucide-react |
| 데이터베이스 | Vercel Postgres (Neon) + Prisma ORM 5 |
| 인증 | Auth.js v5 (next-auth) + Credentials + JWT 세션 + PrismaAdapter |
| 검증/폼 | Zod + react-hook-form |
| 데이터 페칭 | TanStack Query (React Query) |
| 파일 업로드 | AWS S3 (presigned URL) |
| 지도 | Naver Maps API (스크립트 로딩) |
| 배포 | Vercel (한국 리전 `icn1`) |

## 도메인 모델

17개 Prisma 모델 (Auth.js 3 + 도메인 14) + 9개 enum. 자세한 내용은 [`prisma/schema.prisma`](./prisma/schema.prisma) 참고.

- 사용자: `User`, `Patient`, `Dentist`
- 병원: `Clinic`, `ClinicBusinessHours`, `ClinicPhoto`, `ClinicImplantBrand`
- 견적: `QuotationRequest`, `QuotationRequestMissingTooth`, `QuotationRequestPhoto`, `Quotation`, `QuotationImplantItem`, `QuotationAdditionalItem`, `QuotationConsultationSchedule`, `QuotationStatusHistory`
- 예약/리뷰: `Consultation`, `Review`

## 빠른 시작

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example` 을 복사해 `.env.local` 생성 후 값 채움:

```bash
cp .env.example .env.local
```

필요한 값:
- `AUTH_SECRET` — `openssl rand -base64 32` 로 생성
- `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING` — Vercel Postgres
- `AWS_*` — S3 자격증명
- `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` — 네이버 클라우드 콘솔에서 발급

### 3. 데이터베이스 마이그레이션

```bash
npm run db:push       # 초기 스키마 적용 (개발용)
# 또는
npm run db:migrate    # 마이그레이션 파일 생성 후 적용
```

### 4. 개발 서버

```bash
npm run dev
```

→ http://localhost:3000

## 폴더 구조

```
dental-nextjs/
├── prisma/
│   └── schema.prisma           # DB 스키마 (17 model, 9 enum)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── auth/
│   │   │       ├── [...nextauth]/route.ts     # Auth.js 핸들러
│   │   │       └── register/route.ts          # 회원가입
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── patient/
│   │   │   └── dashboard/page.tsx
│   │   ├── dentist/
│   │   │   └── dashboard/page.tsx
│   │   ├── globals.css         # shadcn HSL 변수
│   │   ├── layout.tsx          # 루트 레이아웃 + Providers
│   │   └── page.tsx            # 홈페이지
│   ├── components/
│   │   ├── ui/
│   │   │   └── button.tsx      # shadcn 컴포넌트
│   │   └── providers.tsx       # SessionProvider + QueryClientProvider
│   ├── lib/
│   │   ├── prisma.ts           # PrismaClient singleton
│   │   ├── s3.ts               # S3 presigned URL
│   │   ├── utils.ts            # cn() 헬퍼
│   │   └── zod-schemas.ts      # 도메인 검증 스키마
│   ├── types/
│   │   └── next-auth.d.ts      # 세션에 id, role 확장
│   ├── auth.ts                 # Auth.js v5 설정
│   └── middleware.ts           # 역할 기반 라우트 가드
├── components.json             # shadcn 설정 (style: new-york, slate)
├── tailwind.config.ts          # shadcn HSL 변수 + tailwindcss-animate
├── vercel.json                 # icn1 리전, prisma generate
└── .env.example
```

## 인증 흐름

1. `/auth/register` → `POST /api/auth/register` (역할: PATIENT|DENTIST)
2. `/auth/login` → Credentials Provider → 이메일+bcrypt 비밀번호 검증 → JWT 세션 발급
3. 세션 JWT 에 `id`, `role` 클레임 포함
4. `middleware.ts` 가 `/patient/*` → PATIENT, `/dentist/*` → DENTIST, `/admin/*` → ADMIN 만 통과

## 역할별 접근 영역

| 역할 | 허용 경로 |
|---|---|
| PATIENT | `/patient/**`, 공개 경로 |
| DENTIST | `/dentist/**`, 공개 경로 |
| ADMIN | `/admin/**`, 공개 경로 |
| 비로그인 | `/`, `/about`, `/auth/*`, `/clinics/*` |

## 마이그레이션 매핑 (Spring Boot → Next.js)

| Spring Boot | Next.js |
|---|---|
| Controllers (`@RestController`) | App Router `route.ts` |
| Services (`@Service`) | `src/lib/*` + Server Actions |
| JPA Entities | Prisma models |
| MariaDB | Vercel Postgres (Neon) |
| Spring Security + JJWT | Auth.js v5 (Credentials + JWT) |
| `@PreAuthorize("hasRole(...)")` | `middleware.ts` + `auth()` 헬퍼 |
| AWS SDK Java | `@aws-sdk/client-s3` (TypeScript) |
| Bean validation (`@Valid`) | Zod schemas |
| Hikari pool | Prisma + Pgbouncer (POSTGRES_PRISMA_URL) |

## Vercel 배포

1. GitHub 저장소 push
2. [Vercel Dashboard](https://vercel.com/new) → Import Project
3. Storage → Create Database → Postgres → 프로젝트 연결 (자동으로 `POSTGRES_*` 환경변수 주입)
4. Settings → Environment Variables 에 추가:
   - `AUTH_SECRET`, `AUTH_TRUST_HOST=true`
   - `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
   - `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`
5. Deploy → `prisma generate && next build` 자동 실행

## 다음 작업 단계 (TODO)

### Phase 1 — 최소 기능 (E2E 회원가입/로그인 검증)
- [x] Next.js + shadcn + Prisma + Auth.js 골격
- [x] 회원가입 (PATIENT, DENTIST), 로그인, 미들웨어
- [x] 환자/치과 대시보드 placeholder
- [ ] DB 초기화 + Vercel 배포 검증

### Phase 2 — 핵심 도메인 기능
- [ ] 환자: 견적 요청 생성 (사진 업로드, 치아 선택, 증상)
- [ ] 치과: 견적 요청 조회 + 견적서 작성
- [ ] 환자: 받은 견적서 비교
- [ ] 병원 검색 (Naver Maps 통합)
- [ ] 상담 예약 (캘린더 컴포넌트)
- [ ] 리뷰 작성

### Phase 3 — 운영 / 부가 기능
- [ ] Admin 대시보드 (사용자/병원 승인)
- [ ] 알림 (이메일, FCM)
- [ ] 결제 통합 (선택)
- [ ] 검색 필터링 / 정렬

## 스크립트

```bash
npm run dev          # 개발 서버
npm run build        # 빌드 (prisma generate + next build)
npm run start        # 프로덕션 서버
npm run lint         # ESLint

npm run db:generate  # Prisma client 재생성
npm run db:push      # 스키마 → DB 즉시 반영 (개발용)
npm run db:migrate   # 마이그레이션 파일 생성 + 적용
npm run db:studio    # Prisma Studio (DB GUI)
```

## 라이선스

MIT
