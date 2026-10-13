// npm run db:push
// supabase/migrations/*.sql 중 원격 dev DB에 아직 적용하지 않은 파일을 순서대로 적용한다.
//
// - 파일 이름: <14자리 버전>_<이름>.sql (Supabase CLI와 같은 규칙, 예: 20261013060000_enums.sql)
// - 파일 하나를 트랜잭션 하나로 적용하고, 같은 트랜잭션에서 supabase_migrations.schema_migrations에
//   파일의 버전·이름을 기록한다. 그래서 나중에 로컬 터미널에서 `supabase db push`를 써도 같은 기록을 본다.
// - 파일 안에 begin/commit을 쓰지 않는다(스크립트가 감싼다).
// - 이미 적용한 파일은 고치지 않는다. 바꿀 것이 있으면 새 파일을 만든다.
//
// 옵션: --dry-run 적용할 파일만 보여 준다.

import { randomBytes } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { listAppliedMigrations, runQuery } from "./lib/management-api.mts";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");
const FILE_PATTERN = /^(\d{14})_([a-z0-9_]+)\.sql$/;
// 맨 앞의 트랜잭션 문장만 잡는다 (plpgsql 함수 본문의 "begin"은 세미콜론이 없어서 걸리지 않음)
const TRANSACTION_CONTROL = /^\s*(begin|commit|rollback|start\s+transaction)(\s+(work|transaction))?\s*;/im;

type MigrationFile = { version: string; name: string; fileName: string };

async function readMigrationFiles(): Promise<MigrationFile[]> {
  const fileNames = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  return fileNames.map((fileName) => {
    const match = FILE_PATTERN.exec(fileName);
    if (!match) {
      throw new Error(`마이그레이션 파일 이름이 규칙과 다릅니다: ${fileName} (예: 20261013060000_enums.sql)`);
    }
    return { version: match[1], name: match[2], fileName };
  });
}

function dollarQuote(text: string): string {
  let tag: string;
  do {
    tag = `$migration_${randomBytes(6).toString("hex")}$`;
  } while (text.includes(tag));
  return `${tag}${text}${tag}`;
}

function buildTransaction(file: MigrationFile, sql: string): string {
  return [
    "begin;",
    sql.trim().replace(/;?\s*$/, ";"),
    "create schema if not exists supabase_migrations;",
    "create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);",
    `insert into supabase_migrations.schema_migrations (version, name, statements) values ('${file.version}', '${file.name}', array[${dollarQuote(sql)}]);`,
    "commit;",
  ].join("\n");
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const files = await readMigrationFiles();
  const applied = await listAppliedMigrations();
  const appliedVersions = new Set(applied.map((m) => m.version));
  const fileVersions = new Set(files.map((f) => f.version));

  const unknown = applied.filter((m) => !fileVersions.has(m.version));
  if (unknown.length > 0) {
    console.warn(
      `주의: 원격에는 있지만 저장소에 없는 마이그레이션 ${unknown.length}개: ${unknown.map((m) => `${m.version}_${m.name ?? ""}`).join(", ")}`,
    );
  }

  const pending = files.filter((f) => !appliedVersions.has(f.version));
  if (pending.length === 0) {
    console.log(`적용할 마이그레이션이 없습니다. (적용됨 ${files.length}개)`);
    return;
  }

  for (const file of pending) {
    if (dryRun) {
      console.log(`적용 예정: ${file.fileName}`);
      continue;
    }
    const sql = await readFile(path.join(MIGRATIONS_DIR, file.fileName), "utf8");
    if (TRANSACTION_CONTROL.test(sql)) {
      throw new Error(`${file.fileName}: 파일 안에 begin/commit을 쓰지 마세요. 스크립트가 트랜잭션으로 감쌉니다.`);
    }
    await runQuery(buildTransaction(file, sql));
    console.log(`적용함: ${file.fileName}`);
  }

  if (!dryRun) {
    console.log(`완료: ${pending.length}개 적용. 이어서 npm run db:types 로 타입을 다시 만드세요.`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
