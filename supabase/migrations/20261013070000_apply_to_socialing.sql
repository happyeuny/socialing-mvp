-- SP2 apply_to_socialing: 신청 (architecture 5장, spec 3.2·3.3·8.4)
-- 정원은 소셜링 행을 FOR UPDATE로 잠근 뒤 센다. 같은 소셜링의 신청·승인은 이 잠금으로 한 줄로 선다.
-- 실패하면 오류 코드를 message로 던진다(errcode P0001). 화면 문구는 서버 액션이 붙인다.
--   NOT_AUTHENTICATED, INVALID_INPUT(없는 소셜링), IS_HOST, HOST_CANCELED, NOT_OPEN(종료 등),
--   DEADLINE_PASSED, ALREADY_APPLIED, FULL
-- 성공하면 만든 신청 행을 돌려준다. 선착순은 accepted, 호스트 승인은 pending.

create function public.apply_to_socialing(p_socialing_id bigint)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_socialing public.socialings;
  v_accepted_count integer;
  v_application public.applications;
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

  if v_socialing.host_id = v_user_id then
    raise exception using errcode = 'P0001', message = 'IS_HOST';
  end if;

  if v_socialing.status = 'canceled' then
    raise exception using errcode = 'P0001', message = 'HOST_CANCELED';
  end if;

  if v_socialing.status not in ('recruiting', 'confirmed') then
    raise exception using errcode = 'P0001', message = 'NOT_OPEN';
  end if;

  if now() >= v_socialing.apply_deadline_at then
    raise exception using errcode = 'P0001', message = 'DEADLINE_PASSED';
  end if;

  if exists (
    select 1 from public.applications
    where socialing_id = p_socialing_id
      and user_id = v_user_id
      and status in ('pending', 'accepted')
  ) then
    raise exception using errcode = 'P0001', message = 'ALREADY_APPLIED';
  end if;

  select count(*) into v_accepted_count
  from public.applications
  where socialing_id = p_socialing_id
    and status = 'accepted';

  if v_accepted_count >= v_socialing.capacity then
    raise exception using errcode = 'P0001', message = 'FULL';
  end if;

  insert into public.applications (socialing_id, user_id, status, decided_at)
  values (
    p_socialing_id,
    v_user_id,
    case when v_socialing.join_type = 'first_come' then 'accepted' else 'pending' end::public.application_status,
    case when v_socialing.join_type = 'first_come' then now() end
  )
  returning * into v_application;

  return v_application;
exception
  -- 같은 사람이 같은 순간에 두 번 누른 경우: 부분 유니크 인덱스가 막는다
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'ALREADY_APPLIED';
end;
$$;

revoke execute on function public.apply_to_socialing(bigint) from public, anon;
grant execute on function public.apply_to_socialing(bigint) to authenticated;
