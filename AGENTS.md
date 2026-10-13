# AGENTS.md — 문화소셜링

## 이 저장소
- 관심사가 맞는 사람들이 오프라인 공간에서 가볍게 만나는 1회성 모임("소셜링")을 찾고 신청하는 **모바일 웹 MVP 데모**. PM 교육과정 과제이고, PM은 EUNI 한 명이다.
- 데모 메시지: **"신청 전에 믿고 고르는 소셜링"**. 상태·인원·총 참가비·호스트 기록을 신청 전에 보여 주고, 참여를 마친 사람만 인증 후기를 쓴다.
- 발표는 라이브 시연(spec 7장 10단계) + 슬라이드. 실제 결제·실사용자는 없다.

## 먼저 읽을 것

| 언제 | 파일 |
|---|---|
| 모든 작업 | 이 파일, [docs/tasks.md](docs/tasks.md)의 해당 마일스톤 |
| 기능·화면·문구·상태 규칙 | [docs/spec.md](docs/spec.md) (기준), [docs/screen-cases.md](docs/screen-cases.md) |
| DB·함수·권한·환경·폴더 | [docs/architecture.md](docs/architecture.md) |
| UI | [DESIGN.md](DESIGN.md), [docs/design/wireframes/](docs/design/wireframes/), 시안(spec 8.11) |
| 왜 이렇게 정했나 | [docs/decisions.md](docs/decisions.md) |

- 우선순위: spec.md > DESIGN.md > 시안·와이어프레임. 서로 다르거나 빠진 것이 있으면 추측해서 기능을 만들지 말고 PM에게 묻거나 PR 설명에 적는다.
- 작업과 관련 없는 문서까지 전부 읽지 않는다. 마일스톤이 가리키는 절만 읽는다.

## 작업 방식
1. **마일스톤 하나씩.** 시작하면 코딩 전에 PR 단위 계획(PR마다 범위, 관련 spec 절, 테스트)을 보여 주고 PM 확인을 기다린다.
2. **PR은 작게**: 화면 하나 또는 DB 함수 하나 정도. 브랜치 → PR → Vercel 미리보기 확인 → main.
3. PR 설명은 한국어로: 사람이 보는 변화, 관련 spec 절과 screen-cases ID, 추가한 테스트, 미리보기 URL에서 확인하는 순서, 범위 밖 아이디어는 "제안"으로만.
4. 동작이 spec과 달라지면 같은 PR에서 `docs/`를 고친다. 새 결정은 `docs/decisions.md`에 한 줄.
5. 마일스톤 완료 기준은 `docs/tasks.md`의 체크리스트. 마일스톤을 끝내는 PR에서 체크한다.
6. 모든 PR은 tasks.md 1장 "모든 PR의 완료 기준"을 지킨다.

## 명령 (MS1에서 만든다. 바뀌면 여기를 고친다)

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 로컬 실행 |
| `npm run build` / `npm run lint` | 빌드, 린트 (PR마다 통과) |
| `npm run test:e2e` | Playwright E2E (시드한 dev 프로젝트 대상) |
| `npm run seed` | 데모 데이터 삭제 후 다시 넣기 (secret 키 사용) |
| `npm run db:push` | `supabase/migrations`에서 아직 적용하지 않은 파일을 원격 dev에 적용 (Management API). `-- --dry-run`은 목록만 |
| `npm run db:types` | DB 타입 생성 → `lib/supabase/database.types.ts` (Management API) |

## 스택
Next.js 16.3.x (App Router) · React 19 · TypeScript 6.0 · Supabase (Postgres, Auth, Storage, `@supabase/ssr`) · Tailwind CSS 4 · shadcn/ui · lucide-react · zod · Playwright · Vercel Hobby. 메이저 버전 올리기와 새 라이브러리 추가는 PR 설명에 이유를 적는다.

## 코드 규칙
- **상태 전환·권한·정원 검사는 Postgres 함수(RPC)에만 둔다.** 버튼 하나 = 서버 액션 하나 = 함수 하나. 같은 규칙을 화면이나 서버 액션에 다시 구현하지 않는다. 버튼을 보일지·막을지는 DB가 계산해 준 값으로 정한다.
- 읽기는 서버 컴포넌트에서. 쓰기 뒤에는 관련 경로를 revalidate한다.
- 함수는 정해진 오류 코드를 돌려주고(architecture 5장), 서버 액션이 spec에 적힌 문구로 바꾼다. 화면 문구는 spec에 적힌 그대로 쓴다.
- 테이블에 직접 쓰기 정책을 열지 않는다. `review_checks`는 누구도 직접 읽지 못하고 집계 함수만 읽는다.
- DB 변경은 `supabase/migrations`에 새 SQL 파일로 추가한다. 이미 적용한 마이그레이션 파일은 고치지 않는다. 적용 뒤 `db:types`.
- 입력은 zod로 검증한다(폼과 서버 액션 모두).
- 날짜는 DB에 `timestamptz`, 화면 표시와 날짜 필터는 Asia/Seoul로 계산한다(`lib/format`).
- 로그인 복귀 `next`는 `/`로 시작하고 `//`로 시작하지 않는 앱 안 주소만 받는다.
- 사진은 브라우저에서 1MB 이하로 줄여 Storage에 직접 올린다. 업로드가 실패해도 글과 나머지 입력은 제출된다.
- 코드 식별자는 영어, 화면 글자는 한국어. 도메인 이름은 아래 용어 표의 코드 이름을 쓴다.

## UI 규칙
- 색·글꼴·간격·모서리는 DESIGN.md 토큰만 쓴다. hex 값을 컴포넌트에 직접 쓰지 않고 Tailwind 테마·CSS 변수로 쓴다. shadcn/ui 기본 색은 DESIGN.md 값으로 바꾼다.
- 컴포넌트는 DESIGN.md의 이름(`status-badge`, `apply-bar` 등)으로 만들고, 변형·상태는 props로 받는다. DESIGN.md에 없는 모양을 새로 만들지 않는다.
- 390px 기준, 가로 스크롤 없음, 터치 영역 44px 이상, 글자 대비 4.5:1 이상, 12px 미만 글자 없음, Light mode만.
- primary(#59CBE8) 위에는 흰 글자를 쓰지 않는다(on-primary 남색).
- 데이터를 불러오는 모든 화면에 로딩(스켈레톤)·오류(다시 시도·홈으로)·빈 상태를 둔다. 처리 중 버튼은 잠근다.
- 상세 아래 고정 영역은 spec 8.4 표의 위에서부터 먼저 맞는 줄 하나만 보인다.
- 시안과 spec이 다르면 spec을 따른다. DESIGN.md의 "시안과 다르게 정한 것" 표도 시안보다 우선이다. 시안은 `docs/design/screens/` PNG를 먼저 보고, Figma는 PM 승인을 받은 뒤 그 화면 node id로만 연다(읽기 횟수 한도, `docs/design/screens/README.md`).

## 테스트
- Playwright E2E, 모바일 뷰포트 390px, Chromium. 시드한 dev 프로젝트를 대상으로 한다.
- 기능을 만들면 spec 7장의 해당 시연 단계 E2E를 함께 추가한다. 테스트 이름에 단계 번호나 screen-cases ID를 넣는다.
- main에 합치기 전에 전체 E2E가 통과해야 한다.
- 테스트가 데이터를 바꿔야 하면 시드 데이터를 건드리지 말고, `tests/e2e/helpers/supabase.ts`로 제목이 `[E2E]`로 시작하는 테스트 전용 소셜링을 만들고 테스트 끝에 지운다(Management API, `SUPABASE_ACCESS_TOKEN`).
- 테스트를 건너뛰거나 지우거나 약하게 바꿔서 통과시키지 않는다. 실패 원인을 고친다.

## 보안과 환경
- 환경 변수 4개는 architecture 7장. **값은 출력·커밋·로그·PR에 쓰지 않는다.** 있는지 이름만 확인한다.
- Supabase 키는 새 방식만 쓴다: 앱은 publishable 키(`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), 시드는 secret 키(`SUPABASE_SECRET_KEY`). 옛 `anon`·`service_role` 키와 그 이름은 쓰지 않는다(2026년 말 폐지 예정).
- `SUPABASE_SECRET_KEY`는 `scripts/seed.mts`에서만 쓴다. `app/`, `components/`, `lib/`에서 import하지 않는다. secret 키는 브라우저에서 거부된다(401).
- `.env*.local`은 커밋하지 않는다. **이 저장소는 공개 상태다.**
- 클라우드 환경에는 dev(`socialing-mvp`) 키만 있다. 발표용 `socialing-demo`는 PM이 MS9에서 직접 다룬다.
- Docker는 없다. 클라우드 세션은 HTTPS로만 나가므로 Postgres 직접 접속(`supabase db push`)은 쓰지 않는다. 마이그레이션은 Management API(`api.supabase.com`, `SUPABASE_ACCESS_TOKEN`)로 원격 dev에 적용한다. 토큰은 dev 프로젝트로 범위를 줄인 것이라 권한이 모자라면 우회하지 말고 PM에게 필요한 권한 이름을 알려 준다.
- **정한 방법 (SP5)**: `npm run db:push`가 `POST /v1/projects/{ref}/database/query`로 파일 하나를 트랜잭션 하나로 적용하고, 같은 트랜잭션에서 `supabase_migrations.schema_migrations`에 **파일 이름의 버전**을 기록한다. 실패하면 SQL과 기록이 함께 취소된다. 파일 이름은 `<14자리 버전>_<이름>.sql`(Supabase CLI 규칙), 파일 안에 `begin`/`commit`을 쓰지 않는다. 타입은 `npm run db:types`(`GET /types/typescript`). Supabase CLI와 Docker는 필요 없다. 클라우드 밖에서는 같은 이름의 변수를 `.env.local`에 넣고 같은 명령을 쓴다(Node 22.18 이상).

## 하지 않는 것 (전체는 spec 10장)
채팅·메시지, 알림(푸시·메일·문자), 결제·환불·정산, 비용 항목 내역, 최소 인원·자동 확정·자동 취소·예약 작업(cron), 별점·좋아요·댓글·찜, 점수·온도·랭킹·뱃지·포인트, 추천·인기순·유료 노출·넘기는 배너, 지도·검색창·공유 버튼, 이메일 인증·소셜 로그인·비밀번호 찾기·프로필 사진, 어드민 화면·신고 처리·출석 체크, 다크 모드, "이성 교류" 같은 표현, 다른 앱(문토 등)의 이름·디자인·문구·사진.

## 용어 (화면 → 코드)

| 화면 | 코드 |
|---|---|
| 소셜링 | `socialing` |
| 모집중 / 확정 / 종료 / 호스트 취소 | `recruiting` / `confirmed` / `completed` / `canceled` |
| 신청: 승인 대기 / 참여 확정 / 거절 / 신청 취소 | `application`: `pending` / `accepted` / `rejected` / `canceled` |
| 소셜링 일시 / 신청 마감 일시 | `starts_at` / `apply_deadline_at` |
| 정원(스태프 제외) / 스태프 | `capacity` / `staff_count` |
| 총 참가비 / 술 여부 / 대표 사진 | `fee` / `has_alcohol` / `cover_photo_path` |
| 모집 방식: 선착순 / 호스트 승인, 승인 기준 | `join_type`: `first_come` / `approval`, `approval_criteria` |
| 인증 후기 / 비공개 확인 질문 | `review` / `review_checks` |
| 스터디지점 / 외부 장소, 지역 | `venues.type`: `branch` / `external`, `regions` |

"모임", "이벤트", "진행 확정", "확정 마감"이라고 쓰지 않는다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
