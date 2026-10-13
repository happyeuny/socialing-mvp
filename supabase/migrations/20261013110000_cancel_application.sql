-- MS3 cancel_application: 신청 취소 (architecture 5장, spec 3.3·M7·8.4 O05)
-- 본인의 승인 대기·참여 확정 신청을 소셜링 일시 전에 취소한다. 취소한 뒤 다시 신청하면 새 신청 행이 생긴다.
-- 호스트 취소된 소셜링의 신청은 취소할 수 없다. 호스트 기록의 "호스트 취소 수"는 신청이 있던 채로 취소된
-- 소셜링을 세는데(spec 6장), 그 뒤 신청을 취소하면 기록이 줄어들 수 있어서다.
-- 신청·승인과 같은 줄에 서도록 소셜링 행을 먼저 FOR UPDATE로 잠그고, 그다음 신청 행을 잠가 다시 확인한다.
-- 실패하면 오류 코드를 message로 던진다(errcode P0001). 화면 문구는 서버 액션이 붙인다.
--   NOT_AUTHENTICATED, INVALID_INPUT(없거나 남의 신청), ALREADY_PROCESSED(이미 거절·취소),
--   HOST_CANCELED, STARTED(소셜링 일시 지남)
-- 성공하면 바뀐 신청 행을 돌려준다.

create function public.cancel_application(p_application_id bigint)
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

  -- 남의 신청도 없는 신청과 같게 답한다 (있는지 알려 주지 않는다)
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

revoke execute on function public.cancel_application(bigint) from public, anon;
grant execute on function public.cancel_application(bigint) to authenticated;
