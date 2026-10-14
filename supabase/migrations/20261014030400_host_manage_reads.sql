-- MS4 소셜링 관리(P11) 읽기 (architecture 3.2, spec 8.8)
-- 관리 화면의 버튼을 보일지·막을지와 막힌 이유를 DB가 계산한다(AGENTS.md 코드 규칙). 함수(confirm_socialing,
-- complete_socialing, cancel_socialing, decide_application)와 같은 조건이고, 화면은 이 값을 그대로 쓴다.
-- 둘 다 보는 사람 권한(security_invoker)으로 읽고, 로그인한 사람만 SELECT할 수 있다.

-- 호스트인 소셜링(MS3)에 관리 화면 칸을 더한다. 앞의 칸은 그대로 두고 뒤에만 붙인다.
--   closed_count             거절·취소 탭 건수: 사람마다 가장 최근 신청이 거절·신청 취소인 사람 수
--   can_confirm              확정 가능: 모집중 + 소셜링 일시 전
--   confirm_blocked_reason   'started'(모집중인데 일시 지남) / null
--   can_complete             종료 가능: 확정 + 소셜링 일시 뒤
--   complete_blocked_reason  'confirm_first'(모집중·일시 전) / 'not_confirmed'(모집중·일시 지남) /
--                            'not_started'(확정·일시 전) / null(종료 가능, 또는 이미 종료·호스트 취소)
--   can_cancel               호스트 취소 가능: 종료·호스트 취소 전
--   can_edit                 수정 가능: 종료·호스트 취소 전 (P08은 MS7)
--   can_decide               승인 대기 신청에 승인·거절 가능: 종료·호스트 취소 전 + 소셜링 일시 전
--   can_approve              승인 가능: can_decide + 참여 확정 인원 < 정원
--   approve_blocked_reason   'started'(일시 지남) / 'full'(정원 참) / null
-- 승인 대기·참여 확정은 한 사람에 하나뿐이라(부분 유니크 인덱스) pending_count·accepted_count는
-- 사람마다 가장 최근 신청으로 센 값과 같다.
create or replace view public.my_hosted_socialings
with (security_invoker = true)
as
select
  s.*,
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
  (s.status = 'recruiting' and now() < s.starts_at) as can_confirm,
  case
    when s.status = 'recruiting' and now() >= s.starts_at then 'started'
  end as confirm_blocked_reason,
  (s.status = 'confirmed' and now() >= s.starts_at) as can_complete,
  case
    when s.status = 'recruiting' and now() < s.starts_at then 'confirm_first'
    when s.status = 'recruiting' then 'not_confirmed'
    when s.status = 'confirmed' and now() < s.starts_at then 'not_started'
  end as complete_blocked_reason,
  (s.status in ('recruiting', 'confirmed')) as can_cancel,
  (s.status in ('recruiting', 'confirmed')) as can_edit,
  (s.status in ('recruiting', 'confirmed') and now() < s.starts_at) as can_decide,
  (s.status in ('recruiting', 'confirmed') and now() < s.starts_at and s.accepted_count < s.capacity) as can_approve,
  case
    when s.status not in ('recruiting', 'confirmed') then null
    when now() >= s.starts_at then 'started'
    when s.accepted_count >= s.capacity then 'full'
  end as approve_blocked_reason
from public.socialing_summaries s
where s.host_id = (select auth.uid());

-- 신청자 목록: 내가 호스트인 소셜링의 신청자마다 가장 최근 신청 하나 (거절 뒤 다시 신청하면 새 신청이 보인다)
--   application_id  승인·거절 함수에 넘긴다
--   nickname        신청자 닉네임 (profiles는 닉네임만 공개)
--   status          pending / accepted / rejected / canceled. 소셜링이 호스트 취소되어도 바꾸지 않는다(spec 3.3)
--   applied_at      신청 일시
-- applications는 본인과 그 소셜링의 호스트만 읽는다(RLS). 여기서는 호스트인 소셜링으로 한 번 더 좁혀
-- 신청자 본인에게는 이 뷰가 비어 보인다.
create view public.hosted_socialing_applicants
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
  a.canceled_at
from public.applications a
join public.socialings s on s.id = a.socialing_id
join public.profiles p on p.id = a.user_id
where s.host_id = (select auth.uid())
order by a.socialing_id, a.user_id, a.id desc;

revoke all on public.hosted_socialing_applicants from anon, authenticated;
grant select on public.hosted_socialing_applicants to authenticated;
