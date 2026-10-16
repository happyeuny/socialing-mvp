-- MS14 create_socialing_v2 · update_socialing_v2: 2묶음 칸을 받는 소셜링 등록·수정 (architecture 5장, spec M8·6장·8.6 P07·P08)
-- 같은 이름에 인자를 더하면 함수가 둘로 겹쳐 main 코드의 호출이 깨진다(AGENTS.md 마이그레이션은 추가만). 그래서 새 이름으로 만들고,
-- 옛 create_socialing·update_socialing은 MS14가 main에 들어간 뒤 MS15 첫 PR에서 지운다.
-- 지금 등록·수정의 검사는 그대로(private.check_socialing_input·check_socialing_place 등, MS7)이고 아래를 더한다.
--   참가비 설명(U3)  앞뒤 공백을 뺀 100자까지. 총 참가비가 0보다 크면 비울 수 없다. 비면 null
--   승인 기준(U5)    호스트 승인이면 비울 수 없다(지금은 선택). 200자는 그대로
--   연령 조건(SH1b)  호스트 승인일 때만 남긴다(선착순이면 버림). 각각 null이거나 1~99, 최소 ≤ 최대. 둘 다 null = 제한 없음
--   자료 링크(SH3)   null·빈칸이거나, https://로 시작하고 공백 없이 주소 이름에 점이 있는 500자 이하 주소
--   수정 잠금        참여 확정자가 있으면 이미 적힌 참가비 설명을 바꿀 수 없다(LOCKED_FIELD). 비어 있던 설명은 채울 수 있다
--                    (설명 없이 만든 옛 유료 소셜링이 확정자가 생긴 뒤 아무것도 고칠 수 없게 되지 않게)
-- 실패하면 오류 코드를 message로 던진다(errcode P0001). 화면 문구는 서버 액션이 붙인다.

-- 2묶음 입력 범위. 부르는 쪽이 check_socialing_input을 먼저 부른다
create function private.check_socialing_extra(
  p_fee integer,
  p_fee_note text,
  p_join_type public.join_type,
  p_approval_criteria text,
  p_min_age integer,
  p_max_age integer,
  p_material_url text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_fee_note text := private.trimmed(p_fee_note);
  v_material_url text := private.trimmed(p_material_url);
begin
  if char_length(v_fee_note) > 100
    or (p_fee > 0 and v_fee_note = '')
    or (p_join_type = 'approval' and private.trimmed(p_approval_criteria) = '')
    or (p_join_type = 'approval' and (
      (p_min_age is not null and p_min_age not between 1 and 99)
      or (p_max_age is not null and p_max_age not between 1 and 99)
      or coalesce(p_min_age > p_max_age, false)
    ))
    or (v_material_url <> '' and (
      char_length(v_material_url) > 500
      or v_material_url !~ '^https://[^\s/?#@]+\.[^\s/?#@]+([/?#]\S*)?$'
    )) then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;
end;
$$;

create function public.create_socialing_v2(
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
    fee_note, min_age, max_age, material_url
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
    nullif(private.trimmed(p_material_url), '')
  )
  returning * into v_socialing;

  return v_socialing;
end;
$$;

create function public.update_socialing_v2(
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

  -- 참가비 설명은 총 참가비처럼 잠그되, 비어 있던 설명은 채울 수 있다
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
      fee = p_fee,
      capacity = p_capacity,
      staff_count = p_staff_count,
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

revoke execute on function public.create_socialing_v2(
  text, text, bigint, boolean, bigint, text, text, timestamptz, timestamptz, integer, integer, integer,
  public.join_type, text, text, text, integer, integer, text
) from public, anon;
grant execute on function public.create_socialing_v2(
  text, text, bigint, boolean, bigint, text, text, timestamptz, timestamptz, integer, integer, integer,
  public.join_type, text, text, text, integer, integer, text
) to authenticated;

revoke execute on function public.update_socialing_v2(
  bigint, text, text, bigint, boolean, bigint, text, text, timestamptz, timestamptz, integer, integer, integer,
  public.join_type, text, text, text, integer, integer, text
) from public, anon;
grant execute on function public.update_socialing_v2(
  bigint, text, text, bigint, boolean, bigint, text, text, timestamptz, timestamptz, integer, integer, integer,
  public.join_type, text, text, text, integer, integer, text
) to authenticated;

-- 도우미는 등록·수정 함수 안에서만 쓴다
revoke all on all functions in schema private from public, anon, authenticated;
