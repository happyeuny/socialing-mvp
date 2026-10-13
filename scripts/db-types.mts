// npm run db:types
// 원격 dev DB의 public 스키마에서 TypeScript 타입을 만들어 lib/supabase/database.types.ts에 쓴다.
// Docker나 Supabase CLI 없이 Management API(GET /types/typescript)를 쓴다.

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { generateTypes } from "./lib/management-api.mts";

const OUTPUT = path.join(process.cwd(), "lib", "supabase", "database.types.ts");

async function main() {
  const types = await generateTypes();
  await writeFile(OUTPUT, types.endsWith("\n") ? types : `${types}\n`, "utf8");
  console.log(`타입을 만들었습니다: ${path.relative(process.cwd(), OUTPUT)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
