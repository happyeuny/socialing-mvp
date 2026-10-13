-- 테이블 8개와 제약 (architecture 3.1, spec 2·6장)
-- 계산 값(참여 확정 인원, 신청 가능, 호스트 기록 등)은 저장하지 않는다 (architecture 3.2).

-- 회원 ------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null,
  role public.profile_role not null default 'member',
  created_at timestamptz not null default now(),
  constraint profiles_nickname_length check (char_length(nickname) between 2 and 12),
  constraint profiles_nickname_key unique (nickname)
);

-- 지역: 시·도 > 시·군·구 ---------------------------------------------------------
create table public.regions (
  id bigint generated always as identity primary key,
  sido text not null,
  sigungu text not null,
  code text not null unique
);

-- 장소: 스터디지점(branch) / 외부 장소(external). 지점도 region_id를 가진다 ----------
create table public.venues (
  id bigint generated always as identity primary key,
  type public.venue_type not null,
  name text not null,
  region_id bigint not null references public.regions (id),
  address_text text
);
create index venues_region_id_idx on public.venues (region_id);

-- 카테고리 5개 고정 (spec 6장) -----------------------------------------------------
create table public.categories (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  sort_order integer not null,
  is_party boolean not null default false
);

-- 소셜링 ----------------------------------------------------------------------
create table public.socialings (
  id bigint generated always as identity primary key,
  host_id uuid not null references public.profiles (id),
  title text not null,
  description text not null,
  category_id bigint not null references public.categories (id),
  has_alcohol boolean not null,
  venue_id bigint not null references public.venues (id),
  starts_at timestamptz not null,
  apply_deadline_at timestamptz not null,
  fee integer not null,
  capacity integer not null,
  staff_count integer not null default 0,
  join_type public.join_type not null,
  approval_criteria text,
  cover_photo_path text,
  status public.socialing_status not null default 'recruiting',
  confirmed_at timestamptz,
  completed_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint socialings_title_not_blank check (btrim(title) <> ''),
  constraint socialings_description_not_blank check (btrim(description) <> ''),
  constraint socialings_deadline_before_start check (apply_deadline_at <= starts_at),
  constraint socialings_fee_range check (fee >= 0),
  constraint socialings_capacity_range check (capacity between 2 and 20),
  constraint socialings_staff_count_range check (staff_count >= 0)
);
create index socialings_starts_at_idx on public.socialings (starts_at);
create index socialings_host_id_idx on public.socialings (host_id);
create index socialings_category_id_idx on public.socialings (category_id);
create index socialings_venue_id_idx on public.socialings (venue_id);

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger socialings_set_updated_at
before update on public.socialings
for each row execute function public.set_updated_at();

-- 신청 ------------------------------------------------------------------------
create table public.applications (
  id bigint generated always as identity primary key,
  socialing_id bigint not null references public.socialings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.application_status not null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  canceled_at timestamptz
);
-- 한 사람은 한 소셜링에 유효한 신청(승인 대기·참여 확정)을 하나만 (spec 3.3)
create unique index applications_one_active_per_user
  on public.applications (socialing_id, user_id)
  where status in ('pending', 'accepted');
create index applications_socialing_id_status_idx on public.applications (socialing_id, status);
create index applications_user_id_idx on public.applications (user_id);

-- 인증 후기 -------------------------------------------------------------------
create table public.reviews (
  id bigint generated always as identity primary key,
  socialing_id bigint not null references public.socialings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  photo_path text,
  created_at timestamptz not null default now(),
  constraint reviews_one_per_user unique (socialing_id, user_id),
  constraint reviews_body_length check (char_length(body) between 10 and 500)
);
create index reviews_created_at_idx on public.reviews (created_at desc);

-- 비공개 확인 질문 (개별 응답은 누구에게도 보이지 않는다) -----------------------------
create table public.review_checks (
  review_id bigint primary key references public.reviews (id) on delete cascade,
  members_match boolean not null,
  extra_money boolean not null,
  content_match boolean not null
);
