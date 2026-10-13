-- MS2 목록·상세 읽기 뷰 (architecture 3.2, spec 3.2·8.3·8.4)
-- 카드·상세는 비로그인도 "참가자 4/8명", 꼬리표, 신청 가능 여부를 봐야 한다. 그런데 applications는
-- 본인·호스트만 읽는다(RLS). 그래서 소셜링 하나의 참여 확정 인원(숫자)만 돌려주는 함수를 SECURITY DEFINER로 두고,
-- 뷰는 보는 사람 권한(security_invoker)으로 읽는다. 누가 신청했는지는 이 경로로 나가지 않는다.
-- 계산은 조회할 때 now()로 한다. 저장하지 않는다.

create function public.socialing_accepted_count(p_socialing_id bigint)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.applications
  where socialing_id = p_socialing_id
    and status = 'accepted';
$$;

revoke execute on function public.socialing_accepted_count(bigint) from public;
grant execute on function public.socialing_accepted_count(bigint) to anon, authenticated;

-- 칸 설명
--   accepted_count  참여 확정 인원 (accepted 신청 수)
--   is_past         지난 소셜링 (starts_at <= now(), 상태와 무관)
--   can_apply       신청 가능 = 모집중·확정 + 신청 마감 전 + 참여 확정 인원 < 정원 (spec 3.2)
--   status_tag      꼬리표: 'closed'(신청 마감) / 'full'(정원 마감) / null. 둘 다면 'closed'. 종료·호스트 취소에는 없음 (spec 8.3)
--   closed_reason   신청할 수 없는 이유 (spec 8.4의 2·13줄): 'host_canceled' / 'started'(소셜링 일시 지남) /
--                   'not_open'(종료 등) / 'deadline'(신청 마감) / 'full'(정원 마감) / null(신청 가능)
create view public.socialing_summaries
with (security_invoker = true)
as
select
  base.*,
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
  end as closed_reason
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
    public.socialing_accepted_count(s.id) as accepted_count
  from public.socialings s
  join public.profiles p on p.id = s.host_id
  join public.categories c on c.id = s.category_id
  join public.venues v on v.id = s.venue_id
  join public.regions r on r.id = v.region_id
) base;

-- 읽기만. Supabase 기본 권한이 새 뷰에 쓰기 권한까지 주므로 모두 회수하고 SELECT만 연다.
revoke all on public.socialing_summaries from anon, authenticated;
grant select on public.socialing_summaries to anon, authenticated;
