import { HeaderMain } from "@/components/header-main";
import { TabBar } from "@/components/tab-bar";
import { getViewer } from "@/lib/queries/viewer";

// 메인 탭 화면(홈 P00, 탐색 P01, 인증 후기 P10, 내 소셜링 P06) 틀: 위 header-main + 아래 tab-bar (DESIGN.md Layout).
// 하위 화면(상세, 지난 소셜링, 로그인 등)은 이 묶음 밖에서 각자 header-sub를 둔다.

export default async function TabsLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  return (
    <>
      <HeaderMain viewer={viewer} />
      {/* 아래 탭(64px + 안전 영역)에 내용이 가리지 않게 */}
      <div className="pb-[calc(64px+env(safe-area-inset-bottom))]">{children}</div>
      <TabBar />
    </>
  );
}
