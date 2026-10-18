---
version: alpha
name: 문화소셜링
description: 배움·자기계발 중심의 1회성 오프라인 소셜링을 찾고 신청하는 모바일 웹. 별점 대신 확인 가능한 호스트 기록을 보여 준다. Light mode only.
colors:
  primary: "#59CBE8"
  primary-pressed: "#47BBD8"
  on-primary: "#0B2530"
  primary-strong: "#136F86"
  primary-soft: "#E1F7FC"
  point: "#F5A623"
  on-point: "#2A1C00"
  surface: "#FFFFFF"
  surface-bg: "#F4FAFF"
  surface-muted: "#F5F7F9"
  text-primary: "#111827"
  text-secondary: "#4B5563"
  text-muted: "#6B7280"
  text-disabled: "#9CA3AF"
  border-default: "#E5E7EB"
  border-divider: "#EDF1F4"
  border-strong: "#136F86"
  toggle-off: "#8A94A3"
  danger: "#C62828"
  danger-soft: "#FEE2E2"
  danger-border-soft: "#FCA5A5"
  status-ended: "#637077"
  toast-bg: "#1F292E"
  toast-text: "#FFFFFF"
  dim: "rgba(0, 0, 0, 0.5)"
  deep: "#0E3A47"
  category-learning: "#3E54C7"
  category-learning-soft: "#EBEFFF"
  category-hobby: "#0B7360"
  category-hobby-soft: "#E1F5EF"
  category-activity: "#46720C"
  category-activity-soft: "#EEF6DF"
  category-culture: "#7A45D1"
  category-culture-soft: "#F1EBFD"
  category-party: "#B8336A"
  category-party-soft: "#FCEAF2"
  caution: "#8A4B00"
  caution-soft: "#FFF4E0"
typography:
  title-xl:
    fontFamily: Noto Sans KR
    fontSize: 22px
    fontWeight: 800
    lineHeight: 28px
    letterSpacing: -0.02em
  title-lg:
    fontFamily: Noto Sans KR
    fontSize: 18px
    fontWeight: 800
    lineHeight: 24px
    letterSpacing: -0.02em
  title-md:
    fontFamily: Noto Sans KR
    fontSize: 16px
    fontWeight: 600
    lineHeight: 22px
  body-lg:
    fontFamily: Noto Sans KR
    fontSize: 15px
    fontWeight: 500
    lineHeight: 22px
  body-long:
    fontFamily: Noto Sans KR
    fontSize: 15px
    fontWeight: 400
    lineHeight: 24px
  body-md:
    fontFamily: Noto Sans KR
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  body-sm:
    fontFamily: Noto Sans KR
    fontSize: 13px
    fontWeight: 400
    lineHeight: 18px
  label:
    fontFamily: Noto Sans KR
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  2xl: 20px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  2xl: 32px
  3xl: 48px
  page-x: 16px
  touch-min: 44px
  screen: 390px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.lg}"
    height: 52px
    padding: 20px
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
    textColor: "{colors.on-primary}"
  button-primary-disabled:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-disabled}"
  button-primary-sm:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    height: 36px
    padding: 12px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.lg}"
    height: 48px
    padding: 16px
  button-secondary-pressed:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-primary}"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.lg}"
    height: 48px
    padding: 16px
  button-danger-pressed:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
  button-text-link:
    textColor: "{colors.primary-strong}"
    typography: "{typography.body-md}"
  text-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.lg}"
    height: 48px
    padding: 16px
  text-field-locked:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-secondary}"
  filter-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    height: 36px
  filter-chip-selected:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-strong}"
  status-badge-recruiting:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary-strong}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    height: 24px
  status-badge-confirmed:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  status-badge-ended:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.status-ended}"
  status-badge-awaiting-confirm:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-strong}"
  status-badge-host-cancelled:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
  status-badge-cancelled:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
  status-tag:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    height: 22px
  application-chip-pending:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    height: 24px
  application-chip-accepted:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-strong}"
  application-chip-rejected:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
  application-chip-withdrawn:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-muted}"
  application-chip-host-cancelled:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
  trust-label:
    backgroundColor: "{colors.point}"
    textColor: "{colors.on-point}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    height: 24px
  count-pill:
    backgroundColor: "{colors.point}"
    textColor: "{colors.on-point}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    height: 20px
  socialing-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: 16px
  hero-card:
    textColor: "{colors.surface}"
    rounded: "{rounded.2xl}"
    padding: 20px
  review-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: 16px
  header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    height: 56px
  tab-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
    height: 64px
  tab-bar-active:
    textColor: "{colors.primary-strong}"
  tab-bar-active-indicator:
    backgroundColor: "{colors.primary-soft}"
    rounded: "{rounded.full}"
    width: 52px
    height: 28px
  logo-wordmark:
    textColor: "{colors.primary-strong}"
  apply-bar:
    backgroundColor: "{colors.surface}"
    padding: 16px
  dialog:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: 20px
  bottom-sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.2xl}"
  toast:
    backgroundColor: "{colors.toast-bg}"
    textColor: "{colors.toast-text}"
    rounded: "{rounded.lg}"
    padding: 12px
  page:
    backgroundColor: "{colors.surface-bg}"
    textColor: "{colors.text-primary}"
    width: 390px
  divider:
    backgroundColor: "{colors.border-divider}"
    height: 1px
  edge-line:
    backgroundColor: "{colors.border-divider}"
    height: 1px
  avatar-initial:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-strong}"
    rounded: "{rounded.full}"
  avatar-initial-strong:
    backgroundColor: "{colors.primary-strong}"
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
  toggle-off:
    backgroundColor: "{colors.toggle-off}"
    rounded: "{rounded.full}"
    width: 48px
    height: 28px
  toggle-on:
    backgroundColor: "{colors.primary-strong}"
  overlay:
    backgroundColor: "{colors.dim}"
  notice-box-info:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
  notice-box-caution:
    backgroundColor: "{colors.caution-soft}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
---

# 문화소셜링 DESIGN.md

## Overview

배움·자기계발 중심의 소규모 1회성 오프라인 모임("소셜링")을 찾고 신청하는 모바일 웹이다.

- 화면 기준: 휴대폰 세로 390px. PC에서도 390px 폭을 가운데에 보여 준다(넓은 화면용 배치는 따로 없음).
- Light mode only. 다크 모드는 만들지 않는다.
- 분위기: 차분하고 믿을 수 있고 친근하며 깔끔하다. 정보는 숨기지 않고 바로 보이게 한다.
- 원칙: 별점·점수 대신 확인할 수 있는 사실(호스트 기록, 기준이 공개된 등급, 참여를 마친 사람의 후기)을 보여 준다. 유료 노출·추천·홍보 요소는 두지 않고, 목록에는 정렬·선정 기준을 함께 적는다.
- 화면 시안(Google Stitch → Figma)은 색과 배치의 참고다. 시안과 이 문서가 다르면 이 문서를 따르고, 일부러 다르게 정한 것은 Components 끝 "시안과 다르게 정한 것"에 모았다.

## Colors

하늘색 primary 하나를 중심으로, 살짝 푸른 뉴트럴과 단 한 가지 따뜻한 point 색을 쓴다. 카테고리마다 보조색(진한 색과 연한 soft 색)이 하나씩 있고, 가장 진한 청록 deep이 로고와 큰 숫자를 맡는다. 대비는 WCAG 2.x 공식으로 잰 값이다(본문 글자 기준 4.5:1, 부품 경계 3:1).

색 비율(홈 첫 화면 기준): 흰·연한 바탕 약 60, 연한 색(primary-soft·카테고리 soft) 약 30, 진한 색(primary·primary-strong·deep·카테고리 색) 약 10. point는 이 비율에 넣지 않는다(두 곳에만).

| 역할 | Hex | 쓰는 곳 | 대비 |
|---|---|---|---|
| primary | #59CBE8 | 주 버튼 채움, 확정 배지 채움 | 흰 글자와 1.9:1이라 흰 글자 금지 |
| primary-pressed | #47BBD8 | 주 버튼 눌림 | on-primary와 7.1:1 |
| on-primary | #0B2530 | primary·primary-pressed 위 글자와 아이콘 (유일하게 허용) | primary와 8.4:1 |
| primary-strong | #136F86 | 흰·연한 바탕 위 링크, 테두리 배지·버튼, 활성 탭, 선택된 칩 글자, 머리글 아바타 바탕 | 흰 5.8:1, primary-soft 5.2:1 |
| primary-soft | #E1F7FC | 선택된 칩·탭 표시, 안내 상자(notice-box/info), 아이콘 칸, 이름 첫 글자 원 바탕, "참여 확정" 칩 바탕 (Stitch 이름 primary-container) | - |
| point | #F5A623 | trust-label, count-pill 두 곳에만 | - |
| on-point | #2A1C00 | point 위 글자 | point와 8.2:1 |
| surface | #FFFFFF | 카드, 창, 바텀시트, 머리글, 아래 탭 | - |
| surface-bg | #F4FAFF | 페이지 배경 | - |
| surface-muted | #F5F7F9 | 칩 기본 바탕, 상태 상자, 스켈레톤, 비활성 바탕 | - |
| text-primary | #111827 | 제목, 본문 | 흰 17.7:1 |
| text-secondary | #4B5563 | 보조 설명, 라벨, 카드 메타 | 흰 7.6:1, surface-muted 7.0:1 |
| text-muted | #6B7280 | 힌트, 플레이스홀더, 글자 수, 비활성 탭 글자, "신청 취소" 칩 | 흰 4.8:1, surface-muted 4.5:1 |
| text-disabled | #9CA3AF | 누를 수 없는 버튼·링크 글자에만 (WCAG 예외) | 흰 2.5:1 |
| border-default | #E5E7EB | 버튼·입력칸·칩 테두리, 흰 바탕 위 상자(창 안 상자 등) 테두리 | - |
| border-divider | #EDF1F4 | 목록 행 사이, 카드 안 구분선, 머리글·아래 탭 경계선(edge-line) (장식용, 부품 경계에 쓰지 않음) | - |
| border-strong | #136F86 | 포커스된 입력칸, 선택된 칩·행 테두리 | - |
| toggle-off | #8A94A3 | 꺼진 토글 바탕 | 흰 3.1:1 |
| danger | #C62828 | 호스트 취소, 거절, 오류 글자와 테두리 | 흰 5.6:1, danger-soft 4.6:1 |
| danger-soft | #FEE2E2 | 오류·취소 상태 바탕 | - |
| danger-border-soft | #FCA5A5 | 사진 올리기 실패 상자 테두리 | - |
| status-ended | #637077 | 종료 배지 글자 | 흰 5.1:1, surface-muted 4.8:1 |
| toast-bg | #1F292E | 짧은 안내(토스트) 바탕 | - |
| toast-text | #FFFFFF | 토스트 글자. 토스트 안 링크는 primary | 14.8:1, 링크 7.9:1 |
| dim | rgba(0,0,0,0.5) | 창·바텀시트 뒤 어둡게 | - |
| deep | #0E3A47 | 로고 "문화", 사진 없는 히어로 바탕, 호스트 기록 숫자 | 흰 12.3:1 |
| category-learning / -soft | #3E54C7 / #EBEFFF | 배움·자기계발 | 흰 6.4:1, soft 위 5.6:1 |
| category-hobby / -soft | #0B7360 / #E1F5EF | 취미 | 흰 5.8:1, soft 위 5.1:1 |
| category-activity / -soft | #46720C / #EEF6DF | 운동·활동 | 흰 5.7:1, soft 위 5.1:1 |
| category-culture / -soft | #7A45D1 / #F1EBFD | 문화·예술 | 흰 5.8:1, soft 위 5.0:1 |
| category-party / -soft | #B8336A / #FCEAF2 | 파티·사교 | 흰 5.7:1, soft 위 4.9:1 |
| caution / caution-soft | #8A4B00 / #FFF4E0 | notice-box/caution(상세 "신청 전에 확인해 주세요"의 소셜링 규칙). 주의를 끄는 안내 상자에만 쓰고 버튼·상태 표시에는 쓰지 않는다 | caution-soft 위 6.2:1 |

- 카테고리 이름(slug)은 코드와 같다: learning, hobby, activity, culture, party. 화면에 보이는 이름은 DB 그대로.
- 카테고리 색은 **카테고리를 알아보는 곳에만** 쓴다: 카테고리 그림(category-art), 카드의 카테고리 이름과 점, 홈 카테고리 바로가기, 상세 대표 그림. 버튼, 링크, 상태 표시에는 쓰지 않고, 특정 소셜링을 눈에 띄게 하는 데도 쓰지 않는다(유료 노출 없음).

## Typography

글꼴은 **Noto Sans KR** 하나를 앱에 넣어(npm 글꼴 패키지, docs/architecture.md 1장) 모든 기기에서 같게 보이게 한다. 대체 글꼴 순서: Noto Sans KR → system-ui → -apple-system → sans-serif. Pretendard는 쓰지 않는다.

| 토큰 | 크기 / 줄 높이 / 굵기 | 쓰는 곳 |
|---|---|---|
| title-xl | 22 / 28 / 800, 자간 −0.02em | 화면 제목, 상세 제목, 호스트 기록 숫자 |
| title-lg | 18 / 24 / 800, 자간 −0.02em | 시트·창 제목, 히어로 제목, 묶음 제목(section-header, 상세 "소개"·"호스트") |
| title-md | 16 / 22 / 600 | 묶음 제목, 카드 제목 |
| body-lg | 15 / 22 / 500 | 버튼 글자, 입력값 |
| body-long | 15 / 24 / 400 | 소개, 후기 본문처럼 여러 줄인 글 |
| body-md | 14 / 20 / 400 | 기본 본문, 카드 메타, 링크 |
| body-sm | 13 / 18 / 400 | 기준 문구, 도움말, 오류 이유 |
| label | 12 / 16 / 500 | 상태 배지, 꼬리표, 칩, 숫자, 아래 탭 글자 |

12px보다 작은 글자는 쓰지 않는다.

- 글꼴(Noto Sans KR Variable)은 800까지 들어 있어 따로 글꼴 파일을 더하지 않는다.
- 카드 제목과 주요 값(총 참가비 등)은 그 토큰에 굵기만 700(font-bold)으로 올린다. 굵기 때문에 새 글자 토큰을 만들지 않는다.
- 로고(logo-wordmark)는 글자 토큰의 예외다(C3).

## Layout

- 폭 390px, 좌우 여백 16px(page-x). 간격은 8의 배수, 미세 조정만 4px.
- 누를 수 있는 것은 최소 44×44px(touch-min).
- 메인 탭 화면(홈, 탐색, 인증 후기, 내 소셜링): 위 header-main(56px) + 아래 tab-bar(64px).
- 지난 소셜링: 위 header-sub(56px, 뒤로 + "지난 소셜링") + 아래 tab-bar(64px, 탐색이 켜짐). 탐색 탭을 누르면 필터 없는 탐색으로 간다.
- 나머지 하위 화면(상세, 관리, 후기 쓰기, 로그인, 가입, 등록, 수정): 위 header-sub(56px), 아래 탭 없음.
- 창(O01~O05)은 화면이 아니라 화면 위에 뜬다. 신청하는 사람 쪽 창(필터 O01, 신청 확인 O02, 등급 조건 O03, 신청 취소 확인 O05)은 bottom-sheet, 호스트 동작 확인(O04)은 가운데 dialog.
- 소셜링 상세는 맨 아래에 apply-bar가 붙어 있고, 내용은 그 높이만큼 아래 여백을 둔다.
- 목록 묶음 순서: section-header(제목 + "전체 보기 ›" + 기준 문구) → 카드 목록, 카드 사이 12px.

## Elevation & Depth

연한 바탕(surface-bg) 위의 흰 카드는 테두리 대신 옅은 그림자로 띄운다. 흰 바탕 위에서 줄로 나눌 때는 border-divider를 쓴다. 입력칸, 버튼, 칩처럼 누르거나 쓰는 부품은 테두리(border-default)를 쓴다.

| 이름 | 값 | 쓰는 곳 |
|---|---|---|
| shadow-card | `0 1px 2px rgba(14,58,71,.06), 0 6px 16px rgba(14,58,71,.06)` | 소셜링 카드, 짧은 후기 카드, 스터디지점 바로가기, 상세의 정보·소개·호스트 카드, 요약 카드(manage-summary·review-summary) |
| shadow-bar | `0 -6px 18px rgba(14,58,71,.08)` | 아래 고정 영역(apply-bar와 같은 모양들) |

- 창(바텀시트, 대화상자)은 뒤를 dim으로 어둡게 해서 띄운다. 토스트는 진한 바탕으로 구분한다.
- 테두리를 빼는 것은 **연한 바탕 위의 카드**만이다. 흰 바탕 위 카드(바텀시트 안 상자 등)는 테두리를 남긴다.

## Shapes

| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| xs | 4px | status-tag, verified-badge |
| sm | 6px | 지금 쓰는 곳 없음 (남겨 둔 단계) |
| md | 8px | segmented, 상세 정보 아이콘 칸 |
| lg | 12px | 버튼, 입력칸, 사진 고르기 칸, 카드 사진, 짧은 후기 카드, 안내 상자, 토스트 |
| xl | 16px | 소셜링 카드, 상세의 정보·소개·호스트 카드, 요약 카드, 창 |
| 2xl | 20px | 홈 히어로 카드, 바텀시트 위 모서리, 상세 제목 묶음 위 모서리, 아래 고정 영역 위 모서리 |
| full | 9999px | 칩, status-badge, application-chip, trust-label, count-pill, 토글, avatar-initial, 아래 탭 활성 알약, 머리글 로그인 버튼 |

새 모서리 값은 만들지 않는다. 2026-10 견본(홈·상세)의 대략 값은 위 토큰으로 맞췄다: 카드 14 → xl, 썸네일 10 → lg, 정보 아이콘 칸 9 → md, 아래 고정 영역 18 → 2xl, 신청 버튼 14 → lg.

## Components

이름은 `컴포넌트/변형/상태` 형식이고, 개발 코드에서도 이 이름을 그대로 쓴다 (예: `status-badge/recruiting` → `<StatusBadge status="recruiting" />`, 파일 `components/…/status-badge.tsx`). 화면 ID(P11, O04 등)는 [docs/spec.md](docs/spec.md) 8.2. 색은 위 Colors의 역할 이름이다. 아래에 없는 모양을 새로 만들지 않는다.

### C1 기본 컴포넌트

**button** — 높이 lg 52 / md 48 / sm 36, 좌우 여백 lg 20 / md 16 / sm 12, 모서리 lg, 글자 lg·md는 body-lg에 굵기 700, sm은 body-md. sm은 보이는 높이만 36이고 누르는 영역은 위아래로 넓혀 44px를 지킨다. 로딩 상태는 작은 스피너 + "처리 중…"이고 다시 누를 수 없다.

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| button/primary/default | primary 바탕, on-primary 글자 | 화면의 주 행동 하나 (신청하기, 후기 올리기, 저장) |
| button/primary/pressed | primary-pressed 바탕 | 눌렀을 때 |
| button/primary/disabled | surface-muted 바탕, text-disabled 글자 | 지금 할 수 없는 주 행동 (정원 마감 등) |
| button/primary/loading | primary 바탕 + 스피너 + "처리 중…" | 처리 중 |
| button/secondary/default | surface 바탕, text-primary 글자, border-default 1px | 보조 행동 (신청 취소, 돌아가기, 초기화) |
| button/secondary/pressed | surface-muted 바탕 | 눌렀을 때 |
| button/secondary/disabled | surface-muted 바탕, text-disabled 글자 | 할 수 없는 보조 행동 |
| button/secondary/loading | surface 바탕, text-secondary 글자 + 스피너 | 처리 중 |
| button/danger/default | surface 바탕, danger 글자, danger 테두리 1px | 되돌릴 수 없는 행동 (호스트 취소, 거절, 신청 취소 확인) |
| button/danger/pressed | danger-soft 바탕 | 눌렀을 때 |
| button/danger/disabled | surface-muted 바탕, text-disabled 글자, border-default 테두리 | 호스트 취소된 소셜링의 아래 버튼 등 |
| button/danger/loading | danger 테두리 + 스피너 | 처리 중 |
| button/text-link/default | 상자 없음, primary-strong 글자 body-md, 터치 영역 44px | "다른 소셜링 보기 ›", "홈으로", "전체 보기 ›" |
| button/text-link/pressed | on-primary 글자 | 눌렀을 때 |
| button/text-link/disabled | text-disabled 글자 | 누를 수 없을 때 |

**text-field** — 위에 라벨(body-sm, text-secondary), 높이 48, 모서리 lg, 좌우 16. 등록·수정(P07·P08) 양식의 칸 라벨은 body-lg, text-primary(시안 P07)이고, 장소 묶음 안의 작은 칸("스터디지점", "시·도", "시·군·구", "장소 이름")만 기본 라벨이다.

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| text-field/default | surface 바탕, border-default 1px | 입력 전 |
| text-field/focused | primary-strong 테두리 2px | 입력 중 |
| text-field/filled | default와 같음, 값 표시 | 입력 뒤 |
| text-field/error | danger 테두리 1.5px + 칸 아래 오류 아이콘과 이유(body-sm, danger) | "이미 쓰는 닉네임이에요" |
| text-field/locked | surface-muted 바탕, text-secondary 글자, 자물쇠 아이콘 + 이유 | 수정 화면에서 "참여 확정자가 있어 바꿀 수 없어요" |
| text-field/helper | 칸 아래 도움말(body-sm, text-muted). 오류가 나면 그 자리에 오류 이유가 대신 보인다 | 가입: "6자 이상", "2~12자 · 후기와 호스트 이름으로 보여요" |
| text-field/password | 칸 오른쪽 안에 눈 아이콘 버튼(text-muted, 누르는 영역 44). 숨김이면 빗금 눈, 누르면 글자가 보이고 열린 눈. 버튼 이름은 "비밀번호 보기" / "비밀번호 숨기기" | 로그인·가입의 비밀번호 |
| text-field/suffix | 칸 오른쪽 안에 단위 글자(body-lg, text-primary). 숫자 칸은 숫자 글자만 받고 천 단위 쉼표로 보인다 | 등록·수정의 총 참가비 "15,000 원" (시안 P07) |
| text-field/datetime | 휴대폰 기본 날짜·시간 고르기(`datetime-local`). 글자는 왼쪽 정렬. 자리 글은 둘 수 없다 | 등록·수정의 소셜링 일시, 신청 마감 일시 |

**select-field** — text-field와 같은 칸(높이 48, 모서리 lg, 좌우 16) 오른쪽 안에 ⌄ 아이콘(text-secondary). 누르면 휴대폰 기본 고르기 목록이 열린다. 오류·도움말은 text-field와 같다.

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| select-field/empty | 자리 글(text-muted) "시·도" | 아직 안 고름 |
| select-field/filled | 고른 값(text-primary) "강남점 ⌄", 아래 도움말 "서울 강남구 스터디지점" | 고른 뒤 (시안 P07) |
| select-field/disabled | surface-muted 바탕, text-secondary 글자 | 앞 칸을 아직 안 고름 (시·도를 골라야 시·군·구) |
| select-field/error | text-field/error와 같음 | "스터디지점을 골라 주세요" |
| select-field/locked | text-field/locked와 같음 (surface-muted 바탕, 칸 아래 자물쇠 + 이유) | 수정 화면의 장소 |

**signup-intro** — 가입(P05) 맨 위. 왼쪽에 라벨 알약 "새로운 여정"(높이 24, 모서리 full, primary-soft 바탕, primary-strong 글자 label)과 그 아래 title-lg "함께할 문화 메이트를 찾아요", 오른쪽에 48px 장식 아이콘 상자(surface, border-default 1px, 모서리 lg, 선 아이콘 primary-strong). 로그인(P04)은 맨 위에 안내 한 줄(body-md, text-secondary) "로그인하면 보던 화면으로 돌아가요"만 둔다.

**textarea** — 위에 라벨(title-md, text-primary, 시안 P09 "후기"), 최소 높이 120, 안쪽 여백 14·16, 글 body-long. 칸 아래 오른쪽에 글자 수(body-sm). 글자 수는 앞뒤 공백·줄바꿈을 뺀다.

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| textarea/normal | text-field/default와 같은 테두리, 글자 수 text-muted "120 / 500 · 10자 이상". 아직 안 썼을 때("0 / 500 · 10자 이상")도 normal | 후기 글, 소셜링 소개("0 / 1000 · 20자 이상"), 승인 기준("0 / 200"), 참가비 설명("0 / 100") |
| textarea/error | danger 테두리 1.5px, 글자 수 danger "5 / 500 · 10자 이상" 또는 "520 / 500" | 1~9자이거나 500자 초과. 등록·수정은 올리기를 눌렀을 때 칸 아래 이유도 보인다 |
| textarea/locked | text-field/locked와 같음 (surface-muted 바탕, text-secondary 글자, 칸 아래 자물쇠 + 이유) | 수정 화면의 참가비 설명(참여 확정자가 있고 설명을 써 둠) |

등록·수정(P07·P08)의 textarea 라벨은 text-field 양식 라벨과 같다(body-lg, text-primary). 도움말은 글자 수 아래에 text-field 도움말과 같은 줄로 둔다(승인 기준 "신청하기 전에 누구나 볼 수 있어요", 참가비 설명). 참가비 설명은 100자라 390px에서 5줄쯤 되어 같은 최소 높이 120을 쓴다.

**photo-picker** — 96px 정사각, 모서리 lg. 사진은 1장. 위에 라벨 "사진"(title-md) + "선택 · 1장"(body-sm, text-secondary), 아래 도움말(body-sm, text-secondary) "사진을 올리지 못해도 쓴 글은 그대로 남아요" (시안 P09·P07).

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| photo-picker/empty | surface 바탕, border-default 점선 1.5px, + 아이콘 위·"사진" 아래(body-sm, text-secondary). 버튼 이름 "사진 선택 · 1장" | 사진 고르기 전 |
| photo-picker/selected | 96px 썸네일 + 오른쪽 위 지우기 X | 사진 고른 뒤, 수정(P08)에서 저장된 사진("지금 대표 사진"). X로 지우고 다시 고르면 바뀐다 |
| photo-picker/uploading | primary-soft 바탕, primary-strong 글자 "올리는 중…", 진행 막대 | 올리는 중 |
| photo-picker/failed | 전체 폭(최소 높이 96), danger-soft 바탕, danger-border-soft 테두리, "사진을 올리지 못했어요" + sm 버튼 "다시 고르기" · "사진 없이 올리기"(등록은 "사진 없이 열기", 수정은 "사진 없이 저장") | 올리기 실패 (글은 그대로 올릴 수 있음) |

등록(P07)은 라벨이 "대표 사진 (선택) · 1장"(title-md) 한 줄이고, 도움말 "사진을 올리지 않아도 글은 그대로 남아요"가 사진 칸 오른쪽에 있다(시안 P07).

**칩과 선택 부품**

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| filter-chip/default | surface 바탕, text-primary, border-default 1px, 높이 36, 모서리 full, "카테고리 ⌄" | 탐색 필터 칩 (값 없음) |
| filter-chip/selected | primary-soft 바탕, primary-strong 글자와 테두리 1.5px, 고른 값 표시 "강남점 ⌄" | 값이 적용된 필터 칩 |
| filter-chip/all | 지름 36 동그라미, surface 바탕, border-default 1px, 필터 아이콘(줄 3개)만 | 칩 줄 맨 앞 "전체 필터" (시안 P01). 칩은 모두 보이는 높이 36, 누르는 영역은 위아래로 넓혀 44 |
| choice-chip/off | surface 바탕, text-secondary, border-default 1px | 여러 개 고르는 칩 (필터 시트 카테고리). 하나만 고르는 칩(등록·수정의 카테고리, 시안 P07, 필터 시트 참가비)도 같은 모양이고 라디오로 읽힌다 |
| choice-chip/on | primary-soft 바탕, primary-strong 글자와 테두리 1.5px | 고른 칩 |
| segmented/date-filter/selected | surface-muted 틀(모서리 md, 안쪽 4), 칸 높이 44(누르는 영역), 고른 칸은 surface + border-default + primary-strong 글자, 나머지 text-secondary | 날짜 하나 고르기 "전체 · 오늘 · 이번 주 · 이번 주말", 필터 시트 장소 갈래 "스터디지점 · 지역 (시·도 → 구)" (시안 O01)·술 여부 "전체 · 술 없음", 등록·수정의 술 여부 "없음 · 있음"·장소 갈래·모집 방식 "선착순 · 호스트 승인" (시안 P07) |
| segmented/date-filter/locked | 같은 틀, 고른 칸 글자 text-secondary, 나머지 text-disabled, 누를 수 없음. 아래 자물쇠 + 이유(text-field/locked와 같은 줄) | 수정 화면의 장소 갈래(참여 확정자가 있음), 모집 방식("승인 대기 신청이 있어 바꿀 수 없어요") |
| segmented/binary/unanswered | 흰 버튼 두 칸 "예" · "아니오"(surface, border-default 1px, 모서리 lg, 높이 48, body-lg, 사이 8), 고른 칸 없음. 회색 질문 상자 안에 놓여 틀은 따로 없다 (시안 P09) | 비공개 질문 예/아니오, 아직 답 안 함 |
| segmented/binary/selected | 고른 칸 text-primary 테두리 1.5px + 굵은 글자 | 예 또는 아니오를 고름 |
| question-block/unanswered | 질문 글(body-md, text-primary) + 아래 8 segmented/binary/unanswered, 묶음 사이 20 | 후기 쓰기(P09)의 비공개 질문 3개 |
| question-block/answered | 질문 글 + segmented/binary/selected | 답한 질문 |
| segmented/with-counts/selected | 고른 칸 글자 primary-strong, 나머지 text-secondary | 소셜링 관리(P11) 신청자 탭 "승인 대기 2 · 참여 확정 4 · 거절·취소 1" |
| toggle/off | toggle-off 바탕, 흰 손잡이, 48×28 | "파티·사교 숨기기" 꺼짐 (기본) |
| toggle/on | primary-strong 바탕, 흰 손잡이 | 켜짐 |
| radio-row/off | 왼쪽 동그라미(20, border-default 2px) + 이름(body-lg) + 지역(body-sm, text-secondary), 높이 52, 줄 아래 border-divider (시안 O01) | 장소 하나 고르기 "강남점 서울 강남구", "전체 지점", 지역 "전국"·"서울특별시 전체"·구 |
| radio-row/on | 동그라미가 primary-strong으로 채워지고 가운데 흰 점, 이름 medium | 고른 행 |
| radio-row/next | radio-row와 같은 줄에 동그라미 대신 오른쪽 ›. 그 시·도에서 고른 구가 있으면 이름 옆에 primary-strong 글자 | 지역 시·도 목록 (누르면 구 목록) |
| radio-row/back | ‹ + 시·도 이름(body-md, primary-strong), 높이 44, 줄 아래 border-divider | 구 목록 맨 위 (시·도 목록으로) |

### C2 상태 표시와 카드

**status-badge** — 소셜링의 보이는 상태(DB가 계산한 `display_status`, spec 3.1). 소셜링마다 정확히 하나. 높이 24, 모서리 full(알약), 글자 label, 여백 4·10.

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| status-badge/recruiting | surface 바탕, primary-strong 글자, primary-strong 테두리 1px | "모집중" |
| status-badge/awaiting-confirm | primary-soft 바탕, primary-strong 글자 (모집중의 테두리와 확정의 꽉 찬 색 사이) | "확정 대기": 신청 마감이 지났고 확정 기한 전, 호스트가 확정할 수 있는 소셜링 |
| status-badge/confirmed | primary 바탕, on-primary 글자 | "확정": 참여 확정이 최소 인원 이상일 때 호스트가 확정 기한 전에 확정 버튼을 누른 소셜링 |
| status-badge/ended | surface-muted 바탕, status-ended 글자 | "종료": 호스트가 종료 버튼을 누른 소셜링. 소셜링 일시가 지나도 자동으로 종료되지 않는다 |
| status-badge/host-cancelled | danger-soft 바탕, danger 글자 | "호스트 취소": 호스트가 직접 취소했거나, 확정 대기인 채로 확정 기한이 지난 소셜링 |
| status-badge/cancelled | host-cancelled와 같은 모양 | "취소": 참여 확정 + 승인 대기가 최소 인원보다 적어 열리지 못한 소셜링 (호스트 기록에 세지 않음) |

**status-tag** — 신청할 수 없는 이유 또는 최소 인원까지 남은 수. 상태가 아니라 계산 값. status-badge 오른쪽에 최대 하나. surface-muted 바탕, text-secondary 글자, 높이 22, 모서리 xs. 확정 대기·취소·호스트 취소·종료에는 없다.

| 이름 | 쓰는 곳 |
|---|---|
| status-tag/closed | "신청 마감": 신청 마감 일시가 지남. 정원도 찼으면 이 꼬리표 하나만 |
| status-tag/full | "정원 마감": 참여 확정 인원이 정원과 같음 |
| status-tag/min-needed | "최소 인원까지 2명": 모집중이고 참여 확정이 최소 인원보다 적음(신청 마감·정원 마감이 없을 때). 모양은 다른 꼬리표와 같다 |

허용되는 조합 10가지: 모집중 · 모집중+최소 인원까지 N명 · 모집중+정원 마감 · 확정 · 확정+신청 마감 · 확정+정원 마감 · 확정 대기 · 종료 · 호스트 취소 · 취소.

**application-chip** — 한 사람의 신청 상태. status-badge와 같은 알약 모양(모서리 full, 테두리 없음), 높이 24, 글자 label. 둘은 글자로 구분하고, 같이 놓이면 status-badge가 앞이다(예: "종료" "참여 확정").

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| application-chip/pending | surface-muted 바탕, text-secondary | "승인 대기" |
| application-chip/accepted | primary-soft 바탕, primary-strong | "참여 확정" |
| application-chip/rejected | danger-soft 바탕, danger | "거절" |
| application-chip/withdrawn | surface-muted 바탕, text-muted | "신청 취소" (본인이 취소) |
| application-chip/host-cancelled | danger-soft 바탕, danger | "호스트 취소" (소셜링이 취소됨) |

**point 색 부품** (point는 이 두 가지에만)

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| trust-label/default | point 바탕, on-point 글자, 높이 24(누르는 영역은 위아래로 넓혀 44), 모서리 full, 글자 앞에 방패 아이콘 14(on-point), "믿고 가는 호스트 ⓘ" | 기준이 공개된 등급 라벨. 조건: 최근 6개월 열린 소셜링 5회 이상 + 호스트 취소 0회 + 소개 일치 90% 이상. 상세의 host-profile-row와 호스트 묶음 닉네임 아래 두 곳, 누르면 bottom-sheet/trust-criteria(O03). O03 제목 옆에서는 누르지 않는 모양만 |
| count-pill/pending | point 바탕, on-point 글자, 높이 20, 모서리 full, "2" | 승인 대기 건수 (상세 "관리하기", 내 소셜링 호스트 카드) |

**사람과 인증 표시**

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| verified-badge/default | surface-muted 바탕, border-default 1px, text-secondary, 높이 22, 모서리 xs, "참여 인증" (시안) | 참여를 마친 사람이 쓴 후기. 후기 줄 오른쪽 끝 |
| avatar-initial/default | primary-soft 원 안에 닉네임 첫 글자(primary-strong, 5.2:1). 크기 20 · 32 · 40 · 48 | 카드 메타 20, 후기 카드 32, 신청자 행·상세 호스트 40, 내 소셜링 프로필 48. 프로필 사진은 없다 |
| avatar-initial/strong | primary-strong 원 안에 흰 글자, 28 | 로그인한 머리글 오른쪽 |
| host-profile-row/default | 높이 52. avatar-initial 40 + "호스트"(body-md, text-secondary) + 닉네임(title-md) + 조건을 채운 호스트만 trust-label | 상세 제목 아래 호스트 한 줄 |
| profile-row/default | avatar-initial 48 + 닉네임(title-md), 오른쪽 "로그아웃"(body-md, text-secondary, 누르는 영역 44) | 내 소셜링(P06) 맨 위 |

**카드**

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| socialing-card/photo | surface, 테두리 없음 + shadow-card, 모서리 xl, 여백 16. 왼쪽 96px 정사각 사진(모서리 lg), 오른쪽 위에서부터: status-badge(+status-tag), 제목 1줄 말줄임(title-md, 700), "카테고리 · 술 여부"(카테고리 이름은 카테고리 색 600 + 앞에 6px 점, 술 여부는 text-secondary), "일시 · 장소", avatar-initial 20 + "호스트 · 4/8명 · 총 참가비"(닉네임은 text-primary, 총 참가비는 text-primary 700) | 홈·탐색·지난 소셜링 목록 |
| socialing-card/no-photo | 왼쪽 칸이 category-art(그 카테고리 soft 바탕 + 카테고리 색 선 아이콘) | 대표 사진이 없을 때 |
| socialing-card/my-application | photo 카드 + status-badge 뒤에 application-chip(승인 대기·참여 확정·거절. 호스트 취소·취소면 배지 하나만, 확정 대기는 배지 + 칩, 내가 신청 취소한 소셜링은 목록에 없음). 후기를 쓸 수 있으면(참여 확정 + 종료 + 아직 안 씀) 카드 아래 구분선(border-divider) + 오른쪽 sm primary "후기 쓰기". 거절이고 사유가 있으면 같은 아래 줄에 "거절 사유: 승인 기준과 맞지 않아요"(body-sm, text-secondary) | 내 소셜링 "신청한 소셜링" 탭 |
| socialing-card/host | photo 카드 + 카드 아래 구분선(border-divider), 왼쪽 "승인 대기" + count-pill(0이면 없음, 호스트 취소·취소면 숨김), 오른쪽 "소셜링 관리 ›"(body-md, primary-strong). 카드 전체가 P11로 가는 링크 | 내 소셜링 "호스트인 소셜링" 탭 |
| category-art/default | 그 카테고리 soft 바탕 + 가운데 카테고리 선 아이콘(카테고리 색). 아이콘: 배움·자기계발 책, 취미 웃는 얼굴, 운동·활동 번개, 문화·예술 팔레트, 파티·사교 사람들 | 사진 없는 카드의 사진 칸 |
| hero-card/default | 대표 사진 전체, 아래쪽 어두운 그라데이션 위 흰 글자, 모서리 2xl, 여백 20, 최소 높이 280. 왼쪽 위 작은 라벨 "지금 신청할 수 있는 가장 가까운 소셜링", 아래 status-badge(+ 최소 인원 전이면 status-tag/min-needed), 제목(title-lg), 일시 · 장소, 호스트 · 참가자 · 총 참가비 | 홈 맨 위 1개. 넘기는 배너가 아니다. 카드 아래 기준 문구(body-sm) |
| hero-card/no-photo | default와 같은 틀에 사진 대신 바탕 `linear-gradient(155deg, #17586B 0%, deep 55%, on-primary 100%)`, 오른쪽 위에 카테고리 선 아이콘 132px(흰색 13% 투명), 왼쪽 아래 primary 빛(radial, 28%). 라벨 바탕 흰색 14%·글자 600, status-badge/recruiting은 테두리 없이, 제목 title-lg(800), 일시·장소 글자 흰색 86% | 대표 사진이 없을 때 |
| review-card/compact | surface, 테두리 없음 + shadow-card, 모서리 lg, 여백 14·16. avatar-initial 20 + "닉네임 · 날짜 · 소셜링 제목" + 글 2줄 | 홈 "최근 인증 후기" |
| review-card/full-no-photo | 목록 한 줄(시안): surface 바탕 화면에서 위아래 여백 20, 줄 사이 border-divider. avatar-initial 32 + 닉네임(title-md) + 날짜(body-sm, text-muted), 오른쪽 끝 verified-badge, 소셜링 제목 링크 "주말 아침 독서 토론 ›"(body-lg), 글(body-long, 줄바꿈 그대로) | 인증 후기(P10) 목록 |
| review-card/full-with-photo | full-no-photo + 4:3 사진(모서리 lg) | 사진이 있는 후기 |
| shortcut-category/default | 56px 원(테두리 없음, 그 카테고리 soft 바탕) 안 카테고리 선 아이콘 24(카테고리 색, 선 굵기 2) + 아래 이름(label, text-primary, 가운뎃점 뒤에서 줄바꿈). 5개가 한 줄을 똑같이 나눠 쓰고, 칸이 56px보다 좁은 화면에서는 원이 칸 폭에 맞춰 줄어든다 | 홈 카테고리 바로가기 5개 (시안) |
| shortcut-branch/default | surface, 테두리 없음 + shadow-card, 모서리 lg, 여백 12, 가운데 정렬. 위치 핀 아이콘 16(primary-strong) 아래 지점 이름(title-md, 700) + 지역 "서울 강남구"(label, text-secondary). 3개가 한 줄을 나눠 씀. 핀 원을 왼쪽에 두면 390px에서 지역 글이 "서울 강/남구"로 끊겨 가운데 정렬로 둔다 | 홈 스터디지점 바로가기 3개 (시안) |

**호스트 기록과 상세 정보**

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| host-stats/normal | 상세 호스트 카드(흰 카드, 모서리 xl, shadow-card, 여백 16) 안: avatar-initial 48 + 닉네임(700) + trust-label, 위 문구 "최근 6개월 기록 · 별점이나 점수로 합치지 않아요"(body-sm, text-secondary), 2×2 칸(칸 테두리 없음, 칸 사이를 border-divider 줄로 나눔): 칸 이름(body-sm, text-secondary) + 값(title-xl 800, deep) "6회" · "0회" · "92%"와 아래 "응답 12건"(body-sm, text-muted) · "12개" | 상세의 호스트 영역 |
| host-stats/new-host | 같은 호스트 카드 안. 위 문구는 normal과 같고, 칸 대신 surface-muted 상자(모서리 lg, 여백 16) "새 호스트 · 기록이 쌓이면 숫자로 보여 줘요" | 열린 소셜링 3회 미만 |
| host-stats/ratio-hidden | normal과 같고 소개 일치 칸만 "응답 5건 이상부터 보여요" | 응답 5건 미만 |
| host-stats/load-failed | 같은 호스트 카드 안. error-state/inline 틀(surface-muted, 점선 테두리, 모서리 lg) 안에 "기록을 불러오지 못했어요" + text-link "다시 시도" | 기록만 실패 (상세와 신청은 그대로 동작) |
| manage-summary/default | surface, 테두리 없음 + shadow-card, 모서리 xl, 여백 20. status-badge(+status-tag), 제목(title-lg), "10/14(화) 오후 7:30 · 스터디지점 강남점 · 호스트 승인"(body-md, text-secondary), "참가자 **2/8명** · 최소 4명 · 스태프 1명 · 승인 대기" + count-pill(body-md, text-primary. 최소 인원은 모집중·확정 대기일 때, 스태프는 있을 때, 승인 대기는 1건 이상일 때) | 소셜링 관리(P11) 맨 위 요약 (시안) |
| review-summary/default | manage-summary/default와 같은 카드. status-badge "종료" + application-chip "참여 확정", 제목(title-lg), "10/11(토) 오전 10:00 · 스터디지점 홍대점 · 호스트 도현"(body-md, text-secondary) | 후기 쓰기(P09) 맨 위 요약 (시안) |
| manage-status-actions/recruiting | button/primary/lg "확정하기"(전체 폭) + 설명 body-sm text-secondary("최소 4명이 모이면 확정 기한(…)까지 확정할 수 있어요. …", spec 8.8), 그 아래 button/secondary/md "수정" · button/danger/md "호스트 취소"(반씩), 그 아래 막힌 button/primary/lg "종료하기" + 이유. 막히면 버튼 disabled + 설명 대신 이유 한 줄(최소 인원 전 "최소 인원(4명)이 모여야 확정할 수 있어요 · 지금 2명 · 승인 대기 2명") | 소셜링 관리(P11) 진행 단계 아래, 모집중·확정 대기 (시안) |
| manage-status-actions/confirmed | "종료하기"(일시 전이면 disabled + "소셜링 일시가 지나야 종료할 수 있어요") + "수정" · "호스트 취소" | 확정한 뒤 |
| manage-status-actions/closed | 버튼 대신 notice-box "종료한 소셜링이에요 · 참여자가 후기를 쓸 수 있어요" 또는 "호스트 취소한 소셜링이에요" | 종료·호스트 취소 뒤 |
| manage-status-actions/computed-cancel | 진행 단계와 버튼 대신 notice-box 하나: "취소된 소셜링이에요 · 최소 인원(4명)이 모이지 않았어요" 또는 "호스트 취소 · 확정 기한까지 확정하지 않았어요" | 신청 마감·확정 기한이 지나 계산으로 취소·호스트 취소된 모집중 (MS15 U4) |
| progress-steps/current-recruiting | 모집중 → 확정 → 종료 세 점, 지금 단계만 text-primary 굵게 | 소셜링 관리(P11), 모집중. 상세에는 쓰지 않고 status-badge만 (시안) |
| progress-steps/awaiting-confirm | current-recruiting과 같은 세 점 + 아래 왼쪽 "확정 대기 · 10/21(수) 오전 7:30까지"(body-md, primary-strong 500) | 신청 마감 뒤 확정 기한 전, 확정 대기 (MS15 U4) |
| progress-steps/current-confirmed | 확정이 지금 단계 | 호스트가 확정한 뒤 |
| progress-steps/done-ended | 종료까지 모두 지남 | 호스트가 종료한 뒤 |
| progress-steps/host-cancelled | 세 점 흐리게 + danger "호스트 취소" | 호스트 취소 |
| applicant-row/pending | surface, 아래 구분선, 높이 72. avatar-initial 40, "서윤", "10/12 오전 8:40 신청", sm secondary "거절" + sm primary "승인" | 소셜링 관리 승인 대기 탭 |
| applicant-row/approve-disabled | 승인 버튼 disabled(일시가 지나면 거절도) + 이유: "정원이 차서 승인할 수 없어요" 또는 "소셜링 일시가 지나 승인할 수 없어요". 이유는 줄마다가 아니라 승인 대기 목록 아래 한 줄(body-sm, text-secondary), 승인할 수 있으면 그 자리에 "남은 자리 4 · 정원이 차면 승인할 수 없어요"(시안) | 승인할 수 없을 때 |
| applicant-row/accepted | 높이 64, application-chip/accepted | 참여 확정 탭 |
| applicant-row/rejected | 높이 64, application-chip/rejected 또는 withdrawn. 거절에 사유가 있으면 신청 시각 아래 "거절 사유: …"(body-sm, text-secondary, 줄바꿈 가능) | 거절·취소 탭 |
| info-list/default | 흰 카드(모서리 xl, shadow-card, 여백 6·14, 화면 좌우 16 띄움) 안 라벨·값 행, 행 사이 border-divider 1px. 라벨 앞에 아이콘 칸 30×30(모서리 md, primary-soft 바탕, primary-strong 아이콘 17): 소셜링 일시 calendar · 신청 마감 clock · 확정 기한 calendar-check · 장소 map-pin · 총 참가비 wallet · 모집 방식 user-check · 연령 조건 id-card · 인원 users · 자료 file-text. 값은 700, **소셜링 일시·총 참가비 값은 primary-strong**. 인원 값 아래 보조 글("스태프는 정원에 세지 않아요") 그대로. 긴 보조 글(총 참가비의 참가비 설명, 모집중·확정 대기일 때 확정 기한 "이때까지 호스트가 확정하지 않으면 취소돼요"와 인원의 최소 인원 글 "최소 4명 · 2명 더 모이면 확정할 수 있어요")은 행 아래 줄 전체에 라벨 글자 시작(왼쪽 38)에 맞춰 왼쪽 정렬, body-sm text-secondary, 줄바꿈 그대로. 자료 값은 링크 "자료 보기"(primary-strong, 바깥 링크 아이콘 14, 누르는 영역 44) + 보조 글 사이트 이름 | 상세 정보 |
| section-header/default | 제목 title-lg(800), 오른쪽 text-link "전체 보기 ›"(primary-strong, 600), 아래 기준 문구 body-sm text-secondary | 홈·목록 묶음 머리 ("기준: 가까운 일시 순") |
| notice-box/feed-criteria | surface-muted 바탕, text-secondary, 모서리 lg, 여백 14·16 | 회색 안내: 신청 확인(O02)의 승인 기준, 관리 화면의 종료·취소 안내 등 |
| notice-box/info | primary-soft 바탕, 제목 primary-strong 700 + 앞에 정보 아이콘 16, 본문 text-primary, 모서리 lg, 여백 14·16 | 상세(P03) 소개 카드 안 맨 아래 "호스트 승인 기준". 늘 펼쳐 보여야 하는 짧은 안내(C5 ②) |
| collapsible-row | 흰 카드 안 제목 줄(title-md text-primary, 높이 52, 오른쪽 ⌄ 20 text-secondary). 누르면 아래로 펼쳐지고 ⌃. 버튼에 aria-expanded. 펼친 내용은 body-md | 상세(P03) "신청 전에 확인해 주세요"의 "취소·환불 규칙"(C5 ③) |
| participation-record | notice-box/info 틀(② 안내 상자). 제목 "내 참여 기록 · 나만 볼 수 있어요", 숫자 한 줄 "새 멤버 · 참여 2회 · 늦은 취소 1회"(body-md 500 text-primary, 새 멤버는 참여 3회 미만일 때), 기준 문구 "최근 6개월 · 신청 마감 뒤에 참여 확정을 취소하면 늦은 취소예요"(body-sm text-secondary). 늦은 취소가 있으면 같은 상자 안 아래에 collapsible-row "늦은 취소 기록 보기"(③, 바탕은 상자 그대로): 줄마다 "제목 · 10/12(월) 취소 · 4/14(수)에 기록에서 빠져요"(body-sm text-primary, 링크 아님). 불러오지 못하면 그 자리에 error-state/inline "참여 기록을 불러오지 못했어요" | 내 소셜링(P06) 신청한 소셜링 탭 맨 위, 나만 보는 참여 기록 (MS15 SH2) |
| notice-box/caution | caution-soft 바탕, 제목 caution 700 + 앞에 주의 아이콘 16, 본문 text-primary, 모서리 lg, 여백 14·16. 항목은 "• " 줄 | 상세(P03) "신청 전에 확인해 주세요"의 "소셜링 규칙"(플랫폼 공통 금지 행위, 호스트가 바꿀 수 없음). 호스트가 쓴 승인 기준(info)과 색으로 구분된다(C5 ②) |
| notice-box/lock-privacy | surface-muted 바탕, 모서리 xl, 여백 20. 자물쇠 아이콘 + "비공개 확인 질문"(title-md), 안내(body-sm, text-secondary) "개별 응답은 호스트를 포함해 누구에게도 보이지 않아요. 합계만 호스트 기록에 쓰여요.", 그 아래 question-block 3개 (시안 P09) | 후기 쓰기(P09)의 비공개 질문 |

**상세(P03) 배치** (견본 A안, 새 컴포넌트 이름 없이 위 부품을 놓는 방법)
- 화면 바탕은 surface-bg이고, 흰 카드들이 그 위에 뜬다.
- 대표 그림: 4:3. 사진이 있으면 사진, 없으면 그 카테고리 soft에서 surface-bg 쪽으로 옅어지는 그라데이션 + 가운데 카테고리 선 아이콘 84(카테고리 색, 선 굵기 1.5).
- 제목 묶음: 흰 바탕 묶음이 대표 그림 위로 16 겹쳐 올라오고 위 모서리 2xl. 안에 status-badge(+status-tag) + 카테고리 줄(카테고리 이름은 카테고리 색 600 + 앞에 점, 술 여부 text-secondary), 제목 title-xl, host-profile-row.
- info-list 카드 → "소개" 묶음 → "호스트" 묶음 → "신청 전에 확인해 주세요" 묶음 순서. 묶음 제목은 title-lg.
- 소개: 흰 카드(모서리 xl, shadow-card, 여백 16) 안에 글. 5줄을 넘으면 접고 "더보기"(text-link, primary-strong 600 + ⌄, 왼쪽 정렬, 누르는 영역 44). 호스트 승인 기준이 있으면 이 카드 안 맨 아래 notice-box/info.
- 호스트: host-stats 카드 하나(위 host-stats).
- 신청 전에 확인해 주세요: 아래 고정 영역 바로 위, 흰 카드(모서리 xl, shadow-card, 여백 16) 안에 notice-box/caution "소셜링 규칙". 모든 상세에 늘 있다(호스트 본인·지난 소셜링 포함). 이 상자는 상세에만 두고 신청 확인 창에는 넣지 않는다. 총 참가비가 있고 소셜링 일시 전이면 그 아래 collapsible-row "취소·환불 규칙"(처음엔 접힘).

### C3 탐색과 피드백

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| logo-wordmark/default | 왼쪽 그림 26×22: 두 원이 겹친 모양 `<svg viewBox="0 0 26 22"><circle cx="9" cy="11" r="8" fill="primary"/><circle cx="17" cy="11" r="8" fill="primary-strong" fill-opacity=".88"/></svg>`(색은 토큰), 사이 7, 글자 "문화"(500, deep) + "소셜링"(800, primary-strong), 19px/24, 자간 −0.045em. 로고라서 글자 토큰의 예외. 그림은 읽기 프로그램에서 숨기고, 링크 이름은 "문화소셜링"(누르면 홈) | header-main 왼쪽 |
| header-main/logged-out | surface, 아래 border-divider, 높이 56. 왼쪽 logo-wordmark, 오른쪽 "로그인": sm 버튼(보이는 높이 36, 누르는 영역 44)을 primary 바탕, on-primary 글자 700, 모서리 full로(머리글 로그인에만 쓰는 모양) | 메인 탭 화면, 비로그인 |
| header-main/logged-in | 오른쪽 avatar-initial/strong 28 (누르면 내 소셜링) | 메인 탭 화면, 로그인 |
| header-sub/default | surface, 아래 border-divider, 높이 56. 뒤로 아이콘 + 제목(title-md, 700) ("소셜링 상세") | 하위 화면 |
| header-sub/with-action | default + 오른쪽 text-link ("상세 보기 ›") | 소셜링 관리 |
| tab-bar/active-home · active-explore · active-review · active-mysocialing | surface, 위 border-divider, 높이 64, 4칸 선 아이콘 + 글자 "홈 · 탐색 · 후기 · 내 소셜링". 활성 탭은 아이콘 뒤에 primary-soft 알약 52×28(모서리 full), 아이콘·글자 primary-strong 굵게. 비활성 text-muted | 메인 탭 화면 아래, 지난 소셜링 아래(active-explore) |
| top-tabs/active-applied · active-hosted | 높이 48, 활성 탭 아래 2px text-primary 밑줄, 비활성 text-muted. "신청한 소셜링 / 호스트인 소셜링" | 내 소셜링 |
| toast/success | toast-bg, toast-text(body-md), 링크 primary(누르는 영역 44), 모서리 lg, 여백 12·16. "신청했어요" + "내 소셜링에서 보기 ›" | 성공 뒤 짧은 안내 |
| toast/info | toast-bg, toast-text | "환영해요, ○○님", "호스트만 볼 수 있어요" 같은 안내 |

토스트 공통: 한 번에 하나, 약 4초 뒤 사라진다. 좌우 16px 안쪽 전체 폭. 자리는 아래 탭이나 apply-bar 바로 위 8px, 둘 다 없으면 화면 아래 16px(+ 아이폰 안전 영역). 화면을 옮겨도 남는다(가입 → 홈).
| dialog/confirm | surface, 모서리 xl, 여백 20, 뒤 dim. 제목 + 본문 + secondary "돌아가기" + primary 행동 | 호스트 동작 확인(O04)의 확정·종료: "확정할까요? 확정하면 되돌릴 수 없어요." |
| dialog/confirm-danger | confirm과 같고 행동 버튼이 button/danger/default | O04의 호스트 취소: "호스트 취소할까요?" |
| dialog/reject | confirm-danger에 입력을 더한다. 제목 → "거절 사유"(title-md) 아래 radio-row 4~5줄 → textarea "덧붙일 말 (선택)"(100자, "0 / 100") + 칸 아래 "서윤 님에게 그대로 보여요. 외모나 성별을 이유로 쓰지 마세요"(body-sm, text-secondary) → 본문 "거절하면 되돌릴 수 없어요." → 돌아가기 · danger "거절". 창은 화면 높이의 90%까지, 넘으면 버튼은 그대로 두고 위쪽만 스크롤 | O04 거절: "서윤 님의 신청을 거절할까요?" |
| dialog/result | 버튼 하나 primary "확인" | 결과 안내: "신청하지 못했어요 · 방금 정원이 찼어요" |
| bottom-sheet/confirm-apply | surface, 위 모서리 2xl, 손잡이 36×4, 뒤 dim. 제목 title-lg "신청할까요?" + 소셜링 요약 두 줄(body-md, text-secondary: "제목 · 일시" / "장소 · 총 참가비", 참가비 설명이 있으면 셋째 줄 "참가비 설명: …") + 연령 조건(있을 때, "• 연령 조건 20~39세" body-md text-primary) + notice-box 승인 기준(있을 때) + 결과 안내("• …", body-md) + 모집중 소셜링이면 열리는 조건("• 최소 4명이 모이고 확정 기한(…)까지 호스트가 확정하면 열려요. 취소되면 전액 환불 기준이에요", body-md text-secondary, 0원이면 뒤 문장 없음) + 총 참가비가 있으면 notice-box/feed-criteria "취소·환불 규칙"(상세 collapsible-row와 같은 글, 접지 않음, 마지막 데모 안내만 body-sm text-muted), 아래 secondary "돌아가기" + primary "신청하기"(폭 1:2). 네트워크 오류면 버튼 위에 오류 문구(body-sm, danger)와 "다시 시도" (문구는 docs/spec.md M7·8.4) | 신청 확인(O02) |
| bottom-sheet/trust-criteria | bottom-sheet와 같은 틀. 제목 줄 trust-label + "등급 조건"(title-lg), 설명 "최근 6개월 기록으로 아래 3가지를 모두 채운 호스트예요"(body-md, text-secondary), 조건 3행 상자(border-default, 모서리 xl, 행 사이 border-divider, 행마다 채움 ✓ 원(text-primary) · 조건(body-md) · 이 호스트의 값(title-md, 소개 일치는 뒤에 "(응답 N건)" body-sm text-muted)), 아래 "별점이나 점수가 아니라 공개된 기록으로만 정해요"(body-sm, text-muted), primary "확인"(전체 폭) | 등급 조건(O03) |
| bottom-sheet/confirm-cancel-application | bottom-sheet와 같은 틀. 제목 "신청을 취소할까요?", 맨 위에 DB가 계산한 두 줄(있을 때, 이 순서: 확정 대기 취소 경고 "지금 취소하면 최소 인원(4명)보다 적어져 소셜링이 취소돼요", 늦은 취소 안내 "지금 취소하면 내 참여 기록에 늦은 취소로 남아요(나만 봐요)", MS15), 선착순이고 신청 마감 전일 때만 "취소하면 다른 사람이 자리를 채울 수 있어요.", 총 참가비가 있으면 그 아래 환불 기준 한 줄("지금 취소하면 전액 환불 기준이에요" 등, body-md text-secondary), 버튼 secondary "돌아가기" + danger "신청 취소"(폭 1:1). 네트워크 오류면 버튼 위에 오류 문구와 "다시 시도" | 신청 취소 확인(O05), 상세에서 "신청 취소"를 누를 때 |
| bottom-sheet/report | bottom-sheet와 같은 틀. 제목 "신고하기", "신고 사유"(title-md) 아래 radio-row 5줄(긴 사유는 줄바꿈) · textarea "설명"(300자, "0 / 300") · notice-box/feed-criteria 안내 "신고는 접수만 돼요…", 아래 secondary "돌아가기" + primary "신고하기"(폭 1:2). 칸 아래 오류는 text-field 오류 줄과 같다. 네트워크 오류면 버튼 위에 오류 문구와 "다시 시도" (문구는 docs/spec.md 8.6·8.9 P03) | 상세(P03) 신고 줄의 "신고하기". 줄은 "신청 전에 확인해 주세요" 카드 맨 아래 위 구분선 + "이 소셜링에서 문제를 겪었나요?"(body-md, text-secondary) + button/text-link "신고하기", 접수 뒤 "신고를 접수했어요" |
| bottom-sheet/filter-sheet | surface, 위 모서리 2xl, 손잡이 36×4, 제목 "필터" + 닫기 X(아래 옅은 구분선), 스크롤 내용(카테고리 "여러 개 선택" · 날짜 · 장소 · 참가비 · 술 여부, 묶음 사이 24), 아래 고정 secondary "초기화" + primary "소셜링 4개 보기"(폭 1:2, 위 옅은 구분선) | 탐색 필터(O01) |
| empty-state/filter-no-results | 48px 원(surface-muted) 아이콘, 제목 title-md, 설명 body-sm, secondary "필터 초기화", 여백 48·20 | "조건에 맞는 소셜링이 없어요" |
| empty-state/no-applications | 아이콘 원 primary-soft, primary "탐색하기" | "아직 신청한 소셜링이 없어요" (다른 빈 화면도 이 모양에 글과 버튼만 바꿈) |
| error-state/full | 아이콘 원 danger-soft, "불러오지 못했어요", "연결을 확인하고 다시 시도해 주세요", primary "다시 시도" + text-link "홈으로" | 화면 전체 실패 |
| error-state/inline | surface-muted, border-default 점선, 모서리 lg, 여백 16, sm secondary "다시 시도" | 묶음 하나만 실패 ("후기를 불러오지 못했어요") |
| error-state/not-found | 아이콘 원 surface-muted, "찾을 수 없는 소셜링이에요", "주소가 맞는지 확인해 주세요", primary "탐색으로" + text-link "홈으로" | 없는 소셜링 주소 |
| skeleton/card-list | surface-muted 덩어리: 96px 정사각 + 글 막대 3개, 2개 | 목록 로딩 |
| skeleton/hero | surface-muted 덩어리, 높이 280, 모서리 2xl | 홈 히어로 로딩 |
| skeleton/detail | 4:3 사진 칸 + 제목 막대 + 정보 줄 | 상세 로딩 |
| skeleton/manage · review-list · review-write · socialing-form | 같은 surface-muted 덩어리로 그 화면의 모양(요약 카드, 후기 줄, 입력 칸)을 그린다 | 관리(P11), 인증 후기(P10), 후기 쓰기(P09), 등록·수정(P07·P08) 로딩 |

### C4 상세 아래 고정 영역 (apply-bar)

소셜링 상세 맨 아래에 붙는 영역. 아래 14가지 중 **정확히 하나**만 보인다. 어떤 것을 고를지는 [docs/spec.md](docs/spec.md) 8.4의 순서표가 정한다: 표의 위에서부터 먼저 맞는 줄 하나.

공통: surface 바탕, 위 테두리 없음 + shadow-bar, 위 모서리 2xl, 여백 12·16, 높이 약 100(아이폰 아래 안전 영역 포함). 안내 한 줄(body-sm) + 버튼은 lg 하나까지. 상태 상자는 surface-muted 바탕, 모서리 lg, 버튼 lg와 같은 높이. 상자 안의 application-chip/pending은 바탕이 상자와 같아 surface 바탕으로 띄운다.

| 이름 | spec 8.4 줄 | 모양 |
|---|---|---|
| apply-bar/host-manage | 1 (승인 대기 없음) | 안내 "내가 연 소셜링이에요" + primary "관리하기" |
| apply-bar/host-manage-pending | 1 (승인 대기 있음) | 같은 안내 + primary "관리하기 · 승인 대기" + count-pill "2" |
| apply-bar/host-cancelled | 2 | button/danger/disabled "호스트 취소" + 안내 "호스트가 취소한 소셜링이에요"(확정 기한까지 확정하지 않았으면 "호스트가 확정 기한까지 확정하지 않아 취소된 소셜링이에요") + text-link "다른 소셜링 보기 ›" |
| apply-bar/cancelled | 2-1 | button/danger/disabled "취소" + 안내 "최소 인원(4명)이 모이지 않아 취소된 소셜링이에요" + text-link "다른 소셜링 보기 ›" |
| apply-bar/review-write | 3 | 안내 "소셜링이 끝났어요" + primary "후기 쓰기" |
| apply-bar/review-done | 4 | 상태 상자 "✓ 후기 작성 완료" |
| apply-bar/wait-end | 5 | 상태 상자 "참여 확정 · 소셜링 일시가 지났어요" + 안내 "호스트가 종료하면 후기를 쓸 수 있어요" |
| apply-bar/pending-cancel | 7 (승인 대기) | application-chip/pending + "호스트가 승인하면 참여 확정돼요" + secondary "신청 취소" → bottom-sheet/confirm-cancel-application |
| apply-bar/accepted-cancel | 7 (참여 확정) | application-chip/accepted + 확정 소셜링 "10/14(화) 오후 7:30에 만나요" / 모집중·확정 대기 "확정 기한(10/21(수) 오전 7:30)까지 호스트가 확정하면 열려요" + secondary "신청 취소" → bottom-sheet/confirm-cancel-application |
| apply-bar/pending-expired | 8 | application-chip/pending + 상태 상자 "소셜링 일시가 지났어요" + 안내 "호스트가 응답하지 않았어요" |
| apply-bar/reapply | 9 | application-chip/rejected 또는 withdrawn(실제 상태) + "자리가 남아 있어 다시 신청할 수 있어요" + primary "다시 신청". 거절이고 사유가 있으면 칩 줄 위에 "거절 사유: …"(body-md, text-primary) + 덧붙인 말(body-sm, text-secondary, 따옴표 없이, 있을 때만) |
| apply-bar/closed-after-application | 10 | application-chip/rejected 또는 withdrawn + 신청할 수 없는 이유(예: "신청 마감 일시가 지나 다시 신청할 수 없어요") + text-link "다른 소셜링 보기 ›". 거절 사유 줄은 9와 같다 |
| apply-bar/apply | 11, 12 | 모집 방식 안내 + primary "신청하기". 호스트 승인: "신청하면 호스트가 승인한 뒤 참여가 확정돼요". 선착순: "신청하면 바로 참여가 확정돼요" |
| apply-bar/closed | 13 | button/primary/disabled + 이유 + text-link "다른 소셜링 보기 ›". 버튼·이유: "정원 마감" / "참여 확정 인원이 정원에 찼어요", "신청 마감" / "신청 마감 일시가 지났어요", "지난 소셜링" / "소셜링 일시가 지났어요" |

후기 쓰기(P09)의 아래 고정 영역도 같은 모양(위 공통)을 쓴다: 안내 한 줄 + primary "후기 올리기". 안내는 막힌 이유 하나("후기를 10자 이상 써 주세요" → "후기는 500자까지 쓸 수 있어요" → "세 질문에 모두 답하면 올릴 수 있어요" → "사진을 올리는 중이에요"), 모두 되면 "올리면 바로 공개돼요". 올리기 실패면 그 자리에 오류 문구(danger)와 버튼 "다시 시도".

등록(P07)의 아래 고정 영역도 같은 모양이다: primary "소셜링 열기" 하나. 빈 칸·틀린 칸은 버튼을 막지 않고, 누르면 칸마다 이유를 보이고 첫 오류 칸으로 간다(spec 8.6). 사진을 올리는 중이면 위에 "사진을 올리는 중이에요"와 버튼 막힘, 열기 실패면 오류 문구(danger) "소셜링을 열지 못했어요. 연결을 확인하고 다시 시도해 주세요"와 버튼 "다시 시도".

### C5 새 정보 블록 (기능 추가용)

기능 추가 단계에서 상세 등에 새 정보가 붙을 때는 **아래 세 모양 중 하나로만** 만든다. 새 모양이 필요하면 이 문서를 먼저 PR로 고친다.

| 모양 | 컴포넌트 | 언제 | 모양 |
|---|---|---|---|
| ① 정보 카드 줄 | info-list 행 | 값 하나로 말할 수 있는 정보 (예: 연령 조건) | 라벨 + 값 한 줄. 상세 info-list 카드 안에 행으로 붙는다(아이콘 칸 규칙도 같음) |
| ② 안내 상자 | notice-box/info, notice-box/caution | 늘 펼쳐 보여야 하는 짧은 안내 (예: 승인 기준, 환불 규칙 요약) | info: 위 notice-box/info. caution: caution-soft 바탕, 제목 caution 700, 본문 text-primary. 모서리 lg, 여백 14·16 |
| ③ 접는 줄 | collapsible-row | 길거나 가끔 보는 정보 (예: 규칙 전문, 비용 내역) | 흰 카드 안 제목 줄(title-md, 높이 52, 오른쪽 ⌄). 누르면 아래로 펼쳐지고 ⌃. 버튼에 aria-expanded. 여러 개면 줄 사이 border-divider |

- notice-box/caution은 MS12 규칙 안내(SH4a), collapsible-row는 MS12 취소·환불 규칙 안내(U1)에서 만들었다. 새 부품은 처음 쓰는 기능 PR에서 만든다(쓰지 않는 부품을 미리 만들지 않음).

### 시안과 다르게 정한 것

2026-10 UI 업데이트(MS11)로 색·그림자·로고가 Figma 시안과 달라졌다. 모양은 이 문서가 기준이고, 시안은 배치와 글 참고용이다.

시안(Figma)과 Stitch가 마지막으로 보낸 요약(2026-10-13)에서 아래는 일부러 따르지 않았다. 시안이 이렇게 보여도 이 문서대로 만든다.

| 시안·요약 | 이 문서 | 이유 |
|---|---|---|
| 내 소셜링의 다가오는 소셜링 카드에 신청 칩만 있음 | 모든 카드에 status-badge + 필요하면 application-chip | 카드 공통 규칙 (spec 8.5) |
| text-muted #9CA3AF, 상태색 #0284C7 · #F59E0B · #EF4444 · #6B7280 | text-muted #6B7280, 참여 확정 primary-strong, 승인 대기 text-secondary, 취소·거절 danger, 종료 status-ended | 요약의 값은 글자 대비 4.5:1 미달 (1.9~4.4) |
| "신청 마감"이 상태 배지 | status-tag(꼬리표) | 상태는 4개뿐, 마감은 계산 값 (spec 8.3) |
| 카드 사진 4:3 | 카드는 96px 정사각, 상세 대표 사진만 4:3 | spec 8.5, 실제 시안도 정사각 |
| 필터가 하위 화면 | bottom-sheet/filter-sheet (O01) | spec 8.2 |
| 상세 아래 영역 5가지 | apply-bar 14가지 | spec 8.4 13줄 |
| 상세(P03) 시안의 호스트 묶음에 trust-label이 두 번, 닉네임 없음 | 호스트 묶음은 avatar-initial + 닉네임, trust-label은 조건을 채운 호스트만 하나 | 등급 라벨은 기준을 채운 호스트에게 하나만 (spec M5) |
| 등급 조건(O03) 시안의 라벨이 흰 바탕 + 테두리 | 다른 곳과 같은 trust-label(point 바탕) | 라벨 모양을 하나로. point 색은 trust-label에 쓴다 |
| 신청 확인(O02) 요약이 "제목 · 일시" 한 줄 | 그 아래 "장소 · 총 참가비" 한 줄 더 | 신청 버튼과 환불 규칙 위에서 금액과 장소를 한 번 더 확인하게 (bottom-sheet/confirm-apply) |
| 로그인(P04)·가입(P05) 머리글 오른쪽에 사람 아이콘 원 | header-sub/default(뒤로 + 제목)만 | 로그인 전 화면에 프로필 원이 있으면 이미 로그인된 것처럼 보임 |
| 지난 소셜링(P02) 시안의 배지가 네모에 가깝고 모집중이 연한 하늘 바탕, 카드 안 호스트 줄 위에 구분선 | 모든 목록이 같은 status-badge(알약, 모집중은 흰 바탕 + 테두리)와 같은 socialing-card | 배지 모양은 10-13 결정, 카드는 화면마다 같게 |
| 등록(P07) 머리글 오른쪽에 사람 아이콘 원 | header-sub/default(뒤로 + 제목)만 | 하위 화면은 모두 header-sub |
| 등록(P07) 신청 마감 도움말 "소셜링 일시보다 앞이어야 해요" | "소셜링 일시와 같거나 앞이어야 해요" | 같은 시각도 된다 (spec 2장, DB 함수) |
| 등록(P07) 일시 칸 자리 글 "예: 10/24(금) 오후 7:30" | text-field/datetime (휴대폰 기본 고르기, 자리 글 없음) | 날짜·시간 고르기 칸은 자리 글을 둘 수 없고, 고르기 목록이 형식을 맞춰 준다 |
| 등록(P07) 모집 방식이 "호스트 승인"으로 골라져 있음, 승인 기준 자리 글 "함께할 멤버를…" | 처음은 선착순, 자리 글은 "함께할 참여자를…" | screen-cases P07-01 "빈 양식, 선착순", 용어는 "참여자" |
| 소셜링 관리(P11)에서 막힌 "종료하기"가 점선 테두리 회색 버튼 | 다른 막힌 버튼과 같은 button disabled(surface-muted 바탕, text-disabled 글자) + 아래 이유 한 줄 | 막힌 버튼 모양을 하나로. 이유는 글자로 보인다 |

## Do's and Don'ts

**Do**
- primary(#59CBE8) 위 글자와 아이콘은 언제나 on-primary(#0B2530)를 쓴다.
- 흰·연한 바탕 위 하늘색 글자, 링크, 테두리는 primary-strong(#136F86)을 쓴다.
- point(#F5A623)는 trust-label과 count-pill 두 곳에만 쓴다. 특정 소셜링 카드를 눈에 띄게 하는 데 쓰지 않는다.
- 소셜링마다 status-badge 정확히 하나, 그 오른쪽에 status-tag("신청 마감" · "정원 마감" · "최소 인원까지 N명") 최대 하나. 신청 마감과 정원 마감이 둘 다 해당하면 "신청 마감".
- 개인의 신청 상태는 application-chip, 소셜링 상태는 status-badge로 나눈다. 둘 다 알약 모양이라 글자로 구분하고, 같이 놓이면 status-badge가 앞.
- 소셜링 상세의 아래 고정 영역은 언제나 apply-bar 14가지 중 하나다.
- 메인 탭 화면(홈, 탐색, 인증 후기, 내 소셜링)과 지난 소셜링은 tab-bar가 있다. 지난 소셜링은 위가 header-sub다. 나머지 하위 화면(상세, 관리, 후기 쓰기, 로그인, 가입, 등록, 수정)은 header-sub만 있고 아래 탭이 없다.
- 사람은 avatar-initial(원 안 닉네임 첫 글자) + 닉네임으로만 보인다.
- 대표 사진은 사물과 공간만. 후기 사진은 참여자의 손까지 보일 수 있고 얼굴은 없다. 어느 사진이든 읽을 수 있는 글자·로고는 없다. 사진이 없으면 category-art(카테고리 soft 바탕 + 카테고리 색 선 아이콘).
- 카테고리 색은 카테고리를 알아보는 곳(카테고리 그림, 카드의 카테고리 이름과 점, 홈 바로가기, 상세 대표 그림)에만 쓴다.
- 연한 바탕 위 흰 카드는 테두리 대신 shadow-card, 누르거나 쓰는 부품(버튼·입력칸·칩)은 테두리.
- 목록·히어로·후기 묶음에는 정렬·선정 기준 문구를 함께 적는다.
- 글자 대비는 4.5:1 이상(누를 수 없는 버튼 글자는 예외), 누를 수 있는 것은 44×44px 이상.
- Light mode만 쓴다.

**Don't**
- primary 바탕 위 흰 글자.
- 하트, 찜, 북마크, 좋아요.
- 별점과 평점 숫자. 호스트 평가는 점수 하나로 합치지 않고 host-stats 네 칸으로 보여 준다.
- 홍보 꼬리표, 할인 라벨, 추천 배지, trust-label 말고 다른 등급·레벨 배지.
- 자동으로 넘어가는 배너, 캐러셀. 홈 히어로는 사진 카드 하나.
- 지도, 1:1 채팅, 알림 종 아이콘.
- 위쪽 검색창. 찾기는 탭과 필터 바텀시트로 한다.
- 공유 버튼, 비용 상세 내역, 팔로워·팔로잉 수.
- 다크 모드, 12px보다 작은 글자, 위에 정의되지 않은 새 컴포넌트 모양(새 정보 블록은 C5 세 모양 중 하나).
