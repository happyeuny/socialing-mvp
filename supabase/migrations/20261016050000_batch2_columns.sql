-- MS14 기능 2묶음 칸 (architecture 3.1, spec 6장): 참가비 설명(U3), 연령 조건(SH1b), 자료 링크(SH3), 거절 사유(U10)
-- 마이그레이션은 추가만(AGENTS.md): 모두 null 가능한 새 칸이라 main 코드의 읽기·쓰기는 그대로 동작한다.
-- "유료면 설명 필수", "호스트 승인이면 승인 기준 필수"는 테이블에 걸지 않는다. 이미 있는 행과 테스트 소셜링이 있어서
-- 등록·수정 함수(create_socialing_v2·update_socialing_v2)가 막는다.

-- 거절 사유 (U10, spec 8.8 O04): 승인 기준과 맞지 않아요 / 연령 조건과 맞지 않아요 / 정원이 다 찼어요 /
-- 호스트 사정으로 함께하기 어려워요 / 그 밖의 이유
create type public.reject_reason as enum ('criteria', 'age', 'full', 'host', 'other');

-- 신고 사유 (SH4b, spec 8.9 P03 신고 시트): 종교 활동이나 영업 권유 / 앱에 적힌 금액 외 돈 요구 /
-- 스태프가 참가자인 척 / 호스트의 원치 않는 연락이나 만남 요구 / 그 밖의 문제
create type public.report_reason as enum ('solicitation', 'extra_money', 'fake_participant', 'unwanted_contact', 'other');

alter table public.socialings
  add column fee_note text,
  add column min_age integer,
  add column max_age integer,
  add column material_url text,
  add constraint socialings_fee_note_length check (char_length(fee_note) <= 100),
  add constraint socialings_min_age_range check (min_age between 1 and 99),
  add constraint socialings_max_age_range check (max_age between 1 and 99),
  add constraint socialings_age_order check (min_age <= max_age),
  add constraint socialings_material_url_length check (char_length(material_url) <= 500);

alter table public.applications
  add column reject_reason public.reject_reason,
  add column reject_note text,
  add constraint applications_reject_note_length check (char_length(reject_note) <= 100);
