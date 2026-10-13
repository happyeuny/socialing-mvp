-- 가입하면 profiles 행을 만든다. 닉네임은 가입 메타데이터(options.data.nickname)에서 온다.
-- 닉네임이 없거나 규칙(2~12자, 중복 불가)에 어긋나면 가입 자체가 실패한다.

create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, btrim(new.raw_user_meta_data ->> 'nickname'));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
