-- MS14 신고 접수 (SH4b, architecture 3.1·4·5장, spec M4·8.9 P03)
-- 로그인한 사람이 소셜링 하나에 한 번 신고한다(신청하지 않았어도, 상태와 관계없이). 접수(저장)까지만이고
-- 처리 화면·결과 알림·자동 제재는 없다(spec 10장). 쌓인 신고는 Supabase 대시보드에서만 본다.
-- 신고 수는 호스트 기록·등급에 쓰지 않는다.

create table public.reports (
  id bigint generated always as identity primary key,
  socialing_id bigint not null references public.socialings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reason public.report_reason not null,
  note text,
  created_at timestamptz not null default now(),
  constraint reports_one_per_user unique (socialing_id, user_id),
  constraint reports_note_length check (char_length(note) between 1 and 300),
  constraint reports_other_needs_note check (reason <> 'other' or note is not null)
);
create index reports_user_id_idx on public.reports (user_id);

-- 권한: 신고한 본인만 자기 행을 읽는다(신고했는지 보이려고). 호스트와 다른 사람은 못 읽고, 직접 쓰기는 없다
alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;
create policy "reporters can read their own reports" on public.reports
  for select to authenticated
  using (user_id = (select auth.uid()));

-- create_report: 신고하기
--   사유는 꼭 고르고, 'other'(그 밖의 문제)면 설명이 필요하다. 설명은 앞뒤 공백을 뺀 300자까지, 비면 null
-- 실패하면 오류 코드를 message로 던진다(errcode P0001). 화면 문구는 서버 액션이 붙인다.
--   NOT_AUTHENTICATED, INVALID_INPUT(없는 소셜링, 사유·설명), IS_HOST(그 소셜링의 호스트),
--   ALREADY_REPORTED(이미 신고함. 동시에 두 번 보내도 유니크 제약이 막는다)
-- 성공하면 만든 신고 행을 돌려준다.
create function public.create_report(
  p_socialing_id bigint,
  p_reason public.report_reason,
  p_note text default null
)
returns public.reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_note text := nullif(private.trimmed(p_note), '');
  v_host_id uuid;
  v_report public.reports;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'NOT_AUTHENTICATED';
  end if;

  if p_reason is null
    or char_length(v_note) > 300
    or (p_reason = 'other' and v_note is null) then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  select host_id into v_host_id
  from public.socialings
  where id = p_socialing_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;

  if v_host_id = v_user_id then
    raise exception using errcode = 'P0001', message = 'IS_HOST';
  end if;

  if exists (
    select 1 from public.reports
    where socialing_id = p_socialing_id
      and user_id = v_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'ALREADY_REPORTED';
  end if;

  begin
    insert into public.reports (socialing_id, user_id, reason, note)
    values (p_socialing_id, v_user_id, p_reason, v_note)
    returning * into v_report;
  exception
    when unique_violation then
      raise exception using errcode = 'P0001', message = 'ALREADY_REPORTED';
  end;

  return v_report;
end;
$$;

revoke execute on function public.create_report(bigint, public.report_reason, text) from public, anon;
grant execute on function public.create_report(bigint, public.report_reason, text) to authenticated;
