-- 권한 (architecture 4장)
-- 읽기만 정책으로 연다. 쓰기는 테이블에 직접 열지 않고 SECURITY DEFINER 함수(RPC)로만 한다.

alter table public.profiles enable row level security;
alter table public.regions enable row level security;
alter table public.venues enable row level security;
alter table public.categories enable row level security;
alter table public.socialings enable row level security;
alter table public.applications enable row level security;
alter table public.reviews enable row level security;
alter table public.review_checks enable row level security;

-- 직접 쓰기는 권한부터 막는다 (RLS 정책이 없어도 한 번 더)
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;

-- 누구나 읽기 (비로그인 포함) ---------------------------------------------------------
create policy "regions are readable by everyone" on public.regions
  for select to anon, authenticated using (true);
create policy "venues are readable by everyone" on public.venues
  for select to anon, authenticated using (true);
create policy "categories are readable by everyone" on public.categories
  for select to anon, authenticated using (true);
create policy "socialings are readable by everyone" on public.socialings
  for select to anon, authenticated using (true);
create policy "reviews are readable by everyone" on public.reviews
  for select to anon, authenticated using (true);

-- profiles: id·닉네임만 모두에게. 다른 칸(role, created_at)은 열 권한으로 막는다.
-- 그래서 profiles는 select('*') 대신 select('id, nickname')로 읽는다.
revoke select on public.profiles from anon, authenticated;
grant select (id, nickname) on public.profiles to anon, authenticated;
create policy "profile id and nickname are readable by everyone" on public.profiles
  for select to anon, authenticated using (true);

-- applications: 본인 신청, 그리고 그 소셜링의 호스트 ----------------------------------
create policy "applicants and hosts can read applications" on public.applications
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.socialings s
      where s.id = applications.socialing_id
        and s.host_id = (select auth.uid())
    )
  );

-- review_checks: 정책 없음 + 권한 회수. 집계 함수(SECURITY DEFINER)만 읽는다.
revoke all on public.review_checks from anon, authenticated;
