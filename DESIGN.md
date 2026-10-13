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
  border-divider: "#F3F4F6"
  border-strong: "#136F86"
  toggle-off: "#8A94A3"
  danger: "#C62828"
  danger-soft: "#FEE2E2"
  danger-border-soft: "#FCA5A5"
  status-ended: "#637077"
  toast-bg: "#1F292E"
  toast-text: "#FFFFFF"
  dim: "rgba(0, 0, 0, 0.5)"
typography:
  title-xl:
    fontFamily: Noto Sans KR
    fontSize: 22px
    fontWeight: 700
    lineHeight: 28px
  title-lg:
    fontFamily: Noto Sans KR
    fontSize: 18px
    fontWeight: 700
    lineHeight: 24px
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
  status-badge-host-cancelled:
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
    backgroundColor: "{colors.border-default}"
    height: 1px
  avatar-initial:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.text-secondary}"
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

하늘색 primary 하나를 중심으로, 살짝 푸른 뉴트럴과 단 한 가지 따뜻한 point 색을 쓴다. 대비는 WCAG 2.x 공식으로 잰 값이다(본문 글자 기준 4.5:1, 부품 경계 3:1).

| 역할 | Hex | 쓰는 곳 | 대비 |
|---|---|---|---|
| primary | #59CBE8 | 주 버튼 채움, 확정 배지 채움 | 흰 글자와 1.9:1이라 흰 글자 금지 |
| primary-pressed | #47BBD8 | 주 버튼 눌림 | on-primary와 7.1:1 |
| on-primary | #0B2530 | primary·primary-pressed 위 글자와 아이콘 (유일하게 허용) | primary와 8.4:1 |
| primary-strong | #136F86 | 흰·연한 바탕 위 링크, 테두리 배지·버튼, 활성 탭, 선택된 칩 글자, 머리글 아바타 바탕 | 흰 5.8:1, primary-soft 5.2:1 |
| primary-soft | #E1F7FC | 선택된 칩·행 바탕, "참여 확정" 칩 바탕, 사진 없는 카드의 카테고리 그림 바탕 (Stitch 이름 primary-container) | - |
| point | #F5A623 | trust-label, count-pill 두 곳에만 | - |
| on-point | #2A1C00 | point 위 글자 | point와 8.2:1 |
| surface | #FFFFFF | 카드, 창, 바텀시트, 머리글, 아래 탭 | - |
| surface-bg | #F4FAFF | 페이지 배경 | - |
| surface-muted | #F5F7F9 | 칩 기본 바탕, 상태 상자, 스켈레톤, 비활성 바탕 | - |
| text-primary | #111827 | 제목, 본문 | 흰 17.7:1 |
| text-secondary | #4B5563 | 보조 설명, 라벨, 카드 메타 | 흰 7.6:1, surface-muted 7.0:1 |
| text-muted | #6B7280 | 힌트, 플레이스홀더, 글자 수, 비활성 탭 글자, "신청 취소" 칩 | 흰 4.8:1, surface-muted 4.5:1 |
| text-disabled | #9CA3AF | 누를 수 없는 버튼·링크 글자에만 (WCAG 예외) | 흰 2.5:1 |
| border-default | #E5E7EB | 카드·버튼·입력칸 기본 테두리, 머리글·아래 탭·apply-bar 경계선(edge-line) | - |
| border-divider | #F3F4F6 | 목록 행 사이, 카드 안 구분선 (장식용, 부품 경계에 쓰지 않음) | - |
| border-strong | #136F86 | 포커스된 입력칸, 선택된 칩·행 테두리 | - |
| toggle-off | #8A94A3 | 꺼진 토글 바탕 | 흰 3.1:1 |
| danger | #C62828 | 호스트 취소, 거절, 오류 글자와 테두리 | 흰 5.6:1, danger-soft 4.6:1 |
| danger-soft | #FEE2E2 | 오류·취소 상태 바탕 | - |
| danger-border-soft | #FCA5A5 | 사진 올리기 실패 상자 테두리 | - |
| status-ended | #637077 | 종료 배지 글자 | 흰 5.1:1, surface-muted 4.8:1 |
| toast-bg | #1F292E | 짧은 안내(토스트) 바탕 | - |
| toast-text | #FFFFFF | 토스트 글자. 토스트 안 링크는 primary | 14.8:1, 링크 7.9:1 |
| dim | rgba(0,0,0,0.5) | 창·바텀시트 뒤 어둡게 | - |

## Typography

글꼴은 **Noto Sans KR** 하나를 앱에 넣어(npm 글꼴 패키지, docs/architecture.md 1장) 모든 기기에서 같게 보이게 한다. 대체 글꼴 순서: Noto Sans KR → system-ui → -apple-system → sans-serif. Pretendard는 쓰지 않는다.

| 토큰 | 크기 / 줄 높이 / 굵기 | 쓰는 곳 |
|---|---|---|
| title-xl | 22 / 28 / 700 | 화면 제목, 상세 제목 |
| title-lg | 18 / 24 / 700 | 시트·창 제목, 히어로 제목 |
| title-md | 16 / 22 / 600 | 묶음 제목, 카드 제목 |
| body-lg | 15 / 22 / 500 | 버튼 글자, 입력값 |
| body-long | 15 / 24 / 400 | 소개, 후기 본문처럼 여러 줄인 글 |
| body-md | 14 / 20 / 400 | 기본 본문, 카드 메타, 링크 |
| body-sm | 13 / 18 / 400 | 기준 문구, 도움말, 오류 이유 |
| label | 12 / 16 / 500 | 상태 배지, 꼬리표, 칩, 숫자, 아래 탭 글자 |

12px보다 작은 글자는 쓰지 않는다.

## Layout

- 폭 390px, 좌우 여백 16px(page-x). 간격은 8의 배수, 미세 조정만 4px.
- 누를 수 있는 것은 최소 44×44px(touch-min).
- 메인 탭 화면(홈, 탐색, 인증 후기, 내 소셜링): 위 header-main(56px) + 아래 tab-bar(64px).
- 하위 화면(상세, 관리, 후기 쓰기, 로그인, 가입, 등록, 수정, 지난 소셜링): 위 header-sub(56px), 아래 탭 없음.
- 창(O01~O05)은 화면이 아니라 화면 위에 뜬다. 신청하는 사람 쪽 창(필터 O01, 신청 확인 O02, 등급 조건 O03, 신청 취소 확인 O05)은 bottom-sheet, 호스트 동작 확인(O04)은 가운데 dialog.
- 소셜링 상세는 맨 아래에 apply-bar가 붙어 있고, 내용은 그 높이만큼 아래 여백을 둔다.
- 목록 묶음 순서: section-header(제목 + "전체 보기 ›" + 기준 문구) → 카드 목록, 카드 사이 12px.

## Elevation & Depth

그림자보다 바탕 색 차이와 테두리로 층을 나눈다. 페이지(surface-bg) 위에 흰 카드(surface, border-default 1px)를 놓는다. 그림자는 화면 위에 뜨는 것에만 쓴다: 창·바텀시트(뒤를 dim으로 어둡게), 토스트, apply-bar(위쪽 테두리 1px + 아주 옅은 위쪽 그림자).

## Shapes

| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| xs | 4px | status-tag, verified-badge |
| sm | 6px | 지금 쓰는 곳 없음 (남겨 둔 단계) |
| md | 8px | segmented |
| lg | 12px | 버튼, 입력칸, 사진 고르기 칸, 짧은 후기 카드, 안내 상자, 호스트 기록 칸, 토스트 |
| xl | 16px | 소셜링 카드, 전체 후기 카드, 창 |
| 2xl | 20px | 홈 히어로 카드, 바텀시트 위 모서리 |
| full | 9999px | 칩, status-badge, application-chip, trust-label, count-pill, 토글, avatar-initial |

## Components

이름은 `컴포넌트/변형/상태` 형식이고, 개발 코드에서도 이 이름을 그대로 쓴다 (예: `status-badge/recruiting` → `<StatusBadge status="recruiting" />`, 파일 `components/…/status-badge.tsx`). 화면 ID(P11, O04 등)는 [docs/spec.md](docs/spec.md) 8.2. 색은 위 Colors의 역할 이름이다. 아래에 없는 모양을 새로 만들지 않는다.

### C1 기본 컴포넌트

**button** — 높이 lg 52 / md 48 / sm 36, 좌우 여백 lg 20 / md 16 / sm 12, 모서리 lg, 글자 lg·md는 body-lg, sm은 body-md. sm은 보이는 높이만 36이고 누르는 영역은 위아래로 넓혀 44px를 지킨다. 로딩 상태는 작은 스피너 + "처리 중…"이고 다시 누를 수 없다.

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

**text-field** — 위에 라벨(body-sm, text-secondary), 높이 48, 모서리 lg, 좌우 16.

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| text-field/default | surface 바탕, border-default 1px | 입력 전 |
| text-field/focused | primary-strong 테두리 2px | 입력 중 |
| text-field/filled | default와 같음, 값 표시 | 입력 뒤 |
| text-field/error | danger 테두리 1.5px + 칸 아래 오류 아이콘과 이유(body-sm, danger) | "이미 쓰는 닉네임이에요" |
| text-field/locked | surface-muted 바탕, text-secondary 글자, 자물쇠 아이콘 + 이유 | 수정 화면에서 "참여 확정자가 있어 바꿀 수 없어요" |

**textarea** — 최소 높이 120, 안쪽 여백 14·16, 오른쪽 아래 글자 수.

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| textarea/normal | text-field/default와 같은 테두리, 글자 수 text-muted "120 / 500 · 10자 이상" | 후기 글, 소셜링 소개 |
| textarea/error | danger 테두리 1.5px, 글자 수 danger "520 / 500" | 10자 미만이거나 500자 초과 |

**photo-picker** — 높이 96, 모서리 lg. 사진은 1장.

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| photo-picker/empty | surface 바탕, border-default 점선 1.5px, + 아이콘 "사진 선택 · 1장" | 사진 고르기 전 |
| photo-picker/selected | 썸네일 + 지우기 X | 사진 고른 뒤 |
| photo-picker/uploading | primary-soft 바탕, primary-strong 글자, 진행 막대 | 올리는 중 |
| photo-picker/failed | danger-soft 바탕, danger-border-soft 테두리, "사진을 올리지 못했어요" + sm 버튼 "다시 고르기" · "사진 없이 올리기" | 올리기 실패 (글은 그대로 올릴 수 있음) |

**칩과 선택 부품**

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| filter-chip/default | surface 바탕, text-primary, border-default 1px, 높이 36, 모서리 full, "카테고리 ⌄" | 탐색 필터 칩 (값 없음) |
| filter-chip/selected | primary-soft 바탕, primary-strong 글자와 테두리 1.5px, 고른 값 표시 "강남점 ⌄" | 값이 적용된 필터 칩 |
| choice-chip/off | surface 바탕, text-secondary, border-default 1px | 여러 개 고르는 칩 (카테고리) |
| choice-chip/on | primary-soft 바탕, primary-strong 글자와 테두리 1.5px | 고른 칩 |
| segmented/date-filter/selected | surface-muted 틀(모서리 md, 높이 40), 고른 칸은 surface + border-default | 날짜 하나 고르기 "전체 · 오늘 · 이번 주 · 이번 주말" |
| segmented/binary/unanswered | surface-muted 틀(높이 44), 고른 칸 없음 | 비공개 질문 예/아니오, 아직 답 안 함 |
| segmented/binary/selected | 고른 칸 surface + text-primary 테두리 1.5px | 예 또는 아니오를 고름 |
| question-block/unanswered | 질문 글(body-md, text-primary) + 아래 segmented/binary/unanswered, 묶음 사이 16 | 후기 쓰기(P09)의 비공개 질문 3개 |
| question-block/answered | 질문 글 + segmented/binary/selected | 답한 질문 |
| segmented/with-counts/selected | 고른 칸 글자 primary-strong, 나머지 text-secondary | 소셜링 관리(P11) 신청자 탭 "승인 대기 2 · 참여 확정 4 · 거절·취소 1" |
| toggle/off | toggle-off 바탕, 흰 손잡이, 48×28 | "파티·사교 숨기기" 꺼짐 (기본) |
| toggle/on | primary-strong 바탕, 흰 손잡이 | 켜짐 |
| radio-row/off | surface 바탕, border-default 1px, 높이 52, 모서리 lg | 장소 하나 고르기 "강남점 (서울 강남구)" |
| radio-row/on | primary-soft 바탕, primary-strong 글자와 테두리 1.5px | 고른 행 |

### C2 상태 표시와 카드

**status-badge** — 소셜링의 상태. 소셜링마다 정확히 하나. 높이 24, 모서리 full(알약), 글자 label, 여백 4·10.

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| status-badge/recruiting | surface 바탕, primary-strong 글자, primary-strong 테두리 1px | "모집중" |
| status-badge/confirmed | primary 바탕, on-primary 글자 | "확정": 호스트가 확정 버튼을 누른 소셜링 (최소 인원 조건은 없음) |
| status-badge/ended | surface-muted 바탕, status-ended 글자 | "종료": 호스트가 종료 버튼을 누른 소셜링. 소셜링 일시가 지나도 자동으로 종료되지 않는다 |
| status-badge/host-cancelled | danger-soft 바탕, danger 글자 | "호스트 취소" |

**status-tag** — 신청할 수 없는 이유. 상태가 아니라 계산 값. status-badge 오른쪽에 최대 하나. surface-muted 바탕, text-secondary 글자, 높이 22, 모서리 xs.

| 이름 | 쓰는 곳 |
|---|---|
| status-tag/closed | "신청 마감": 신청 마감 일시가 지남. 정원도 찼으면 이 꼬리표 하나만 |
| status-tag/full | "정원 마감": 참여 확정 인원이 정원과 같음 |

허용되는 조합 8가지: 모집중 · 모집중+신청 마감 · 모집중+정원 마감 · 확정 · 확정+신청 마감 · 확정+정원 마감 · 종료 · 호스트 취소.

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
| trust-label/default | point 바탕, on-point 글자, 높이 24, 모서리 full, "믿고 가는 호스트 ⓘ" | 기준이 공개된 등급 라벨. 조건: 최근 6개월 열린 소셜링 5회 이상 + 호스트 취소 0회 + 소개 일치 90% 이상. 누르면 bottom-sheet/trust-criteria(O03) |
| count-pill/pending | point 바탕, on-point 글자, 높이 20, 모서리 full, "2" | 승인 대기 건수 (상세 "관리하기", 내 소셜링 호스트 카드) |

**사람과 인증 표시**

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| verified-badge/default | surface-muted 바탕, text-secondary, 높이 22, 모서리 xs, "✓ 참여 인증" | 참여를 마친 사람이 쓴 후기 |
| avatar-initial/default | surface-muted 원 안에 닉네임 첫 글자(text-secondary). 크기 20 · 32 · 40 · 48 | 카드 메타 20, 후기 카드 32, 신청자 행·상세 호스트 40, 내 소셜링 프로필 48. 프로필 사진은 없다 |
| avatar-initial/strong | primary-strong 원 안에 흰 글자, 28 | 로그인한 머리글 오른쪽 |
| host-profile-row/default | 높이 52. avatar-initial 40 + "호스트"(body-md, text-secondary) + 닉네임(title-md) + 조건을 채운 호스트만 trust-label | 상세 제목 아래 호스트 한 줄 |
| profile-row/default | avatar-initial 48 + 닉네임(title-md), 오른쪽 "로그아웃"(body-md, text-secondary, 누르는 영역 44) | 내 소셜링(P06) 맨 위 |

**카드**

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| socialing-card/photo | surface, border-default 1px, 모서리 xl, 여백 16. 왼쪽 96px 정사각 사진(모서리 lg), 오른쪽 위에서부터: status-badge(+status-tag), 제목 1줄 말줄임(title-md), "카테고리 · 술 여부", "일시 · 장소", avatar-initial 20 + "호스트 · 4/8명 · 총 참가비"(닉네임과 총 참가비는 text-primary) | 홈·탐색·지난 소셜링 목록 |
| socialing-card/no-photo | 왼쪽 칸이 primary-soft 바탕 + 카테고리 선 아이콘 | 대표 사진이 없을 때 |
| socialing-card/my-application | photo 카드 + application-chip. 후기를 쓸 수 있으면(참여 확정 + 종료 + 아직 안 씀) sm primary "후기 쓰기" | 내 소셜링 "신청한 소셜링" 탭 |
| socialing-card/host | photo 카드 + "승인 대기" count-pill + "소셜링 관리 ›" | 내 소셜링 "호스트인 소셜링" 탭 |
| hero-card/default | 대표 사진 전체, 아래쪽 어두운 그라데이션 위 흰 글자, 모서리 2xl, 여백 20, 최소 높이 280. 왼쪽 위 작은 라벨 "지금 신청할 수 있는 가장 가까운 소셜링", 아래 status-badge, 제목, 일시 · 장소, 호스트 · 참가자 · 총 참가비 | 홈 맨 위 1개. 넘기는 배너가 아니다. 카드 아래 기준 문구(body-sm) |
| review-card/compact | surface, border-default 1px, 모서리 lg, 여백 14·16. "닉네임 · 날짜 · 소셜링 제목" + 글 2줄 | 홈 "최근 인증 후기" |
| review-card/full-no-photo | surface, 모서리 xl, 여백 16. avatar-initial 32, 닉네임, 날짜, verified-badge, 소셜링 제목 링크 "주말 아침 독서 토론 ›", 글(body-long) | 인증 후기 목록 |
| review-card/full-with-photo | full-no-photo + 4:3 사진(모서리 lg) | 사진이 있는 후기 |

**호스트 기록과 상세 정보**

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| host-stats/normal | 위 문구 "최근 6개월 기록 · 별점이나 점수로 합치지 않아요", 2×2 칸(surface, border-default, 모서리 lg): 열린 소셜링 · 호스트 취소 · 소개 일치(응답 수) · 후기 | 상세의 호스트 영역 |
| host-stats/new-host | surface-muted 상자, "새 호스트 · 기록이 쌓이면 숫자로 보여 줘요" | 열린 소셜링 3회 미만 |
| host-stats/ratio-hidden | normal과 같고 소개 일치 칸만 "응답 5건 이상부터 보여요" | 응답 5건 미만 |
| host-stats/load-failed | "기록을 불러오지 못했어요" + text-link "다시 시도" | 기록만 실패 (상세와 신청은 그대로 동작) |
| progress-steps/current-recruiting | 모집중 → 확정 → 종료 세 점, 지금 단계만 text-primary 굵게 | 소셜링 관리(P11), 모집중. 상세에는 쓰지 않고 status-badge만 (시안) |
| progress-steps/current-confirmed | 확정이 지금 단계 | 호스트가 확정한 뒤 |
| progress-steps/done-ended | 종료까지 모두 지남 | 호스트가 종료한 뒤 |
| progress-steps/host-cancelled | 세 점 흐리게 + danger "호스트 취소" | 호스트 취소 |
| applicant-row/pending | surface, 아래 구분선, 높이 72. avatar-initial 40, "서윤", "10/12 오전 8:40 신청", sm secondary "거절" + sm primary "승인" | 소셜링 관리 승인 대기 탭 |
| applicant-row/approve-disabled | 승인 버튼 disabled + 이유: "정원이 차서 승인할 수 없어요" 또는 "소셜링 일시가 지나 승인할 수 없어요" | 승인할 수 없을 때 |
| applicant-row/accepted | 높이 64, application-chip/accepted | 참여 확정 탭 |
| applicant-row/rejected | 높이 64, application-chip/rejected 또는 withdrawn | 거절·취소 탭 |
| info-list/default | 라벨·값 행, 행 사이 border-divider 1px. 소셜링 일시 · 신청 마감 · 장소 · 총 참가비 · 모집 방식 · 인원("참가자 4/8명 · 스태프 1명" + "스태프는 정원에 세지 않아요") | 상세 정보 |
| section-header/default | 제목 title-md, 오른쪽 text-link "전체 보기 ›", 아래 기준 문구 body-sm text-secondary | 홈·목록 묶음 머리 ("기준: 가까운 일시 순") |
| notice-box/feed-criteria | surface-muted 바탕, text-secondary, 모서리 lg, 여백 14·16 | 호스트 승인 기준 등 안내 |
| notice-box/lock-privacy | feed-criteria + 자물쇠 아이콘 | "개별 응답은 호스트를 포함해 누구에게도 보이지 않아요" |

### C3 탐색과 피드백

| 이름 | 모양 | 쓰는 곳 |
|---|---|---|
| header-main/logged-out | surface, 아래 border-default, 높이 56. 왼쪽 "문화소셜링"(누르면 홈), 오른쪽 sm secondary "로그인" | 메인 탭 화면, 비로그인 |
| header-main/logged-in | 오른쪽 avatar-initial/strong 28 (누르면 내 소셜링) | 메인 탭 화면, 로그인 |
| header-sub/default | 뒤로 아이콘 + 제목 ("소셜링 상세") | 하위 화면 |
| header-sub/with-action | default + 오른쪽 text-link ("상세 보기 ›") | 소셜링 관리 |
| tab-bar/active-home · active-explore · active-review · active-mysocialing | surface, 위 border-default, 높이 64, 4칸 선 아이콘 + 글자 "홈 · 탐색 · 후기 · 내 소셜링". 활성 primary-strong 굵게, 비활성 text-muted | 메인 탭 화면 아래 |
| top-tabs/active-applied · active-hosted | 높이 48, 활성 탭 아래 2px text-primary 밑줄, 비활성 text-muted. "신청한 소셜링 / 호스트인 소셜링" | 내 소셜링 |
| toast/success | toast-bg, toast-text, 링크 primary, 모서리 lg, 여백 12·16. "신청했어요" + "내 소셜링에서 보기 ›" | 성공 뒤 짧은 안내 |
| toast/info | toast-bg, toast-text | "호스트만 볼 수 있어요" 같은 안내 |
| dialog/confirm | surface, 모서리 xl, 여백 20, 뒤 dim. 제목 + 본문 + secondary "돌아가기" + primary 행동 | 호스트 동작 확인(O04)의 확정·종료: "확정할까요? 확정하면 되돌릴 수 없어요." |
| dialog/confirm-danger | confirm과 같고 행동 버튼이 button/danger/default | O04의 호스트 취소·거절: "호스트 취소할까요?" |
| dialog/result | 버튼 하나 primary "확인" | 결과 안내: "신청하지 못했어요 · 방금 정원이 찼어요" |
| bottom-sheet/confirm-apply | surface, 위 모서리 2xl, 손잡이 36×4, 뒤 dim. 제목 + 소셜링 요약(제목·일시·장소·총 참가비) + notice-box 승인 기준(있을 때) + 결과 안내 + 결제 안내 문구, 아래 secondary "돌아가기" + primary "신청하기" (문구는 docs/spec.md M7) | 신청 확인(O02) |
| bottom-sheet/trust-criteria | bottom-sheet와 같은 틀. 제목 "믿고 가는 호스트", 조건 3행(조건 · 이 호스트의 실제 값 · 채움 ✓), 닫기 | 등급 조건(O03) |
| bottom-sheet/confirm-cancel-application | bottom-sheet와 같은 틀. 제목 "신청을 취소할까요?", 선착순일 때만 본문 "취소하면 다른 사람이 자리를 채울 수 있어요.", 버튼 secondary "돌아가기" + danger "신청 취소" | 신청 취소 확인(O05), 상세에서 "신청 취소"를 누를 때 |
| bottom-sheet/filter-sheet | surface, 위 모서리 2xl, 손잡이 36×4, 제목 + 닫기 X, 스크롤 내용, 아래 고정 secondary "초기화" + primary "소셜링 4개 보기" | 탐색 필터(O01) |
| empty-state/filter-no-results | 48px 원(surface-muted) 아이콘, 제목 title-md, 설명 body-sm, secondary "필터 초기화", 여백 48·20 | "조건에 맞는 소셜링이 없어요" |
| empty-state/no-applications | 아이콘 원 primary-soft, primary "탐색하기" | "아직 신청한 소셜링이 없어요" (다른 빈 화면도 이 모양에 글과 버튼만 바꿈) |
| error-state/full | 아이콘 원 danger-soft, "불러오지 못했어요", "연결을 확인하고 다시 시도해 주세요", primary "다시 시도" + text-link "홈으로" | 화면 전체 실패 |
| error-state/inline | surface-muted, border-default 점선, 모서리 lg, 여백 16, sm secondary "다시 시도" | 묶음 하나만 실패 ("후기를 불러오지 못했어요") |
| error-state/not-found | 아이콘 원 surface-muted, "찾을 수 없는 소셜링이에요", "주소가 맞는지 확인해 주세요", primary "탐색으로" + text-link "홈으로" | 없는 소셜링 주소 |
| skeleton/card-list | surface-muted 덩어리: 96px 정사각 + 글 막대 3개, 2개 | 목록 로딩 |
| skeleton/detail | 4:3 사진 칸 + 제목 막대 + 정보 줄 | 상세 로딩 |

### C4 상세 아래 고정 영역 (apply-bar)

소셜링 상세 맨 아래에 붙는 영역. 아래 14가지 중 **정확히 하나**만 보인다. 어떤 것을 고를지는 [docs/spec.md](docs/spec.md) 8.4의 순서표가 정한다: 표의 위에서부터 먼저 맞는 줄 하나.

공통: surface 바탕, 위 border-default 1px, 여백 12·16, 높이 약 100(아이폰 아래 안전 영역 포함). 안내 한 줄(body-sm) + 버튼은 lg 하나까지. 상태 상자는 surface-muted 바탕, 모서리 lg.

| 이름 | spec 8.4 줄 | 모양 |
|---|---|---|
| apply-bar/host-manage | 1 (승인 대기 없음) | 안내 "내가 연 소셜링이에요" + primary "관리하기" |
| apply-bar/host-manage-pending | 1 (승인 대기 있음) | 같은 안내 + primary "관리하기 · 승인 대기" + count-pill "2" |
| apply-bar/host-cancelled | 2 | button/danger/disabled "호스트 취소" + 안내 "호스트가 취소한 소셜링이에요" + text-link "다른 소셜링 보기 ›" |
| apply-bar/review-write | 3 | 안내 "소셜링이 끝났어요" + primary "후기 쓰기" |
| apply-bar/review-done | 4 | 상태 상자 "✓ 후기 작성 완료" |
| apply-bar/wait-end | 5 | 상태 상자 "참여 확정 · 소셜링 일시가 지났어요" + 안내 "호스트가 종료하면 후기를 쓸 수 있어요" |
| apply-bar/not-confirmed | 6 | 같은 상자 + 안내 "호스트가 확정하지 않은 소셜링이라 후기를 쓸 수 없어요" |
| apply-bar/pending-cancel | 7 (승인 대기) | application-chip/pending + "호스트가 승인하면 참여 확정돼요" + secondary "신청 취소" → bottom-sheet/confirm-cancel-application |
| apply-bar/accepted-cancel | 7 (참여 확정) | application-chip/accepted + "10/14(화) 오후 7:30에 만나요" + secondary "신청 취소" → bottom-sheet/confirm-cancel-application |
| apply-bar/pending-expired | 8 | application-chip/pending + 상태 상자 "소셜링 일시가 지났어요" + 안내 "호스트가 응답하지 않았어요" |
| apply-bar/reapply | 9 | application-chip/rejected 또는 withdrawn(실제 상태) + "자리가 남아 있어 다시 신청할 수 있어요" + primary "다시 신청" |
| apply-bar/closed-after-application | 10 | application-chip/rejected 또는 withdrawn + 신청할 수 없는 이유(예: "신청 마감 일시가 지나 다시 신청할 수 없어요") + text-link "다른 소셜링 보기 ›" |
| apply-bar/apply | 11, 12 | 모집 방식 안내 + primary "신청하기". 호스트 승인: "신청하면 호스트가 승인한 뒤 참여가 확정돼요". 선착순: "신청하면 바로 참여가 확정돼요" |
| apply-bar/closed | 13 | button/primary/disabled + 이유 + text-link "다른 소셜링 보기 ›". 버튼·이유: "정원 마감" / "참여 확정 인원이 정원에 찼어요", "신청 마감" / "신청 마감 일시가 지났어요", "지난 소셜링" / "소셜링 일시가 지났어요" |

### 시안과 다르게 정한 것

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
| 지난 소셜링(P02) 시안의 배지가 네모에 가깝고 모집중이 연한 하늘 바탕, 카드 안 호스트 줄 위에 구분선 | 모든 목록이 같은 status-badge(알약, 모집중은 흰 바탕 + 테두리)와 같은 socialing-card | 배지 모양은 10-13 결정, 카드는 화면마다 같게 |

## Do's and Don'ts

**Do**
- primary(#59CBE8) 위 글자와 아이콘은 언제나 on-primary(#0B2530)를 쓴다.
- 흰·연한 바탕 위 하늘색 글자, 링크, 테두리는 primary-strong(#136F86)을 쓴다.
- point(#F5A623)는 trust-label과 count-pill 두 곳에만 쓴다. 특정 소셜링 카드를 눈에 띄게 하는 데 쓰지 않는다.
- 소셜링마다 status-badge 정확히 하나, 그 오른쪽에 status-tag("신청 마감" 또는 "정원 마감") 최대 하나. 둘 다 해당하면 "신청 마감".
- 개인의 신청 상태는 application-chip, 소셜링 상태는 status-badge로 나눈다. 둘 다 알약 모양이라 글자로 구분하고, 같이 놓이면 status-badge가 앞.
- 소셜링 상세의 아래 고정 영역은 언제나 apply-bar 14가지 중 하나다.
- 메인 탭 화면(홈, 탐색, 인증 후기, 내 소셜링)은 header-main + tab-bar, 하위 화면은 header-sub이고 아래 탭이 없다.
- 사람은 avatar-initial(원 안 닉네임 첫 글자) + 닉네임으로만 보인다.
- 사진은 사물과 공간(책, 스터디룸, 노트북)만. 사람·읽을 수 있는 글자·로고가 없는 사진. 사진이 없으면 primary-soft 바탕 + 카테고리 선 아이콘.
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
- 다크 모드, 12px보다 작은 글자, 위에 정의되지 않은 새 컴포넌트 모양.
