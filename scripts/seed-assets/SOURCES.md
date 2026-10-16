# 시드 사진 출처

**발표 슬라이드에 쓰는 문장: "사진은 AI(Gemini)로 만든 이미지"**

- 이 폴더의 사진 15장은 모두 PM이 Google Gemini로 만든 AI 생성 이미지다(2026-10-16). 실제 장소·사람의 사진이나 다른 앱의 사진이 아니다.
- 프롬프트는 PM의 기획 문서 "소셜링 이미지 생성 프롬프트"에 있다. 공통 규칙: 가로 4:3, 얼굴·사람 전체 없음, 읽을 수 있는 글자·로고 없음, 대표 사진은 사람·손 없이 사물과 공간만, 후기 사진은 참여자의 손·팔까지.
- **받은 그대로 쓴다**(PM 결정 2026-10-16): 1024×765 JPEG, 줄이거나 자르거나 다시 저장하지 않는다. 오른쪽 아래 Gemini 표시(약 40px)도 지우지 않는다. 카드의 정사각 사진에서는 잘려서 안 보이고, 홈 히어로·상세·인증 후기 사진에서는 보인다.
- 사진 규칙(DESIGN.md Do's)의 예외로 PM이 받아들인 것: R1 왼쪽 아래 공책 손글씨가 영어로 조금 읽힘, T4 노트북 화면에 엑셀처럼 보이는 표·차트.
- `npm run seed`가 이 파일들을 Storage에 그 사람 폴더(`<사용자 id>/<파일 이름>`)로 올려 연결한다. 어느 소셜링·후기에 붙는지는 `scripts/seed-data.mts`의 `cover_photo`·`photo`. 파일을 바꾸면 시드를 다시 넣어야 화면에 반영된다.

## 대표 사진 (사물과 공간만)

| 번호 | 파일 | 시드 소셜링 |
|---|---|---|
| T1 | thumb-01-travel-english.jpg | 퇴근 후 영어 회화: 여행 영어 롤플레이 |
| T2 | thumb-02-three-minute-speech.jpg | 영어로 내 일 소개하기: 3분 스피치 |
| T3 | thumb-03-morning-journal.jpg | 아침 7시 영어 일기 쓰기 |
| T4 | thumb-04-spreadsheet.jpg | 엑셀 함수 기초: 업무 자동화 첫걸음 |
| T5 | thumb-05-small-exhibition.jpg | 작은 전시 함께 보고 이야기 나누기 |
| T6 | thumb-06-han-river-run.jpg | 한강 5km 가볍게 달리기 |
| T7 | thumb-07-essay-book-club.jpg | 독서 소셜링: 이번 달 에세이 한 권 |
| T8 | thumb-08-board-game-wine.jpg | 보드게임과 와인 한 잔 |
| T9 | thumb-09-film-camera-walk.jpg | 필름 카메라로 골목 산책 |
| T10 | thumb-10-calligraphy.jpg | 캘리그라피 한 줄 써 보기 |

## 후기 사진 (손·팔까지, 얼굴 없음)

| 번호 | 파일 | 시드 후기 |
|---|---|---|
| R1 | review-01-weekend-plans.jpg | 영어 회화: 주말 계획 말하기 · 서윤 |
| R2 | review-02-book-chapter.jpg | 영어 원서 한 챕터 같이 읽기 · 민지 |
| R3 | review-03-bookshop-walk.jpg | 동네 서점 둘러보기 · 민지 |
| R4 | review-04-han-river-night.jpg | 한강 야간 걷기 7km · 소라 |
| R5 | review-05-wine-tasting.jpg | 와인 입문: 세 가지 맛 비교 · 지훈 |

## 사진 없이 두는 소셜링 (카테고리 그림)

영어 뉴스 한 편 같이 읽기 / 수제 맥주 펍 투어 / 직장인 영어 프레젠테이션 연습 / 퇴근 후 영어 스몰토크: 맥주 한 잔과 함께. 화면에 카테고리 그림도 보이게 일부러 비워 둔다. 나머지 지난 소셜링(호스트 기록용)도 사진이 없다.
