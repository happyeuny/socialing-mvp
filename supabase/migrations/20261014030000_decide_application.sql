-- MS4 decide_application: 호스트의 승인·거절 (architecture 5장, spec 3.3·M8·8.8)
-- 그 소셜링의 호스트가 승인 대기 신청을 소셜링 일시 전에 승인(참여 확정)하거나 거절한다.
-- 승인은 정원을 넘지 않는다. 신청·신청 취소와 같은 줄에 서도록 소셜링 행을 먼저 FOR UPDATE로 잠그고
-- 참여 확정 인원을 센 다음, 신청 행을 잠가 다시 확인한다.
-- 실패하면 오류 코드를 message로 던진다(errcode P0001). 화면 문구는 서버 액션이 붙인다.
--   NOT_AUTHENTICATED, INVALID_INPUT(없는 신청), NOT_HOST(그 소셜링의 호스트가 아님),
--   INVALID_STATE(종료·호스트 취소된 소셜링), ALREADY_PROCESSED(승인 대기가 아님),
--   STARTED(소셜링 일시 지남), FULL(승인할 때 정원이 참)
-- 성공하면 바뀐 신청 행을 돌려준다.

create function public.decide_application(p_application_id bigint, p_approve boolean)
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

  if p_approve is null then
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

  if v_application.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'ALREADY_PROCESSED';
  end if;

  if now() >= v_socialing.starts_at then
    raise exception using errcode = 'P0001', message = 'STARTED';
  end if;

  if p_approve then
    select count(*) into v_accepted_count
    from public.applications
    where socialing_id = v_socialing_id
      and status = 'accepted';

    if v_accepted_count >= v_socialing.capacity then
      raise exception using errcode = 'P0001', message = 'FULL';
    end if;
  end if;

  update public.applications
  set status = case when p_approve then 'accepted' else 'rejected' end::public.application_status,
      decided_at = now()
  where id = p_application_id
  returning * into v_application;

  return v_application;
end;
$$;

revoke execute on function public.decide_application(bigint, boolean) from public, anon;
grant execute on function public.decide_application(bigint, boolean) to authenticated;
