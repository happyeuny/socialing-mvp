import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalScroll, submitLogin } from "./helpers/auth";
import { makeJpeg } from "./helpers/photos";
import {
  addApplication,
  addReview,
  createFixtureSocialing,
  deleteFixtureSocialings,
  reviewsOf,
  titleOf,
  type FixtureOptions,
} from "./helpers/supabase";

// MS5 후기 쓰기 P09 (spec M9, 3.4, 7장 8·9단계, 8.6, 8.7, screen-cases P09-01~12, E07~09)
// 사진 업로드 자체(1MB 이하로 줄이기, 실패해도 글 유지, HEIC)는 sp3-photo. 시드 데이터는 건드리지 않고
// 호스트 C의 종료된 테스트 소셜링을 쓴다(후기·비공개 응답도 함께 지워진다).

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

// 종료된 소셜링 (어제 열림), A 참여 확정
async function fixture(options: Partial<FixtureOptions> = {}) {
  const id = await createFixtureSocialing({
    host: "C",
    status: "completed",
    deadlineInHours: -26,
    startsInHours: -25,
    accepted: ["A"],
    ...options,
  });
  created.push(id);
  return id;
}

const reviewPath = (id: number) => `/socialings/${id}/review`;

async function loginAs(page: Page, user: "A" | "C" | "P1" | "P4", next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await submitLogin(page, user);
  await expect(page).toHaveURL(next);
}

const BODY = "소개에 적힌 대로 진행돼서 편하게 참여했어요.\n다음에도 신청할게요.";
const body = (page: Page) => page.getByRole("textbox", { name: "후기" });
const submit = (page: Page) => page.getByRole("button", { name: "후기 올리기" });
const reason = (page: Page) => page.locator("#review-submit-reason");
const question = (page: Page, text: string) => page.getByRole("group", { name: new RegExp(text) });

/** 질문 세 개에 답한다 (① 예, ② 아니오, ③ 예) */
async function answerAll(page: Page) {
  await question(page, "참가자 구성").getByText("예", { exact: true }).click();
  await question(page, "금액 외에 돈").getByText("아니오", { exact: true }).click();
  await question(page, "진행 내용").getByText("예", { exact: true }).click();
}

test.describe("MS5 후기 쓰기 P09", () => {
  test("8·9단계(P09-01·05·06·10): 내 소셜링 '후기 쓰기' → 사진·답을 넣어 올리면 인증 후기 맨 위 + '후기를 올렸어요' → 제목 → 상세 '후기 작성 완료'", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const id = await fixture();
    const title = await titleOf(id);
    await loginAs(page, "A", "/me");
    await page.getByRole("article").filter({ hasText: title }).getByRole("link", { name: "후기 쓰기" }).click();
    await expect(page).toHaveURL(reviewPath(id));

    // P09-01: 소셜링 요약, 빈 양식, "후기 올리기" 꺼짐 + 이유
    await expect(page.getByRole("heading", { level: 1, name: "후기 쓰기" })).toBeVisible();
    const summary = page.getByRole("region", { name: "소셜링 요약" });
    await expect(summary.getByText("종료", { exact: true })).toBeVisible();
    await expect(summary.getByText("참여 확정", { exact: true })).toBeVisible();
    await expect(summary.getByRole("heading", { name: title })).toBeVisible();
    await expect(summary).toContainText("호스트 하린");
    await expect(body(page)).toHaveAttribute("placeholder", "어떤 시간이었는지 다음 참여자에게 알려 주세요");
    await expect(page.getByText("0 / 500 · 10자 이상")).toBeVisible();
    await expect(page.getByText("개별 응답은 호스트를 포함해 누구에게도 보이지 않아요. 합계만 호스트 기록에 쓰여요.")).toBeVisible();
    await expect(submit(page)).toBeDisabled();
    await expect(reason(page)).toHaveText("후기를 10자 이상 써 주세요");

    // P09-06: 사진을 고르면 미리보기
    await body(page).fill(BODY);
    await page.getByLabel("사진 선택", { exact: true }).setInputFiles({
      name: "photo.jpg",
      mimeType: "image/jpeg",
      buffer: await makeJpeg(page, 800, 600),
    });
    await expect(page.getByRole("img", { name: "고른 사진" })).toBeVisible({ timeout: 30_000 });
    await expect(reason(page)).toHaveText("세 질문에 모두 답하면 올릴 수 있어요");

    // P09-05: 모두 입력하면 켜진다
    await answerAll(page);
    await expect(question(page, "참가자 구성").getByRole("radio", { name: "예" })).toBeChecked();
    await expect(reason(page)).toHaveText("올리면 바로 공개돼요");
    await expect(submit(page)).toBeEnabled();
    await submit(page).click();

    // P09-10: 인증 후기 맨 위에 새 후기 + "후기를 올렸어요"
    await expect(page).toHaveURL("/reviews");
    await expect(page.getByText("후기를 올렸어요")).toBeVisible();
    const mine = page.getByRole("article", { name: "서윤님의 후기" }).filter({ hasText: title });
    await expect(mine.getByRole("img", { name: "후기 사진" })).toBeVisible();
    await expect(mine.getByText("소개에 적힌 대로 진행돼서 편하게 참여했어요.")).toBeVisible();
    // 맨 위: 이 후기 위에는 같은 때 다른 테스트가 쓴 후기만 있을 수 있다
    const titles = await page.getByRole("listitem").getByRole("article").getByRole("link").allTextContents();
    const index = titles.findIndex((text) => text.includes(title));
    expect(index).toBeGreaterThanOrEqual(0);
    expect(titles.slice(0, index).every((text) => text.startsWith("[E2E]"))).toBe(true);

    // DB: 글(앞뒤 공백 제외), 사진 경로, 비공개 응답
    const [saved] = await reviewsOf(id);
    expect(saved).toMatchObject({ body: BODY, members_match: true, extra_money: false, content_match: true });
    expect(saved.photo_path).toMatch(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/);

    // 9단계: 소셜링 제목 → 상세 아래 "후기 작성 완료", 내 소셜링 카드의 "후기 쓰기"가 사라진다
    await mine.getByRole("link", { name: title }).click();
    await expect(page).toHaveURL(`/socialings/${id}`);
    await expect(page.getByRole("region", { name: "신청" }).getByText("후기 작성 완료")).toBeVisible();
    await page.goto("/me");
    const card = page.getByRole("article").filter({ hasText: title });
    await expect(card).toBeVisible();
    await expect(card.getByRole("link", { name: "후기 쓰기" })).toHaveCount(0);
  });

  test("P03 '후기 쓰기' 버튼으로도 들어온다", async ({ page }) => {
    const id = await fixture();
    await loginAs(page, "A", `/socialings/${id}`);
    await page.getByRole("region", { name: "신청" }).getByRole("link", { name: "후기 쓰기" }).click();
    await expect(page).toHaveURL(reviewPath(id));
    await expect(page.getByRole("heading", { level: 1, name: "후기 쓰기" })).toBeVisible();
  });

  test("P09-02·03·04: 글 10자 미만·500자 초과, 질문 미응답이면 '후기 올리기'가 꺼지고 이유가 보인다", async ({ page }) => {
    const id = await fixture();
    await loginAs(page, "A", reviewPath(id));

    // 앞뒤 공백·줄바꿈은 세지 않는다
    await body(page).fill("  짧은 후기\n\n ");
    await expect(page.getByText("5 / 500 · 10자 이상")).toBeVisible();
    await expect(body(page)).toHaveAttribute("aria-invalid", "true");
    await expect(reason(page)).toHaveText("후기를 10자 이상 써 주세요");
    await expect(submit(page)).toBeDisabled();

    await body(page).fill("가".repeat(501));
    await expect(page.getByText("501 / 500", { exact: true })).toBeVisible();
    await expect(reason(page)).toHaveText("후기는 500자까지 쓸 수 있어요");
    await expect(submit(page)).toBeDisabled();

    await body(page).fill("가".repeat(500));
    await expect(page.getByText("500 / 500 · 10자 이상")).toBeVisible();
    await expect(body(page)).not.toHaveAttribute("aria-invalid");
    await expect(reason(page)).toHaveText("세 질문에 모두 답하면 올릴 수 있어요");

    // 두 질문만 답해도 꺼져 있다
    await question(page, "참가자 구성").getByText("예", { exact: true }).click();
    await question(page, "금액 외에 돈").getByText("아니오", { exact: true }).click();
    await expect(submit(page)).toBeDisabled();
    await question(page, "진행 내용").getByText("아니오", { exact: true }).click();
    await expect(submit(page)).toBeEnabled();
    await expect(reason(page)).toHaveText("올리면 바로 공개돼요");
  });

  test("P09-08: 쓰던 글과 답은 새로 고침해도 남고(사진 제외), 올리면 지워진다", async ({ page }) => {
    const id = await fixture();
    await loginAs(page, "A", reviewPath(id));
    await body(page).fill(BODY);
    await question(page, "금액 외에 돈").getByText("아니오", { exact: true }).click();

    await page.reload();
    await expect(body(page)).toHaveValue(BODY);
    await expect(question(page, "금액 외에 돈").getByRole("radio", { name: "아니오" })).toBeChecked();
    await expect(question(page, "참가자 구성").getByRole("radio", { name: "예" })).not.toBeChecked();

    await question(page, "참가자 구성").getByText("예", { exact: true }).click();
    await question(page, "진행 내용").getByText("예", { exact: true }).click();
    await submit(page).click();
    await expect(page).toHaveURL("/reviews");
    const drafts = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("review-draft:")));
    expect(drafts).toEqual([]);
  });

  test("P09-09: 올리기가 실패하면 글을 그대로 두고 안내 + 다시 시도, 다시 누르면 올라간다", async ({ page }) => {
    const id = await fixture();
    await loginAs(page, "A", reviewPath(id));
    await body(page).fill(BODY);
    await answerAll(page);

    // 서버 액션 요청만 끊는다
    await page.route(`**${reviewPath(id)}`, (route) =>
      route.request().method() === "POST" && route.request().headers()["next-action"] ? route.abort() : route.continue(),
    );
    await submit(page).click();
    await expect(page.getByRole("alert").filter({ hasText: "후기를 올리지" })).toHaveText(
      "후기를 올리지 못했어요. 연결을 확인하고 다시 시도해 주세요",
    );
    await expect(body(page)).toHaveValue(BODY);
    expect(await reviewsOf(id)).toEqual([]);

    await page.unroute(`**${reviewPath(id)}`);
    await page.getByRole("button", { name: "다시 시도" }).click();
    await expect(page).toHaveURL("/reviews");
    expect(await reviewsOf(id)).toHaveLength(1);
  });

  test("E07: 참여 확정자가 아니면(승인 대기·신청 안 함·호스트) 상세 + '참여 확정자만 쓸 수 있어요'", async ({ page }) => {
    const id = await fixture();
    await addApplication(id, "P1", "pending");
    for (const user of ["P1", "P4", "C"] as const) {
      await loginAs(page, user, "/me");
      await page.goto(reviewPath(id));
      await expect(page).toHaveURL(`/socialings/${id}`);
      await expect(page.getByText("참여 확정자만 쓸 수 있어요")).toBeVisible();
      await page.context().clearCookies();
    }
  });

  test("E08: 호스트가 종료하기 전이면 상세 + '호스트가 종료한 뒤 쓸 수 있어요'", async ({ page }) => {
    // 소셜링 일시는 지났지만 아직 확정 (시연 7→8단계 전)
    const id = await fixture({ status: "confirmed" });
    await loginAs(page, "A", "/me");
    await page.goto(reviewPath(id));
    await expect(page).toHaveURL(`/socialings/${id}`);
    await expect(page.getByText("호스트가 종료한 뒤 쓸 수 있어요")).toBeVisible();
  });

  test("E09: 이미 후기를 썼으면 상세 + '이미 후기를 썼어요'", async ({ page }) => {
    const id = await fixture();
    await addReview(id, "A");
    await loginAs(page, "A", "/me");
    await page.goto(reviewPath(id));
    await expect(page).toHaveURL(`/socialings/${id}`);
    await expect(page.getByText("이미 후기를 썼어요")).toBeVisible();
  });

  test("쓰는 사이 다른 화면에서 후기를 썼으면, 올릴 때 상세 + '이미 후기를 썼어요'이고 임시 저장도 지운다", async ({ page }) => {
    const id = await fixture();
    await loginAs(page, "A", reviewPath(id));
    await body(page).fill(BODY);
    await answerAll(page);
    await addReview(id, "A", { body: "다른 화면에서 먼저 쓴 후기예요." });

    await submit(page).click();
    await expect(page).toHaveURL(`/socialings/${id}`);
    await expect(page.getByText("이미 후기를 썼어요")).toBeVisible();
    expect(await reviewsOf(id)).toHaveLength(1);
    const drafts = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("review-draft:")));
    expect(drafts).toEqual([]);
  });

  test("P09-11·P09-12: 로딩 스켈레톤, 화면 오류(다시 시도 · 홈으로)", async ({ page }) => {
    const id = await fixture();
    await loginAs(page, "A", reviewPath(id));
    await page.goto(`${reviewPath(id)}?_state=loading`);
    await expect(page.getByRole("status").filter({ hasText: "불러오는 중" })).toBeVisible();
    await page.goto(`${reviewPath(id)}?_state=error`);
    await expect(page.getByText("불러오지 못했어요")).toBeVisible();
    await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
    await expect(page.getByRole("link", { name: "홈으로" })).toBeVisible();
  });

  test("없는 소셜링의 후기 쓰기 주소 → 찾을 수 없는 소셜링", async ({ page }) => {
    await loginAs(page, "A", "/me");
    await page.goto(reviewPath(999_999_999));
    await expect(page.getByText("찾을 수 없는 소셜링이에요")).toBeVisible();
  });

  test("390px·320px에서 가로 스크롤이 없다 (긴 글, 사진 실패 상자)", async ({ page }) => {
    const id = await fixture();
    await loginAs(page, "A", reviewPath(id));
    await page.route("**/storage/v1/object/review-photos/**", (route) => route.abort("failed"));
    await body(page).fill("가나다라마바사아자차카타파하".repeat(40));
    await page.getByLabel("사진 선택", { exact: true }).setInputFiles({
      name: "photo.jpg",
      mimeType: "image/jpeg",
      buffer: await makeJpeg(page, 400, 300),
    });
    await expect(page.getByText("사진을 올리지 못했어요")).toBeVisible({ timeout: 30_000 });
    await expectNoHorizontalScroll(page);
    await page.setViewportSize({ width: 320, height: 640 });
    await expectNoHorizontalScroll(page);
  });
});
