// Supabase Management API (https://api.supabase.com) 얇은 도우미.
// 클라우드 세션은 HTTPS로만 나가므로 Postgres에 직접 붙지 않고 이 API로 SQL을 실행한다.
// 토큰·키 값은 어디에도 출력하지 않는다.

const API_BASE = "https://api.supabase.com/v1";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경 변수 ${name}이(가) 없습니다. 클라우드 환경 설정이나 .env.local을 확인하세요.`);
  }
  return value;
}

/** NEXT_PUBLIC_SUPABASE_URL(https://<ref>.supabase.co)에서 프로젝트 ref를 꺼낸다. */
export function projectRef(): string {
  const url = new URL(requireEnv("NEXT_PUBLIC_SUPABASE_URL"));
  const ref = url.hostname.split(".")[0];
  if (!ref || !url.hostname.endsWith(".supabase.co")) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL이 https://<ref>.supabase.co 모양이 아닙니다.");
  }
  return ref;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}/projects/${projectRef()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${requireEnv("SUPABASE_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Management API가 거부했습니다(${response.status}). SUPABASE_ACCESS_TOKEN의 권한(Database 쓰기 등)이나 만료일을 확인하세요. 응답: ${text}`,
      );
    }
    throw new Error(`Management API ${method} ${path} 실패(${response.status}): ${text}`);
  }
  return (text ? JSON.parse(text) : undefined) as T;
}

/** SQL을 실행하고 결과 행을 돌려준다. 여러 문장도 한 번에 보낼 수 있다. */
export function runQuery<Row = Record<string, unknown>>(query: string): Promise<Row[]> {
  return request<Row[]>("POST", "/database/query", { query });
}

export type AppliedMigration = { version: string; name?: string };

/** 원격 DB의 supabase_migrations.schema_migrations 기록. */
export function listAppliedMigrations(): Promise<AppliedMigration[]> {
  return request<AppliedMigration[]>("GET", "/database/migrations");
}

/** public 스키마의 TypeScript 타입 문자열. */
export async function generateTypes(): Promise<string> {
  const result = await request<{ types: string }>("GET", "/types/typescript?included_schemas=public");
  return result.types;
}
