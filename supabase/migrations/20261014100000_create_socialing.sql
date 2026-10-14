-- MS7 create_socialing: 소셜링 등록 (architecture 5장, spec M8·6장)
-- 로그인한 사람이 호스트가 되어 모집중 소셜링을 연다.
-- 장소는 둘 중 하나: 스터디지점 하나(p_branch_id) / 지역(시·군·구 코드) + 장소 이름(외부 장소를 새로 만든다).
-- 승인 기준은 호스트 승인일 때만 남긴다(선착순이면 버린다). 대표 사진은 없거나, 쓰는 사람 폴더(`<사용자 id>/파일명`)에
-- 실제로 올라간 socialing-photos 파일만 받는다.
-- 실패하면 오류 코드를 message로 던진다(errcode P0001). 화면 문구는 서버 액션이 붙인다.
--   NOT_AUTHENTICATED, INVALID_INPUT(입력 범위, 장소, 지난 소셜링 일시, 받을 수 없는 사진 경로)
-- 성공하면 만든 소셜링 행을 돌려준다.
--
-- 등록·수정(update_socialing)이 같이 쓰는 검사는 private 스키마에 둔다. private는 API로 열리지 않는다.

create schema if not exists private;

-- 앞뒤 공백·줄바꿈을 뺀 글 (화면의 글자 수와 같은 기준)
create function private.trimmed(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(coalesce(p_value, ''), '^\s+|\s+$', '', 'g');
$$;

-- 장소를 뺀 입력 범위 (spec 6장). 소셜링 일시가 지금 이후인지는 부르는 쪽이 본다(수정은 바꿀 때만).
create function private.check_socialing_input(
  p_title text,
  p_description text,
  p_category_id bigint,
  p_has_alcohol boolean,
  p_starts_at timestamptz,
  p_apply_deadline_at timestamptz,
  p_fee integer,
  p_capacity integer,
  p_staff_count integer,
  p_join_type public.join_type,
  p_approval_criteria text
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if char_length(private.trimmed(p_title)) not between 1 and 40
    or char_length(private.trimmed(p_description)) not between 20 and 1000
    or not exists (select 1 from public.categories where id = p_category_id)
    or p_has_alcohol is null
    or p_starts_at is null
    or p_apply_deadline_at is null
    or p_apply_deadline_at > p_starts_at
    or p_fee is null or p_fee not between 0 and 1000000
    or p_capacity is null or p_capacity not between 2 and 20
    or p_staff_count is null or p_staff_count not between 0 and 20
    or p_join_type is null
    or char_length(private.trimmed(p_approval_criteria)) > 200 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;
end;
$$;

-- 장소 입력: 스터디지점 하나, 또는 지역(시·군·구 코드) + 장소 이름 1~40자. 둘 다이거나 둘 다 없으면 INVALID_INPUT
create function private.check_socialing_place(p_branch_id bigint, p_region_code text, p_place_name text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_branch_id is not null then
    if p_region_code is not null or p_place_name is not null
      or not exists (select 1 from public.venues where id = p_branch_id and type = 'branch') then
      raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
    end if;
  elsif not exists (select 1 from public.regions where code = p_region_code)
    or char_length(private.trimmed(p_place_name)) not between 1 and 40 then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;
end;
$$;

-- 지금 장소(p_venue_id)와 입력한 장소가 같은지. 외부 장소는 지역과 이름(앞뒤 공백 뺌)이 같으면 같은 장소다
create function private.is_same_place(p_venue_id bigint, p_branch_id bigint, p_region_code text, p_place_name text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when p_branch_id is not null then p_venue_id = p_branch_id
    else exists (
      select 1
      from public.venues v
      join public.regions r on r.id = v.region_id
      where v.id = p_venue_id
        and v.type = 'external'
        and r.code = p_region_code
        and v.name = private.trimmed(p_place_name)
    )
  end;
$$;

-- 입력한 장소의 venue id. 외부 장소는 새 행을 만든다 (check_socialing_place를 먼저 통과한 입력만 넘긴다)
create function private.socialing_venue_id(p_branch_id bigint, p_region_code text, p_place_name text)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_venue_id bigint;
begin
  if p_branch_id is not null then
    return p_branch_id;
  end if;

  insert into public.venues (type, name, region_id)
  select 'external', private.trimmed(p_place_name), id
  from public.regions
  where code = p_region_code
  returning id into v_venue_id;

  return v_venue_id;
end;
$$;

-- 사진 경로가 그 사람 폴더에 실제로 올라간 socialing-photos 파일인지
create function private.is_own_socialing_photo(p_path text, p_user_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from storage.objects
    where bucket_id = 'socialing-photos'
      and name = p_path
      and (storage.foldername(name))[1] = p_user_id::text
      and array_length(storage.foldername(name), 1) = 1
  );
$$;

create function public.create_socialing(
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
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHENTICATED';
  end if;

  perform private.check_socialing_input(
    p_title, p_description, p_category_id, p_has_alcohol, p_starts_at, p_apply_deadline_at,
    p_fee, p_capacity, p_staff_count, p_join_type, p_approval_criteria
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
    starts_at, apply_deadline_at, fee, capacity, staff_count, join_type, approval_criteria, cover_photo_path
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
    -- 승인 기준은 호스트 승인일 때만, 비어 있으면 null
    case when p_join_type = 'approval' then nullif(private.trimmed(p_approval_criteria), '') end,
    v_photo_path
  )
  returning * into v_socialing;

  return v_socialing;
end;
$$;

revoke execute on function public.create_socialing(
  text, text, bigint, boolean, bigint, text, text, timestamptz, timestamptz, integer, integer, integer,
  public.join_type, text, text
) from public, anon;
grant execute on function public.create_socialing(
  text, text, bigint, boolean, bigint, text, text, timestamptz, timestamptz, integer, integer, integer,
  public.join_type, text, text
) to authenticated;

-- 도우미는 등록·수정 함수 안에서만 쓴다
revoke all on all functions in schema private from public, anon, authenticated;
