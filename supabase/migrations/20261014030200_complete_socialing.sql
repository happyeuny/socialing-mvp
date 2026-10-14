-- MS4 complete_socialing: 호스트의 종료 (architecture 5장, spec 3.1·M8·8.8)
-- 그 소셜링의 호스트가 확정한 소셜링을 소셜링 일시가 지난 뒤 종료한다. 모집중에서 바로 종료할 수 없다.
-- 종료하면 참여 확정자가 인증 후기를 쓸 수 있다(spec 3.4). 시간이 지나도 자동으로 종료되지 않는다.
-- 실패하면 오류 코드를 message로 던진다(errcode P0001). 화면 문구는 서버 액션이 붙인다.
--   NOT_AUTHENTICATED, INVALID_INPUT(없는 소셜링), NOT_HOST, INVALID_STATE(확정이 아님),
--   NOT_STARTED(소셜링 일시 전)
-- 성공하면 바뀐 소셜링 행을 돌려준다.

create function public.complete_socialing(p_socialing_id bigint)
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

  if v_socialing.status <> 'confirmed' then
    raise exception using errcode = 'P0001', message = 'INVALID_STATE';
  end if;

  if now() < v_socialing.starts_at then
    raise exception using errcode = 'P0001', message = 'NOT_STARTED';
  end if;

  update public.socialings
  set status = 'completed',
      completed_at = now()
  where id = p_socialing_id
  returning * into v_socialing;

  return v_socialing;
end;
$$;

revoke execute on function public.complete_socialing(bigint) from public, anon;
grant execute on function public.complete_socialing(bigint) to authenticated;
