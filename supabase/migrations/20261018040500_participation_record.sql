-- MS15 get_my_participation_record: 나만 보는 참여 기록 (SH2, architecture 3.2, spec M11·6장)
-- 내 소셜링(P06) "신청한 소셜링" 탭 맨 위 상자가 부른다. 로그인한 본인의 기록만 돌려주고, 호스트나 다른 사람은 어디서도 볼 수 없다.
-- 보는 사람 권한(security invoker)으로 읽는다: 신청은 본인 것만 골라 읽고(호스트는 자기 소셜링 신청도 읽을 수 있어서 user_id로 한 번 더 좁힘),
-- 소셜링은 누구나 읽는다. 칸은 더하지 않는다.
--
-- 집계 기간: 최근 6개월 = 소셜링 일시가 6개월 전 이후(호스트 기록과 같음)
--   participated_count  참여: 종료된 소셜링에서 참여 확정인 내 신청 수
--   late_cancel_count   늦은 취소: 참여 확정이었다가 신청 마감 일시가 지난 뒤 신청 취소한 것 (결정 H5)
--                       참여 확정이었는지는 decided_at으로 안다(선착순은 신청 때, 호스트 승인은 승인 때 기록. 거절은 rejected로 남음).
--                       승인 대기 중 취소·마감 전 취소·호스트 거절·호스트 취소·계산 취소는 늦은 취소가 아니다
--   is_new_member       새 멤버: 참여 3회 미만 (새 호스트와 같은 3회)
--   late_cancels        늦은 취소 목록(최근 취소 순): socialing_id, title, canceled_at, expires_at(기록에서 빠지는 때 = 소셜링 일시 + 6개월)

create function public.get_my_participation_record()
returns table (
  participated_count integer,
  late_cancel_count integer,
  is_new_member boolean,
  late_cancels jsonb
)
language sql
stable
set search_path = ''
as $$
  with mine as (
    select a.status, a.decided_at, a.canceled_at, s.id as socialing_id, s.title, s.status as socialing_status,
      s.starts_at, s.apply_deadline_at
    from public.applications a
    join public.socialings s on s.id = a.socialing_id
    where a.user_id = (select auth.uid())
      and s.starts_at >= now() - interval '6 months'
  ),
  late as (
    select mine.socialing_id, mine.title, mine.canceled_at, mine.starts_at + interval '6 months' as expires_at
    from mine
    where mine.status = 'canceled'
      and mine.decided_at is not null
      and mine.canceled_at >= mine.apply_deadline_at
  ),
  participated as (
    select count(*)::integer as n
    from mine
    where mine.status = 'accepted' and mine.socialing_status = 'completed'
  )
  select
    participated.n,
    (select count(*)::integer from late),
    participated.n < 3,
    coalesce(
      (select jsonb_agg(
          jsonb_build_object(
            'socialing_id', late.socialing_id,
            'title', late.title,
            'canceled_at', late.canceled_at,
            'expires_at', late.expires_at
          )
          order by late.canceled_at desc, late.socialing_id desc)
        from late),
      '[]'::jsonb
    )
  from participated;
$$;

revoke execute on function public.get_my_participation_record() from public, anon;
grant execute on function public.get_my_participation_record() to authenticated;
