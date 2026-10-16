-- MS14 읽기 뷰에 2묶음 칸을 끝에 더한다 (architecture 3.2). 앞 칸의 이름·순서는 그대로(마이그레이션은 추가만).
--   socialing_summaries          + fee_note(참가비 설명), min_age·max_age(연령 조건), material_url(자료 링크)
--   my_applied_socialings        + reject_reason·reject_note (가장 최근 신청의 거절 사유, 신청자 본인)
--   hosted_socialing_applicants  + reject_reason·reject_note (호스트가 고른 거절 사유)
-- 뷰 위에 만든 뷰(my_applied_socialings, my_hosted_socialings)는 만들 때 칸이 고정되므로, 아래에서 앞 칸을 이름으로 적어
-- 새 칸이 끝에만 붙게 한다. my_hosted_socialings는 그대로 둔다(새 칸이 필요 없음).

create or replace view public.socialing_summaries
with (security_invoker = true)
as
select
  base.id,
  base.title,
  base.description,
  base.host_id,
  base.host_nickname,
  base.category_id,
  base.category_slug,
  base.category_name,
  base.category_is_party,
  base.has_alcohol,
  base.venue_id,
  base.venue_type,
  base.venue_name,
  base.region_sido,
  base.region_sigungu,
  base.starts_at,
  base.apply_deadline_at,
  base.fee,
  base.capacity,
  base.staff_count,
  base.join_type,
  base.approval_criteria,
  base.cover_photo_path,
  base.status,
  base.accepted_count,
  base.starts_at <= now() as is_past,
  (base.status in ('recruiting', 'confirmed')
    and now() < base.apply_deadline_at
    and base.accepted_count < base.capacity) as can_apply,
  case
    when base.status not in ('recruiting', 'confirmed') then null
    when now() >= base.apply_deadline_at then 'closed'
    when base.accepted_count >= base.capacity then 'full'
  end as status_tag,
  case
    when base.status in ('recruiting', 'confirmed')
      and now() < base.apply_deadline_at
      and base.accepted_count < base.capacity then null
    when base.status = 'canceled' then 'host_canceled'
    when base.starts_at <= now() then 'started'
    when base.status not in ('recruiting', 'confirmed') then 'not_open'
    when now() >= base.apply_deadline_at then 'deadline'
    else 'full'
  end as closed_reason,
  base.fee_note,
  base.min_age,
  base.max_age,
  base.material_url
from (
  select
    s.id,
    s.title,
    s.description,
    s.host_id,
    p.nickname as host_nickname,
    s.category_id,
    c.slug as category_slug,
    c.name as category_name,
    c.is_party as category_is_party,
    s.has_alcohol,
    s.venue_id,
    v.type as venue_type,
    v.name as venue_name,
    r.sido as region_sido,
    r.sigungu as region_sigungu,
    s.starts_at,
    s.apply_deadline_at,
    s.fee,
    s.capacity,
    s.staff_count,
    s.join_type,
    s.approval_criteria,
    s.cover_photo_path,
    s.status,
    public.socialing_accepted_count(s.id) as accepted_count,
    s.fee_note,
    s.min_age,
    s.max_age,
    s.material_url
  from public.socialings s
  join public.profiles p on p.id = s.host_id
  join public.categories c on c.id = s.category_id
  join public.venues v on v.id = s.venue_id
  join public.regions r on r.id = v.region_id
) base;

create or replace view public.my_applied_socialings
with (security_invoker = true)
as
select
  s.id,
  s.title,
  s.description,
  s.host_id,
  s.host_nickname,
  s.category_id,
  s.category_slug,
  s.category_name,
  s.category_is_party,
  s.has_alcohol,
  s.venue_id,
  s.venue_type,
  s.venue_name,
  s.region_sido,
  s.region_sigungu,
  s.starts_at,
  s.apply_deadline_at,
  s.fee,
  s.capacity,
  s.staff_count,
  s.join_type,
  s.approval_criteria,
  s.cover_photo_path,
  s.status,
  s.accepted_count,
  s.is_past,
  s.can_apply,
  s.status_tag,
  s.closed_reason,
  latest.id as application_id,
  latest.status as application_status,
  latest.created_at as applied_at,
  exists (
    select 1 from public.reviews r
    where r.socialing_id = s.id
      and r.user_id = latest.user_id
  ) as has_review,
  latest.reject_reason,
  latest.reject_note
from (
  select distinct on (a.socialing_id) a.*
  from public.applications a
  where a.user_id = (select auth.uid())
  order by a.socialing_id, a.id desc
) latest
join public.socialing_summaries s on s.id = latest.socialing_id;

create or replace view public.hosted_socialing_applicants
with (security_invoker = true)
as
select distinct on (a.socialing_id, a.user_id)
  a.socialing_id,
  a.id as application_id,
  a.user_id,
  p.nickname,
  a.status,
  a.created_at as applied_at,
  a.decided_at,
  a.canceled_at,
  a.reject_reason,
  a.reject_note
from public.applications a
join public.socialings s on s.id = a.socialing_id
join public.profiles p on p.id = a.user_id
where s.host_id = (select auth.uid())
order by a.socialing_id, a.user_id, a.id desc;

-- 권한은 그대로: 목록·상세는 모두 읽기만, "나" 기준 뷰는 로그인한 사람만 읽기만
revoke all on public.socialing_summaries from anon, authenticated;
grant select on public.socialing_summaries to anon, authenticated;
revoke all on public.my_applied_socialings from anon, authenticated;
grant select on public.my_applied_socialings to authenticated;
revoke all on public.hosted_socialing_applicants from anon, authenticated;
grant select on public.hosted_socialing_applicants to authenticated;
