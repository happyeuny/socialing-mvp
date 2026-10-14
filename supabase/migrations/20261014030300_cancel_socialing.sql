-- MS4 cancel_socialing: 호스트 취소 (architecture 5장, spec 3.1·3.3·M8·8.8)
-- 그 소셜링의 호스트가 종료 전(모집중·확정) 소셜링을 취소한다. 소셜링 일시가 지나도 종료 전이면 된다
-- (확정하지 않은 채 일시가 지난 모집중 소셜링은 호스트 취소만 된다).
-- 신청 상태는 바꾸지 않는다. 화면에서 "호스트 취소"로 덮어 보여 준다(spec 3.3).
-- 신청·승인과 같은 줄에 서도록 소셜링 행을 FOR UPDATE로 잠근 뒤 확인한다.
-- 실패하면 오류 코드를 message로 던진다(errcode P0001). 화면 문구는 서버 액션이 붙인다.
--   NOT_AUTHENTICATED, INVALID_INPUT(없는 소셜링), NOT_HOST, INVALID_STATE(이미 종료·호스트 취소)
-- 성공하면 바뀐 소셜링 행을 돌려준다.

create function public.cancel_socialing(p_socialing_id bigint)
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

  update public.socialings
  set status = 'canceled',
      canceled_at = now()
  where id = p_socialing_id
  returning * into v_socialing;

  return v_socialing;
end;
$$;

revoke execute on function public.cancel_socialing(bigint) from public, anon;
grant execute on function public.cancel_socialing(bigint) to authenticated;
