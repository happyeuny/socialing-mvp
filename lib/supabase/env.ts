// 앱이 쓰는 Supabase 주소와 publishable 키 (architecture 7장).
// secret 키는 앱 코드에서 쓰지 않는다(scripts/seed.mts만).
// NEXT_PUBLIC_ 값은 빌드 때 코드에 들어가므로 process.env.이름을 그대로 적는다.

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`환경 변수 ${name}이(가) 없습니다.`);
  return value;
}

export const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
export const supabasePublishableKey = required(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
