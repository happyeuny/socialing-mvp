-- MS15 기능 3묶음 칸 (U4, architecture 3.1, spec 2·6장): 최소 인원, 확정 기한
-- 마이그레이션은 추가만(AGENTS.md): 새 칸은 기본값이 있거나 이미 있는 값으로 채워서, main 코드의 읽기는 그대로 동작한다.
--   min_participants     최소 인원. 참여 확정이 이 인원 이상이어야 호스트가 확정할 수 있다. 2명부터 정원까지(스태프는 세지 않음)
--   confirm_deadline_at  확정 기한. 이때까지 호스트가 확정하지 않으면 보이는 상태가 취소로 계산된다(저장하지 않음, 예약 작업 없음).
--                        신청 마감 ≤ 확정 기한 ≤ 소셜링 일시. "소셜링 일시 12시간 전까지"는 이미 있는 행 때문에 등록·수정 함수(_v3)에서만 본다
-- 이미 있는 소셜링의 확정 기한은 신청 마감 값으로 채운다(확정 대기 없이 마감 때 정해지는 것과 같다).
-- 이미 있는 행의 정원은 2명 이상이라 최소 인원 기본값 2가 제약을 통과한다.

alter table public.socialings
  add column min_participants integer not null default 2,
  add column confirm_deadline_at timestamptz,
  add constraint socialings_min_participants_range check (min_participants >= 2 and min_participants <= capacity);

update public.socialings set confirm_deadline_at = apply_deadline_at;

alter table public.socialings
  alter column confirm_deadline_at set not null,
  add constraint socialings_confirm_deadline_order
    check (apply_deadline_at <= confirm_deadline_at and confirm_deadline_at <= starts_at);
