-- MS7 update_socialing: 소셜링 수정 (architecture 5장, spec M8·6장·8.6 P08)
-- 그 소셜링의 호스트가 종료·호스트 취소 전(모집중·확정) 소셜링을 고친다. 입력 범위와 장소 입력은 등록과 같다.
-- 잠금:
--   참여 확정자가 있으면 소셜링 일시·장소·총 참가비를 바꿀 수 없다 (LOCKED_FIELD)
--   승인 대기 신청이 있으면 모집 방식을 바꿀 수 없다 (LOCKED_FIELD, EUNI 결정 2026-10-14)
--   정원은 참여 확정 인원보다 적게 할 수 없다 (BELOW_ACCEPTED)
-- 소셜링 일시와 신청 마감 일시는 화면이 분 단위로 보내서, 같은 분이면 바꾸지 않은 것으로 보고 지금 값을 그대로 둔다.
-- 소셜링 일시가 지금 이후인지는 바꿀 때만 본다(이미 지난 소셜링도 일시를 그대로 두면 다른 칸을 고칠 수 있다).
-- 장소는 지금과 같으면 그대로 두고, 바뀐 외부 장소는 새 행을 만든다.
-- 대표 사진은 지금 경로 그대로 · 지움(null) · 쓰는 사람 폴더에 실제로 올라간 새 파일.
-- 신청·승인과 같은 줄에 서도록 소셜링 행을 FOR UPDATE로 잠근 뒤 인원을 센다.
-- 실패하면 오류 코드를 message로 던진다(errcode P0001). 화면 문구는 서버 액션이 붙인다.
--   NOT_AUTHENTICATED, INVALID_INPUT(없는 소셜링, 입력 범위, 장소, 지난 소셜링 일시, 받을 수 없는 사진 경로),
--   NOT_HOST, INVALID_STATE(종료·호스트 취소), LOCKED_FIELD, BELOW_ACCEPTED
-- 성공하면 바뀐 소셜링 행을 돌려준다.

create function public.update_socialing(
  p_socialing_id bigint,
  p_title text,
  p_description text,
  p_category_id bigint,
  p_has_alcohol boolean,
  p_branch_id bigint,
  p_region_code text,
  p_place_name text,
  p_starts_at timestamptz,
  p_apply_deadline_at timestamptz,
  p_fee integer,
  p_capacity integer,
  p_staff_count integer,
  p_join_type public.join_type,
  p_approval_criteria text,
  p_cover_photo_path text
)
returns public.socialings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_photo_path text := nullif(btrim(coalesce(p_cover_photo_path, '')), '');
  v_socialing public.socialings;
  v_accepted_count integer;
  v_pending_count integer;
  v_starts_at timestamptz;
  v_apply_deadline_at timestamptz;
  v_same_place boolean;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHENTICATED';
  end if;

  select * into v_socialing
  from public.socialings
  where id = p_socialing_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  if v_socialing.host_id <> v_user_id then
    raise exception using errcode = 'P0001', message = 'NOT_HOST';
  end if;

  if v_socialing.status not in ('recruiting', 'confirmed') then
    raise exception using errcode = 'P0001', message = 'INVALID_STATE';
  end if;

  -- 같은 분이면 바꾸지 않은 것 (지금 값을 그대로 둔다)
  v_starts_at := case
    when date_trunc('minute', p_starts_at) = date_trunc('minute', v_socialing.starts_at) then v_socialing.starts_at
    else p_starts_at
  end;
  v_apply_deadline_at := case
    when date_trunc('minute', p_apply_deadline_at) = date_trunc('minute', v_socialing.apply_deadline_at)
      then v_socialing.apply_deadline_at
    else p_apply_deadline_at
  end;

  perform private.check_socialing_input(
    p_title, p_description, p_category_id, p_has_alcohol, v_starts_at, v_apply_deadline_at,
    p_fee, p_capacity, p_staff_count, p_join_type, p_approval_criteria
  );
  perform private.check_socialing_place(p_branch_id, p_region_code, p_place_name);

  if v_starts_at <> v_socialing.starts_at and v_starts_at <= now() then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  if v_photo_path is not null
    and v_photo_path is distinct from v_socialing.cover_photo_path
    and not private.is_own_socialing_photo(v_photo_path, v_user_id) then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select
    count(*) filter (where status = 'accepted'),
    count(*) filter (where status = 'pending')
  into v_accepted_count, v_pending_count
  from public.applications
  where socialing_id = p_socialing_id;

  v_same_place := private.is_same_place(v_socialing.venue_id, p_branch_id, p_region_code, p_place_name);

  if v_accepted_count > 0
    and (v_starts_at <> v_socialing.starts_at or not v_same_place or p_fee <> v_socialing.fee) then
    raise exception using errcode = 'P0001', message = 'LOCKED_FIELD';
  end if;

  if v_pending_count > 0 and p_join_type <> v_socialing.join_type then
    raise exception using errcode = 'P0001', message = 'LOCKED_FIELD';
  end if;

  if p_capacity < v_accepted_count then
    raise exception using errcode = 'P0001', message = 'BELOW_ACCEPTED';
  end if;

  update public.socialings
  set title = private.trimmed(p_title),
      description = private.trimmed(p_description),
      category_id = p_category_id,
      has_alcohol = p_has_alcohol,
      venue_id = case
        when v_same_place then v_socialing.venue_id
        else private.socialing_venue_id(p_branch_id, p_region_code, p_place_name)
      end,
      starts_at = v_starts_at,
      apply_deadline_at = v_apply_deadline_at,
      fee = p_fee,
      capacity = p_capacity,
      staff_count = p_staff_count,
      join_type = p_join_type,
      approval_criteria = case when p_join_type = 'approval' then nullif(private.trimmed(p_approval_criteria), '') end,
      cover_photo_path = v_photo_path
  where id = p_socialing_id
  returning * into v_socialing;

  return v_socialing;
end;
$$;

revoke execute on function public.update_socialing(
  bigint, text, text, bigint, boolean, bigint, text, text, timestamptz, timestamptz, integer, integer, integer,
  public.join_type, text, text
) from public, anon;
grant execute on function public.update_socialing(
  bigint, text, text, bigint, boolean, bigint, text, text, timestamptz, timestamptz, integer, integer, integer,
  public.join_type, text, text
) to authenticated;
