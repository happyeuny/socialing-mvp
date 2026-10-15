import { useRef } from "react";

// 창(O01~O05)을 닫으면 포커스를 창을 연 버튼으로 돌려준다 (WAI-ARIA 대화 상자 패턴, 키보드·읽기 프로그램).
// Radix Dialog는 Dialog.Trigger로 열었을 때만 돌려주는데, 이 앱의 창은 상태로 열어서 닫으면 포커스가 문서 처음으로 간다.
// 열 때 포커스가 있던 곳(또는 알려 준 버튼)을 기억했다가 닫을 때 돌려준다. 처리 결과로 그 버튼이 사라졌거나 잠겼으면
// (신청 → 아래 영역이 "신청 취소"로 바뀜, 확정 → "확정하기"가 사라짐 등) 같은 묶음(section·region·group)의 첫 버튼으로,
// 묶음에 누를 것이 하나도 남지 않으면(종료 → 상태 버튼 대신 안내) 묶음의 제목으로 옮긴다.

const AREA = 'section, [role="region"], [role="group"]';
const FOCUSABLE = "button, a[href], input:not([type='hidden']), select, textarea";

type Area = { element: Element; selector: string | null; headingId: string | null };

function areaOf(element: HTMLElement): Area | null {
  const area = element.closest(AREA);
  if (!area) return null;
  // 서버가 그 묶음을 새로 그려 요소가 바뀌어도 이름으로 다시 찾는다
  const label = area.getAttribute("aria-label");
  const labelledBy = area.getAttribute("aria-labelledby");
  const selector = label
    ? `[aria-label="${CSS.escape(label)}"]`
    : labelledBy
      ? `[aria-labelledby="${CSS.escape(labelledBy)}"]`
      : null;
  return { element: area, selector, headingId: labelledBy };
}

function canFocus(element: HTMLElement | null | undefined): element is HTMLElement {
  return !!element && element.isConnected && !element.matches(":disabled") && element.getClientRects().length > 0;
}

function firstIn(area: Area | null): HTMLElement | null {
  if (!area) return null;
  const current = area.element.isConnected
    ? area.element
    : area.selector
      ? document.querySelector(area.selector)
      : null;
  const control = [...(current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].find(canFocus);
  if (control) return control;
  const heading = area.headingId ? document.getElementById(area.headingId) : null;
  if (!heading) return null;
  // 제목은 탭 순서에 넣지 않고 포커스만 받게 한다
  heading.tabIndex = -1;
  return heading;
}

const openDialog = () => document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');

/**
 * 처리에 성공하면 창은 먼저 닫히고 서버가 새로 그린 화면은 조금 뒤에 온다. 그때 방금 포커스를 준 버튼이 사라지면
 * (신청하기 → 신청 취소) 포커스가 문서 처음으로 가므로, 묶음의 새 첫 버튼으로 한 번 더 옮긴다.
 * 그 사이 사람이 무언가를 누르거나(다른 화면으로 이동 포함) 포커스를 옮겼으면 건드리지 않는다.
 */
function followReplacement(target: HTMLElement, area: Area | null) {
  if (!area) return;
  const observer = new MutationObserver(() => {
    if (target.isConnected) return;
    stop();
    if (document.activeElement && document.activeElement !== document.body) return;
    firstIn(area)?.focus();
  });
  const timer = window.setTimeout(stop, 10_000);
  function stop() {
    observer.disconnect();
    window.clearTimeout(timer);
    document.removeEventListener("pointerdown", stop, true);
    document.removeEventListener("keydown", stop, true);
  }
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("pointerdown", stop, true);
  document.addEventListener("keydown", stop, true);
}

/**
 * Radix Dialog.Content의 onOpenAutoFocus · onCloseAutoFocus에 넘긴다.
 * returnFocusRef: 창을 연 버튼. 클릭으로 버튼에 포커스가 가지 않는 브라우저(Safari)나,
 * 다른 창이 닫히면서 이어 열리는 결과 창처럼 열 때 포커스가 창 밖 버튼에 없는 경우를 위해 알려 준다.
 */
export function useReturnFocus(returnFocusRef?: React.RefObject<HTMLElement | null>) {
  const opener = useRef<HTMLElement | null>(null);
  const area = useRef<Area | null>(null);

  function onOpenAutoFocus() {
    const active = document.activeElement;
    const focused = active instanceof HTMLElement && active !== document.body ? active : null;
    const from = returnFocusRef?.current ?? focused;
    opener.current = from;
    area.current = from ? areaOf(from) : null;
  }

  function onCloseAutoFocus(event: Event) {
    event.preventDefault();
    // 이어서 결과 창이 열렸으면 그 창이 포커스를 가진다
    if (openDialog()) return;
    const target = [returnFocusRef?.current, opener.current].find(canFocus) ?? firstIn(area.current);
    if (!target) return;
    target.focus();
    followReplacement(target, area.current);
  }

  return { onOpenAutoFocus, onCloseAutoFocus };
}
