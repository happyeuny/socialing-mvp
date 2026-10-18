-- MS15 get_host_record: 확정하지 않아 생긴 호스트 취소를 호스트 취소 수에 더한다 (U4 결정 H3, architecture 3.2, spec 6장)
-- 돌려주는 칸·인자가 같아 create or replace로 바꾼다(main 코드 호출 그대로). 나머지 칸과 규칙은 MS8(20261014110000_trusted_host.sql)과 같다.
--   canceled_count  호스트 취소 = ① 승인 대기·참여 확정 신청이 있던 상태에서 호스트 취소된 소셜링(그대로)
--                              ② 확정 대기인 채로 확정 기한이 지난 모집중 소셜링(보이는 상태가 계산으로 'host_canceled')
--                   최소 인원이 모이지 않아 계산으로 취소된 소셜링('auto_canceled')은 세지 않는다.
--                   ②는 최소 인원(2명 이상)이 모였던 경우라 신청이 있던 소셜링이다. 시드 쪽 계산(hostRecordFromSeed)과 같은 규칙이다.
--   등급(is_trusted_host)의 "호스트 취소 0회"에도 ②가 들어간다.

create or replace function public.get_host_record(p_host_id uuid)
returns table (
  opened_count integer,
  canceled_count integer,
  review_count integer,
  response_count integer,
  match_rate numeric,
  is_new_host boolean,
  is_trusted_host boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with recent as (
    select s.id, s.status
    from public.socialings s
    where s.host_id = p_host_id
      and s.starts_at >= now() - interval '6 months'
  ),
  recent_reviews as (
    select r.id
    from public.reviews r
    join recent on recent.id = r.socialing_id
  ),
  checks as (
    select c.members_match, c.extra_money, c.content_match
    from public.review_checks c
    join recent_reviews on recent_reviews.id = c.review_id
  ),
  counts as (
    select
      (select count(*) from recent
        where recent.status = 'completed'
          and exists (
            select 1 from public.applications a
            where a.socialing_id = recent.id and a.status = 'accepted'
          ))::integer as opened_count,
      (select count(*) from recent
        where (recent.status = 'canceled'
            and exists (
              select 1 from public.applications a
              where a.socialing_id = recent.id and a.status in ('pending', 'accepted')
            ))
          or (recent.status = 'recruiting'
            and public.socialing_display_status(recent.id) = 'host_canceled'))::integer as canceled_count,
      (select count(*) from recent_reviews)::integer as review_count,
      (select count(*) from checks)::integer as response_count,
      (select count(*) from checks
        where checks.members_match and not checks.extra_money and checks.content_match)::integer as match_count
  )
  select
    counts.opened_count,
    counts.canceled_count,
    counts.review_count,
    counts.response_count,
    case when counts.response_count >= 5 then counts.match_count::numeric / counts.response_count end,
    counts.opened_count < 3,
    counts.opened_count >= 5
      and counts.canceled_count = 0
      and counts.response_count >= 5
      and counts.match_count * 10 >= counts.response_count * 9
  from counts;
$$;
