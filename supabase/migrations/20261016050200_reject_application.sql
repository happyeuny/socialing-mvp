-- MS14 reject_application: 거절 사유를 고르는 거절 (U10, architecture 5장, spec 8.8 O04)
-- 검사는 decide_application(MS4)의 거절과 같고, 거절 사유를 더한다.
--   사유는 꼭 고른다. 'age'(연령 조건과 맞지 않아요)는 그 소셜링에 연령 조건이 있을 때만,
--   'other'(그 밖의 이유)면 덧붙일 말이 필요하다. 덧붙일 말은 앞뒤 공백을 뺀 100자까지, 비면 null
-- 사유는 신청 행에 남고, 신청 행을 읽을 수 있는 신청자 본인과 그 소셜링의 호스트만 본다(지금 권한).
-- 승인은 decide_application을 그대로 쓴다. 옛 거절 길 decide_application(…, false)은 main 코드가 쓰므로
-- MS14가 main에 들어간 뒤 MS15에서 막는다.
-- 실패하면 오류 코드를 message로 던진다(errcode P0001). 화면 문구는 서버 액션이 붙인다.
--   NOT_AUTHENTICATED, INVALID_INPUT(없는 신청, 사유·덧붙일 말), NOT_HOST, INVALID_STATE(종료·호스트 취소),
--   ALREADY_PROCESSED(승인 대기가 아님), STARTED(소셜링 일시 지남)
-- 성공하면 바뀐 신청 행을 돌려준다.

create function public.reject_application(
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

  -- 신청·승인과 같은 줄에 서도록 소셜링 행 → 신청 행 순서로 잠근다
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

revoke execute on function public.reject_application(bigint, public.reject_reason, text) from public, anon;
grant execute on function public.reject_application(bigint, public.reject_reason, text) to authenticated;
