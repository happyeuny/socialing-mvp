-- MS15 create_socialing_v3 · update_socialing_v3: 최소 인원·확정 기한을 받는 소셜링 등록·수정 (U4, architecture 5장, spec M8·6장·8.6)
-- 같은 이름에 인자를 더하면 함수가 둘로 겹쳐 main 코드의 호출이 깨진다(AGENTS.md 마이그레이션은 추가만). 그래서 새 이름으로 만들고,
-- MS14의 _v2는 MS15가 main에 들어간 뒤 MS16 첫 PR에서 지운다. _v2의 검사는 그대로이고 아래를 더한다.
--   최소 인원        2명부터 정원까지. 비우면 INVALID_INPUT
--   확정 기한        신청 마감 ≤ 확정 기한 ≤ 소셜링 일시 − 12시간. 비우면 INVALID_INPUT.
--                    수정에서는 세 일시(소셜링 일시·신청 마감·확정 기한) 중 하나를 바꿀 때만 본다(같은 분이면 바꾸지 않은 것)
--   수정 잠금        참여 확정자가 있으면 최소 인원·확정 기한을 바꿀 수 없다(LOCKED_FIELD). 참여자가 믿은 "언제 정해지나"를 지킨다
--   계산 취소        보이는 상태가 취소·호스트 취소(계산, socialing_display_status)면 수정할 수 없다(AUTO_CANCELED)
-- 실패하면 오류 코드를 message로 던진다(errcode P0001). 화면 문구는 서버 액션이 붙인다.
--
-- 같은 파일에서: 옛 create_socialing·update_socialing(MS7)을 지운다(MS14가 main에 들어가 main 코드가 더는 부르지 않음, 03 10.1 약속).
-- _v2는 MS16까지 남으므로, 확정 기한이 not null이 된 뒤에도 동작하게 고친다(인자·돌려주는 칸은 그대로):
--   등록은 확정 기한 = 신청 마감, 수정은 확정 기한을 신청 마감 ~ 소셜링 일시 안으로 맞추고 최소 인원은 정원보다 크지 않게.

drop function public.create_socialing(
  text, text, bigint, boolean, bigint, text, text, timestamptz, timestamptz, integer, integer, integer,
  public.join_type, text, text
);

drop function public.update_socialing(
  bigint, text, text, bigint, boolean, bigint, text, text, timestamptz, timestamptz, integer, integer, integer,
  public.join_type, text, text
);

-- 3묶음 입력 범위(최소 인원, 세 일시의 순서와 12시간). 부르는 쪽이 check_socialing_input을 먼저 부른다
create function private.check_socialing_schedule(
  p_starts_at timestamptz,
  p_apply_deadline_at timestamptz,
  p_confirm_deadline_at timestamptz
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_confirm_deadline_at is null
    or p_confirm_deadline_at < p_apply_deadline_at
    or p_confirm_deadline_at > p_starts_at - interval '12 hours' then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;
end;
$$;

create function public.create_socialing_v3(
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
  p_cover_photo_path text,
  p_fee_note text default null,
  p_min_age integer default null,
  p_max_age integer default null,
  p_material_url text default null,
  p_min_participants integer default null,
  p_confirm_deadline_at timestamptz default null
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
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHENTICATED';
  end if;

  perform private.check_socialing_input(
    p_title, p_description, p_category_id, p_has_alcohol, p_starts_at, p_apply_deadline_at,
    p_fee, p_capacity, p_staff_count, p_join_type, p_approval_criteria
  );
  perform private.check_socialing_extra(
    p_fee, p_fee_note, p_join_type, p_approval_criteria, p_min_age, p_max_age, p_material_url
  );
  perform private.check_socialing_place(p_branch_id, p_region_code, p_place_name);

  if p_min_participants is null or p_min_participants not between 2 and p_capacity then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;
  perform private.check_socialing_schedule(p_starts_at, p_apply_deadline_at, p_confirm_deadline_at);

  -- 소셜링 일시는 지금 이후 (spec 8.6 P07)
  if p_starts_at <= now() then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  if v_photo_path is not null and not private.is_own_socialing_photo(v_photo_path, v_user_id) then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  insert into public.socialings (
    host_id, title, description, category_id, has_alcohol, venue_id,
    starts_at, apply_deadline_at, fee, capacity, staff_count, join_type, approval_criteria, cover_photo_path,
    fee_note, min_age, max_age, material_url, min_participants, confirm_deadline_at
  )
  values (
    v_user_id,
    private.trimmed(p_title),
    private.trimmed(p_description),
    p_category_id,
    p_has_alcohol,
    private.socialing_venue_id(p_branch_id, p_region_code, p_place_name),
    p_starts_at,
    p_apply_deadline_at,
    p_fee,
    p_capacity,
    p_staff_count,
    p_join_type,
    -- 승인 기준·연령 조건은 호스트 승인일 때만
    case when p_join_type = 'approval' then nullif(private.trimmed(p_approval_criteria), '') end,
    v_photo_path,
    nullif(private.trimmed(p_fee_note), ''),
    case when p_join_type = 'approval' then p_min_age end,
    case when p_join_type = 'approval' then p_max_age end,
    nullif(private.trimmed(p_material_url), ''),
    p_min_participants,
    p_confirm_deadline_at
  )
  returning * into v_socialing;

  return v_socialing;
end;
$$;

create function public.update_socialing_v3(
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
  p_cover_photo_path text,
  p_fee_note text default null,
  p_min_age integer default null,
  p_max_age integer default null,
  p_material_url text default null,
  p_min_participants integer default null,
  p_confirm_deadline_at timestamptz default null
)
returns public.socialings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_photo_path text := nullif(btrim(coalesce(p_cover_photo_path, '')), '');
  v_fee_note text := nullif(private.trimmed(p_fee_note), '');
  v_socialing public.socialings;
  v_accepted_count integer;
  v_pending_count integer;
  v_starts_at timestamptz;
  v_apply_deadline_at timestamptz;
  v_confirm_deadline_at timestamptz;
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

  if public.socialing_display_status(p_socialing_id) in ('host_canceled', 'auto_canceled') then
    raise exception using errcode = 'P0001', message = 'AUTO_CANCELED';
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
  v_confirm_deadline_at := case
    when date_trunc('minute', p_confirm_deadline_at) = date_trunc('minute', v_socialing.confirm_deadline_at)
      then v_socialing.confirm_deadline_at
    else p_confirm_deadline_at
  end;

  perform private.check_socialing_input(
    p_title, p_description, p_category_id, p_has_alcohol, v_starts_at, v_apply_deadline_at,
    p_fee, p_capacity, p_staff_count, p_join_type, p_approval_criteria
  );
  perform private.check_socialing_extra(
    p_fee, p_fee_note, p_join_type, p_approval_criteria, p_min_age, p_max_age, p_material_url
  );
  perform private.check_socialing_place(p_branch_id, p_region_code, p_place_name);

  if p_min_participants is null or p_min_participants not between 2 and p_capacity
    or v_confirm_deadline_at is null then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  -- 세 일시 중 하나를 바꿀 때만 순서와 12시간을 본다 (MS15 전에 만든 소셜링은 확정 기한 = 신청 마감이라 12시간을 못 채울 수 있다)
  if v_starts_at <> v_socialing.starts_at
    or v_apply_deadline_at <> v_socialing.apply_deadline_at
    or v_confirm_deadline_at <> v_socialing.confirm_deadline_at then
    perform private.check_socialing_schedule(v_starts_at, v_apply_deadline_at, v_confirm_deadline_at);
  end if;

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

  -- 참가비 설명은 총 참가비처럼 잠그되, 비어 있던 설명은 채울 수 있다 (MS14)
  if v_accepted_count > 0
    and v_socialing.fee_note is not null
    and v_fee_note is distinct from v_socialing.fee_note then
    raise exception using errcode = 'P0001', message = 'LOCKED_FIELD';
  end if;

  -- 최소 인원·확정 기한은 참여 확정자가 있으면 잠근다 (MS15)
  if v_accepted_count > 0
    and (p_min_participants <> v_socialing.min_participants
      or v_confirm_deadline_at <> v_socialing.confirm_deadline_at) then
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
      confirm_deadline_at = v_confirm_deadline_at,
      fee = p_fee,
      capacity = p_capacity,
      staff_count = p_staff_count,
      min_participants = p_min_participants,
      join_type = p_join_type,
      approval_criteria = case when p_join_type = 'approval' then nullif(private.trimmed(p_approval_criteria), '') end,
      cover_photo_path = v_photo_path,
      fee_note = v_fee_note,
      -- 선착순으로 바꾸면 연령 조건도 지운다(승인 기준과 같음)
      min_age = case when p_join_type = 'approval' then p_min_age end,
      max_age = case when p_join_type = 'approval' then p_max_age end,
      material_url = nullif(private.trimmed(p_material_url), '')
  where id = p_socialing_id
  returning * into v_socialing;

  return v_socialing;
end;
$$;

revoke execute on function public.create_socialing_v3(
  text, text, bigint, boolean, bigint, text, text, timestamptz, timestamptz, integer, integer, integer,
  public.join_type, text, text, text, integer, integer, text, integer, timestamptz
) from public, anon;
grant execute on function public.create_socialing_v3(
  text, text, bigint, boolean, bigint, text, text, timestamptz, timestamptz, integer, integer, integer,
  public.join_type, text, text, text, integer, integer, text, integer, timestamptz
) to authenticated;

revoke execute on function public.update_socialing_v3(
  bigint, text, text, bigint, boolean, bigint, text, text, timestamptz, timestamptz, integer, integer, integer,
  public.join_type, text, text, text, integer, integer, text, integer, timestamptz
) from public, anon;
grant execute on function public.update_socialing_v3(
  bigint, text, text, bigint, boolean, bigint, text, text, timestamptz, timestamptz, integer, integer, integer,
  public.join_type, text, text, text, integer, integer, text, integer, timestamptz
) to authenticated;

-- _v2(MS14)는 MS16 첫 PR에서 지울 때까지 그대로 동작하게 한다. 검사는 MS14 그대로이고, 새 칸만 채운다.
create or replace function public.create_socialing_v2(
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
  p_cover_photo_path text,
  p_fee_note text default null,
  p_min_age integer default null,
  p_max_age integer default null,
  p_material_url text default null
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
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHENTICATED';
  end if;

  perform private.check_socialing_input(
    p_title, p_description, p_category_id, p_has_alcohol, p_starts_at, p_apply_deadline_at,
    p_fee, p_capacity, p_staff_count, p_join_type, p_approval_criteria
  );
  perform private.check_socialing_extra(
    p_fee, p_fee_note, p_join_type, p_approval_criteria, p_min_age, p_max_age, p_material_url
  );
  perform private.check_socialing_place(p_branch_id, p_region_code, p_place_name);

  if p_starts_at <= now() then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  if v_photo_path is not null and not private.is_own_socialing_photo(v_photo_path, v_user_id) then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  insert into public.socialings (
    host_id, title, description, category_id, has_alcohol, venue_id,
    starts_at, apply_deadline_at, fee, capacity, staff_count, join_type, approval_criteria, cover_photo_path,
    fee_note, min_age, max_age, material_url, confirm_deadline_at
  )
  values (
    v_user_id,
    private.trimmed(p_title),
    private.trimmed(p_description),
    p_category_id,
    p_has_alcohol,
    private.socialing_venue_id(p_branch_id, p_region_code, p_place_name),
    p_starts_at,
    p_apply_deadline_at,
    p_fee,
    p_capacity,
    p_staff_count,
    p_join_type,
    case when p_join_type = 'approval' then nullif(private.trimmed(p_approval_criteria), '') end,
    v_photo_path,
    nullif(private.trimmed(p_fee_note), ''),
    case when p_join_type = 'approval' then p_min_age end,
    case when p_join_type = 'approval' then p_max_age end,
    nullif(private.trimmed(p_material_url), ''),
    -- 확정 기한을 받지 않으므로 신청 마감과 같게 (최소 인원은 기본값 2)
    p_apply_deadline_at
  )
  returning * into v_socialing;

  return v_socialing;
end;
$$;

create or replace function public.update_socialing_v2(
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
  p_cover_photo_path text,
  p_fee_note text default null,
  p_min_age integer default null,
  p_max_age integer default null,
  p_material_url text default null
)
returns public.socialings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_photo_path text := nullif(btrim(coalesce(p_cover_photo_path, '')), '');
  v_fee_note text := nullif(private.trimmed(p_fee_note), '');
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
  perform private.check_socialing_extra(
    p_fee, p_fee_note, p_join_type, p_approval_criteria, p_min_age, p_max_age, p_material_url
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

  if v_accepted_count > 0
    and v_socialing.fee_note is not null
    and v_fee_note is distinct from v_socialing.fee_note then
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
      -- 확정 기한·최소 인원을 받지 않으므로 바뀐 일시·정원 안으로만 맞춘다 (신청 마감 ≤ 확정 기한 ≤ 일시, 최소 인원 ≤ 정원)
      confirm_deadline_at = least(greatest(v_socialing.confirm_deadline_at, v_apply_deadline_at), v_starts_at),
      min_participants = least(v_socialing.min_participants, p_capacity),
      fee = p_fee,
      capacity = p_capacity,
      staff_count = p_staff_count,
      join_type = p_join_type,
      approval_criteria = case when p_join_type = 'approval' then nullif(private.trimmed(p_approval_criteria), '') end,
      cover_photo_path = v_photo_path,
      fee_note = v_fee_note,
      min_age = case when p_join_type = 'approval' then p_min_age end,
      max_age = case when p_join_type = 'approval' then p_max_age end,
      material_url = nullif(private.trimmed(p_material_url), '')
  where id = p_socialing_id
  returning * into v_socialing;

  return v_socialing;
end;
$$;

-- 도우미는 등록·수정 함수 안에서만 쓴다
revoke all on all functions in schema private from public, anon, authenticated;
