/** 제출 뒤 오류가 있으면 화면 순서상 첫 오류 칸으로 이동한다 (spec 8.6 입력 오류) */
export function focusFirstError(
  form: HTMLFormElement | null,
  fieldErrors: Partial<Record<string, string>> | undefined,
  order: readonly string[],
) {
  if (!form || !fieldErrors) return;
  const first = order.find((name) => fieldErrors[name]);
  if (!first) return;
  const field = form.elements.namedItem(first);
  // 라디오 묶음(카테고리 칩 등)은 첫 칸, 그 밖에는 입력·고르기·글 칸
  const target = field instanceof RadioNodeList ? field[0] : field;
  if (target instanceof HTMLElement) target.focus();
}
