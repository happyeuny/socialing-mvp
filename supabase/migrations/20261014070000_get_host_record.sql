-- MS6 get_host_record: 호스트 기록 집계 (architecture 3.2, spec M5·6장)
-- 상세(P03)의 호스트 영역이 부른다. 비로그인도 본다. 합계만 돌려주고 개별 비공개 응답은 어떤 경로로도 나가지 않는다.
-- review_checks와 applications는 보는 사람이 직접 읽을 수 없으므로 SECURITY DEFINER로 센다.
--
-- 집계 기간: 최근 6개월 = 소셜링 일시가 6개월 전 이후인 소셜링(앞으로 열릴 소셜링 포함. 앞으로 열릴 소셜링을
-- 호스트 취소해도 바로 센다). 시드 쪽 계산(scripts/seed-data.mts hostRecordFromSeed)과 같은 규칙이다.
--   opened_count    열린 소셜링: 종료 상태이고 참여 확정자가 1명 이상
--   canceled_count  호스트 취소: 호스트 취소된 소셜링 중 승인 대기·참여 확정 신청이 있던 것
--                   (호스트 취소 뒤에는 신청 상태가 바뀌지 않으므로 지금 남은 pending·accepted 신청으로 판단한다)
--   review_count    후기 수: 그 소셜링들의 인증 후기
--   response_count  비공개 확인 응답 수
--   match_rate      소개 일치 비율: ①예 ②아니오 ③예 를 모두 만족한 응답의 비율(0~1, 반올림 안 함).
--                   응답 5건 이상일 때만, 아니면 null
--   is_new_host     새 호스트: 열린 소셜링 3회 미만

create function public.get_host_record(p_host_id uuid)
returns table (
  opened_count integer,
  canceled_count integer,
  review_count integer,
  response_count integer,
  match_rate numeric,
  is_new_host boolean
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
    counts.opened_count < 3
  from counts;
$$;

revoke execute on function public.get_host_record(uuid) from public;
grant execute on function public.get_host_record(uuid) to anon, authenticated;
