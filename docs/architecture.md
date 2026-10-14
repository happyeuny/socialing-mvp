# 아키텍처: 어떻게 만드나

- 무엇을 만드는지는 [spec.md](spec.md), 결정 이유는 [decisions.md](decisions.md). 구조가 바뀌면 같은 PR에서 이 문서를 고친다.
- 버전은 2026-10-12에 npm에서 확인한 값이다. MS1에서 설치할 때 다시 확인하고, 최신 메이저가 막 나온 경우 한 단계 이전 안정 버전을 고정한다.

## 1. 스택

| 영역 | 선택 | 버전 |
|---|---|---|
| 프레임워크 | Next.js App Router + React | next 16.3.x (16.4는 쓰지 않음), react 19.x |
| 언어 | TypeScript | 6.0.x (7.0 쓰지 않음) |
| DB·인증·파일 | Supabase (Postgres, Auth, Storage). 키는 새 방식 publishable·secret만 | @supabase/supabase-js 2.x, @supabase/ssr 0.12.x, supabase CLI 2.x (`npx supabase`) |
| UI | Tailwind CSS + shadcn/ui, 아이콘 lucide-react. 창(바텀시트·가운데 창)은 Radix Dialog에 DESIGN 토큰을 직접 입힌다(decisions.md) | tailwindcss 4.x, shadcn CLI 4.x, @radix-ui/react-dialog 1.1.x |
| 글꼴 | Noto Sans KR. npm 글꼴 패키지로 앱 안에서 제공 (`next/font/google`은 빌드 때 Google에 접속하는데 클라우드 환경 네트워크가 막을 수 있음) | @fontsource-variable/noto-sans-kr 5.3.x |
| 입력 검증 | zod | 4.x |
| 린트 | ESLint + eslint-config-next (core-web-vitals, typescript) | eslint 9.x (10 쓰지 않음) |
| E2E 테스트 | Playwright (Chromium, 모바일 390px) | @playwright/test 1.56.1 (클라우드 환경의 Chromium에 맞춰 고정) |
| 이미지 축소 | browser-image-compression (문제 시 canvas로 대체) | 2.0.2 |
| 배포 | Vercel Hobby | - |

## 2. 구조

```mermaid
flowchart LR
    U[휴대폰 브라우저] -->|페이지 요청| N[Next.js on Vercel]
    N -->|읽기: 서버 컴포넌트| DB[(Supabase Postgres<br/>테이블·뷰 + RLS)]
    N -->|쓰기: 서버 액션 → RPC 함수| DB
    U -->|로그인·세션 쿠키| A[Supabase Auth]
    N --> A
    U -->|축소한 사진 직접 업로드| S[Supabase Storage]
```

- **읽기**: 서버 컴포넌트가 Supabase에서 바로 읽는다. 비로그인도 목록·상세·피드를 읽을 수 있게 RLS를 연다. 동적 페이지가 기본이다.
- **쓰기**: 버튼 하나 = 서버 액션 하나 = Postgres 함수(RPC) 하나. 상태 전환·권한·정원 검사는 **DB 함수 안에만** 둔다. 서버 액션은 입력을 zod로 검사하고 함수를 부른 뒤, 결과를 화면 문구로 바꾸고 관련 경로를 재검증(revalidate)한다.
- **사진**: 브라우저에서 1MB 이하로 축소 → Storage에 직접 업로드(`사용자id/파일명`) → 경로를 함수에 넘긴다. 업로드가 실패하면 경로 없이 제출한다(Q4).
  - SP3에서 정한 것: `components/photo-picker.tsx`가 사진을 고르는 즉시 줄여서 올리고, 올린 경로를 폼의 숨은 칸으로 넘긴다(실패하거나 지우면 빈 값). 줄이기는 `lib/photos/compress.ts`: 긴 변 1600px, 목표 0.9MB, JPEG로 저장(버킷 한도 1MB에 여유). 라이브러리의 웹 워커는 외부 CDN(jsdelivr)에서 코드를 받아 와서 쓰지 않는다(`useWebWorker: false`).
  - 파일 고르기는 `accept="image/*"`. iPhone은 이때 HEIC 사진을 JPEG로 바꿔 넘긴다. 브라우저가 열지 못하는 형식(예: Android Chrome의 HEIC)은 "사진을 올리지 못했어요" + "JPEG로 골라 주세요".
  - 경로는 `<사용자 id>/<무작위 uuid>.jpg`. 고른 뒤 제출하지 않고 나간 사진은 버킷에 남는다(MVP에서는 정리하지 않음). `npm run seed`가 두 버킷을 비운다.
- **시간**: 현재/지난, 신청 가능, 버튼 가능 여부는 조회할 때 `now()`로 계산한다. 예약 작업(cron)은 없다. DB는 `timestamptz`, 화면 표시와 날짜 필터 계산은 Asia/Seoul로 고정한다(서버가 UTC여도 같은 결과).
- **세션**: `@supabase/ssr`로 쿠키 세션. Next.js 16은 루트 `proxy.ts`(예전 이름 middleware)에서 `supabase.auth.getClaims()`로 세션을 갱신하고, 로그인이 필요한 경로는 `/login?next=원래주소`로 보낸다. 서버 코드에서 `getSession()` 결과는 믿지 않고 `getClaims()`로 확인한다(Supabase 공식 Next.js 가이드, 2026-10-12 판).
  - SP1에서 정한 것: 세션 갱신과 주소 처리는 `lib/supabase/proxy.ts`(`updateSession`), 서버 컴포넌트·서버 액션용 클라이언트는 `lib/supabase/server.ts`. 로그인이 필요한 주소 목록(P06 `/me`, P07, P08, P09, P11)과 `next` 검사는 `lib/routes.ts` 한 곳에 둔다. 로그인한 사람이 `/login`·`/signup`에 오면 proxy가 `next`(없으면 `/`)로 보낸다.
  - proxy는 첫 관문일 뿐이라 로그인이 필요한 화면과 서버 액션도 `getClaims()`로 다시 확인한다(Next.js 16 proxy 안내). 호스트인지 같은 권한은 화면과 DB 함수가 확인한다.
  - `next`는 `/`로 시작하고 `//`·`/\`로 시작하지 않으며, URL로 풀었을 때 앱 주소 그대로인 값만 받는다(탭·줄바꿈이 섞여 다른 사이트로 읽히는 주소도 거부).
  - 가입은 `auth.signUp`에 `options.data.nickname`을 넘기고, profiles 행은 가입 트리거가 만든다. 닉네임 중복은 가입 전에 profiles를 읽어 확인하고, 그 사이 같은 닉네임이 먼저 가입하면 트리거가 실패하므로 한 번 더 읽어 "이미 쓰는 닉네임이에요"로 바꾼다.
  - 로그아웃은 이 기기의 세션만 끝낸다(`signOut({ scope: "local" })`). 발표 중 같은 계정으로 연 다른 기기는 그대로다.

## 3. 데이터 모델

### 3.1 테이블

| 테이블 | 주요 컬럼 | 제약·메모 |
|---|---|---|
| `profiles` | id(= auth.users.id), nickname, role(`member`/`host`/`admin`, 기본 `member`, 지금은 `member`만 씀. 호스트인지는 `socialings.host_id`로 판단), created_at | nickname 2~12자, unique. 가입 시 트리거로 생성(닉네임은 가입 메타데이터에서) |
| `regions` | id, sido, sigungu, code | 시드. 전국 시·도 > 시·군·구 |
| `venues` | id, type(`branch`/`external`), name, region_id, address_text | 지점도 region_id를 가진다 |
| `categories` | id, slug, name, sort_order, is_party | 5개 고정 시드. slug: `learning`, `hobby`, `activity`, `culture`, `party` |
| `socialings` | id, host_id, title, description, category_id, has_alcohol, venue_id, starts_at, apply_deadline_at, fee, capacity, staff_count, join_type(`first_come`/`approval`), approval_criteria(null 가능), cover_photo_path(null 가능), status(`recruiting`/`confirmed`/`completed`/`canceled`, 기본 `recruiting`), confirmed_at, completed_at, canceled_at, created_at, updated_at | apply_deadline_at ≤ starts_at, capacity 2~20, fee ≥ 0, staff_count ≥ 0 |
| `applications` | id, socialing_id, user_id, status(`pending`/`accepted`/`rejected`/`canceled`), created_at, decided_at, canceled_at | (socialing_id, user_id)는 status가 pending·accepted인 행이 하나만 (부분 유니크 인덱스) |
| `reviews` | id, socialing_id, user_id, body, photo_path(null 가능), created_at | (socialing_id, user_id) 유니크, body 10~500자 |
| `review_checks` | review_id(PK, FK), members_match, extra_money, content_match (boolean) | **직접 SELECT 정책 없음**. 집계 함수만 읽는다 |

enum 이름과 값은 위와 같다. 코드의 타입은 `supabase gen types`로 만든다.

```mermaid
erDiagram
    profiles ||--o{ socialings : "호스트"
    profiles ||--o{ applications : "신청"
    profiles ||--o{ reviews : "작성"
    socialings ||--o{ applications : ""
    socialings ||--o{ reviews : ""
    reviews ||--|| review_checks : "비공개"
    categories ||--o{ socialings : ""
    venues ||--o{ socialings : ""
    regions ||--o{ venues : ""
```

### 3.2 계산 값 (저장하지 않음, 뷰나 함수로)

| 이름 | 정의 |
|---|---|
| 참여 확정 인원 | 그 소셜링의 `accepted` 신청 수 |
| 신청 가능 | status ∈ (recruiting, confirmed) AND now() < apply_deadline_at AND 참여 확정 인원 < capacity |
| 꼬리표 | 신청 마감 일시 지남 → "신청 마감", 아니고 정원 참 → "정원 마감" (종료·호스트 취소에는 없음) |
| 현재 / 지난 | starts_at > now() / 그 외 |
| 호스트 기록 | 최근 6개월(starts_at 기준): 열린 소셜링 수(completed + accepted 1명 이상), 호스트 취소 수(canceled 중 pending·accepted 신청이 있던 것), 소개 일치 비율(review_checks 중 members_match = true, extra_money = false, content_match = true 비율, 응답 5건 이상일 때만), 후기 수 |
| 새 호스트 / 등급 | 열린 소셜링 3회 미만 → 새 호스트. 5회 이상 + 호스트 취소 0 + 일치 90% 이상 → "믿고 가는 호스트" |

호스트 기록은 `get_host_record(host_id)` 같은 SECURITY DEFINER 함수가 집계값만 돌려준다. 개별 응답은 어떤 경로로도 나가지 않는다.

목록·상세는 뷰 `socialing_summaries` 하나를 읽는다(MS2). 소셜링 칸에 호스트 닉네임·카테고리·장소·지역을 붙이고, 위 표를 계산한 칸을 더한다.

| 칸 | 값 |
|---|---|
| `accepted_count` | 참여 확정 인원 |
| `is_past` | 지난 소셜링 (starts_at <= now()) |
| `can_apply` | 신청 가능 |
| `status_tag` | 꼬리표 `closed`(신청 마감) / `full`(정원 마감) / null |
| `closed_reason` | 신청할 수 없는 이유. spec 8.4의 2·13줄 순서로 `host_canceled` / `started`(소셜링 일시 지남) / `not_open`(종료) / `deadline` / `full`, 신청 가능하면 null |

뷰는 `security_invoker`라 보는 사람 권한으로 읽는다. 비로그인은 applications를 못 읽으므로 참여 확정 인원만 SECURITY DEFINER 함수 `socialing_accepted_count(socialing_id)`가 숫자로 돌려준다. 누가 신청했는지는 이 경로로 나가지 않는다.

"나" 기준 읽기는 뷰 두 개다(MS3). 관리 화면(MS4)은 그중 `my_hosted_socialings`에 칸을 더하고 신청자 목록 뷰를 하나 더 쓴다. 둘 다 `socialing_summaries`의 칸을 그대로 두고 칸을 더하며, `security_invoker`이고 로그인한 사람만 읽는다. 상세 아래 영역(spec 8.4)과 내 소셜링(P06)이 같이 쓴다.

| 뷰 | 행 | 더한 칸 |
|---|---|---|
| `my_applied_socialings` | 내가 신청한 소셜링마다 **가장 최근 신청** 하나 (거절·신청 취소 뒤 다시 신청하면 새 행) | `application_id`, `application_status`(호스트 취소돼도 그대로), `applied_at`, `has_review`(내가 후기를 썼는지) |
| `my_hosted_socialings` | 내가 호스트인 소셜링 | `pending_count`(승인 대기 건수. applications는 호스트가 읽을 수 있어 함수 없이 센다). MS4 관리 화면(P11) 칸: `closed_count`(거절·취소 탭 건수, 사람마다 가장 최근 신청 기준), `can_confirm` · `confirm_blocked_reason`(`started`), `can_complete` · `complete_blocked_reason`(`confirm_first` 모집중·일시 전 / `not_confirmed` 모집중·일시 지남 / `not_started` 확정·일시 전), `can_cancel`, `can_edit`, `can_decide`(승인·거절), `can_approve` · `approve_blocked_reason`(`started` / `full`). 함수와 같은 조건이다 |
| `hosted_socialing_applicants` | 내가 호스트인 소셜링의 신청자마다 **가장 최근 신청** 하나 (MS4, P11 신청자 목록) | `socialing_id`, `application_id`, `nickname`, `status`(호스트 취소돼도 그대로), `applied_at`, `decided_at`, `canceled_at`. 신청자 본인에게는 비어 보인다 |

## 4. 권한 (RLS)

| 데이터 | 읽기 | 쓰기 |
|---|---|---|
| socialings, venues, regions, categories | 모두(비로그인 포함) | socialings는 등록·수정 함수로만 |
| applications | 본인, 그 소셜링의 호스트 | 함수로만 |
| reviews | 모두 | 함수로만 |
| review_checks | 아무도 직접 못 읽음 | `create_review` 함수로만 |
| 호스트 기록 | 모두 (집계 함수) | 계산 값 |
| `socialing_summaries` 뷰 (목록·상세) | 모두 (참여 확정 인원은 숫자만) | 없음 (SELECT 권한만) |
| `my_applied_socialings`, `my_hosted_socialings`, `hosted_socialing_applicants` 뷰 | 로그인한 본인 행만, 신청자 목록은 그 소셜링의 호스트만 (비로그인 거부) | 없음 (SELECT 권한만) |
| profiles | 닉네임·id는 모두, 나머지는 본인 | 본인 |
| Storage `socialing-photos`, `review-photos` | 공개 읽기 | 로그인 사용자가 자기 폴더(`사용자id/`)에만 업로드 |

- 쓰기 함수는 `SECURITY DEFINER` + `auth.uid()` 검사 + `search_path` 고정.
- profiles는 열 권한으로 `id`, `nickname`만 공개한다. 코드에서 profiles를 읽을 때 `select('*')` 대신 `select('id, nickname')`처럼 칸을 적는다(`role` 등을 넣으면 거부됨).
- 모든 테이블에서 anon·authenticated의 INSERT/UPDATE/DELETE 권한을 회수했다. review_checks는 SELECT 권한도 회수.
- Storage 버킷은 파일 1MB 이하, JPEG·PNG·WebP만 받는다(HEIC는 브라우저에서 JPEG로 바꿔 올림).
- 가입 트리거는 `raw_user_meta_data.nickname`(앞뒤 공백 제거)으로 profiles를 만든다. 닉네임이 없거나 중복이면 가입이 실패한다(가입 화면에서 오류 문구로 바꿈).
- 테이블에 직접 INSERT/UPDATE/DELETE 정책을 열지 않는다(profiles 닉네임 수정만 예외로 본인 허용 가능).
- publishable 키(비로그인)로 review_checks를 조회하면 0행 또는 거부되는지 테스트한다.
- publishable 키로 `socialing_summaries`를 고치려 하면 거부되고, 참여 확정 인원이 보여도 applications는 0행 또는 거부되는지 테스트한다(MS2).

## 5. 쓰기 함수 (RPC)

모든 함수는 실패할 때 **정해진 오류 코드**를 돌려주고, 서버 액션이 그것을 spec 8.4·8.6·8.8의 문구로 바꾼다. 방식(SP2에서 정함): `raise exception using errcode = 'P0001', message = 'FULL'`처럼 오류 코드를 message에 넣는다. supabase-js에서는 `error.message`가 오류 코드다. 성공하면 바뀐 행을 돌려준다(`apply_to_socialing`은 만든 `applications` 행). 오류 코드 예: `NOT_AUTHENTICATED`, `NOT_HOST`, `IS_HOST`, `NOT_OPEN`(신청 불가), `DEADLINE_PASSED`, `FULL`, `HOST_CANCELED`, `ALREADY_APPLIED`, `STARTED`(소셜링 일시 지남), `NOT_STARTED`, `INVALID_STATE`, `ALREADY_PROCESSED`, `NOT_ELIGIBLE`(후기 조건), `ALREADY_REVIEWED`, `LOCKED_FIELD`, `INVALID_INPUT`.

| 함수 | 호출 화면 | 검사 |
|---|---|---|
| `apply_to_socialing(socialing_id)` | P03 → O02 | 로그인, 호스트 아님, 신청 가능, 유효한 신청 없음, 정원(소셜링 행 `FOR UPDATE` 잠금). 선착순 → accepted, 승인 → pending |
| `cancel_application(application_id)` | P03 → O05 | 본인(남의 신청은 없는 신청처럼 `INVALID_INPUT`), pending·accepted(아니면 `ALREADY_PROCESSED`), 호스트 취소 아님(`HOST_CANCELED`), 소셜링 일시 전(`STARTED`). 소셜링 행 → 신청 행 순서로 잠금. 성공하면 바뀐 신청 행 |
| `decide_application(application_id, approve)` | P11 (거절은 O04) | 없는 신청 `INVALID_INPUT`, 호스트 본인(`NOT_HOST`), 종료·호스트 취소 아님(`INVALID_STATE`), pending(`ALREADY_PROCESSED`), 소셜링 일시 전(`STARTED`), 승인이면 정원(`FULL`). 소셜링 행 → 신청 행 순서로 잠금. 성공하면 바뀐 신청 행 |
| `confirm_socialing(id)` | P11 → O04 | 없는 소셜링 `INVALID_INPUT`, 호스트 본인(`NOT_HOST`), recruiting(`INVALID_STATE`), 소셜링 일시 전(`STARTED`). 소셜링 행 잠금. 성공하면 바뀐 소셜링 행 |
| `complete_socialing(id)` | P11 → O04 | 없는 소셜링 `INVALID_INPUT`, 호스트 본인(`NOT_HOST`), confirmed(`INVALID_STATE`, 모집중에서 바로 종료 불가), 소셜링 일시 이후(`NOT_STARTED`). 소셜링 행 잠금. 성공하면 바뀐 소셜링 행 |
| `cancel_socialing(id)` | P11 → O04 | 없는 소셜링 `INVALID_INPUT`, 호스트 본인(`NOT_HOST`), completed·canceled 아님(`INVALID_STATE`). 일시가 지나도 종료 전이면 된다. 신청 상태는 바꾸지 않는다. 소셜링 행 잠금. 성공하면 바뀐 소셜링 행 |
| `create_socialing(...)` | P07 | 입력 범위(spec 6장), 대표 사진 경로(선택). host_id = auth.uid() |
| `update_socialing(id, ...)` | P08 | 호스트 본인, 종료·호스트 취소 아님, 참여 확정자가 있으면 starts_at·venue_id·fee 변경 불가, capacity ≥ 참여 확정 인원 |
| `create_review(socialing_id, body, photo_path, members_match, extra_money, content_match)` | P09 | 참여 확정자, completed, 미작성, 글 10~500자, 질문 3개 모두 |

## 6. 폴더 구조

실제 구조. 아직 없는 폴더(`scripts/seed-assets/`)는 처음 쓰는 마일스톤에서 만든다.

```
/proxy.ts                 세션 갱신과 로그인 필요 주소 처리 (Next.js 16 proxy, 2장 세션)
/app                      화면 (라우트는 spec 8.2 주소 그대로)
  (tabs)/                 메인 탭 화면 묶음. layout.tsx가 header-main + tab-bar를 둔다 (주소에는 안 나타남)
    page.tsx              P00 홈
    explore/              P01 탐색
    me/                   P06 내 소셜링 (page: 닉네임·로그아웃·top-tabs, applied-socialings·hosted-socialings: 탭 내용)
  login/  signup/         P04 · P05 (page.tsx + 폼 클라이언트 컴포넌트). 하위 화면은 각자 header-sub
  past/                   P02 지난 소셜링 (하위 화면, header-sub)
  socialings/[id]/        P03 상세 (page + loading + not-found)
  error.tsx               화면 전체 오류: "불러오지 못했어요" + 다시 시도 · 홈으로
  dev/photo-upload/       SP3 실기기 확인·E2E용 임시 화면 (미리보기·로컬만. MS5에서 테스트를 후기 쓰기로 옮기고 지움)
  (MS4~) socialings/[id]/ 아래 manage/ · edit/ · review/, socialings/new/, (tabs)/reviews/
/components               DESIGN.md 이름의 컴포넌트: button, text-field, avatar-initial, photo-picker,
                          password-field, header-main, header-sub, header-login-link, tab-bar (+ 뒤로 판단용
                          navigation-tracker), top-tabs, status-badge, status-tag, application-chip, count-pill,
                          socialing-card, category-art(사진 없을 때 카테고리 그림), skeleton, empty-state,
                          error-state, host-profile-row, info-list, notice-box, intro-text(소개 5줄 접기),
                          apply-bar(spec 8.4 순서표 13줄), hero-card, section-header, shortcut-category,
                          shortcut-branch, review-card, toast(짧은 안내),
                          bottom-sheet · dialog(Radix Dialog 위, decisions.md), confirm-apply-sheet(O02),
                          confirm-cancel-application-sheet(O05)
/lib/supabase             server.ts(서버), client.ts(브라우저), proxy.ts(세션 갱신), env.ts, database.types.ts(생성)
/lib/actions              서버 액션 (RPC 호출과 오류 코드 → 문구 변환만). auth.ts, applications.ts(신청·신청 취소)
/lib/validation           zod 스키마 (폼과 서버 액션이 같이 씀)
/lib/photos               사진 줄이기 (compress.ts)
/lib/routes.ts            로그인 필요 주소, `next` 검사
/lib/in-app-history.ts    머리글 뒤로 버튼: 앱 안 이전 화면이 없으면 홈 (spec 8.7)
/lib/queries              읽기 함수. viewer.ts(지금 보는 사람, 닉네임은 로그인 토큰에서), socialings.ts(socialing_summaries 뷰),
                          my-socialings.ts("나" 기준 뷰: 상세 아래 영역의 보는 사람, 내 소셜링 두 탭 목록),
                          catalog.ts(카테고리·스터디지점), reviews.ts(인증 후기)
/lib/format               날짜(Asia/Seoul)·금액 표시
/lib/simulated-state.ts   화면 상태 흉내 `?_state=empty|error|loading|partial` (운영 주소에서는 무시, decisions.md)
/supabase/migrations      테이블·enum·RLS·함수 SQL (파일 하나 = 변경 하나)
/scripts/seed.mts         데모 시드 (secret 키는 여기서만), seed-data.mts는 데이터 정의
/scripts/db-push.mts      마이그레이션 적용, db-types.mts 타입 생성, lib/management-api.mts 공용
/scripts/seed-assets/     시드 대표 사진 + SOURCES.md (사진이 준비되면)
/tests/e2e                Playwright. helpers/에 로그인·테스트 데이터 도우미
/docs                     spec, architecture, tasks, decisions, screen-cases, design/
```

## 7. 환경과 배포

| 환경 | Supabase | Vercel | 용도 |
|---|---|---|---|
| 개발 | `socialing-mvp` | 로컬 또는 PR 미리보기 배포 | 개발, E2E |
| 발표 | `socialing-demo` (MS9 직전에 생성) | 운영 배포 (main) | 리허설, 발표 |

**환경 변수** (값은 저장소·채팅·로그 어디에도 쓰지 않는다. 이름만 확인한다)

| 이름 | 쓰는 곳 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 앱 전체, Vercel |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 앱 화면, Vercel. publishable 키(`sb_publishable_…`). 공식 Next.js 가이드와 같은 이름 |
| `SUPABASE_SECRET_KEY` | `scripts/seed.mts`만. 앱 코드에서 import 금지. secret 키(`sb_secret_…`). RLS를 무시하고 브라우저에서는 거부된다 |
| `SUPABASE_ACCESS_TOKEN` | 마이그레이션(Management API), 타입 생성. dev 프로젝트로 범위를 줄인 토큰(scoped personal access token) |

- 클라우드 Claude Code 환경에는 dev 값만 있다. demo 키는 넣지 않는다.
- `SUPABASE_DB_PASSWORD`는 클라우드 환경에 없다. 로컬 터미널에서 `supabase db push`를 쓸 때만 `.env.local`에 넣는다.
- 로컬 터미널에서는 같은 이름을 `.env.local`에 넣는다(`.gitignore`).
- Vercel에는 `NEXT_PUBLIC_` 2개만 넣는다. Preview·Production 모두 dev 값, MS9에서 Production만 demo 값으로 바꾼다.
- 네트워크: 클라우드 환경은 `*.supabase.co`, `*.supabase.com`과 패키지 관리자만 허용한다. 다른 주소가 막히면 우회하지 말고 PM에게 허용할 도메인 이름을 알려 준다.

**마이그레이션**: Docker(로컬 Supabase)는 쓰지 않는다. SQL은 `supabase/migrations/`에 파일로 남긴다. 클라우드 세션은 HTTP/HTTPS로만 나가므로(Claude Code 공식 문서, 2026-10-13 시험에서 80·443 외 포트 막힘) Postgres 직접 접속인 `supabase db push`는 기대하지 않는다. 기본 방법은 Supabase Management API(HTTPS `api.supabase.com`, `SUPABASE_ACCESS_TOKEN`)로 원격 dev에 적용하는 것이다. SP5에서 정한 방법: `npm run db:push`(`scripts/db-push.mts`)가 `POST /database/query`로 파일 하나를 트랜잭션 하나로 적용하고, 같은 트랜잭션에서 `supabase_migrations.schema_migrations`에 파일 이름의 버전·이름을 남긴다. 적용 기록용 엔드포인트(`POST /database/migrations`)는 버전을 적용 시각으로 새로 붙여 파일 버전과 달라지고(Supabase CLI가 같은 파일을 다시 적용하려 함), API로 되돌리기도 막혀 있어(production 브랜치) 쓰지 않는다. 막히면 ② 대시보드 SQL 편집기 ③ PM의 로컬 터미널(`supabase link` + `db push`, `SUPABASE_DB_PASSWORD`) 순서이고, 기록 방식이 CLI와 같아서 ③으로 바꿔도 이미 적용한 파일을 다시 적용하지 않는다. 타입 생성은 `npm run db:types`(`GET /types/typescript`). 자세한 규칙은 AGENTS.md "보안과 환경".

**시드**: `npm run seed` 한 번으로 데모 데이터 삭제(사진 버킷 2개 비우기 포함, Storage API) → 데모 계정 생성(관리자 API: `@supabase/supabase-js`의 `createClient`에 secret 키, auth 옵션 `persistSession`·`autoRefreshToken`·`detectSessionInUrl`은 false, 이메일 인증 완료 상태) → 지역·지점·카테고리 → 소셜링·신청·후기·비공개 응답 → 대표 사진 업로드. 날짜는 실행 시점 기준 상대값. 두 번 실행해도 결과가 같고 1분 안에 끝난다. 요구 조건은 spec 7장. 대표 사진은 `scripts/seed-assets/`(Gemini 생성 이미지, 출처는 `SOURCES.md`). 사진이 없으면 전부 카테고리 그림으로 둔다.
- 데모 계정 이메일은 메일이 가지 않는 `@socialing.test` 주소이고, 시드는 이 도메인의 계정만 지우고 다시 만든다.
- 데모 계정 비밀번호는 `DEMO_PASSWORD` 환경 변수. 없으면 시드가 새로 만들어 `.env.local`에 저장한다(공개 저장소라 코드에 두지 않음). E2E도 같은 값을 읽는다(`playwright.config.ts`가 `.env.local`을 읽음).

**지역 데이터**: 행정안전부 법정동코드(공공데이터포털)에서 시·군·구 단위만 뽑아 시드 파일로 만든다(파일 형식·최신 개편 반영은 MS1에서 확인). 어려우면 서울 25개 구 + 다른 시·도 대표 몇 개로 시작하고 decisions.md에 적는다. **지금은 이 대안으로 시작했다**(`scripts/seed-data.mts`의 `REGIONS`, 2026-10-13).

**테스트**: E2E는 시드를 넣은 dev 프로젝트를 대상으로 돌린다. main에 합치기 전에 전체 E2E를 실행한다(GitHub Actions 자동 실행은 Should).

## 8. 기술 위험

| 위험 | 대응 |
|---|---|
| 무료 Supabase 7일 비활성 일시정지 | 발표 전날 접속·시드 재실행. 일시정지되면 대시보드에서 재개 |
| Next.js 캐시로 상태 변경이 늦게 보임 | 쓰기 뒤 관련 경로 revalidate, 동적 렌더링 |
| RLS 실수로 비공개 응답 노출 | 직접 SELECT 정책 없음 + 테스트 |
| 범위 밖 기능 추가 | AGENTS.md "하지 않는 것", PR 설명에 "제안"으로만 |
| 최신 버전 호환 문제 | 한 단계 이전 안정 버전 고정 |
| Vercel Hobby 로그 1시간 보관 | 리허설 직후 바로 확인 |
| iPhone HEIC 사진 | 축소 라이브러리로 JPEG 변환, 실패 시 "JPEG로 골라 주세요" 안내 (SP3) |
