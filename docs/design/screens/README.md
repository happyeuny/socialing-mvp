# 화면 시안 PNG

- Google Stitch로 만들어 Figma로 옮긴 화면 시안을 PNG로 둔다. PM이 Figma에서 14화면을 2배 크기로 내보냈다(2026-10-13). 파일 목록은 아래 표의 PNG 칸.
- 파일 이름은 spec 8.2의 화면 ID로 시작한다. 예: `P00_home.png`, `P01_explore.png`, `O01_filter_sheet.png`, `P03_detail.png`.
- 내보낼 때 글꼴이 빠져 한글 일부가 네모(□)로 보이는 PNG가 있다(예: P03 일시·금액·인원 줄, O02, P06, P07). 읽을 수 없는 글자는 spec 문구를 따른다. P00·P01 위아래의 검은 띠도 내보내기 흔적이다.
- 시안은 색·모양 참고다. 문구와 동작은 [spec.md](../../spec.md), 토큰과 컴포넌트 이름은 [DESIGN.md](../../../DESIGN.md)를 따른다. 일부러 시안과 다르게 정한 것은 DESIGN.md Components 끝 "시안과 다르게 정한 것" 표에 있다.

## Figma 원본

파일: https://www.figma.com/design/kjWEG1WDu9tqfL6QoW7ujk/Untitled (페이지 `1:2`). 무료 요금제는 Figma 읽기가 한 달 20회라 PNG를 먼저 본다. Figma가 꼭 필요하면 **PM에게 어떤 화면을 왜 읽을지 말하고 승인을 받은 뒤** 아래 node id로 그 화면만 한 번 읽는다(페이지 전체 읽기는 하지 않는다).

| 화면 ID | 화면 | PNG | Figma 프레임 | node id |
|---|---|---|---|---|
| P00 | 홈 | [P00_home.png](P00_home.png) | 문화소셜링 - 홈 (01_home) | `1:3` |
| P01 | 탐색 | [P01_explore.png](P01_explore.png) | 문화소셜링 - 탐색 (02_explore) | `1:256` |
| O01 | 필터 시트 | [O01_filter_sheet.png](O01_filter_sheet.png) | 문화소셜링 - 필터 (03_filter_sheet) | `1:570` |
| P02 | 지난 소셜링 | [P02_past.png](P02_past.png) | 문화소셜링 - 지난 소셜링 | `8:609` |
| P03 | 소셜링 상세 | [P03_detail.png](P03_detail.png) | 문화소셜링 - 소셜링 상세 (04_detail) | `1:445` |
| O02 | 신청 확인 | [O02_apply_confirm.png](O02_apply_confirm.png) | 문화소셜링 - 신청 확인 | `8:477` |
| O03 | 등급 조건 | [O03_trust_criteria.png](O03_trust_criteria.png) | 문화소셜링 - 등급 조건 | `8:308` |
| P04 | 로그인 | [P04_login.png](P04_login.png) | 문화소셜링 - 로그인 | `8:562` |
| P05 | 가입 | [P05_signup.png](P05_signup.png) | 문화소셜링 - 가입 | `8:414` |
| P06 | 내 소셜링 | [P06_my_socialings.png](P06_my_socialings.png) | 문화소셜링 - 내 소셜링 (08_my_socialings) | `8:160` |
| P07 | 소셜링 등록 (P08 수정도 같은 양식) | [P07_new_socialing.png](P07_new_socialing.png) | 문화소셜링 - 소셜링 등록 | `8:2` |
| P09 | 후기 쓰기 | [P09_review_write.png](P09_review_write.png) | 문화소셜링 - 후기 쓰기 (06_review_write) | `1:814` |
| P10 | 인증 후기 | [P10_review_feed.png](P10_review_feed.png) | 문화소셜링 - 인증 후기 (07_review_feed) | `1:909` |
| P11 | 소셜링 관리 | [P11_manage.png](P11_manage.png) | 문화소셜링 - 소셜링 관리 (05_manage) | `1:712` |

- 시안이 없는 것: P08 수정(P07 + 잠금 표시), O04 호스트 동작 확인, O05 신청 취소 확인, 상세 아래 영역 14가지와 공통 상태. 이것들은 DESIGN.md의 모양과 [wireframes/](../wireframes/) `08_detail_bottom_states`, `09_common_states`를 따른다.
- 홈·탐색·지난 소셜링 프레임은 폭 1280 바탕 안에 390px 화면이 들어 있다. 빈 프레임 `8:307`(등급 조건 복사본)은 쓰지 않는다.
- 확인일: 2026-10-13 (Figma 메타데이터). 프레임을 옮기거나 지우면 이 표를 고친다.
