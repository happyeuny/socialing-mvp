# 발표 준비 체크리스트

발표는 운영 주소 https://socialing-mvp.vercel.app 에서 발표용 Supabase `socialing-demo`로 한다(architecture 7장). 운영 주소는 main 브랜치이고, main은 발표용으로 동결한다. 개발은 dev 브랜치에서 하고, 개발과 PR 미리보기는 계속 dev DB(`socialing-mvp`)를 쓴다.

| 무엇 | 어디 |
|---|---|
| 발표 DB에 마이그레이션 + 시드 다시 | GitHub 저장소 Actions → **발표 DB 준비** → Run workflow (`.github/workflows/demo-db.yml`). "Use workflow from"은 평소 main, dev → main 병합 직전은 dev(7장) |
| 운영 주소 읽기 점검 | `npm run test:smoke` (Claude가 클라우드에서 돌림. 데이터를 바꾸지 않음) |
| 시연 순서 | spec 7장, 아래 4장 |
| 개발 단계를 운영 주소에 올리기 | 아래 7장 (dev → main) |

값(키·토큰·비밀번호)은 채팅·문서·PR 어디에도 쓰지 않는다.

## 1. 처음 한 번: 발표 DB를 만들고 운영 주소를 옮기기

순서를 지킨다. 발표 DB에 데이터를 다 넣은 뒤(C) 마지막에 Vercel을 다시 배포해야(D) 운영 주소가 빈 화면인 순간이 없다.

| 순서 | 누가 | 할 일 |
|---|---|---|
| A | PM | Supabase에서 새 프로젝트 `socialing-demo` (지역 Seoul, dev를 만들 때와 같은 기본 설정). Authentication의 이메일 설정에서 **Confirm email 끄기**(dev에서 끈 곳과 같은 곳). 비밀번호 최소 길이는 기본값 6 그대로(spec 6장). 무료 프로젝트는 2개까지 |
| B | PM | GitHub 저장소 Settings → Secrets and variables → Actions → New repository secret으로 4개: `DEMO_SUPABASE_URL`(https://<ref>.supabase.co), `DEMO_SUPABASE_SECRET_KEY`(`sb_secret_…`), `DEMO_SUPABASE_ACCESS_TOKEN`(dev 토큰과 같은 권한, 범위만 socialing-demo), `DEMO_PASSWORD`(데모 계정 비밀번호. dev와 같은 값이면 외울 것이 하나) |
| C | PM 또는 Claude | Actions → 발표 DB 준비 → Run workflow. 로그 끝에 "적용함: …" 줄들(처음엔 19개)과 "시드 완료 (…초): 데모 계정 9개, …, 소셜링 23개, 신청 46개, 후기 16개"가 나오면 끝 |
| D | PM | Vercel → Settings → Environment Variables에서 `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 이름마다 두 줄로 만든다: dev 값은 **Preview**, demo 값은 **Production**, 종류(Type)는 모두 **Config**(브라우저가 쓰는 공개 값). 기존 줄이 **Secret** 종류면 Config로 바꿀 수 없고 환경만 고쳐도 저장이 막히므로(`NEXT_PUBLIC_`이 붙은 Secret은 저장 불가) 지우고 새로 만든다. 지운 채로 main에 병합하면 운영 빌드에 값이 빠지니 4줄을 다 만든 뒤에 병합한다. 그다음 Deployments → 맨 위 Production 줄 ⋯ → **Redeploy**("Use existing Build Cache"는 끔). 버튼을 못 찾으면 main에 PR 하나를 병합해도 새로 빌드된다. `NEXT_PUBLIC_` 값은 빌드할 때 들어가서 다시 빌드하기 전까지는 운영 주소가 dev를 보고, 빌드가 끝난 뒤 1분쯤은 예전 빌드가 응답할 수 있다 |
| E | Claude | `npm run test:smoke`: 로그인 쿠키로 운영 주소가 dev가 아닌 DB를 보는지, 홈·탐색·B 상세(등급 라벨)·인증 후기, A·B 로그인과 시연 시작 상태 |

되돌리기: Vercel Production 값을 dev 값으로 돌리고 Redeploy하면 바로 원래대로다(dev는 Claude에게 "dev 시드 다시"를 부탁).

새 마이그레이션이 main에 들어가면 운영 주소의 새 코드가 발표 DB에 없는 함수를 부를 수 있다. 그래서 dev → main 병합 **직전에** dev 기준으로 **발표 DB 준비**를 돌린다(7장). 급한 버그 수정(fix/… → main)에 마이그레이션이 들어 있으면 병합 직후 main 기준으로 돌린다(Vercel 빌드가 끝나기 전에 끝난다). 이미 적용한 파일은 건너뛰고 시드도 다시 넣는다.

## 2. 발표 DB 시드 다시 넣기

- **먼저 두 창 모두 로그아웃하고 시크릿 창을 닫는다.** 시드는 데모 계정을 지우고 새로 만든다(이메일·닉네임은 같고 계정 ID가 바뀜). 로그인한 채로 두면 그 창은 지워진 계정으로 로그인된 채 남아서, 내 소셜링이 "불러오지 못했어요"가 되고 로그아웃 버튼도 볼 수 없다(로그인 화면도 열리지 않음). 갇혔으면 6장.
- 언제: 리허설 뒤, 발표 전날, 발표 당일 아침. 시드는 리허설로 바뀐 데이터를 모두 지우고, 날짜를 **돌린 시점 기준**으로 다시 만든다(X는 2일 전, 4~6단계 소셜링은 4일 뒤).
- 방법: Actions → 발표 DB 준비 → Run workflow("Use workflow from"은 main, "목록만 보기"는 끔), 또는 스레드에 "발표 DB 시드 다시 넣어 줘". 1분 안팎.
- 시드는 `@socialing.test` 계정과 데모 데이터만 지우고 다시 만든다. 리허설 중 가입한 다른 이메일 계정은 남는다.

## 3. 발표 전날

- [ ] Supabase 대시보드에서 `socialing-demo`가 **일시정지(Paused)가 아닌지**. 무료 프로젝트는 7일 동안 요청이 없으면 멈춘다. 멈췄으면 Restore(몇 분 걸림)
- [ ] 발표 DB 준비 → 끝나면 운영 점검(`npm run test:smoke`) 4개 통과
- [ ] 휴대폰과 노트북에서 운영 주소가 열림, A 서윤·B 도현 로그인
- [ ] 두 브라우저 준비: 일반 창 = A 서윤, 시크릿 창 = B 도현 (로그인 상태는 브라우저마다 따로)
- [ ] 4장 순서로 한 번 끝까지 → 두 창 로그아웃·시크릿 창 닫기 → 다시 발표 DB 준비

## 4. 시연 순서 (시드 그대로일 때)

| 단계 | 창 | 하는 것 |
|---|---|---|
| 1 | 아무 창(비로그인) | 홈 → "전체 보기" → 탐색. 카드의 카테고리·술 여부, "가까운 일시 순" |
| 2 | 비로그인 | "파티·사교 숨기기" 켜기 → 장소 칩 → 스터디지점 강남점 → 적용 |
| 3 | 비로그인 | "영어로 내 일 소개하기: 3분 스피치" → 상태·인원·스태프·총 참가비·승인 기준·호스트 기록 → "믿고 가는 호스트" → 등급 조건 → 확인 → 뒤로(필터 그대로) |
| 4 | 일반(A) | 같은 소셜링 → 신청 → 로그인(A) → 상세로 돌아옴 → 신청하기 → 승인 대기 |
| 5 | 시크릿(B) | 로그인(B) → 내 소셜링 → 호스트인 소셜링 → 3분 스피치 "소셜링 관리" → 서윤 "승인" → "확정하기" |
| 6 | 일반(A) | 내 소셜링 → 신청한 소셜링에서 참여 확정 · 확정 |
| 7 | 시크릿(B) | 호스트인 소셜링 → "퇴근 후 영어 회화: 여행 영어 롤플레이"(X) "소셜링 관리" → "종료하기" |
| 8 | 일반(A) | 내 소셜링 → X "후기 쓰기" → 사진 · 세 질문 · 글 → 후기 올리기 |
| 9 | 일반(A) | 인증 후기 맨 위 → 소셜링 제목 → 상세 호스트 기록의 후기 수가 1 늘어남 |
| 10 (선택) | 시크릿(B) | 내 소셜링 → 새 소셜링 만들기 → 소셜링 열기 → 상세 → 탐색에 보임 |

X를 이미 종료했다면 7~9단계는 "영어 뉴스 한 편 같이 읽기"(Y, 이미 종료, A 후기 없음)로 대신한다.

## 5. 발표 당일 아침

- [ ] 두 창 로그아웃·시크릿 창 닫기 → 발표 DB 준비(날짜를 오늘 기준으로) → 운영 점검 통과
- [ ] `socialing-demo`가 일시정지가 아닌지
- [ ] A·B 두 창에 미리 로그인, 휴대폰은 화면 꺼짐 시간 늘리기
- [ ] 4장 1~3단계만 한 번 눌러 봄 (데이터를 바꾸지 않는 단계)

## 6. 문제가 생기면

| 증상 | 할 일 |
|---|---|
| 화면마다 "불러오지 못했어요" | `socialing-demo` 일시정지 → 대시보드에서 Restore. 아니면 Vercel Production 값과 Redeploy 확인 |
| 로그인 "이메일 또는 비밀번호가 맞지 않아요" | GitHub Secrets `DEMO_PASSWORD`와 같은 비밀번호인지. 발표 DB 준비를 다시 돌리면 그 비밀번호로 계정을 다시 만든다 |
| 데이터가 시연 시작 상태가 아님 | 발표 DB 준비 (1분 안팎) |
| 내 소셜링이 "불러오지 못했어요"이고 로그아웃 버튼이 없음, 로그인 화면이 열리지 않음 | 로그인한 채 발표 DB 준비를 돌린 창(2장). 그 브라우저에서 주소창 왼쪽 아이콘 → 쿠키 및 사이트 데이터 → socialing-mvp.vercel.app 삭제 → 새로 고침. 시크릿 창은 모두 닫았다가 새로 연다. 다른 브라우저를 써도 된다. 로그인하고 1시간쯤 지나면 저절로 풀린다 |
| 발표 DB 자체가 안 됨 | Vercel Production 값을 dev로 되돌리고 Redeploy. dev 시드는 Claude에게 |
| 무슨 오류인지 모름 | Vercel Hobby 로그는 1시간만 남는다. 리허설 직후 Vercel → Logs를 바로 본다 |

## 7. 단계 끝: dev → main 병합

업그레이드 단계(MS10~)는 dev에 모았다가 단계가 끝나면 한 번에 main(운영 주소)에 올린다. 규칙은 AGENTS.md "브랜치"와 tasks.md 1장.

| 순서 | 누가 | 할 일 |
|---|---|---|
| 1 | PM | dev 미리보기에 로그인한 창이 있으면 로그아웃 (2의 시드 때문. 2장과 같은 이유) |
| 2 | Claude | dev 시드 다시(`npm run seed`) → 전체 E2E(`npm run test:e2e`) 통과 |
| 3 | Claude | dev → main PR. 설명에 이 단계의 PR 목록, 새 마이그레이션·시드 변경 여부 |
| 4 | Claude | 발표 DB 준비를 **dev 기준 + 목록만 보기**로 돌려 적용할 마이그레이션을 로그로 확인(발표 DB는 바뀌지 않음) |
| 5 | PM → Claude | 새 마이그레이션이나 시드 변경이 **있을 때만**: 두 창 로그아웃·시크릿 창 닫기 → 발표 DB 준비를 **dev 기준**으로 실제 실행. 없으면 건너뛴다. 이때부터 병합까지 운영 주소의 main 코드가 dev 마이그레이션이 들어간 DB를 보므로 마이그레이션은 추가만 한다(AGENTS.md) |
| 6 | PM | GitHub에서 **Create a merge commit**으로 병합 (Squash·Rebase는 쓰지 않는다. dev와 main 기록이 갈라져 다음 병합 때 충돌한다) |
| 7 | Claude | Vercel 운영 배포가 끝나면(1~2분) `npm run test:smoke` 4개 통과 |

- 저장소 설정 "Automatically delete head branches"는 켜지 않는다. 켜면 dev → main 병합 뒤 dev가 지워진다.
- 5를 건너뛰면 발표 DB는 리허설 뒤 상태 그대로다. 발표 전에는 2·3·5장대로 시드를 다시 넣는다.
- 병합 뒤 운영 주소에 문제가 생기면 급한 버그 규칙(fix/… → main, AGENTS.md)으로 고친다. 고칠 시간이 없으면 Vercel Deployments에서 이전 Production 배포로 Instant Rollback한다(그 뒤 새 배포는 운영 주소에 자동으로 붙지 않아서, 고친 배포를 다시 Promote해야 한다). 발표 DB의 추가 마이그레이션은 예전 코드가 쓰지 않으므로 그대로 둔다.
