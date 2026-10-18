-- MS15 보이는 상태 계산 (U4, architecture 3.2, spec 3.1·8.3): socialing_display_status
-- 저장된 상태(모집중·확정·종료·호스트 취소)는 호스트 버튼으로만 바뀐다. 신청 마감·확정 기한이 지나면 "보이는 상태"만
-- 조회할 때 계산으로 바뀐다(예약 작업 없음). 뷰와 버튼 함수가 이 함수 하나를 같이 쓴다.
--
-- 참여 확정 = a, 승인 대기 = p, 최소 인원 = m. 위에서부터 먼저 맞는 줄:
--   종료 → 'completed' / 호스트 취소 → 'host_canceled' / 확정 → 'confirmed'
--   모집중 · 신청 마감 전 → 'recruiting'
--   모집중 · 신청 마감 지남 · a + p < m → 'auto_canceled' (최소 인원이 모이지 않아 취소, 호스트 기록에 세지 않음)
--   모집중 · 신청 마감 지남 · 확정 기한 전 → 'awaiting_confirm' (확정 대기)
--   모집중 · 확정 기한 지남 → 'host_canceled' (호스트가 확정 기한까지 확정하지 않음, 호스트 취소 수에 셈)
-- 되돌아가지 않는다: 신청 마감 뒤에는 새 신청이 없어 a + p는 줄기만 하고, 확정 기한 뒤에는 모든 동작이 막힌다.
--
-- 승인 대기는 그 소셜링의 호스트만 읽으므로(RLS) SECURITY DEFINER로 센다. 숫자는 돌려주지 않고 상태만 돌려준다.
-- p_without_application_id: "이 신청을 취소했다면"의 상태(신청 취소 창 O05의 경고). 부른 사람 본인의 신청일 때만 뺀다.

create function public.socialing_display_status(
  p_socialing_id bigint,
  p_without_application_id bigint default null
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when s.status = 'completed' then 'completed'
    when s.status = 'canceled' then 'host_canceled'
    when s.status = 'confirmed' then 'confirmed'
    when now() < s.apply_deadline_at then 'recruiting'
    when (
      select count(*)
      from public.applications a
      where a.socialing_id = s.id
        and a.status in ('pending', 'accepted')
        and (a.id is distinct from p_without_application_id or a.user_id is distinct from auth.uid())
    ) < s.min_participants then 'auto_canceled'
    when now() < s.confirm_deadline_at then 'awaiting_confirm'
    else 'host_canceled'
  end
  from public.socialings s
  where s.id = p_socialing_id;
$$;

revoke execute on function public.socialing_display_status(bigint, bigint) from public;
grant execute on function public.socialing_display_status(bigint, bigint) to anon, authenticated;
