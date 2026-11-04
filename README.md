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
- `DATABASE_URL` — PostgreSQL 연결 URL (`prisma/schema.prisma` 가 읽는 유일한 DB 변수)
- `CRON_SECRET` — Vercel Cron 인증값. 없으면 `/api/cron/*` 이 모두 401
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
| Hikari pool | Prisma (DATABASE_URL) |

## Vercel 배포

1. GitHub 저장소 push
2. [Vercel Dashboard](https://vercel.com/new) → Import Project
3. Storage → Create Database → Postgres → 프로젝트 연결 후, 그 연결 URL 을 `DATABASE_URL` 로 등록 (스키마는 `DATABASE_URL` 만 읽는다)
4. Settings → Environment Variables 에 추가:
   - `AUTH_SECRET`, `AUTH_TRUST_HOST=true`
   - `CRON_SECRET` (cron 2개가 이 값으로만 인증 — 아래 "운영 보안 규칙" 참고)
   - `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
   - `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`
5. Deploy → `prisma generate && next build` 자동 실행

## 운영 보안 규칙

환자 견적 요청에는 증상·치료 이력·구강 사진 같은 건강정보가 들어 있다. 아래 규칙은 코드로 강제된다.

| 규칙 | 위치 |
|---|---|
| 면허 인증(`Dentist.isVerified`) 전 의사는 견적 요청 목록·상세·사진을 보지 못하고 견적서·채팅을 시작할 수 없다 | `src/lib/dentist-access.ts` |
| 의사에게 환자는 가린 이름(`김**`) + 시/구까지만. 실명은 그 의사의 견적서가 수락된 뒤에만 | `canDentistSeePatientName` |
| 의사는 같은 요청에 달린 다른 병원 견적서(가격)를 볼 수 없다 | `api/quotation-requests/[id]` |
| 사진은 DB 에 버킷 URL 로 저장하고, 화면에는 서명 URL(1시간 단위 고정, 2시간 유효)로만 내보낸다 → 버킷 비공개 가능 | `src/lib/s3.ts` `toViewUrl` |
| 견적 요청 사진·채팅 이미지는 본인이 이 서비스로 올린 파일만 허용 | `isOwnUpload` |
| 회원 상태는 요청마다 다시 확인 — 정지·비활성·탈퇴 시 토큰이 남아도 바로 로그아웃 | `src/auth.ts` jwt 콜백 |
| 날짜 경계(오늘 상담, 유효기간)는 서울 시간 기준 | `src/lib/kst.ts` |
| 응답 후 메일 발송은 `waitUntil` 로 끝까지 실행 | `@vercel/functions` |

### Cron

| 경로 | 주기 (UTC) | 하는 일 |
|---|---|---|
| `/api/cron/unread-chat` | 매일 00:00 (서울 09:00) | 5분 넘게 안 읽은 채팅 메일 알림 (방마다 1시간에 1번) |
| `/api/cron/expire` | 매일 15:05 (서울 00:05) | 기간 지난 OPEN 견적 요청 → EXPIRED, 남은 PENDING 견적서와 유효기간 지난 견적서 → EXPIRED (이력 기록) |

- 두 cron 모두 `Authorization: Bearer <CRON_SECRET>` 로만 통과한다 (User-Agent 는 인증 근거가 아니다).
- Vercel Hobby 요금제는 cron 을 하루 1번까지만 허용해서 두 cron 모두 하루 1번이다. 더 자주 돌리려면 Pro 요금제나 외부 스케줄러(GitHub Actions 등)로 같은 주소를 `CRON_SECRET` 과 함께 호출한다.
- 새 견적 요청은 만든 날로부터 30일 뒤를 `expiresAt` 으로 저장한다. `expiresAt` 이 비어 있는 예전 요청은 자동 만료하지 않는다.

## 술식 안내 · 의사 술식 학습 · 교육 이수

견적서의 시술 태그(`TREATMENT_PLAN_TAGS` — extract, bone_graft, sinus, implant, abutment, crown, ct, anesthesia, scaling, checkup)를 키로 세 기능이 묶인다.

| 기능 | 대상 | 화면 | 데이터 |
|---|---|---|---|
| 치료 미리 알아보기 | 환자·비로그인 | `/procedures`, `/procedures/[tag]` | 코드 안 콘텐츠 `src/lib/content/procedures.ts` (DB 없음) |
| 술식 학습 | 면허 인증 의사 | `/dentist/learning`, `/dentist/learning/[id]` | `Course`, `CourseLesson`, `LessonProgress` |
| 교육 이수 이력 | 의사 등록 → 환자에게 표시 | `/dentist/credentials` | `DentistCredential` |
| 과정·강의 관리, 이수 확인 | 관리자 | `/admin/courses`, `/admin/credentials` | — |

- 환자 견적서 상세에 그 견적에 나온 시술의 안내 바로가기가 붙는다 (치료 계획·추가 항목 문장에서 찾음).
- 과정의 강의를 모두 마치면 온라인 이수 이력이 자동으로 생긴다(확인됨). 오프라인 연수는 의사가 수료증 사진과 함께 등록 → 관리자 확인 후 표시.
- 환자 화면(받은 견적서·견적 비교·병원 소개)에는 면허 인증된 의사의 확인된 이력만 "○○ 과정 이수 · 기관 · 연월" 로 표시한다. 과정명에 '전문'·'명의' 같은 표현은 받지 않는다 (의료광고).
- 강의 영상은 YouTube·Vimeo 주소(임베드) 또는 mp4 주소. 우리 S3 주소면 서명 URL 로 재생한다. 공개를 제한해야 하는 강의는 YouTube 일부 공개 대신 S3 나 도메인 제한 Vimeo 를 쓴다.
- 환자 안내 콘텐츠는 초안이다 (`CONTENT_REVIEWED = false`). 운영 공개 전에 치과 전문가 감수를 받는다.
- DB 반영: 새 테이블 4개·enum 3개 추가만 있다 (기존 테이블 변경 없음). 배포 **전에** `npm run db:push` 를 먼저 실행해야 한다 — 안 하면 견적서·병원 화면이 없는 테이블을 조회해 오류가 난다.

## 다음 작업 단계 (TODO)

### Phase 1 — 최소 기능 (E2E 회원가입/로그인 검증)
- [x] Next.js + shadcn + Prisma + Auth.js 골격
- [x] 회원가입 (PATIENT, DENTIST), 로그인, 미들웨어
- [x] 환자/치과 대시보드 placeholder
- [x] DB 초기화 + Vercel 배포 검증

### Phase 2 — 핵심 도메인 기능
- [x] 환자: 견적 요청 생성 (사진 업로드, 치아 선택, 증상) — 노년 친화 8단계 입력
- [x] 치과: 견적 요청 조회 + 견적서 작성
- [x] 환자: 받은 견적서 비교 + 수락/거절
- [x] 병원 검색 (Naver Maps 통합)
- [x] 상담 예약 (시간 겹침·지난 시각 검사)
- [x] 리뷰 작성
- [x] 환자 ↔ 의사 채팅 (이미지·핀·검색·입력 중 표시, 미읽음 메일)

### Phase 3 — 운영 / 부가 기능
- [x] Admin 대시보드 (사용자 상태, 의사 인증, 프리미엄 병원)
- [x] 알림 — 이메일 + 화면 알림 벨
- [ ] 푸시 알림 (Web Push 또는 카카오 알림톡)
- [ ] 채팅 실시간 채널 (지금은 3초/10초 폴링, 화면이 가려지면 멈춤)
- [x] 환자용 치료 안내 · 의사 전용 술식 학습 · 교육 이수 이력 표시
- [ ] 환자용 치료 안내 콘텐츠 전문가 감수
- [ ] 동의 기록 저장 (회원가입 약관·민감정보 동의를 서버에 기록)
- [ ] PWA (manifest, 서비스워커, 홈 화면 추가)
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
