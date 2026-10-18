-- MS15 읽기 뷰에 3묶음 칸을 끝에 더한다 (U4·SH2, architecture 3.2, 04 8.1). 앞 칸의 이름·순서는 그대로(마이그레이션은 추가만).
--   socialing_summaries    + min_participants(최소 인원), confirm_deadline_at(확정 기한),
--                            display_status(보이는 상태: recruiting·awaiting_confirm·confirmed·completed·host_canceled·auto_canceled),
--                            cancel_reason(host 직접 취소 · not_confirmed 확정 기한까지 확정하지 않음 · min_not_met 최소 인원 미달),
--                            needed_count(최소 인원까지 남은 수, 모집중·확정 대기만)
--   my_applied_socialings  + 같은 5칸 + 신청 취소 창(O05) 두 줄의 판단
--                            cancel_would_auto_cancel(확정 대기에서 내가 취소하면 최소 인원보다 적어져 취소됨)
--                            cancel_would_be_late(신청 마감 뒤 참여 확정 취소 = 내 참여 기록의 늦은 취소)
--   my_hosted_socialings   + 같은 5칸. 확정·승인·거절·수정·호스트 취소 가능 칸은 새 규칙(2.5)으로
-- 바뀌는 앞 칸 값:
--   status_tag             보이는 상태가 모집중·확정일 때만(확정 대기·취소·호스트 취소는 꼬리표 없음, 2.4). 값은 그대로 closed·full만
--                          ("최소 인원까지 N명"은 화면이 needed_count로 고른다. main 코드가 모르는 값을 받지 않게)
--   my_hosted_socialings   confirm_blocked_reason에 min_not_met(참여 확정 < 최소 인원)·canceled(계산으로 취소·호스트 취소) 추가.
--                          계산으로 취소·호스트 취소면 확정·승인·거절·수정·호스트 취소가 모두 막히고 신청자 목록은 보기만
--                          (approve_blocked_reason이 비어 버튼이 없음), 종료가 막힌 이유는 not_confirmed
-- closed_reason(상세 아래 영역용)은 값을 바꾸지 않는다. 새 줄은 화면 PR에서 display_status·cancel_reason으로 고른다.
-- 뷰 위에 만든 뷰(my_applied_socialings, my_hosted_socialings)는 만들 때 칸이 고정되므로 앞 칸을 이름으로 적어 새 칸이 끝에만 붙게 한다.

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
    when base.display_status not in ('recruiting', 'confirmed') then null
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
  base.material_url,
  base.min_participants,
  base.confirm_deadline_at,
  base.display_status,
  case
    when base.status = 'canceled' then 'host'
    when base.display_status = 'host_canceled' then 'not_confirmed'
    when base.display_status = 'auto_canceled' then 'min_not_met'
  end as cancel_reason,
  case
    when base.display_status in ('recruiting', 'awaiting_confirm')
      then greatest(base.min_participants - base.accepted_count, 0)
  end as needed_count
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
    s.material_url,
    s.min_participants,
    s.confirm_deadline_at,
    public.socialing_display_status(s.id) as display_status
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
  latest.reject_note,
  s.min_participants,
  s.confirm_deadline_at,
  s.display_status,
  s.cancel_reason,
  s.needed_count,
  -- O05 위 줄: 확정 대기이고, 내 신청을 빼면 참여 확정 + 승인 대기가 최소 인원보다 적어짐 (숫자는 내지 않음)
  (latest.status in ('pending', 'accepted')
    and s.display_status = 'awaiting_confirm'
    and public.socialing_display_status(s.id, latest.id) = 'auto_canceled') as cancel_would_auto_cancel,
  -- O05 아래 줄: 신청 마감이 지났고 내가 참여 확정 (확정 대기·확정 모두). get_my_participation_record의 늦은 취소와 같은 기준
  (latest.status = 'accepted'
    and now() >= s.apply_deadline_at
    and s.display_status in ('awaiting_confirm', 'confirmed')) as cancel_would_be_late
from (
  select distinct on (a.socialing_id) a.*
  from public.applications a
  where a.user_id = (select auth.uid())
  order by a.socialing_id, a.id desc
) latest
join public.socialing_summaries s on s.id = latest.socialing_id;

create or replace view public.my_hosted_socialings
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
  (
    select count(*)::integer
    from public.applications a
    where a.socialing_id = s.id
      and a.status = 'pending'
  ) as pending_count,
  (
    select count(*)::integer
    from (
      select distinct on (a.user_id) a.status
      from public.applications a
      where a.socialing_id = s.id
      order by a.user_id, a.id desc
    ) latest
    where latest.status in ('rejected', 'canceled')
  ) as closed_count,
  -- 확정하기: 모집중(확정 대기 포함), 확정 기한 전, 참여 확정 ≥ 최소 인원 (confirm_socialing과 같은 규칙)
  (s.status = 'recruiting'
    and s.display_status in ('recruiting', 'awaiting_confirm')
    and now() < s.starts_at
    and s.accepted_count >= s.min_participants) as can_confirm,
  case
    when s.status <> 'recruiting' then null
    when s.display_status not in ('recruiting', 'awaiting_confirm') then 'canceled'
    when now() >= s.starts_at then 'started'
    when s.accepted_count < s.min_participants then 'min_not_met'
  end as confirm_blocked_reason,
  (s.status = 'confirmed' and now() >= s.starts_at) as can_complete,
  case
    when s.status = 'recruiting' and s.display_status not in ('recruiting', 'awaiting_confirm') then 'not_confirmed'
    when s.status = 'recruiting' and now() < s.starts_at then 'confirm_first'
    when s.status = 'recruiting' then 'not_confirmed'
    when s.status = 'confirmed' and now() < s.starts_at then 'not_started'
  end as complete_blocked_reason,
  -- 호스트 취소·수정: 종료·호스트 취소 전, 계산으로 취소·호스트 취소가 아님 (확정 대기 중에는 됨)
  (s.status in ('recruiting', 'confirmed')
    and s.display_status in ('recruiting', 'awaiting_confirm', 'confirmed')) as can_cancel,
  (s.status in ('recruiting', 'confirmed')
    and s.display_status in ('recruiting', 'awaiting_confirm', 'confirmed')) as can_edit,
  -- 승인·거절: 확정 소셜링은 일시 전까지, 모집중은 확정 기한 전까지(계산으로 취소면 막힘)
  (s.status in ('recruiting', 'confirmed')
    and s.display_status in ('recruiting', 'awaiting_confirm', 'confirmed')
    and now() < s.starts_at) as can_decide,
  (s.status in ('recruiting', 'confirmed')
    and s.display_status in ('recruiting', 'awaiting_confirm', 'confirmed')
    and now() < s.starts_at
    and s.accepted_count < s.capacity) as can_approve,
  case
    when s.status not in ('recruiting', 'confirmed') then null
    when s.display_status not in ('recruiting', 'awaiting_confirm', 'confirmed') then null
    when now() >= s.starts_at then 'started'
    when s.accepted_count >= s.capacity then 'full'
  end as approve_blocked_reason,
  s.min_participants,
  s.confirm_deadline_at,
  s.display_status,
  s.cancel_reason,
  s.needed_count
from public.socialing_summaries s
where s.host_id = (select auth.uid());

-- 권한은 그대로: 목록·상세는 모두 읽기만, "나" 기준 뷰는 로그인한 사람만 읽기만
revoke all on public.socialing_summaries from anon, authenticated;
grant select on public.socialing_summaries to anon, authenticated;
revoke all on public.my_applied_socialings from anon, authenticated;
grant select on public.my_applied_socialings to authenticated;
revoke all on public.my_hosted_socialings from anon, authenticated;
grant select on public.my_hosted_socialings to authenticated;
