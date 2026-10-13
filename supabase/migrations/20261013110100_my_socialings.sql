-- MS3 "나" 기준 읽기 뷰 (architecture 3.2, spec 8.4·M11)
-- 상세 아래 영역(spec 8.4)과 내 소셜링(P06) 두 탭이 읽는다. 둘 다 socialing_summaries의 칸을 그대로 두고
-- 보는 사람 기준 칸을 더한다. 보는 사람 권한(security_invoker)으로 읽고, 로그인한 사람만 SELECT할 수 있다.

-- 신청한 소셜링: 내가 신청한 소셜링마다 가장 최근 신청 하나 (거절·신청 취소 뒤 다시 신청하면 새 행이 최근)
--   application_id      그 신청의 id (신청 취소 함수에 넘긴다)
--   application_status  pending / accepted / rejected / canceled. 소셜링이 호스트 취소되어도 바꾸지 않는다(spec 3.3)
--   applied_at          신청 일시
--   has_review          내가 이 소셜링에 인증 후기를 썼는지 (spec 3.4, 8.4의 3·4줄)
create view public.my_applied_socialings
with (security_invoker = true)
as
select
  s.*,
  latest.id as application_id,
  latest.status as application_status,
  latest.created_at as applied_at,
  exists (
    select 1 from public.reviews r
    where r.socialing_id = s.id
      and r.user_id = latest.user_id
  ) as has_review
from (
  select distinct on (a.socialing_id) a.*
  from public.applications a
  where a.user_id = (select auth.uid())
  order by a.socialing_id, a.id desc
) latest
join public.socialing_summaries s on s.id = latest.socialing_id;

-- 호스트인 소셜링: 내가 호스트인 소셜링 + 승인 대기 건수
--   pending_count  승인 대기 신청 수. applications는 그 소셜링의 호스트가 읽을 수 있어서(RLS) 함수 없이 센다
create view public.my_hosted_socialings
with (security_invoker = true)
as
select
  s.*,
  (
    select count(*)::integer
    from public.applications a
    where a.socialing_id = s.id
      and a.status = 'pending'
  ) as pending_count
from public.socialing_summaries s
where s.host_id = (select auth.uid());

-- 읽기만, 로그인한 사람만. 비로그인은 볼 것이 없다.
revoke all on public.my_applied_socialings from anon, authenticated;
revoke all on public.my_hosted_socialings from anon, authenticated;
grant select on public.my_applied_socialings to authenticated;
grant select on public.my_hosted_socialings to authenticated;
