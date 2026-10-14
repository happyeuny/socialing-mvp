// node scripts/build-regions.mts <법정동 CSV 경로>
// 공공데이터포털 "국토교통부_전국 법정동" CSV(UTF-8, 열: 법정동코드,시도명,시군구명,읍면동명,리명,순번,생성일자)에서
// 시·군·구만 뽑아 scripts/regions.mts를 다시 만든다. 지역 필터(spec M3)와 시드(npm run seed)가 쓴다.
// - 시·군·구 행 = 코드 끝 5자리가 00000이고 시군구명이 있고 읍면동명이 빈 행. 코드는 앞 5자리.
// - 일반구가 있는 시(예: 수원시)는 시 행을 빼고 구 행을 "수원시 영통구"처럼 시와 구를 띄어 둔다.
//   그 시의 모든 동이 구 아래에 있어 장소는 언제나 구에 속한다.
// - CSV 파일은 저장소에 넣지 않는다(1.4MB). 기준일은 파일 이름의 날짜를 SOURCE_DATE로 넘긴다.

import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";

const csvPath = process.argv[2];
if (!csvPath) throw new Error("사용법: node scripts/build-regions.mts <법정동 CSV 경로>");

const text = (await readFile(csvPath, "utf8")).replace(/^﻿/, "");
const [header, ...lines] = text.split(/\r?\n/).filter(Boolean);
if (!header.startsWith("법정동코드,시도명,시군구명,읍면동명")) throw new Error(`예상한 열이 아닙니다: ${header}`);

type Row = { code: string; sido: string; sigungu: string };
const sigungu: Row[] = [];
for (const line of lines) {
  const [code, sido, sgg, emd] = line.split(",");
  if (!/^\d{10}$/.test(code)) throw new Error(`법정동코드가 10자리 숫자가 아닙니다: ${line}`);
  if (code.endsWith("00000") && sgg && !emd) sigungu.push({ code: code.slice(0, 5), sido, sigungu: sgg });
}

// 일반구가 있는 시: 같은 시·도 안에서 다른 시·군·구 이름이 이 이름으로 시작하는 시 (예: "수원시" ← "수원시영통구")
const parents = new Set(
  sigungu
    .filter((row) => row.sigungu.endsWith("시"))
    .filter((row) => sigungu.some((o) => o.sido === row.sido && o.code !== row.code && o.sigungu.startsWith(row.sigungu)))
    .map((row) => `${row.sido}/${row.sigungu}`),
);
const regions = sigungu
  .filter((row) => !parents.has(`${row.sido}/${row.sigungu}`))
  .map((row) => {
    const parent = [...parents].find((p) => p.startsWith(`${row.sido}/`) && row.sigungu.startsWith(p.split("/")[1]));
    const city = parent?.split("/")[1];
    return city ? { ...row, sigungu: `${city} ${row.sigungu.slice(city.length)}` } : row;
  })
  .sort((a, b) => a.code.localeCompare(b.code));

const sourceDate = /(\d{8})/.exec(basename(csvPath))?.[1] ?? "unknown";
const sidoCount = new Set(regions.map((r) => r.sido)).size;
const body = regions.map((r) => `  ["${r.code}", "${r.sido}", "${r.sigungu}"],`).join("\n");

await writeFile(
  new URL("./regions.mts", import.meta.url),
  `// 자동 생성: node scripts/build-regions.mts <CSV> (손으로 고치지 않는다)
// 출처: 공공데이터포털 "국토교통부_전국 법정동" (https://www.data.go.kr/data/15063424/fileData.do), 기준일 ${sourceDate}
// 시·도 ${sidoCount}개, 시·군·구 ${regions.length}곳. 코드는 법정동코드 앞 5자리.

/** [코드, 시·도, 시·군·구] */
export const REGION_ROWS: readonly (readonly [code: string, sido: string, sigungu: string])[] = [
${body}
];
`,
  "utf8",
);
console.log(`scripts/regions.mts: 시·도 ${sidoCount}개, 시·군·구 ${regions.length}곳 (기준일 ${sourceDate})`);
