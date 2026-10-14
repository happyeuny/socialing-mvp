-- MS8 기준 공개 등급: get_host_record에 is_trusted_host 칸을 더한다 (architecture 3.2, spec M5·6장)
-- 돌려주는 칸이 바뀌면 create or replace를 쓸 수 없어 함수를 지우고 다시 만든다. 나머지 칸과 규칙은 MS6
-- (20261014070000_get_host_record.sql)과 같다.
--
--   is_trusted_host 기준 공개 등급 "믿고 가는 호스트": 열린 소셜링 5회 이상 + 호스트 취소 0회 + 소개 일치 90% 이상.
--                   소개 일치는 반올림 전 값으로 판단하고(화면이 92%처럼 반올림해 보여도 판단은 그 전 값),
--                   응답 5건 미만이라 비율이 없으면 등급도 없다. 나눗셈 없이 정수로 비교한다(일치 × 10 ≥ 응답 × 9).

drop function public.get_host_record(uuid);

create function public.get_host_record(p_host_id uuid)
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
        where recent.status = 'canceled'
          and exists (
            select 1 from public.applications a
            where a.socialing_id = recent.id and a.status in ('pending', 'accepted')
          ))::integer as canceled_count,
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

revoke execute on function public.get_host_record(uuid) from public;
grant execute on function public.get_host_record(uuid) to anon, authenticated;
