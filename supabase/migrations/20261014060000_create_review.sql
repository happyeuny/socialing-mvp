-- MS5 create_review: 인증 후기 쓰기 (architecture 5장, spec 3.4·M9·6장)
-- 참여 확정자가 종료된 소셜링에 한 번 쓴다. 글(앞뒤 공백을 뺀 10~500자)과 비공개 확인 질문 3개(예/아니오)는 필수,
-- 사진은 선택이다. 후기와 비공개 응답(review_checks)을 함께 저장하고, 비공개 응답은 돌려주지 않는다.
-- 사진 경로는 쓰는 사람 폴더(`<사용자 id>/파일명`)에 실제로 올라간 review-photos 파일만 받는다.
-- 남이 올린 사진을 자기 후기에 붙일 수 없게 한다.
-- 실패하면 오류 코드를 message로 던진다(errcode P0001). 화면 문구는 서버 액션이 붙인다.
--   NOT_AUTHENTICATED, INVALID_INPUT(없는 소셜링, 글 길이, 빠진 답, 받을 수 없는 사진 경로),
--   NOT_ELIGIBLE(그 소셜링의 참여 확정자가 아님. 호스트 본인 포함), INVALID_STATE(종료 전),
--   ALREADY_REVIEWED(이미 씀)
-- 성공하면 만든 후기 행을 돌려준다.

create function public.create_review(
  p_socialing_id bigint,
  p_body text,
  p_photo_path text,
  p_members_match boolean,
  p_extra_money boolean,
  p_content_match boolean
)
returns public.reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_status public.socialing_status;
  -- 앞뒤 공백·줄바꿈을 뺀 글 (화면의 글자 수와 같은 기준)
  v_body text := regexp_replace(coalesce(p_body, ''), '^\s+|\s+$', '', 'g');
  v_photo_path text := nullif(btrim(coalesce(p_photo_path, '')), '');
  v_review public.reviews;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHENTICATED';
  end if;

  select status into v_status
  from public.socialings
  where id = p_socialing_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  -- 작성 조건 (spec 3.4): 참여 확정자 → 종료 → 아직 안 씀
  if not exists (
    select 1 from public.applications
    where socialing_id = p_socialing_id
      and user_id = v_user_id
      and status = 'accepted'
  ) then
    raise exception using errcode = 'P0001', message = 'NOT_ELIGIBLE';
  end if;

  if v_status <> 'completed' then
    raise exception using errcode = 'P0001', message = 'INVALID_STATE';
  end if;

  if exists (
    select 1 from public.reviews
    where socialing_id = p_socialing_id
      and user_id = v_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'ALREADY_REVIEWED';
  end if;

  -- 입력 (spec M9, 6장)
  if char_length(v_body) not between 10 and 500
    or p_members_match is null
    or p_extra_money is null
    or p_content_match is null then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  if v_photo_path is not null and not exists (
    select 1 from storage.objects
    where bucket_id = 'review-photos'
      and name = v_photo_path
      and (storage.foldername(name))[1] = v_user_id::text
      and array_length(storage.foldername(name), 1) = 1
  ) then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  begin
    insert into public.reviews (socialing_id, user_id, body, photo_path)
    values (p_socialing_id, v_user_id, v_body, v_photo_path)
    returning * into v_review;
  exception
    -- 같은 사람이 동시에 두 번 올림 (reviews_one_per_user)
    when unique_violation then
      raise exception using errcode = 'P0001', message = 'ALREADY_REVIEWED';
  end;

  insert into public.review_checks (review_id, members_match, extra_money, content_match)
  values (v_review.id, p_members_match, p_extra_money, p_content_match);

  return v_review;
end;
$$;

revoke execute on function public.create_review(bigint, text, text, boolean, boolean, boolean) from public, anon;
grant execute on function public.create_review(bigint, text, text, boolean, boolean, boolean) to authenticated;
