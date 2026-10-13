/** 제출 뒤 오류가 있으면 화면 순서상 첫 오류 칸으로 이동한다 (spec 8.6 입력 오류) */
export function focusFirstError(
  form: HTMLFormElement | null,
  fieldErrors: Partial<Record<string, string>> | undefined,
  order: readonly string[],
) {
  if (!form || !fieldErrors) return;
  const first = order.find((name) => fieldErrors[name]);
  if (!first) return;
  const input = form.elements.namedItem(first);
  if (input instanceof HTMLInputElement) input.focus();
}
