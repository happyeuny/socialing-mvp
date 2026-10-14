-- MS4 confirm_socialing: 호스트의 확정 (architecture 5장, spec 3.1·M8·8.8)
-- 그 소셜링의 호스트가 모집중 소셜링을 소셜링 일시 전에 확정한다. 최소 인원 조건은 없다.
-- 승인·신청과 같은 줄에 서도록 소셜링 행을 FOR UPDATE로 잠근 뒤 확인한다.
-- 실패하면 오류 코드를 message로 던진다(errcode P0001). 화면 문구는 서버 액션이 붙인다.
--   NOT_AUTHENTICATED, INVALID_INPUT(없는 소셜링), NOT_HOST, INVALID_STATE(모집중이 아님),
--   STARTED(소셜링 일시 지남)
-- 성공하면 바뀐 소셜링 행을 돌려준다.

create function public.confirm_socialing(p_socialing_id bigint)
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

  if v_socialing.status <> 'recruiting' then
    raise exception using errcode = 'P0001', message = 'INVALID_STATE';
  end if;

  if now() >= v_socialing.starts_at then
    raise exception using errcode = 'P0001', message = 'STARTED';
  end if;

  update public.socialings
  set status = 'confirmed',
      confirmed_at = now()
  where id = p_socialing_id
  returning * into v_socialing;

  return v_socialing;
end;
$$;

revoke execute on function public.confirm_socialing(bigint) from public, anon;
grant execute on function public.confirm_socialing(bigint) to authenticated;
