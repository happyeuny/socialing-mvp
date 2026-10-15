import { expect, test } from "@playwright/test";
import { submitLogin } from "./helpers/auth";
import { addApplication, createFixtureSocialing, deleteFixtureSocialings } from "./helpers/supabase";

// MS9 창을 닫으면 포커스가 창을 연 버튼으로 돌아온다 (MS8 #49 제안 · spec 8.6 · WAI-ARIA 대화 상자 패턴).
// O01 필터 시트, O02 신청 확인, O04 호스트 확인(확정·거절), O05 신청 취소 확인. O03은 ms8-trust-label.
// 키보드로 열고 닫는다(Enter·Esc). 처리 결과로 연 버튼이 사라지면 같은 묶음(아래 신청 영역, 소셜링 상태)의 첫 버튼으로 간다.
// 시드 소셜링은 건드리지 않고 테스트 전용 소셜링을 만들고 지운다.

const created: number[] = [];
test.afterAll(async () => {
  await deleteFixtureSocialings(created);
});

async function fixture(options: Parameters<typeof createFixtureSocialing>[0]) {
  const id = await createFixtureSocialing(options);
  created.push(id);
  return id;
}

const loginPath = (next: string) => `/login?next=${encodeURIComponent(next)}`;

test.describe("MS9 창을 닫으면 포커스 복귀", () => {
  test("O01 필터 시트: Esc·닫기면 연 칩으로, 적용하면 값이 바뀐 그 칩으로", async ({ page }) => {
    await page.goto("/explore");
    const chips = page.getByRole("group", { name: "필터" });
    const sheet = page.getByRole("dialog", { name: "필터" });

    const place = chips.getByRole("button", { name: "장소", exact: true });
    await place.focus();
    await page.keyboard.press("Enter");
    await expect(sheet).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(place).toBeFocused();

    const all = chips.getByRole("button", { name: "전체 필터" });
    await all.focus();
    await page.keyboard.press("Enter");
    await sheet.getByRole("button", { name: "닫기" }).press("Enter");
    await expect(sheet).toBeHidden();
    await expect(all).toBeFocused();

    await place.focus();
    await page.keyboard.press("Enter");
    await sheet.getByText("강남점", { exact: true }).click();
    await sheet.getByRole("button", { name: /^소셜링 \d+개 보기$/ }).press("Enter");
    await expect(sheet).toBeHidden();
    await expect(page).toHaveURL(/\/explore\?branch=\d+$/);
    await expect(chips.getByRole("button", { name: "장소 강남점" })).toBeFocused();
  });

  test("O02·O05 신청 확인·신청 취소: 돌아가기·Esc면 연 버튼으로, 처리하면 아래 영역의 새 버튼으로", async ({ page }) => {
    const id = await fixture({ host: "C", capacity: 4 });
    await page.goto(loginPath(`/socialings/${id}`));
    await submitLogin(page, "P4");
    await expect(page).toHaveURL(`/socialings/${id}`);
    const bar = page.getByRole("region", { name: "신청" });

    // O02
    const apply = bar.getByRole("button", { name: "신청하기" });
    const applySheet = page.getByRole("dialog", { name: "신청할까요?" });
    await apply.focus();
    await page.keyboard.press("Enter");
    await expect(applySheet).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(applySheet).toBeHidden();
    await expect(apply).toBeFocused();

    await page.keyboard.press("Enter");
    await applySheet.getByRole("button", { name: "돌아가기" }).press("Enter");
    await expect(applySheet).toBeHidden();
    await expect(apply).toBeFocused();

    await page.keyboard.press("Enter");
    await applySheet.getByRole("button", { name: "신청하기" }).press("Enter");
    await expect(applySheet).toBeHidden();
    // 신청하기는 사라지고 아래 영역이 7줄(참여 확정 + 신청 취소)이 된다
    const cancel = bar.getByRole("button", { name: "신청 취소" });
    await expect(cancel).toBeFocused();

    // O05
    const cancelSheet = page.getByRole("dialog", { name: "신청을 취소할까요?" });
    await page.keyboard.press("Enter");
    await expect(cancelSheet).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(cancelSheet).toBeHidden();
    await expect(cancel).toBeFocused();

    await page.keyboard.press("Enter");
    await cancelSheet.getByRole("button", { name: "신청 취소" }).press("Enter");
    await expect(cancelSheet).toBeHidden();
    // 9줄: 자리가 남아 있어 다시 신청
    await expect(bar.getByRole("button", { name: "다시 신청" })).toBeFocused();
  });

  test("O04 호스트 확인: 돌아가기·Esc면 연 버튼으로, 확정하면 '소셜링 상태'의 다음 버튼으로", async ({ page }) => {
    // 호스트 취소는 하지 않아 C의 호스트 기록 숫자는 바뀌지 않는다. 확정·종료한 테스트 소셜링은 끝에 지운다
    const id = await fixture({ host: "C", joinType: "approval", capacity: 4 });
    await addApplication(id, "P3", "pending");
    await page.goto(loginPath(`/socialings/${id}/manage`));
    await submitLogin(page, "C");
    await expect(page).toHaveURL(`/socialings/${id}/manage`);
    const status = page.getByRole("region", { name: "소셜링 상태" });

    const confirm = status.getByRole("button", { name: "확정하기" });
    const confirmDialog = page.getByRole("alertdialog", { name: "확정할까요?" });
    await confirm.focus();
    await page.keyboard.press("Enter");
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole("button", { name: "돌아가기" }).press("Enter");
    await expect(confirmDialog).toBeHidden();
    await expect(confirm).toBeFocused();

    const reject = page.getByRole("list", { name: "신청자 목록" }).getByRole("button", { name: "거절" });
    const rejectDialog = page.getByRole("alertdialog", { name: /신청을 거절할까요\?$/ });
    await reject.focus();
    await page.keyboard.press("Enter");
    await expect(rejectDialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(rejectDialog).toBeHidden();
    await expect(reject).toBeFocused();

    await confirm.focus();
    await page.keyboard.press("Enter");
    await confirmDialog.getByRole("button", { name: "확정하기" }).press("Enter");
    await expect(confirmDialog).toBeHidden();
    await expect(page.getByText("확정했어요", { exact: true })).toBeVisible();
    // 확정하기는 사라지고, 종료하기는 일시 전이라 막혀 있어 다음 버튼(수정)으로
    await expect(status.getByRole("button", { name: "종료하기" })).toBeDisabled();
    await expect(status.getByRole("link", { name: "수정" })).toBeFocused();
  });

  test("O04 종료: 상태 버튼이 모두 사라지면 '소셜링 상태' 제목으로", async ({ page }) => {
    // 참여 확정자가 없는 소셜링이라 종료해도 C의 열린 소셜링 수에 들어가지 않는다
    const id = await fixture({ host: "C", status: "confirmed", deadlineInHours: -2, startsInHours: -1 });
    await page.goto(loginPath(`/socialings/${id}/manage`));
    await submitLogin(page, "C");
    await expect(page).toHaveURL(`/socialings/${id}/manage`);
    const status = page.getByRole("region", { name: "소셜링 상태" });

    const complete = status.getByRole("button", { name: "종료하기" });
    const completeDialog = page.getByRole("alertdialog", { name: "종료할까요?" });
    await complete.focus();
    await page.keyboard.press("Enter");
    await expect(completeDialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(completeDialog).toBeHidden();
    await expect(complete).toBeFocused();

    await page.keyboard.press("Enter");
    await completeDialog.getByRole("button", { name: "종료하기" }).press("Enter");
    await expect(completeDialog).toBeHidden();
    await expect(status).toContainText("종료한 소셜링이에요");
    await expect(status.getByRole("heading", { name: "소셜링 상태" })).toBeFocused();
  });
});
