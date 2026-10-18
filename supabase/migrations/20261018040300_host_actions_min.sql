-- MS15 버튼 함수에 최소 인원·확정 기한 검사를 더한다 (U4, architecture 5장, spec 3.1·3.3·M8·8.8)
-- 같은 이름·같은 인자·같은 돌려주는 칸(create or replace)이라 main 코드의 호출은 그대로다. 새 오류 코드:
--   MIN_NOT_MET    참여 확정이 최소 인원보다 적어 확정할 수 없다 (결정 H4)
--   AUTO_CANCELED  보이는 상태가 계산으로 취소·호스트 취소다(최소 인원 미달, 확정 기한까지 확정하지 않음). 모든 동작을 막는다
-- 모집중 소셜링은 확정 기한이 지나면 늘 계산으로 취소(또는 호스트 취소)라, 확정 기한 뒤의 확정·승인·거절은 AUTO_CANCELED로 막힌다.
-- 발표 DB 실제 실행과 dev → main 병합 사이 몇 분 동안 main 코드가 새 코드를 받으면 일반 오류 문구를 보인다(04 8.1, 받아들임).
--
-- 같은 파일에서: decide_application의 옛 거절 길(p_approve = false)을 지운다. 거절은 사유를 받는 reject_application(MS14)만 쓴다.

-- 확정: 모집중(확정 대기 포함), 확정 기한 전, 참여 확정 ≥ 최소 인원
create or replace function public.confirm_socialing(p_socialing_id bigint)
returns public.socialings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_socialing public.socialings;
  v_accepted_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHENTICATED';
  end if;

  select * into v_socialing
  from public.socialings
  where id = p_socialing_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  if v_socialing.host_id <> v_user_id then
    raise exception using errcode = 'P0001', message = 'NOT_HOST';
  end if;

  if v_socialing.status <> 'recruiting' then
    raise exception using errcode = 'P0001', message = 'INVALID_STATE';
  end if;

  if public.socialing_display_status(p_socialing_id) in ('host_canceled', 'auto_canceled') then
    raise exception using errcode = 'P0001', message = 'AUTO_CANCELED';
  end if;

  -- 확정 기한 ≤ 소셜링 일시라 위에서 이미 막히지만, 규칙(소셜링 일시 전)을 그대로 둔다
  if now() >= v_socialing.starts_at then
    raise exception using errcode = 'P0001', message = 'STARTED';
  end if;

  select count(*) into v_accepted_count
  from public.applications
  where socialing_id = p_socialing_id
    and status = 'accepted';

  if v_accepted_count < v_socialing.min_participants then
    raise exception using errcode = 'P0001', message = 'MIN_NOT_MET';
  end if;

  update public.socialings
  set status = 'confirmed',
      confirmed_at = now()
  where id = p_socialing_id
  returning * into v_socialing;

  return v_socialing;
end;
$$;

-- 승인: 확정 소셜링은 소셜링 일시 전까지(그대로), 모집중은 확정 기한 전까지(확정 대기 중에도 됨). 옛 거절 길은 지운다
create or replace function public.decide_application(p_application_id bigint, p_approve boolean)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_socialing_id bigint;
  v_socialing public.socialings;
  v_application public.applications;
  v_accepted_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHENTICATED';
  end if;

  -- 승인만 받는다. 거절(p_approve = false)은 거절 사유를 받는 reject_application으로 (MS15에서 옛 길을 지움)
  if p_approve is not true then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select socialing_id into v_socialing_id
  from public.applications
  where id = p_application_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select * into v_socialing
  from public.socialings
  where id = v_socialing_id
  for update;

  if v_socialing.host_id <> v_user_id then
    raise exception using errcode = 'P0001', message = 'NOT_HOST';
  end if;

  select * into v_application
  from public.applications
  where id = p_application_id
  for update;

  if v_socialing.status not in ('recruiting', 'confirmed') then
    raise exception using errcode = 'P0001', message = 'INVALID_STATE';
  end if;

  if public.socialing_display_status(v_socialing_id) in ('host_canceled', 'auto_canceled') then
    raise exception using errcode = 'P0001', message = 'AUTO_CANCELED';
  end if;

  if v_application.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'ALREADY_PROCESSED';
  end if;

  if now() >= v_socialing.starts_at then
    raise exception using errcode = 'P0001', message = 'STARTED';
  end if;

  select count(*) into v_accepted_count
  from public.applications
  where socialing_id = v_socialing_id
    and status = 'accepted';

  if v_accepted_count >= v_socialing.capacity then
    raise exception using errcode = 'P0001', message = 'FULL';
  end if;

  update public.applications
  set status = 'accepted',
      decided_at = now()
  where id = p_application_id
  returning * into v_application;

  return v_application;
end;
$$;

-- 거절(MS14): 승인과 같은 때까지. 거절로 최소 인원이 될 수 없게 되면 그 순간 계산으로 취소된다(세지 않음, 04 2.6)
create or replace function public.reject_application(
  p_application_id bigint,
  p_reason public.reject_reason,
  p_note text default null
)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_note text := nullif(private.trimmed(p_note), '');
  v_socialing_id bigint;
  v_socialing public.socialings;
  v_application public.applications;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHENTICATED';
  end if;

  if p_reason is null
    or char_length(v_note) > 100
    or (p_reason = 'other' and v_note is null) then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select socialing_id into v_socialing_id
  from public.applications
  where id = p_application_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select * into v_socialing
  from public.socialings
  where id = v_socialing_id
  for update;

  if v_socialing.host_id <> v_user_id then
    raise exception using errcode = 'P0001', message = 'NOT_HOST';
  end if;

  select * into v_application
  from public.applications
  where id = p_application_id
  for update;

  if v_socialing.status not in ('recruiting', 'confirmed') then
    raise exception using errcode = 'P0001', message = 'INVALID_STATE';
  end if;

  if public.socialing_display_status(v_socialing_id) in ('host_canceled', 'auto_canceled') then
    raise exception using errcode = 'P0001', message = 'AUTO_CANCELED';
  end if;

  if v_application.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'ALREADY_PROCESSED';
  end if;

  if now() >= v_socialing.starts_at then
    raise exception using errcode = 'P0001', message = 'STARTED';
  end if;

  if p_reason = 'age' and v_socialing.min_age is null and v_socialing.max_age is null then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  update public.applications
  set status = 'rejected',
      decided_at = now(),
      reject_reason = p_reason,
      reject_note = v_note
  where id = p_application_id
  returning * into v_application;

  return v_application;
end;
$$;

-- 신청 취소: 계산으로 취소·호스트 취소된 소셜링에서는 못 한다(호스트 취소와 같은 방식). 확정 대기 중에는 되고,
-- 그 취소로 참여 확정 + 승인 대기가 최소 인원보다 적어지면 그 순간 계산으로 취소된다(창 O05가 미리 알림)
create or replace function public.cancel_application(p_application_id bigint)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_socialing_id bigint;
  v_socialing public.socialings;
  v_application public.applications;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHENTICATED';
  end if;

  select socialing_id into v_socialing_id
  from public.applications
  where id = p_application_id
    and user_id = v_user_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select * into v_socialing
  from public.socialings
  where id = v_socialing_id
  for update;

  select * into v_application
  from public.applications
  where id = p_application_id
  for update;

  if v_application.status not in ('pending', 'accepted') then
    raise exception using errcode = 'P0001', message = 'ALREADY_PROCESSED';
  end if;

  if v_socialing.status = 'canceled' then
    raise exception using errcode = 'P0001', message = 'HOST_CANCELED';
  end if;

  if public.socialing_display_status(v_socialing_id) in ('host_canceled', 'auto_canceled') then
    raise exception using errcode = 'P0001', message = 'AUTO_CANCELED';
  end if;

  if now() >= v_socialing.starts_at then
    raise exception using errcode = 'P0001', message = 'STARTED';
  end if;

  update public.applications
  set status = 'canceled',
      canceled_at = now()
  where id = p_application_id
  returning * into v_application;

  return v_application;
end;
$$;

-- 호스트 취소: 확정 대기 중에도 된다. 계산으로 취소·호스트 취소면 막는다(호스트 취소 수가 두 번 늘지 않게)
create or replace function public.cancel_socialing(p_socialing_id bigint)
returns public.socialings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_socialing public.socialings;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHENTICATED';
  end if;

  select * into v_socialing
  from public.socialings
  where id = p_socialing_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  if v_socialing.host_id <> v_user_id then
    raise exception using errcode = 'P0001', message = 'NOT_HOST';
  end if;

  if v_socialing.status not in ('recruiting', 'confirmed') then
    raise exception using errcode = 'P0001', message = 'INVALID_STATE';
  end if;

  if public.socialing_display_status(p_socialing_id) in ('host_canceled', 'auto_canceled') then
    raise exception using errcode = 'P0001', message = 'AUTO_CANCELED';
  end if;

  update public.socialings
  set status = 'canceled',
      canceled_at = now()
  where id = p_socialing_id
  returning * into v_socialing;

  return v_socialing;
end;
$$;
